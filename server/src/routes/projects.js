const express = require('express');
const router = express.Router();
const pool = require('../db');

// GET /api/projects - list all projects with BOM summary stats
router.get('/', async (req, res) => {
  try {
    const query = `
      SELECT 
        p.id,
        p.projectName,
        p.description,
        p.url,
        p.photoUrl,
        COUNT(b.id) AS bomItemCount,
        COALESCE(SUM(b.quantity), 0) AS totalQuantityNeeded,
        COUNT(CASE WHEN b.id IS NOT NULL AND COALESCE(c.qty, 0) < b.quantity THEN 1 END) AS absentPartsCount,
        COALESCE(SUM(CASE WHEN b.id IS NOT NULL THEN GREATEST(0, b.quantity - COALESCE(c.qty, 0)) ELSE 0 END), 0) AS totalShortageQty
      FROM i_projects p
      LEFT JOIN t_bom b ON p.id = b.projectId
      LEFT JOIN i_components c ON b.componentId = c.ID
      GROUP BY p.id, p.projectName, p.description, p.url, p.photoUrl
      ORDER BY p.projectName ASC
    `;
    const [rows] = await pool.query(query);
    res.json(rows);
  } catch (error) {
    console.error('Error fetching projects:', error);
    res.status(500).json({ error: 'Failed to fetch projects', details: error.message });
  }
});

// GET /api/projects/:id - single project
router.get('/:id', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM i_projects WHERE id = ?', [req.params.id]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }
    res.json(rows[0]);
  } catch (error) {
    console.error('Error fetching project:', error);
    res.status(500).json({ error: 'Failed to fetch project', details: error.message });
  }
});

// GET /api/projects/:id/bom - constituent BOM items with component details and stock adequacy
router.get('/:id/bom', async (req, res) => {
  try {
    const query = `
      SELECT 
        b.id AS bomId,
        b.projectId,
        b.componentId,
        b.quantity AS requiredQuantity,
        b.comment,
        c.component,
        c.description AS componentDescription,
        c.shortDescription,
        c.marking,
        c.datasheetURL,
        c.photoURL AS componentPhotoURL,
        c.qty AS stockQuantity,
        cat.category,
        pkg.package,
        pkg.pinQuantity,
        pkg.isSmd,
        pkg.drawingURL,
        CASE 
          WHEN c.qty >= b.quantity THEN 1 
          ELSE 0 
        END AS isStockSufficient,
        GREATEST(0, b.quantity - COALESCE(c.qty, 0)) AS shortageQuantity
      FROM t_bom b
      LEFT JOIN i_components c ON b.componentId = c.ID
      LEFT JOIN i_categories cat ON c.category_id = cat.ID
      LEFT JOIN i_packages pkg ON c.package_id = pkg.ID
      WHERE b.projectId = ?
      ORDER BY cat.category ASC, c.component ASC
    `;
    const [rows] = await pool.query(query, [req.params.id]);
    res.json(rows);
  } catch (error) {
    console.error('Error fetching project BOM:', error);
    res.status(500).json({ error: 'Failed to fetch project BOM', details: error.message });
  }
});

// POST /api/projects/:id/bom - add component to project BOM
router.post('/:id/bom', async (req, res) => {
  const projectId = req.params.id;
  const { componentId, quantity = 1, comment = '' } = req.body;

  if (!componentId) {
    return res.status(400).json({ error: 'componentId is required' });
  }

  try {
    const [result] = await pool.query(
      'INSERT INTO t_bom (projectId, componentId, quantity, comment) VALUES (?, ?, ?, ?)',
      [projectId, componentId, quantity, comment]
    );
    res.status(201).json({ id: result.insertId, projectId, componentId, quantity, comment });
  } catch (error) {
    console.error('Error adding component to BOM:', error);
    res.status(500).json({ error: 'Failed to add component to BOM', details: error.message });
  }
});

// PUT /api/projects/:id/bom/:bomId - update BOM entry
router.put('/:id/bom/:bomId', async (req, res) => {
  const { bomId } = req.params;
  const { quantity, comment } = req.body;

  try {
    await pool.query(
      'UPDATE t_bom SET quantity = COALESCE(?, quantity), comment = COALESCE(?, comment) WHERE id = ?',
      [quantity, comment, bomId]
    );
    res.json({ success: true, bomId });
  } catch (error) {
    console.error('Error updating BOM item:', error);
    res.status(500).json({ error: 'Failed to update BOM item', details: error.message });
  }
});

// DELETE /api/projects/:id/bom/:bomId - delete BOM entry
router.delete('/:id/bom/:bomId', async (req, res) => {
  const { bomId } = req.params;
  try {
    await pool.query('DELETE FROM t_bom WHERE id = ?', [bomId]);
    res.json({ success: true, bomId });
  } catch (error) {
    console.error('Error deleting BOM item:', error);
    res.status(500).json({ error: 'Failed to delete BOM item', details: error.message });
  }
});

// POST /api/projects - create new project
router.post('/', async (req, res) => {
  const { projectName, description = '', url = '', photoUrl = '' } = req.body;
  if (!projectName || !projectName.trim()) {
    return res.status(400).json({ error: 'projectName is required' });
  }

  try {
    const [result] = await pool.query(
      'INSERT INTO i_projects (projectName, description, url, photoUrl) VALUES (?, ?, ?, ?)',
      [projectName.trim(), description.trim(), url.trim(), photoUrl.trim()]
    );
    res.status(201).json({
      id: result.insertId,
      projectName: projectName.trim(),
      description: description.trim(),
      url: url.trim(),
      photoUrl: photoUrl.trim(),
      bomItemCount: 0,
      totalQuantityNeeded: 0,
      absentPartsCount: 0,
      totalShortageQty: 0
    });
  } catch (error) {
    console.error('Error creating project:', error);
    res.status(500).json({ error: 'Failed to create project', details: error.message });
  }
});

// PUT /api/projects/:id - update project
router.put('/:id', async (req, res) => {
  const { projectName, description, url, photoUrl } = req.body;
  if (!projectName || !projectName.trim()) {
    return res.status(400).json({ error: 'projectName is required' });
  }

  try {
    await pool.query(
      `UPDATE i_projects 
       SET projectName = ?, 
           description = ?, 
           url = ?, 
           photoUrl = ? 
       WHERE id = ?`,
      [
        projectName.trim(),
        description !== undefined ? description.trim() : '',
        url !== undefined ? url.trim() : '',
        photoUrl !== undefined ? photoUrl.trim() : '',
        req.params.id
      ]
    );
    res.json({
      success: true,
      id: Number(req.params.id),
      projectName: projectName.trim(),
      description: description !== undefined ? description.trim() : '',
      url: url !== undefined ? url.trim() : '',
      photoUrl: photoUrl !== undefined ? photoUrl.trim() : ''
    });
  } catch (error) {
    console.error('Error updating project:', error);
    res.status(500).json({ error: 'Failed to update project', details: error.message });
  }
});

module.exports = router;
