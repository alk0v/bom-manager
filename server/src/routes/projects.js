const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const pool = require('../db');
const projectFilesRouter = require('./projectFiles');
const { parseIbomHtml, matchComponentsWithDb } = require('../utils/ibomParser');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 }
});

const mediaDir = process.env.MEDIA_DIR
  ? path.resolve(process.env.MEDIA_DIR)
  : path.resolve(__dirname, '../../../media');

// Mount project files sub-router: /api/projects/:id/files
router.use('/:id/files', projectFilesRouter);

// GET /api/projects - list all projects with BOM summary stats & attached file counts
router.get('/', async (req, res) => {
  try {
    const query = `
      SELECT 
        p.id,
        p.projectName,
        p.description,
        p.url,
        p.photoUrl,
        COUNT(DISTINCT b.id) AS bomItemCount,
        COALESCE(SUM(b.quantity), 0) AS totalQuantityNeeded,
        COUNT(DISTINCT CASE WHEN b.id IS NOT NULL AND COALESCE(c.qty, 0) < b.quantity THEN b.id END) AS absentPartsCount,
        COALESCE(SUM(CASE WHEN b.id IS NOT NULL THEN GREATEST(0, b.quantity - COALESCE(c.qty, 0)) ELSE 0 END), 0) AS totalShortageQty,
        (SELECT COUNT(*) FROM t_project_files pf WHERE pf.projectId = p.id) AS filesCount,
        (SELECT COUNT(*) FROM t_project_files pf WHERE pf.projectId = p.id AND pf.fileType = 'ibom') AS ibomFilesCount,
        COALESCE(ROUND(SUM(b.quantity * lo.latestPrice), 2), 0) AS estimatedCost,
        COUNT(DISTINCT CASE WHEN lo.latestPrice IS NOT NULL THEN b.id END) AS pricedItemsCount
      FROM i_projects p
      LEFT JOIN t_bom b ON p.id = b.projectId
      LEFT JOIN i_components c ON b.componentId = c.ID
      LEFT JOIN (
        SELECT componentId, price AS latestPrice
        FROM (
          SELECT componentId, price,
                 ROW_NUMBER() OVER (PARTITION BY componentId ORDER BY date DESC, id DESC) as rn
          FROM t_orders
          WHERE componentId IS NOT NULL
        ) r WHERE rn = 1
      ) lo ON lo.componentId = b.componentId
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

// GET /api/projects/:id - single project with financial stats
router.get('/:id', async (req, res) => {
  try {
    const query = `
      SELECT 
        p.id,
        p.projectName,
        p.description,
        p.url,
        p.photoUrl,
        COUNT(DISTINCT b.id) AS bomItemCount,
        COALESCE(SUM(b.quantity), 0) AS totalQuantityNeeded,
        COUNT(DISTINCT CASE WHEN b.id IS NOT NULL AND COALESCE(c.qty, 0) < b.quantity THEN b.id END) AS absentPartsCount,
        COALESCE(ROUND(SUM(b.quantity * lo.latestPrice), 2), 0) AS estimatedCost,
        COUNT(DISTINCT CASE WHEN lo.latestPrice IS NOT NULL THEN b.id END) AS pricedItemsCount
      FROM i_projects p
      LEFT JOIN t_bom b ON p.id = b.projectId
      LEFT JOIN i_components c ON b.componentId = c.ID
      LEFT JOIN (
        SELECT componentId, price AS latestPrice
        FROM (
          SELECT componentId, price,
                 ROW_NUMBER() OVER (PARTITION BY componentId ORDER BY date DESC, id DESC) as rn
          FROM t_orders
          WHERE componentId IS NOT NULL
        ) r WHERE rn = 1
      ) lo ON lo.componentId = b.componentId
      WHERE p.id = ?
      GROUP BY p.id, p.projectName, p.description, p.url, p.photoUrl
    `;
    const [rows] = await pool.query(query, [req.params.id]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }
    res.json(rows[0]);
  } catch (error) {
    console.error('Error fetching project:', error);
    res.status(500).json({ error: 'Failed to fetch project', details: error.message });
  }
});

// GET /api/projects/:id/bom - constituent BOM items with component details, stock adequacy, and price insights
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
        GREATEST(0, b.quantity - COALESCE(c.qty, 0)) AS shortageQuantity,
        lo.latestPrice AS unitPrice,
        ROUND(b.quantity * lo.latestPrice, 4) AS totalItemCost,
        lo.latestOrderDate,
        lo.latestOrderUrl,
        lo.latestOrderDetails
      FROM t_bom b
      LEFT JOIN i_components c ON b.componentId = c.ID
      LEFT JOIN i_categories cat ON c.category_id = cat.ID
      LEFT JOIN i_packages pkg ON c.package_id = pkg.ID
      LEFT JOIN (
        SELECT componentId, price AS latestPrice, date AS latestOrderDate, url AS latestOrderUrl, details AS latestOrderDetails
        FROM (
          SELECT componentId, price, date, url, details,
                 ROW_NUMBER() OVER (PARTITION BY componentId ORDER BY date DESC, id DESC) as rn
          FROM t_orders
          WHERE componentId IS NOT NULL
        ) r WHERE rn = 1
      ) lo ON lo.componentId = b.componentId
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

// DELETE /api/projects/:id - delete project and its cascade dependencies
router.delete('/:id', async (req, res) => {
  const projectId = parseInt(req.params.id, 10);
  if (isNaN(projectId)) {
    return res.status(400).json({ error: 'Invalid project ID' });
  }

  try {
    // 1. Check if project exists
    const [projs] = await pool.query('SELECT id, projectName FROM i_projects WHERE id = ?', [projectId]);
    if (projs.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }
    const project = projs[0];

    // 2. Perform cascade deletion inside transaction
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      // Delete production items for any production runs of this project
      await conn.query(`
        DELETE pi FROM t_production_items pi
        INNER JOIN t_production_runs pr ON pi.runId = pr.id
        WHERE pr.projectId = ?
      `, [projectId]);

      // Delete production runs
      await conn.query('DELETE FROM t_production_runs WHERE projectId = ?', [projectId]);

      // Delete BOM records
      await conn.query('DELETE FROM t_bom WHERE projectId = ?', [projectId]);

      // Delete project files metadata from database
      await conn.query('DELETE FROM t_project_files WHERE projectId = ?', [projectId]);

      // Delete project record
      await conn.query('DELETE FROM i_projects WHERE id = ?', [projectId]);

      await conn.commit();
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }

    // 3. Clean up physical attachment files on disk if directory exists
    try {
      const attachDir = path.join(mediaDir, 'projects', 'attachments', String(projectId));
      if (fs.existsSync(attachDir)) {
        await fs.promises.rm(attachDir, { recursive: true, force: true });
      }
    } catch (fsErr) {
      console.warn(`[Warning] Could not clean attachment directory for project ${projectId}:`, fsErr.message);
    }

    res.json({
      success: true,
      id: projectId,
      projectName: project.projectName,
      message: `Project "${project.projectName}" deleted successfully`
    });
  } catch (error) {
    console.error('Error deleting project:', error);
    res.status(500).json({ error: 'Failed to delete project', details: error.message });
  }
});

// POST /api/projects/:id/bom/parse-ibom - Parse iBOM file and provide DB match candidates
router.post('/:id/bom/parse-ibom', (req, res) => {
  upload.single('file')(req, res, async (err) => {
    if (err) {
      console.error('iBOM file upload error:', err);
      return res.status(400).json({ error: err.message || 'File upload failed' });
    }

    const projectId = req.params.id;
    let htmlContent = '';

    try {
      if (req.file) {
        htmlContent = req.file.buffer.toString('utf8');
      } else if (req.body && req.body.fileId) {
        // Read from project attachments
        const [files] = await pool.query(
          'SELECT fileName FROM t_project_files WHERE id = ? AND projectId = ?',
          [req.body.fileId, projectId]
        );
        if (files.length === 0) {
          return res.status(404).json({ error: 'Attached file not found' });
        }
        const filePath = path.join(mediaDir, 'projects', 'attachments', String(projectId), files[0].fileName);
        if (!fs.existsSync(filePath)) {
          return res.status(404).json({ error: 'Attached file not found on disk' });
        }
        htmlContent = fs.readFileSync(filePath, 'utf8');
      } else {
        return res.status(400).json({ error: 'Please upload an iBOM file or provide a valid fileId' });
      }

      // Parse iBOM HTML
      const parsed = parseIbomHtml(htmlContent);

      // Perform intelligent database component matching
      const matchedItems = await matchComponentsWithDb(parsed.items, pool);

      res.json({
        success: true,
        metadata: parsed.metadata,
        itemsCount: parsed.itemsCount,
        totalQuantity: parsed.totalQuantity,
        items: matchedItems
      });
    } catch (parseError) {
      console.error('Error parsing iBOM file:', parseError);
      res.status(400).json({
        error: 'Failed to parse KiCAD iBOM file',
        details: parseError.message
      });
    }
  });
});

// POST /api/projects/:id/bom/import-ibom - Import mapped iBOM items into project BOM
router.post('/:id/bom/import-ibom', async (req, res) => {
  const projectId = req.params.id;
  const { mode = 'append', items = [] } = req.body;

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'No items provided for import' });
  }

  // Verify project exists
  const [projs] = await pool.query('SELECT id FROM i_projects WHERE id = ?', [projectId]);
  if (projs.length === 0) {
    return res.status(404).json({ error: 'Project not found' });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // If replace mode, clear existing BOM entries for this project
    if (mode === 'replace') {
      await conn.query('DELETE FROM t_bom WHERE projectId = ?', [projectId]);
    }

    let importedCount = 0;
    let createdComponentsCount = 0;

    for (const item of items) {
      let finalComponentId = item.componentId;

      // Option to create a new component on-the-fly
      if (item.createAsNew && item.newComponent) {
        const nc = item.newComponent;
        const compName = (nc.component || item.value || 'Unknown Part').trim();
        const catId = nc.category_id || null;
        const pkgId = nc.package_id || 28; // Default 28 = unknown
        const desc = (nc.description || '').trim();
        const shortDesc = (nc.shortDescription || '').trim();
        const marking = (nc.marking || '').trim();
        const initialQty = parseInt(nc.qty || 0, 10);

        const [compResult] = await conn.query(
          `INSERT INTO i_components 
           (component, category_id, package_id, description, shortDescription, marking, qty) 
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [compName, catId, pkgId, desc, shortDesc, marking, initialQty]
        );
        finalComponentId = compResult.insertId;
        createdComponentsCount++;
      }

      if (finalComponentId) {
        const qty = parseInt(item.quantity || 1, 10);
        const comment = (item.comment !== undefined ? item.comment : (item.designators || '')).trim();

        await conn.query(
          `INSERT INTO t_bom (projectId, componentId, quantity, comment) 
           VALUES (?, ?, ?, ?)`,
          [projectId, finalComponentId, qty, comment]
        );
        importedCount++;
      }
    }

    await conn.commit();

    res.json({
      success: true,
      projectId: Number(projectId),
      mode,
      importedCount,
      createdComponentsCount
    });
  } catch (error) {
    await conn.rollback();
    console.error('Error importing iBOM components:', error);
    res.status(500).json({ error: 'Failed to import iBOM components', details: error.message });
  } finally {
    conn.release();
  }
});

// POST /api/projects/:id/produce - Produce N units of project and decrease component inventory
router.post('/:id/produce', async (req, res) => {
  const projectId = req.params.id;
  const { count = 1, allowNegativeStock = false } = req.body;

  const produceCount = parseInt(count, 10);
  if (isNaN(produceCount) || produceCount < 1) {
    return res.status(400).json({ error: 'Production count must be a positive integer greater than or equal to 1' });
  }

  // Check project exists
  const [projs] = await pool.query('SELECT id, projectName FROM i_projects WHERE id = ?', [projectId]);
  if (projs.length === 0) {
    return res.status(404).json({ error: 'Project not found' });
  }
  const project = projs[0];

  // Fetch BOM items with current stock
  const bomQuery = `
    SELECT 
      b.id AS bomId,
      b.projectId,
      b.componentId,
      b.quantity AS requiredQuantity,
      b.comment,
      c.component,
      c.marking,
      c.shortDescription,
      COALESCE(c.qty, 0) AS currentStock,
      cat.category,
      pkg.package
    FROM t_bom b
    LEFT JOIN i_components c ON b.componentId = c.ID
    LEFT JOIN i_categories cat ON c.category_id = cat.ID
    LEFT JOIN i_packages pkg ON c.package_id = pkg.ID
    WHERE b.projectId = ?
    ORDER BY cat.category ASC, c.component ASC
  `;
  const [bomItems] = await pool.query(bomQuery, [projectId]);

  if (bomItems.length === 0) {
    return res.status(400).json({ error: 'Cannot produce project with an empty Bill of Materials (BOM)' });
  }

  // Calculate deductions and shortages
  const deductions = bomItems.map(item => {
    const totalRequired = item.requiredQuantity * produceCount;
    const currentStock = item.currentStock;
    const remainingStock = currentStock - totalRequired;
    const shortage = Math.max(0, totalRequired - currentStock);

    return {
      bomId: item.bomId,
      componentId: item.componentId,
      component: item.component,
      marking: item.marking,
      category: item.category,
      package: item.package,
      requiredPerUnit: item.requiredQuantity,
      totalRequired,
      currentStock,
      remainingStock,
      shortage,
      isSufficient: shortage === 0
    };
  });

  const shortages = deductions.filter(d => !d.isSufficient);

  if (shortages.length > 0 && !allowNegativeStock) {
    return res.status(400).json({
      error: `Insufficient stock for ${shortages.length} component(s)`,
      shortages,
      deductions
    });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // 1. Insert production run record
    const [runResult] = await conn.query(
      'INSERT INTO t_production_runs (projectId, count, status, producedAt, notes) VALUES (?, ?, ?, NOW(), ?)',
      [projectId, produceCount, 'completed', req.body.notes || '']
    );
    const runId = runResult.insertId;

    // 2. Insert deduction items and update component quantities
    for (const d of deductions) {
      const cId = parseInt(d.componentId, 10);
      const reqQty = parseInt(d.totalRequired, 10);
      const perUnitQty = parseInt(d.requiredPerUnit, 10) || 1;

      if (!isNaN(cId) && !isNaN(reqQty) && reqQty > 0) {
        // Record item in run snapshot
        await conn.query(
          'INSERT INTO t_production_items (runId, componentId, quantityPerUnit, totalDeducted, returnedStock) VALUES (?, ?, ?, ?, 0)',
          [runId, cId, perUnitQty, reqQty]
        );

        // Deduct stock from component inventory
        const [updateRes] = await conn.query(
          'UPDATE i_components SET qty = COALESCE(qty, 0) - ? WHERE ID = ?',
          [reqQty, cId]
        );
        console.log(`Deducted ${reqQty} from component ID ${cId}, affectedRows: ${updateRes.affectedRows}`);
      }
    }

    await conn.commit();

    res.json({
      success: true,
      runId,
      projectId: Number(projectId),
      projectName: project.projectName,
      producedCount: produceCount,
      totalItemsDeducted: deductions.length,
      totalComponentsDeducted: deductions.reduce((acc, d) => acc + d.totalRequired, 0),
      deductions
    });
  } catch (error) {
    await conn.rollback();
    console.error('Error during project production deduction:', error);
    res.status(500).json({ error: 'Failed to process project production', details: error.message });
  } finally {
    conn.release();
  }
});

module.exports = router;

