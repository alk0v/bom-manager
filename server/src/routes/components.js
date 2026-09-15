const express = require('express');
const router = express.Router();
const pool = require('../db');

// GET /api/components - list components with optional search & filtering
router.get('/', async (req, res) => {
  try {
    const {
      search = '',
      categoryId,
      categoryIds,
      packageId,
      packageIds,
      projectId,
      isSmd,
      minPins,
      maxPins,
      limit = 100,
      offset = 0
    } = req.query;
    
    let whereClauses = [];
    let params = [];

    // Search keyword across multiple fields
    if (search && search.trim()) {
      whereClauses.push('(c.component LIKE ? OR c.description LIKE ? OR c.marking LIKE ? OR c.shortDescription LIKE ?)');
      const term = `%${search.trim()}%`;
      params.push(term, term, term, term);
    }

    // Category filter (multi-choice supported)
    let parsedCategoryIds = [];
    if (categoryIds) {
      if (Array.isArray(categoryIds)) {
        parsedCategoryIds = categoryIds.map(x => parseInt(x, 10)).filter(x => !isNaN(x));
      } else if (typeof categoryIds === 'string') {
        parsedCategoryIds = categoryIds.split(',').map(x => parseInt(x, 10)).filter(x => !isNaN(x));
      }
    } else if (categoryId) {
      const parsed = parseInt(categoryId, 10);
      if (!isNaN(parsed)) parsedCategoryIds = [parsed];
    }

    if (parsedCategoryIds.length > 0) {
      const placeholders = parsedCategoryIds.map(() => '?').join(', ');
      whereClauses.push(`c.category_id IN (${placeholders})`);
      params.push(...parsedCategoryIds);
    }

    // Package filter (multi-choice supported)
    let parsedPackageIds = [];
    if (packageIds) {
      if (Array.isArray(packageIds)) {
        parsedPackageIds = packageIds.map(x => parseInt(x, 10)).filter(x => !isNaN(x));
      } else if (typeof packageIds === 'string') {
        parsedPackageIds = packageIds.split(',').map(x => parseInt(x, 10)).filter(x => !isNaN(x));
      }
    } else if (packageId) {
      const parsed = parseInt(packageId, 10);
      if (!isNaN(parsed)) parsedPackageIds = [parsed];
    }

    if (parsedPackageIds.length > 0) {
      const placeholders = parsedPackageIds.map(() => '?').join(', ');
      whereClauses.push(`c.package_id IN (${placeholders})`);
      params.push(...parsedPackageIds);
    }

    // Project filter (components linked to project BOM)
    if (projectId) {
      const parsedProjectId = parseInt(projectId, 10);
      if (!isNaN(parsedProjectId)) {
        whereClauses.push('EXISTS (SELECT 1 FROM t_bom b WHERE b.projectId = ? AND b.componentId = c.ID)');
        params.push(parsedProjectId);
      }
    }

    // SMD / THT filter
    if (isSmd !== undefined && isSmd !== null && isSmd !== '') {
      const parsedSmd = parseInt(isSmd, 10);
      if (!isNaN(parsedSmd) && (parsedSmd === 0 || parsedSmd === 1)) {
        whereClauses.push('pkg.isSmd = ?');
        params.push(parsedSmd);
      }
    }

    // Number of pins (range)
    if (minPins !== undefined && minPins !== null && minPins !== '') {
      const parsedMin = parseInt(minPins, 10);
      if (!isNaN(parsedMin)) {
        whereClauses.push('pkg.pinQuantity >= ?');
        params.push(parsedMin);
      }
    }

    if (maxPins !== undefined && maxPins !== null && maxPins !== '') {
      const parsedMax = parseInt(maxPins, 10);
      if (!isNaN(parsedMax)) {
        whereClauses.push('pkg.pinQuantity <= ?');
        params.push(parsedMax);
      }
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const countQuery = `
      SELECT COUNT(DISTINCT c.ID) AS total 
      FROM i_components c
      LEFT JOIN i_packages pkg ON c.package_id = pkg.ID
      ${whereSql}
    `;
    const [countRows] = await pool.query(countQuery, params);
    const total = countRows[0].total;

    const dataQuery = `
      SELECT 
        c.ID,
        c.component,
        c.category_id,
        c.package_id,
        c.description,
        c.shortDescription,
        c.marking,
        c.datasheetURL,
        c.photoURL,
        c.qty,
        cat.category,
        pkg.package,
        pkg.pinQuantity,
        pkg.isSmd,
        pkg.drawingURL
      FROM i_components c
      LEFT JOIN i_categories cat ON c.category_id = cat.ID
      LEFT JOIN i_packages pkg ON c.package_id = pkg.ID
      ${whereSql}
      ORDER BY c.component ASC
      LIMIT ? OFFSET ?
    `;

    const [rows] = await pool.query(dataQuery, [...params, parseInt(limit, 10), parseInt(offset, 10)]);

    res.json({
      total,
      limit: parseInt(limit, 10),
      offset: parseInt(offset, 10),
      items: rows
    });
  } catch (error) {
    console.error('Error fetching components:', error);
    res.status(500).json({ error: 'Failed to fetch components', details: error.message });
  }
});

// GET /api/components/check-existing - check if duplicate or similar component exists
router.get('/check-existing', async (req, res) => {
  const { component = '', category_id, package_id } = req.query;

  const trimmedName = component.trim();
  if (!trimmedName) {
    return res.json({ exists: false, matches: [] });
  }

  const parsedCatId = category_id ? parseInt(category_id, 10) : null;
  const parsedPkgId = package_id ? parseInt(package_id, 10) : null;

  try {
    const query = `
      SELECT 
        c.ID, 
        c.component, 
        c.marking, 
        c.qty, 
        c.category_id, 
        c.package_id,
        cat.category, 
        pkg.package,
        pkg.isSmd,
        pkg.pinQuantity,
        CASE
          WHEN LOWER(TRIM(c.component)) = LOWER(?) AND c.package_id <=> ? AND c.category_id <=> ? THEN 'exact'
          WHEN LOWER(TRIM(c.component)) = LOWER(?) THEN 'same_name'
          ELSE 'similar'
        END AS matchReason
      FROM i_components c
      LEFT JOIN i_categories cat ON c.category_id = cat.ID
      LEFT JOIN i_packages pkg ON c.package_id = pkg.ID
      WHERE 
        LOWER(TRIM(c.component)) = LOWER(?)
        OR (c.category_id = ? AND c.package_id = ? AND LOWER(TRIM(c.component)) LIKE CONCAT('%', LOWER(?), '%'))
      ORDER BY 
        CASE 
          WHEN LOWER(TRIM(c.component)) = LOWER(?) AND c.package_id <=> ? AND c.category_id <=> ? THEN 1
          WHEN LOWER(TRIM(c.component)) = LOWER(?) THEN 2
          ELSE 3
        END ASC
      LIMIT 5
    `;

    const [rows] = await pool.query(query, [
      trimmedName, parsedPkgId, parsedCatId,
      trimmedName,
      trimmedName,
      parsedCatId, parsedPkgId, trimmedName,
      trimmedName, parsedPkgId, parsedCatId,
      trimmedName
    ]);

    res.json({
      exists: rows.length > 0,
      matches: rows
    });
  } catch (error) {
    console.error('Error checking existing component:', error);
    res.status(500).json({ error: 'Failed to check existing components', details: error.message });
  }
});

// GET /api/components/:id - single component details + warehouse stock breakdown
router.get('/:id', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT 
        c.ID,
        c.component,
        c.category_id,
        c.package_id,
        c.description,
        c.shortDescription,
        c.marking,
        c.datasheetURL,
        c.photoURL,
        c.qty,
        cat.category,
        pkg.package,
        pkg.pinQuantity,
        pkg.isSmd,
        pkg.drawingURL
      FROM i_components c
      LEFT JOIN i_categories cat ON c.category_id = cat.ID
      LEFT JOIN i_packages pkg ON c.package_id = pkg.ID
      WHERE c.ID = ?
    `, [req.params.id]);

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Component not found' });
    }

    const component = rows[0];

    // Fetch warehouse allocations
    const [warehouseRows] = await pool.query(`
      SELECT w.id, w.storageId, s.storage, w.quantity
      FROM t_warehouse w
      LEFT JOIN i_storages s ON w.storageId = s.ID
      WHERE w.componentId = ?
    `, [req.params.id]);

    component.warehouse = warehouseRows;

    res.json(component);
  } catch (error) {
    console.error('Error fetching component:', error);
    res.status(500).json({ error: 'Failed to fetch component', details: error.message });
  }
});

// POST /api/components - create component
router.post('/', async (req, res) => {
  const {
    component,
    category_id = null,
    package_id = 28,
    description = '',
    shortDescription = '',
    marking = '',
    datasheetURL = null,
    photoURL = null,
    qty = 0,
    storageId = null
  } = req.body;

  if (!component || !component.trim()) {
    return res.status(400).json({ error: 'Component name is required' });
  }

  const parsedQty = parseInt(qty, 10) || 0;
  const parsedCategoryId = category_id ? parseInt(category_id, 10) : null;
  const parsedPackageId = package_id ? parseInt(package_id, 10) : 28;

  try {
    const [result] = await pool.query(
      `INSERT INTO i_components 
       (component, category_id, package_id, description, shortDescription, marking, datasheetURL, photoURL, qty)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        component.trim(),
        parsedCategoryId,
        parsedPackageId,
        description ? description.trim() : '',
        shortDescription ? shortDescription.trim() : '',
        marking ? marking.trim() : '',
        datasheetURL ? datasheetURL.trim() : null,
        photoURL ? photoURL.trim() : null,
        parsedQty
      ]
    );

    const componentId = result.insertId;

    // If initial stock and storageId provided, allocate to t_warehouse
    if (parsedQty > 0 && storageId) {
      const parsedStorageId = parseInt(storageId, 10);
      if (!isNaN(parsedStorageId)) {
        await pool.query(
          'INSERT INTO t_warehouse (componentId, storageId, quantity) VALUES (?, ?, ?)',
          [componentId, parsedStorageId, parsedQty]
        );
      }
    }

    res.status(201).json({
      id: componentId,
      component: component.trim(),
      category_id: parsedCategoryId,
      package_id: parsedPackageId,
      description,
      shortDescription,
      marking,
      datasheetURL,
      photoURL,
      qty: parsedQty
    });
  } catch (error) {
    console.error('Error creating component:', error);
    res.status(500).json({ error: 'Failed to create component', details: error.message });
  }
});

// PUT /api/components/:id - update component
router.put('/:id', async (req, res) => {
  const {
    component,
    category_id,
    package_id,
    description,
    shortDescription,
    marking,
    datasheetURL,
    photoURL,
    qty
  } = req.body;

  try {
    await pool.query(
      `UPDATE i_components SET
        component = COALESCE(?, component),
        category_id = COALESCE(?, category_id),
        package_id = COALESCE(?, package_id),
        description = COALESCE(?, description),
        shortDescription = COALESCE(?, shortDescription),
        marking = COALESCE(?, marking),
        datasheetURL = COALESCE(?, datasheetURL),
        photoURL = COALESCE(?, photoURL),
        qty = COALESCE(?, qty)
       WHERE ID = ?`,
      [component, category_id, package_id, description, shortDescription, marking, datasheetURL, photoURL, qty, req.params.id]
    );
    res.json({ success: true, id: req.params.id });
  } catch (error) {
    console.error('Error updating component:', error);
    res.status(500).json({ error: 'Failed to update component', details: error.message });
  }
});

module.exports = router;
