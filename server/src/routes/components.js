const express = require('express');
const router = express.Router();
const pool = require('../db');

// GET /api/components - list components with optional search & filtering
router.get('/', async (req, res) => {
  try {
    const { search = '', categoryId, limit = 100, offset = 0 } = req.query;
    
    let whereClauses = [];
    let params = [];

    if (search.trim()) {
      whereClauses.push('(c.component LIKE ? OR c.description LIKE ? OR c.marking LIKE ? OR c.shortDescription LIKE ?)');
      const term = `%${search.trim()}%`;
      params.push(term, term, term, term);
    }

    if (categoryId) {
      whereClauses.push('c.category_id = ?');
      params.push(categoryId);
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const countQuery = `SELECT COUNT(*) AS total FROM i_components c ${whereSql}`;
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
    category_id,
    package_id = 28,
    description = '',
    shortDescription = '',
    marking = '',
    datasheetURL = null,
    photoURL = null,
    qty = 0
  } = req.body;

  if (!component) {
    return res.status(400).json({ error: 'Component name is required' });
  }

  try {
    const [result] = await pool.query(
      `INSERT INTO i_components 
       (component, category_id, package_id, description, shortDescription, marking, datasheetURL, photoURL, qty)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [component, category_id, package_id, description, shortDescription, marking, datasheetURL, photoURL, qty]
    );
    res.status(201).json({ id: result.insertId, ...req.body });
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
