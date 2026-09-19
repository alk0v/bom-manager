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
      stockStatus,
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

    // Stock status filter:
    if (stockStatus === 'absent') {
      whereClauses.push('COALESCE(c.qty, 0) <= 0');
    } else if (stockStatus === 'low') {
      whereClauses.push('c.minQty > 0 AND COALESCE(c.qty, 0) <= c.minQty AND COALESCE(c.qty, 0) > 0');
    } else if (stockStatus === 'absent_or_low') {
      whereClauses.push('(COALESCE(c.qty, 0) <= 0 OR (c.minQty > 0 AND COALESCE(c.qty, 0) <= c.minQty))');
    } else if (stockStatus === 'in_stock') {
      whereClauses.push('COALESCE(c.qty, 0) > 0');
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
        COALESCE(c.minQty, 0) AS minQty,
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
          WHEN LOWER(TRIM(c.component)) = LOWER(?) AND COALESCE(c.package_id, -1) = COALESCE(?, -1) AND COALESCE(c.category_id, -1) = COALESCE(?, -1) THEN 'exact'
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
          WHEN LOWER(TRIM(c.component)) = LOWER(?) AND COALESCE(c.package_id, -1) = COALESCE(?, -1) AND COALESCE(c.category_id, -1) = COALESCE(?, -1) THEN 1
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

// GET /api/components/template-csv - download CSV import template
router.get('/template-csv', (req, res) => {
  const csvHeader = 'component,category,package,marking,shortDescription,description,qty,minQty,storage,isSmd,pins\r\n';
  const csvRows = [
    'STM32F401CDU6,Microcontrollers,UFQFPN-48,32F401CD,"ARM Cortex-M4 MCU 84MHz, 384KB Flash",General purpose 32-bit MCU,15,5,Box A1,1,48',
    'NE555P,Analog ICs,DIP-08,NE555,Precision Timer Single,Standard 555 precision timer oscillator,50,10,Drawer 2,0,8',
    'GRM188R71H104KA93D,Capacitors,0603,,"0.1uF 50V X7R 10% Ceramic Capacitor",MLCC ceramic capacitor,500,100,Reel 12,1,2',
    'AMS1117-3.3,Voltage Regulators,SOT-223,AMS1117-3.3,3.3V 1A LDO Linear Voltage Regulator,Low dropout linear voltage regulator,25,10,Box B3,1,4'
  ].join('\r\n');

  const csvContent = '\uFEFF' + csvHeader + csvRows;
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="components_template.csv"');
  res.send(csvContent);
});

// POST /api/components/import-csv - import components with category/package mapping and duplicate handling
router.post('/import-csv', async (req, res) => {
  const {
    components = [],
    categoryMappings = [],
    packageMappings = [],
    duplicateHandling = 'skip'
  } = req.body;

  if (!Array.isArray(components) || components.length === 0) {
    return res.status(400).json({ error: 'No components provided for import' });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    let createdCategoriesCount = 0;
    let createdPackagesCount = 0;
    let importedCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;
    const errors = [];

    // 1. Resolve Category Mappings
    const categoryLookup = new Map();
    const [allCategories] = await conn.query('SELECT ID, category FROM i_categories');
    const existingCatByName = new Map();
    for (const c of allCategories) {
      if (c.category) existingCatByName.set(c.category.trim().toLowerCase(), c.ID);
    }

    const catMapList = Array.isArray(categoryMappings)
      ? categoryMappings
      : Object.entries(categoryMappings).map(([k, v]) => ({ csvCategory: k, ...v }));

    for (const m of catMapList) {
      const origKey = (m.csvCategory || '').trim().toLowerCase();
      if (!origKey) continue;

      if (m.action === 'skip') {
        categoryLookup.set(origKey, null);
      } else if (m.action === 'existing' && m.categoryId) {
        categoryLookup.set(origKey, parseInt(m.categoryId, 10));
      } else if (m.action === 'create') {
        const catName = (m.newCategoryName || m.csvCategory || '').trim();
        if (catName) {
          const lowerName = catName.toLowerCase();
          if (existingCatByName.has(lowerName)) {
            categoryLookup.set(origKey, existingCatByName.get(lowerName));
          } else {
            const [catRes] = await conn.query('INSERT INTO i_categories (category) VALUES (?)', [catName]);
            const newCatId = catRes.insertId;
            existingCatByName.set(lowerName, newCatId);
            categoryLookup.set(origKey, newCatId);
            createdCategoriesCount++;
          }
        }
      }
    }

    // 2. Resolve Package Mappings
    const packageLookup = new Map();
    const [allPackages] = await conn.query('SELECT ID, package, pinQuantity, isSmd FROM i_packages');
    const existingPkgByName = new Map();
    for (const p of allPackages) {
      if (p.package) existingPkgByName.set(p.package.trim().toLowerCase(), p.ID);
    }

    const pkgMapList = Array.isArray(packageMappings)
      ? packageMappings
      : Object.entries(packageMappings).map(([k, v]) => ({ csvPackage: k, ...v }));

    for (const m of pkgMapList) {
      const origKey = (m.csvPackage || '').trim().toLowerCase();
      if (!origKey) continue;

      if (m.action === 'skip') {
        packageLookup.set(origKey, 28);
      } else if (m.action === 'existing' && m.packageId) {
        packageLookup.set(origKey, parseInt(m.packageId, 10));
      } else if (m.action === 'create') {
        const pkgName = (m.newPackageName || m.csvPackage || '').trim();
        if (pkgName) {
          const lowerPkg = pkgName.toLowerCase();
          if (existingPkgByName.has(lowerPkg)) {
            packageLookup.set(origKey, existingPkgByName.get(lowerPkg));
          } else {
            const pinQty = m.pinQuantity !== undefined && m.pinQuantity !== null && m.pinQuantity !== ''
              ? parseInt(m.pinQuantity, 10) : (m.pins ? parseInt(m.pins, 10) : 0);
            const smdVal = (m.isSmd === true || m.isSmd === 1 || m.isSmd === '1' || String(m.isSmd).toLowerCase() === 'true' || String(m.isSmd).toLowerCase() === 'smd') ? 1 : 0;
            const [pkgRes] = await conn.query(
              'INSERT INTO i_packages (package, pinQuantity, isSmd, drawingURL) VALUES (?, ?, ?, ?)',
              [pkgName, isNaN(pinQty) ? 0 : pinQty, smdVal, null]
            );
            const newPkgId = pkgRes.insertId;
            existingPkgByName.set(lowerPkg, newPkgId);
            packageLookup.set(origKey, newPkgId);
            createdPackagesCount++;
          }
        }
      }
    }

    // 3. Cache Storages
    const [allStorages] = await conn.query('SELECT ID, storage FROM i_storages');
    const storageLookup = new Map();
    for (const s of allStorages) {
      if (s.storage) storageLookup.set(s.storage.trim().toLowerCase(), s.ID);
    }

    // 4. Process each component
    for (let i = 0; i < components.length; i++) {
      const row = components[i];
      const compName = (row.component || '').trim();
      if (!compName) {
        errors.push({ row: i + 1, error: 'Empty component name' });
        continue;
      }

      // Resolve category ID
      let categoryId = null;
      if (row.categoryId) {
        categoryId = parseInt(row.categoryId, 10);
      } else if (row.category || row.categoryName) {
        const rawCat = (row.category || row.categoryName).trim().toLowerCase();
        if (categoryLookup.has(rawCat)) {
          categoryId = categoryLookup.get(rawCat);
        } else if (existingCatByName.has(rawCat)) {
          categoryId = existingCatByName.get(rawCat);
        }
      }

      // Resolve package ID
      let packageId = 28;
      if (row.packageId) {
        packageId = parseInt(row.packageId, 10);
      } else if (row.package || row.packageName) {
        const rawPkg = (row.package || row.packageName).trim().toLowerCase();
        if (packageLookup.has(rawPkg)) {
          packageId = packageLookup.get(rawPkg);
        } else if (existingPkgByName.has(rawPkg)) {
          packageId = existingPkgByName.get(rawPkg);
        }
      }

      // Resolve storage ID
      let storageId = null;
      const rawStorage = (row.storage || row.storageName || '').trim();
      if (rawStorage) {
        const lowerStorage = rawStorage.toLowerCase();
        if (storageLookup.has(lowerStorage)) {
          storageId = storageLookup.get(lowerStorage);
        } else {
          const [storeRes] = await conn.query('INSERT INTO i_storages (storage) VALUES (?)', [rawStorage]);
          storageId = storeRes.insertId;
          storageLookup.set(lowerStorage, storageId);
        }
      } else if (row.storageId) {
        storageId = parseInt(row.storageId, 10) || null;
      }

      const qty = parseInt(row.qty, 10) || 0;
      const minQty = parseInt(row.minQty, 10) || 0;
      const description = (row.description || '').trim();
      const shortDescription = (row.shortDescription || '').trim();
      const marking = (row.marking || '').trim();
      const datasheetURL = (row.datasheetURL || '').trim() || null;

      // Duplicate check by component name (case-insensitive)
      const [existing] = await conn.query(
        'SELECT ID, component, qty FROM i_components WHERE LOWER(TRIM(component)) = LOWER(TRIM(?))',
        [compName]
      );

      if (existing.length > 0) {
        const existingComp = existing[0];
        if (duplicateHandling === 'skip') {
          skippedCount++;
          continue;
        } else if (duplicateHandling === 'updateStock') {
          if (qty > 0) {
            await conn.query('UPDATE i_components SET qty = qty + ? WHERE ID = ?', [qty, existingComp.ID]);
            if (storageId) {
              const [wRows] = await conn.query(
                'SELECT id, quantity FROM t_warehouse WHERE componentId = ? AND storageId = ?',
                [existingComp.ID, storageId]
              );
              if (wRows.length > 0) {
                await conn.query('UPDATE t_warehouse SET quantity = quantity + ? WHERE id = ?', [qty, wRows[0].id]);
              } else {
                await conn.query('INSERT INTO t_warehouse (componentId, storageId, quantity) VALUES (?, ?, ?)', [
                  existingComp.ID,
                  storageId,
                  qty
                ]);
              }
            }
          }
          updatedCount++;
          continue;
        }
        // If 'createAnyway', fall through to insert
      }

      // Insert new component
      const [insertRes] = await conn.query(
        `INSERT INTO i_components 
         (component, category_id, package_id, description, shortDescription, marking, datasheetURL, photoURL, qty, minQty)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          compName,
          categoryId,
          packageId,
          description,
          shortDescription,
          marking,
          datasheetURL,
          null,
          qty,
          minQty
        ]
      );

      const newCompId = insertRes.insertId;

      if (qty > 0 && storageId) {
        await conn.query(
          'INSERT INTO t_warehouse (componentId, storageId, quantity) VALUES (?, ?, ?)',
          [newCompId, storageId, qty]
        );
      }

      importedCount++;
    }

    await conn.commit();

    res.json({
      success: true,
      importedCount,
      updatedCount,
      skippedCount,
      createdCategoriesCount,
      createdPackagesCount,
      errors
    });
  } catch (error) {
    await conn.rollback();
    console.error('Error importing components:', error);
    res.status(500).json({ error: 'Failed to import components', details: error.message });
  } finally {
    conn.release();
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
        COALESCE(c.minQty, 0) AS minQty,
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

    // Fetch purchase orders history
    const [orderRows] = await pool.query(`
      SELECT 
        id,
        componentId,
        price,
        qty,
        date,
        url,
        details
      FROM t_orders
      WHERE componentId = ?
      ORDER BY date DESC, id DESC
    `, [req.params.id]);

    let totalQtyPurchased = 0;
    let totalSpent = 0;
    const orders = orderRows.map(o => {
      const unitPrice = o.price != null ? Number(o.price) : 0;
      const orderQty = o.qty != null ? Number(o.qty) : 0;
      const orderTotal = Math.round(unitPrice * orderQty * 10000) / 10000;
      totalQtyPurchased += orderQty;
      totalSpent += (unitPrice * orderQty);
      return {
        id: o.id,
        componentId: o.componentId,
        price: unitPrice,
        qty: orderQty,
        totalCost: Math.round(orderTotal * 100) / 100,
        date: o.date,
        url: o.url || '',
        details: o.details || ''
      };
    });

    const latestOrder = orders.length > 0 ? orders[0] : null;
    const latestPrice = latestOrder ? latestOrder.price : null;
    const avgPrice = totalQtyPurchased > 0 
      ? Math.round((totalSpent / totalQtyPurchased) * 10000) / 10000 
      : (latestPrice ?? null);

    component.latestPrice = latestPrice;
    component.pricing = {
      latestPrice,
      latestOrderDate: latestOrder?.date || null,
      latestOrderUrl: latestOrder?.url || null,
      latestOrderDetails: latestOrder?.details || null,
      avgPrice,
      totalQuantityPurchased: totalQtyPurchased,
      totalSpent: Math.round(totalSpent * 100) / 100,
      orderCount: orders.length,
      orders
    };

    // Fetch projects where component is used in BOM
    const [projects] = await pool.query(`
      SELECT 
        p.id,
        p.projectName,
        p.description,
        p.photoUrl,
        p.url,
        SUM(b.quantity) AS requiredQuantity,
        GROUP_CONCAT(NULLIF(TRIM(b.comment), '') SEPARATOR ', ') AS designators
      FROM t_bom b
      INNER JOIN i_projects p ON b.projectId = p.id
      WHERE b.componentId = ?
      GROUP BY p.id, p.projectName, p.description, p.photoUrl, p.url
      ORDER BY p.projectName ASC
    `, [req.params.id]);

    component.projects = projects.map(p => ({
      ...p,
      requiredQuantity: Number(p.requiredQuantity) || 1
    }));

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
    minQty = 0,
    storageId = null
  } = req.body;

  if (!component || !component.trim()) {
    return res.status(400).json({ error: 'Component name is required' });
  }

  const parsedQty = parseInt(qty, 10) || 0;
  const parsedMinQty = minQty !== undefined && minQty !== null ? (parseInt(minQty, 10) || 0) : 0;
  const parsedCategoryId = category_id ? parseInt(category_id, 10) : null;
  const parsedPackageId = package_id ? parseInt(package_id, 10) : 28;

  try {
    const [result] = await pool.query(
      `INSERT INTO i_components 
       (component, category_id, package_id, description, shortDescription, marking, datasheetURL, photoURL, qty, minQty)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        component.trim(),
        parsedCategoryId,
        parsedPackageId,
        description ? description.trim() : '',
        shortDescription ? shortDescription.trim() : '',
        marking ? marking.trim() : '',
        datasheetURL ? datasheetURL.trim() : null,
        photoURL ? photoURL.trim() : null,
        parsedQty,
        parsedMinQty
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
      qty: parsedQty,
      minQty: parsedMinQty
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
    qty,
    minQty,
    storageId
  } = req.body;

  try {
    const parsedMinQty = minQty !== undefined && minQty !== null ? parseInt(minQty, 10) : null;
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
        qty = COALESCE(?, qty),
        minQty = COALESCE(?, minQty)
       WHERE ID = ?`,
      [component, category_id, package_id, description, shortDescription, marking, datasheetURL, photoURL, qty, parsedMinQty, req.params.id]
    );

    // If storageId is provided, update or create t_warehouse entry
    if (storageId !== undefined && storageId !== null) {
      const parsedStorageId = parseInt(storageId, 10);
      if (!isNaN(parsedStorageId)) {
        const [existingWarehouse] = await pool.query(
          'SELECT id FROM t_warehouse WHERE componentId = ? LIMIT 1',
          [req.params.id]
        );
        if (existingWarehouse.length > 0) {
          await pool.query(
            'UPDATE t_warehouse SET storageId = ? WHERE id = ?',
            [parsedStorageId, existingWarehouse[0].id]
          );
        } else {
          await pool.query(
            'INSERT INTO t_warehouse (componentId, storageId, quantity) VALUES (?, ?, ?)',
            [req.params.id, parsedStorageId, qty !== undefined ? parseInt(qty, 10) || 0 : 0]
          );
        }
      }
    }

    res.json({ success: true, id: req.params.id, minQty: parsedMinQty });
  } catch (error) {
    console.error('Error updating component:', error);
    res.status(500).json({ error: 'Failed to update component', details: error.message });
  }
});

// PATCH /api/components/:id/min-qty - quickly update minimal acceptable quantity
router.patch('/:id/min-qty', async (req, res) => {
  const { minQty } = req.body;
  const parsed = parseInt(minQty, 10);
  if (isNaN(parsed) || parsed < 0) {
    return res.status(400).json({ error: 'minQty must be a non-negative integer' });
  }
  try {
    await pool.query('UPDATE i_components SET minQty = ? WHERE ID = ?', [parsed, req.params.id]);
    res.json({ success: true, id: req.params.id, minQty: parsed });
  } catch (error) {
    console.error('Error updating component minQty:', error);
    res.status(500).json({ error: 'Failed to update minimal quantity', details: error.message });
  }
});

// PATCH /api/components/:id/qty - quickly update in stock quantity
router.patch('/:id/qty', async (req, res) => {
  const { qty } = req.body;
  const parsed = parseInt(qty, 10);
  if (isNaN(parsed) || parsed < 0) {
    return res.status(400).json({ error: 'qty must be a non-negative integer' });
  }
  try {
    await pool.query('UPDATE i_components SET qty = ? WHERE ID = ?', [parsed, req.params.id]);
    res.json({ success: true, id: req.params.id, qty: parsed });
  } catch (error) {
    console.error('Error updating component qty:', error);
    res.status(500).json({ error: 'Failed to update stock quantity', details: error.message });
  }
});

// POST /api/components/:id/purchase - record purchase order directly for a component
router.post('/:id/purchase', async (req, res) => {
  const componentId = req.params.id;
  const {
    qty,
    price,
    date = new Date().toISOString().slice(0, 10),
    url = '',
    details = '',
    addToStock = true,
    storageId = null
  } = req.body;

  const purchaseQty = parseInt(qty, 10);
  if (isNaN(purchaseQty) || purchaseQty <= 0) {
    return res.status(400).json({ error: 'Quantity must be greater than 0' });
  }

  const unitPrice = parseFloat(price) || 0;

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // 1. Fetch component
    const [compRows] = await conn.query(
      'SELECT ID, component, qty AS currentStock FROM i_components WHERE ID = ?',
      [componentId]
    );

    if (compRows.length === 0) {
      await conn.rollback();
      return res.status(404).json({ error: 'Component not found' });
    }

    const component = compRows[0];

    // 2. Insert into t_orders
    const [orderResult] = await conn.query(
      `INSERT INTO t_orders (componentId, price, qty, date, url, details) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        componentId,
        unitPrice,
        purchaseQty,
        date,
        url ? url.trim() : '',
        details ? details.trim() : ''
      ]
    );
    const orderId = orderResult.insertId;

    // 3. Update stock in i_components (if requested)
    let newStock = component.currentStock || 0;
    if (addToStock) {
      await conn.query(
        'UPDATE i_components SET qty = COALESCE(qty, 0) + ? WHERE ID = ?',
        [purchaseQty, componentId]
      );
      newStock += purchaseQty;

      // Handle warehouse allocation if storageId provided
      if (storageId !== null && storageId !== undefined) {
        const parsedStorageId = parseInt(storageId, 10);
        if (!isNaN(parsedStorageId)) {
          const [whRows] = await conn.query(
            'SELECT id, quantity FROM t_warehouse WHERE componentId = ? AND storageId = ?',
            [componentId, parsedStorageId]
          );
          if (whRows.length > 0) {
            await conn.query(
              'UPDATE t_warehouse SET quantity = quantity + ? WHERE id = ?',
              [purchaseQty, whRows[0].id]
            );
          } else {
            await conn.query(
              'INSERT INTO t_warehouse (componentId, storageId, quantity) VALUES (?, ?, ?)',
              [componentId, parsedStorageId, purchaseQty]
            );
          }
        }
      }
    }

    // 4. If component is in shopping list (t_busket), clear or decrement it
    const [basketRows] = await conn.query(
      'SELECT id, qty FROM t_busket WHERE componentId = ?',
      [componentId]
    );
    if (basketRows.length > 0) {
      for (const b of basketRows) {
        if (purchaseQty >= b.qty) {
          await conn.query('DELETE FROM t_busket WHERE id = ?', [b.id]);
        } else {
          await conn.query('UPDATE t_busket SET qty = qty - ? WHERE id = ?', [purchaseQty, b.id]);
        }
      }
    }

    await conn.commit();

    res.json({
      success: true,
      orderId,
      componentId,
      component: component.component,
      qty: purchaseQty,
      price: unitPrice,
      newStock
    });
  } catch (err) {
    await conn.rollback();
    console.error('Error confirming purchase for component:', err);
  } finally {
    conn.release();
  }
});

// GET /api/components/:id/usage - check projects using this component in their BOM
router.get('/:id/usage', async (req, res) => {
  const componentId = req.params.id;
  try {
    const [projects] = await pool.query(`
      SELECT 
        p.id,
        p.projectName,
        p.description,
        p.photoUrl,
        p.url,
        SUM(b.quantity) AS requiredQuantity,
        GROUP_CONCAT(NULLIF(TRIM(b.comment), '') SEPARATOR ', ') AS designators
      FROM t_bom b
      INNER JOIN i_projects p ON b.projectId = p.id
      WHERE b.componentId = ?
      GROUP BY p.id, p.projectName, p.description, p.photoUrl, p.url
      ORDER BY p.projectName ASC
    `, [componentId]);

    const formattedProjects = projects.map(p => ({
      ...p,
      requiredQuantity: Number(p.requiredQuantity) || 1
    }));

    res.json({
      componentId: parseInt(componentId, 10),
      usageCount: formattedProjects.length,
      projects: formattedProjects
    });
  } catch (error) {
    console.error('Error checking component usage:', error);
    res.status(500).json({ error: 'Failed to check component usage', details: error.message });
  }
});

// DELETE /api/components/:id - delete component with usage checks and cascade
router.delete('/:id', async (req, res) => {
  const componentId = parseInt(req.params.id, 10);
  const force = req.query.force === 'true';

  if (isNaN(componentId)) {
    return res.status(400).json({ error: 'Invalid component ID' });
  }

  try {
    // 1. Check if component exists
    const [compRows] = await pool.query('SELECT ID, component FROM i_components WHERE ID = ?', [componentId]);
    if (compRows.length === 0) {
      return res.status(404).json({ error: 'Component not found' });
    }
    const compName = compRows[0].component;

    // 2. Check if used in any project BOM
    const [projects] = await pool.query(`
      SELECT 
        p.id,
        p.projectName,
        p.description,
        p.photoUrl,
        p.url,
        SUM(b.quantity) AS requiredQuantity,
        GROUP_CONCAT(NULLIF(TRIM(b.comment), '') SEPARATOR ', ') AS designators
      FROM t_bom b
      INNER JOIN i_projects p ON b.projectId = p.id
      WHERE b.componentId = ?
      GROUP BY p.id, p.projectName, p.description, p.photoUrl, p.url
      ORDER BY p.projectName ASC
    `, [componentId]);

    if (projects.length > 0 && !force) {
      return res.status(409).json({
        warning: true,
        message: `Component "${compName}" is used in ${projects.length} project(s)`,
        projects: projects.map(p => ({
          ...p,
          requiredQuantity: Number(p.requiredQuantity) || 1
        }))
      });
    }

    // 3. Perform atomic deletion across related tables
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      await conn.query('DELETE FROM t_bom WHERE componentId = ?', [componentId]);
      await conn.query('DELETE FROM t_busket WHERE componentId = ?', [componentId]);
      await conn.query('DELETE FROM t_warehouse WHERE componentId = ?', [componentId]);
      await conn.query('DELETE FROM t_orders WHERE componentId = ?', [componentId]);
      await conn.query('DELETE FROM t_production_items WHERE componentId = ?', [componentId]);
      await conn.query('DELETE FROM i_components WHERE ID = ?', [componentId]);

      await conn.commit();

      res.json({
        success: true,
        id: componentId,
        component: compName,
        message: `Component "${compName}" successfully deleted`
      });
    } catch (dbErr) {
      await conn.rollback();
      throw dbErr;
    } finally {
      conn.release();
    }
  } catch (error) {
    console.error('Error deleting component:', error);
    res.status(500).json({ error: 'Failed to delete component', details: error.message });
  }
});

module.exports = router;
