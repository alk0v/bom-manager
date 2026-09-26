const express = require('express');
const router = express.Router();
const pool = require('../db');

// ==========================================
// CATEGORIES CRUD
// ==========================================

// GET /api/categories - list all categories with components count, package mappings, and custom fields
router.get('/categories', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT 
        c.ID, 
        c.category, 
        COUNT(comp.ID) AS componentCount
      FROM i_categories c
      LEFT JOIN i_components comp ON c.ID = comp.category_id
      GROUP BY c.ID, c.category
      ORDER BY c.category ASC
    `);

    // Fetch package associations
    let pkgRows = [];
    try {
      const [pRows] = await pool.query('SELECT categoryId, packageId FROM t_category_packages');
      pkgRows = pRows;
    } catch (e) {
      // Table might not exist yet
    }

    const pkgMap = new Map();
    pkgRows.forEach(r => {
      if (!pkgMap.has(r.categoryId)) pkgMap.set(r.categoryId, []);
      pkgMap.get(r.categoryId).push(r.packageId);
    });

    // Fetch custom fields
    let fieldRows = [];
    try {
      const [fRows] = await pool.query('SELECT id, categoryId, fieldName, fieldLabel, fieldType, unit, options, sortOrder FROM t_category_fields ORDER BY sortOrder ASC, id ASC');
      fieldRows = fRows;
    } catch (e) {
      // Table might not exist yet
    }

    const fieldMap = new Map();
    fieldRows.forEach(r => {
      if (!fieldMap.has(r.categoryId)) fieldMap.set(r.categoryId, []);
      fieldMap.get(r.categoryId).push({
        id: r.id,
        categoryId: r.categoryId,
        fieldName: r.fieldName,
        fieldLabel: r.fieldLabel,
        fieldType: r.fieldType,
        unit: r.unit,
        options: r.options ? (typeof r.options === 'string' ? r.options.split(',').map(s => s.trim()).filter(Boolean) : r.options) : [],
        rawOptions: r.options || '',
        sortOrder: r.sortOrder
      });
    });

    res.json(rows.map(r => ({
      ...r,
      componentCount: Number(r.componentCount) || 0,
      packageIds: pkgMap.get(r.ID) || [],
      packageCount: (pkgMap.get(r.ID) || []).length,
      customFields: fieldMap.get(r.ID) || [],
      fieldsCount: (fieldMap.get(r.ID) || []).length
    })));
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ error: 'Failed to fetch categories', details: error.message });
  }
});

// GET /api/categories-packages-map - get fast lookup map of { [categoryId]: [packageIds] }
router.get('/categories-packages-map', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT categoryId, packageId FROM t_category_packages');
    const map = {};
    rows.forEach(r => {
      if (!map[r.categoryId]) map[r.categoryId] = [];
      map[r.categoryId].push(r.packageId);
    });
    res.json(map);
  } catch (error) {
    console.error('Error fetching categories packages map:', error);
    res.status(500).json({ error: 'Failed to fetch packages map', details: error.message });
  }
});

// GET /api/categories-fields-map - get all custom fields grouped by categoryId
router.get('/categories-fields-map', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT id, categoryId, fieldName, fieldLabel, fieldType, unit, options, sortOrder FROM t_category_fields ORDER BY sortOrder ASC, id ASC');
    const map = {};
    rows.forEach(r => {
      if (!map[r.categoryId]) map[r.categoryId] = [];
      map[r.categoryId].push({
        id: r.id,
        categoryId: r.categoryId,
        fieldName: r.fieldName,
        fieldLabel: r.fieldLabel,
        fieldType: r.fieldType,
        unit: r.unit,
        options: r.options ? (typeof r.options === 'string' ? r.options.split(',').map(s => s.trim()).filter(Boolean) : r.options) : [],
        rawOptions: r.options || '',
        sortOrder: r.sortOrder
      });
    });
    res.json(map);
  } catch (error) {
    console.error('Error fetching categories fields map:', error);
    res.status(500).json({ error: 'Failed to fetch fields map', details: error.message });
  }
});

// POST /api/categories - create new category
router.post('/categories', async (req, res) => {
  const { category, packageIds, customFields } = req.body;
  if (!category || !category.trim()) {
    return res.status(400).json({ error: 'Category name is required' });
  }
  try {
    const trimmed = category.trim();
    // Check if duplicate
    const [existing] = await pool.query('SELECT ID FROM i_categories WHERE LOWER(category) = LOWER(?)', [trimmed]);
    if (existing.length > 0) {
      return res.status(400).json({ error: 'A category with this name already exists', id: existing[0].ID });
    }
    const [result] = await pool.query('INSERT INTO i_categories (category) VALUES (?)', [trimmed]);
    const catId = result.insertId;

    // Save package mappings if provided
    if (Array.isArray(packageIds) && packageIds.length > 0) {
      for (const pId of packageIds) {
        if (pId) {
          await pool.query('INSERT INTO t_category_packages (categoryId, packageId) VALUES (?, ?)', [catId, pId]);
        }
      }
    }

    // Save custom fields if provided
    if (Array.isArray(customFields) && customFields.length > 0) {
      for (let i = 0; i < customFields.length; i++) {
        const f = customFields[i];
        if (f.fieldName && f.fieldLabel) {
          const rawOpts = Array.isArray(f.options) ? f.options.join(',') : (f.options || f.rawOptions || null);
          await pool.query(
            'INSERT INTO t_category_fields (categoryId, fieldName, fieldLabel, fieldType, unit, options, sortOrder) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [catId, f.fieldName.trim(), f.fieldLabel.trim(), f.fieldType || 'number', f.unit || null, rawOpts, f.sortOrder || i]
          );
        }
      }
    }

    res.status(201).json({
      ID: catId,
      category: trimmed,
      componentCount: 0,
      packageIds: packageIds || [],
      packageCount: (packageIds || []).length
    });
  } catch (error) {
    console.error('Error creating category:', error);
    res.status(500).json({ error: 'Failed to create category', details: error.message });
  }
});

// PUT /api/categories/:id - update category
router.put('/categories/:id', async (req, res) => {
  const { category, packageIds } = req.body;
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    return res.status(400).json({ error: 'Invalid category ID' });
  }
  if (!category || !category.trim()) {
    return res.status(400).json({ error: 'Category name is required' });
  }
  try {
    const trimmed = category.trim();
    const [existing] = await pool.query('SELECT ID FROM i_categories WHERE LOWER(category) = LOWER(?) AND ID != ?', [trimmed, id]);
    if (existing.length > 0) {
      return res.status(400).json({ error: 'Another category with this name already exists' });
    }
    await pool.query('UPDATE i_categories SET category = ? WHERE ID = ?', [trimmed, id]);

    // Update package mappings if packageIds is explicitly provided in body
    if (Array.isArray(packageIds)) {
      await pool.query('DELETE FROM t_category_packages WHERE categoryId = ?', [id]);
      for (const pId of packageIds) {
        if (pId) {
          await pool.query('INSERT INTO t_category_packages (categoryId, packageId) VALUES (?, ?)', [id, pId]);
        }
      }
    }

    res.json({ success: true, ID: id, category: trimmed, packageIds: packageIds || [] });
  } catch (error) {
    console.error('Error updating category:', error);
    res.status(500).json({ error: 'Failed to update category', details: error.message });
  }
});

// PUT /api/categories/:id/packages - update package mappings for category
router.put('/categories/:id/packages', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const { packageIds } = req.body;
  if (isNaN(id)) {
    return res.status(400).json({ error: 'Invalid category ID' });
  }
  if (!Array.isArray(packageIds)) {
    return res.status(400).json({ error: 'packageIds must be an array' });
  }
  try {
    await pool.query('DELETE FROM t_category_packages WHERE categoryId = ?', [id]);
    for (const pId of packageIds) {
      if (pId) {
        await pool.query('INSERT INTO t_category_packages (categoryId, packageId) VALUES (?, ?)', [id, pId]);
      }
    }
    res.json({ success: true, categoryId: id, packageIds });
  } catch (error) {
    console.error('Error updating category packages:', error);
    res.status(500).json({ error: 'Failed to update category packages', details: error.message });
  }
});

// GET /api/categories/:id/fields - get custom fields for category
router.get('/categories/:id/fields', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    return res.status(400).json({ error: 'Invalid category ID' });
  }
  try {
    const [rows] = await pool.query(
      'SELECT id, categoryId, fieldName, fieldLabel, fieldType, unit, options, sortOrder FROM t_category_fields WHERE categoryId = ? ORDER BY sortOrder ASC, id ASC',
      [id]
    );
    res.json(rows.map(r => ({
      id: r.id,
      categoryId: r.categoryId,
      fieldName: r.fieldName,
      fieldLabel: r.fieldLabel,
      fieldType: r.fieldType,
      unit: r.unit,
      options: r.options ? (typeof r.options === 'string' ? r.options.split(',').map(s => s.trim()).filter(Boolean) : r.options) : [],
      rawOptions: r.options || '',
      sortOrder: r.sortOrder
    })));
  } catch (error) {
    console.error('Error fetching category fields:', error);
    res.status(500).json({ error: 'Failed to fetch category fields', details: error.message });
  }
});

// POST /api/categories/:id/fields - add custom field to category
router.post('/categories/:id/fields', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const { fieldName, fieldLabel, fieldType = 'number', unit = null, options = null, sortOrder = 0 } = req.body;
  if (isNaN(id)) {
    return res.status(400).json({ error: 'Invalid category ID' });
  }
  if (!fieldName || !fieldName.trim() || !fieldLabel || !fieldLabel.trim()) {
    return res.status(400).json({ error: 'Field Name and Label are required' });
  }
  try {
    const cleanName = fieldName.trim().replace(/\s+/g, '_').toLowerCase();
    const cleanLabel = fieldLabel.trim();
    const cleanUnit = unit ? unit.trim() : null;
    const rawOptions = Array.isArray(options) ? options.join(',') : (options ? options.trim() : null);

    const [result] = await pool.query(
      'INSERT INTO t_category_fields (categoryId, fieldName, fieldLabel, fieldType, unit, options, sortOrder) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [id, cleanName, cleanLabel, fieldType, cleanUnit, rawOptions, sortOrder]
    );

    res.status(201).json({
      id: result.insertId,
      categoryId: id,
      fieldName: cleanName,
      fieldLabel: cleanLabel,
      fieldType,
      unit: cleanUnit,
      options: rawOptions ? rawOptions.split(',').map(s => s.trim()).filter(Boolean) : [],
      rawOptions: rawOptions || '',
      sortOrder
    });
  } catch (error) {
    console.error('Error adding category field:', error);
    res.status(500).json({ error: 'Failed to add category field', details: error.message });
  }
});

// PUT /api/categories/:id/fields/:fieldId - update custom field
router.put('/categories/:id/fields/:fieldId', async (req, res) => {
  const { id, fieldId } = req.params;
  const { fieldName, fieldLabel, fieldType = 'number', unit = null, options = null, sortOrder = 0 } = req.body;
  if (!fieldLabel || !fieldLabel.trim()) {
    return res.status(400).json({ error: 'Field Label is required' });
  }
  try {
    const cleanName = fieldName ? fieldName.trim().replace(/\s+/g, '_').toLowerCase() : 'field';
    const cleanLabel = fieldLabel.trim();
    const cleanUnit = unit ? unit.trim() : null;
    const rawOptions = Array.isArray(options) ? options.join(',') : (options ? options.trim() : null);

    await pool.query(
      'UPDATE t_category_fields SET fieldName = ?, fieldLabel = ?, fieldType = ?, unit = ?, options = ?, sortOrder = ? WHERE id = ? AND categoryId = ?',
      [cleanName, cleanLabel, fieldType, cleanUnit, rawOptions, sortOrder, fieldId, id]
    );

    res.json({
      id: Number(fieldId),
      categoryId: Number(id),
      fieldName: cleanName,
      fieldLabel: cleanLabel,
      fieldType,
      unit: cleanUnit,
      options: rawOptions ? rawOptions.split(',').map(s => s.trim()).filter(Boolean) : [],
      rawOptions: rawOptions || '',
      sortOrder
    });
  } catch (error) {
    console.error('Error updating category field:', error);
    res.status(500).json({ error: 'Failed to update category field', details: error.message });
  }
});

// DELETE /api/categories/:id/fields/:fieldId - delete custom field
router.delete('/categories/:id/fields/:fieldId', async (req, res) => {
  const { id, fieldId } = req.params;
  try {
    await pool.query('DELETE FROM t_component_field_values WHERE fieldId = ?', [fieldId]);
    await pool.query('DELETE FROM t_category_fields WHERE id = ? AND categoryId = ?', [fieldId, id]);
    res.json({ success: true, fieldId: Number(fieldId) });
  } catch (error) {
    console.error('Error deleting category field:', error);
    res.status(500).json({ error: 'Failed to delete category field', details: error.message });
  }
});

// DELETE /api/categories/:id - delete category (with usage check)
router.delete('/categories/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const force = req.query.force === 'true';
  if (isNaN(id)) {
    return res.status(400).json({ error: 'Invalid category ID' });
  }
  try {
    const [compRows] = await pool.query('SELECT COUNT(*) AS count FROM i_components WHERE category_id = ?', [id]);
    const count = compRows[0]?.count || 0;

    if (count > 0 && !force) {
      return res.status(409).json({
        error: `Cannot delete category: ${count} component(s) are currently assigned to it`,
        componentCount: count
      });
    }

    if (count > 0 && force) {
      await pool.query('UPDATE i_components SET category_id = NULL WHERE category_id = ?', [id]);
    }

    await pool.query('DELETE FROM t_category_packages WHERE categoryId = ?', [id]);
    const [fields] = await pool.query('SELECT id FROM t_category_fields WHERE categoryId = ?', [id]);
    for (const f of fields) {
      await pool.query('DELETE FROM t_component_field_values WHERE fieldId = ?', [f.id]);
    }
    await pool.query('DELETE FROM t_category_fields WHERE categoryId = ?', [id]);
    await pool.query('DELETE FROM i_categories WHERE ID = ?', [id]);
    res.json({ success: true, ID: id, message: 'Category deleted successfully' });
  } catch (error) {
    console.error('Error deleting category:', error);
    res.status(500).json({ error: 'Failed to delete category', details: error.message });
  }
});

// ==========================================
// PACKAGES CRUD
// ==========================================

// GET /api/packages
router.get('/packages', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT 
        p.ID, 
        p.package, 
        p.pinQuantity, 
        p.isSmd, 
        p.drawingURL,
        COUNT(comp.ID) AS componentCount
      FROM i_packages p
      LEFT JOIN i_components comp ON p.ID = comp.package_id
      GROUP BY p.ID, p.package, p.pinQuantity, p.isSmd, p.drawingURL
      ORDER BY p.package ASC
    `);
    res.json(rows.map(r => ({
      ...r,
      componentCount: Number(r.componentCount) || 0
    })));
  } catch (error) {
    console.error('Error fetching packages:', error);
    res.status(500).json({ error: 'Failed to fetch packages', details: error.message });
  }
});

// POST /api/packages - create new package
router.post('/packages', async (req, res) => {
  const { package: pkgName, pinQuantity, isSmd, drawingURL } = req.body;
  if (!pkgName || !pkgName.trim()) {
    return res.status(400).json({ error: 'Package name is required' });
  }
  try {
    const trimmed = pkgName.trim();
    const [existing] = await pool.query('SELECT ID FROM i_packages WHERE LOWER(package) = LOWER(?)', [trimmed]);
    if (existing.length > 0) {
      return res.status(400).json({ error: 'A package with this name already exists', id: existing[0].ID });
    }
    const pins = pinQuantity !== undefined && pinQuantity !== null && pinQuantity !== '' ? parseInt(pinQuantity, 10) : null;
    const smdVal = isSmd ? 1 : 0;
    const drawing = drawingURL ? drawingURL.trim() : null;

    const [result] = await pool.query(
      'INSERT INTO i_packages (package, pinQuantity, isSmd, drawingURL) VALUES (?, ?, ?, ?)',
      [trimmed, pins, smdVal, drawing]
    );

    res.status(201).json({
      ID: result.insertId,
      package: trimmed,
      pinQuantity: pins,
      isSmd: smdVal,
      drawingURL: drawing,
      componentCount: 0
    });
  } catch (error) {
    console.error('Error creating package:', error);
    res.status(500).json({ error: 'Failed to create package', details: error.message });
  }
});

// PUT /api/packages/:id - update package
router.put('/packages/:id', async (req, res) => {
  const { package: pkgName, pinQuantity, isSmd, drawingURL } = req.body;
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    return res.status(400).json({ error: 'Invalid package ID' });
  }
  if (!pkgName || !pkgName.trim()) {
    return res.status(400).json({ error: 'Package name is required' });
  }
  try {
    const trimmed = pkgName.trim();
    const [existing] = await pool.query('SELECT ID FROM i_packages WHERE LOWER(package) = LOWER(?) AND ID != ?', [trimmed, id]);
    if (existing.length > 0) {
      return res.status(400).json({ error: 'Another package with this name already exists' });
    }
    const pins = pinQuantity !== undefined && pinQuantity !== null && pinQuantity !== '' ? parseInt(pinQuantity, 10) : null;
    const smdVal = isSmd ? 1 : 0;
    const drawing = drawingURL !== undefined ? (drawingURL ? drawingURL.trim() : null) : null;

    await pool.query(
      'UPDATE i_packages SET package = ?, pinQuantity = ?, isSmd = ?, drawingURL = ? WHERE ID = ?',
      [trimmed, pins, smdVal, drawing, id]
    );

    res.json({
      success: true,
      ID: id,
      package: trimmed,
      pinQuantity: pins,
      isSmd: smdVal,
      drawingURL: drawing
    });
  } catch (error) {
    console.error('Error updating package:', error);
    res.status(500).json({ error: 'Failed to update package', details: error.message });
  }
});

// DELETE /api/packages/:id - delete package (with usage check)
router.delete('/packages/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const force = req.query.force === 'true';
  if (isNaN(id)) {
    return res.status(400).json({ error: 'Invalid package ID' });
  }
  try {
    const [compRows] = await pool.query('SELECT COUNT(*) AS count FROM i_components WHERE package_id = ?', [id]);
    const count = compRows[0]?.count || 0;

    if (count > 0 && !force) {
      return res.status(409).json({
        error: `Cannot delete package: ${count} component(s) currently use this footprint`,
        componentCount: count
      });
    }

    if (count > 0 && force) {
      await pool.query('UPDATE i_components SET package_id = NULL WHERE package_id = ?', [id]);
    }

    await pool.query('DELETE FROM i_packages WHERE ID = ?', [id]);
    res.json({ success: true, ID: id, message: 'Package deleted successfully' });
  } catch (error) {
    console.error('Error deleting package:', error);
    res.status(500).json({ error: 'Failed to delete package', details: error.message });
  }
});

// GET /api/storages
router.get('/storages', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT ID, storage FROM i_storages ORDER BY storage ASC');
    res.json(rows);
  } catch (error) {
    console.error('Error fetching storages:', error);
    res.status(500).json({ error: 'Failed to fetch storages', details: error.message });
  }
});

// GET /api/config - media server URLs and paths
router.get('/config', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT c_key, c_value FROM t_config');
    const configMap = {};
    rows.forEach(r => {
      configMap[r.c_key] = r.c_value;
    });

    // Fallbacks or overrides from environment: default to local serving '/media'
    const mediaBaseUrl = process.env.MEDIA_BASE_URL !== undefined
      ? process.env.MEDIA_BASE_URL
      : '/media';

    res.json({
      mediaBaseUrl,
      projectPhotoFolder: configMap.projectPhotoFolder || 'projects/',
      componentPhotoFolder: configMap.componentPhotoFolder || 'components/',
      packagePhotoFolder: configMap.packagePhotoFolder || 'packages/',
      datasheetFolder: configMap.datasheetFolder || 'datasheets/'
    });
  } catch (error) {
    console.error('Error fetching config:', error);
    res.status(500).json({ error: 'Failed to fetch config', details: error.message });
  }
});

// ==========================================
// TAGS CRUD & AUTOCOMPLETE
// ==========================================

// GET /api/tags - list all tags with project count
router.get('/tags', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT 
        t.id, 
        t.name,
        COUNT(pt.projectId) AS projectCount
      FROM t_tags t
      LEFT JOIN t_project_tags pt ON t.id = pt.tagId
      GROUP BY t.id, t.name
      ORDER BY t.name ASC
    `);
    res.json(rows.map(r => ({
      id: r.id,
      name: r.name,
      projectCount: Number(r.projectCount) || 0
    })));
  } catch (error) {
    console.error('Error fetching tags:', error);
    res.status(500).json({ error: 'Failed to fetch tags', details: error.message });
  }
});

// POST /api/tags - create tag if not exists
router.post('/tags', async (req, res) => {
  const { name } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Tag name is required' });
  }
  const cleanName = name.trim().toLowerCase();
  try {
    const [existing] = await pool.query('SELECT id, name FROM t_tags WHERE LOWER(name) = ?', [cleanName]);
    if (existing.length > 0) {
      return res.json(existing[0]);
    }
    const [result] = await pool.query('INSERT INTO t_tags (name) VALUES (?)', [cleanName]);
    res.status(201).json({ id: result.insertId, name: cleanName, projectCount: 0 });
  } catch (error) {
    console.error('Error creating tag:', error);
    res.status(500).json({ error: 'Failed to create tag', details: error.message });
  }
});

// DELETE /api/tags/:id - delete tag and associations
router.delete('/tags/:id', async (req, res) => {
  const tagId = parseInt(req.params.id, 10);
  if (isNaN(tagId)) {
    return res.status(400).json({ error: 'Invalid tag ID' });
  }
  try {
    await pool.query('DELETE FROM t_project_tags WHERE tagId = ?', [tagId]);
    await pool.query('DELETE FROM t_tags WHERE id = ?', [tagId]);
    res.json({ success: true, id: tagId });
  } catch (error) {
    console.error('Error deleting tag:', error);
    res.status(500).json({ error: 'Failed to delete tag', details: error.message });
  }
});

module.exports = router;
