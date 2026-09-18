const express = require('express');
const router = express.Router();
const pool = require('../db');

// GET /api/reports/production - list production history with items & summary stats
router.get('/production', async (req, res) => {
  try {
    const {
      search = '',
      projectId,
      status = 'all',
      startDate,
      endDate,
      limit = 50,
      offset = 0
    } = req.query;

    let whereClauses = [];
    let params = [];

    // Filter by project
    if (projectId) {
      const pId = parseInt(projectId, 10);
      if (!isNaN(pId)) {
        whereClauses.push('r.projectId = ?');
        params.push(pId);
      }
    }

    // Filter by status ('completed', 'cancelled', 'all')
    if (status && status !== 'all') {
      whereClauses.push('r.status = ?');
      params.push(status);
    }

    // Filter by search query (project name, component name, notes)
    if (search && search.trim()) {
      const term = `%${search.trim()}%`;
      whereClauses.push(`(
        p.projectName LIKE ? 
        OR r.notes LIKE ? 
        OR EXISTS (
          SELECT 1 FROM t_production_items pi2 
          JOIN i_components c2 ON pi2.componentId = c2.ID 
          WHERE pi2.runId = r.id AND (c2.component LIKE ? OR c2.marking LIKE ?)
        )
      )`);
      params.push(term, term, term, term);
    }

    // Filter by date range
    if (startDate) {
      whereClauses.push('r.producedAt >= ?');
      params.push(startDate);
    }
    if (endDate) {
      whereClauses.push('r.producedAt <= ?');
      params.push(`${endDate} 23:59:59`);
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    // Overall summary stats query (not limited by pagination)
    const statsQuery = `
      SELECT 
        COUNT(*) AS totalRuns,
        COALESCE(SUM(CASE WHEN r.status = 'completed' THEN r.count ELSE 0 END), 0) AS totalUnitsActive,
        COALESCE(SUM(CASE WHEN r.status = 'cancelled' THEN r.count ELSE 0 END), 0) AS totalUnitsCancelled,
        COUNT(CASE WHEN r.status = 'completed' THEN 1 END) AS activeRunsCount,
        COUNT(CASE WHEN r.status = 'cancelled' THEN 1 END) AS cancelledRunsCount,
        COUNT(DISTINCT r.projectId) AS uniqueProjectsCount
      FROM t_production_runs r
      LEFT JOIN i_projects p ON r.projectId = p.id
      ${whereSql}
    `;
    const [statsRows] = await pool.query(statsQuery, params);
    const stats = statsRows[0] || {};

    // Total parts consumed vs returned
    const partsStatsQuery = `
      SELECT 
        COALESCE(SUM(CASE WHEN r.status = 'completed' THEN pi.totalDeducted ELSE 0 END), 0) AS totalPartsActive,
        COALESCE(SUM(CASE WHEN r.status = 'cancelled' THEN pi.totalDeducted ELSE 0 END), 0) AS totalPartsReturned
      FROM t_production_items pi
      JOIN t_production_runs r ON pi.runId = r.id
      LEFT JOIN i_projects p ON r.projectId = p.id
      ${whereSql}
    `;
    const [partsStatsRows] = await pool.query(partsStatsQuery, params);
    const partsStats = partsStatsRows[0] || {};

    // Production runs list query
    const runsQuery = `
      SELECT 
        r.id,
        r.projectId,
        r.count,
        r.status,
        r.producedAt,
        r.cancelledAt,
        r.notes,
        p.projectName,
        p.photoUrl AS projectPhotoUrl,
        p.description AS projectDescription,
        (SELECT COUNT(*) FROM t_production_items pi WHERE pi.runId = r.id) AS itemsCount,
        (SELECT COALESCE(SUM(pi.totalDeducted), 0) FROM t_production_items pi WHERE pi.runId = r.id) AS totalComponentsDeducted
      FROM t_production_runs r
      LEFT JOIN i_projects p ON r.projectId = p.id
      ${whereSql}
      ORDER BY r.producedAt DESC, r.id DESC
      LIMIT ? OFFSET ?
    `;
    const [runs] = await pool.query(runsQuery, [...params, parseInt(limit, 10), parseInt(offset, 10)]);

    // Fetch items for the retrieved runs
    if (runs.length > 0) {
      const runIds = runs.map(r => r.id);
      const placeholders = runIds.map(() => '?').join(', ');
      const itemsQuery = `
        SELECT 
          pi.id,
          pi.runId,
          pi.componentId,
          pi.quantityPerUnit,
          pi.totalDeducted,
          pi.returnedStock,
          c.component,
          c.marking,
          c.shortDescription,
          c.qty AS currentStock,
          c.photoURL AS componentPhotoURL,
          cat.category,
          pkg.package
        FROM t_production_items pi
        LEFT JOIN i_components c ON pi.componentId = c.ID
        LEFT JOIN i_categories cat ON c.category_id = cat.ID
        LEFT JOIN i_packages pkg ON c.package_id = pkg.ID
        WHERE pi.runId IN (${placeholders})
        ORDER BY cat.category ASC, c.component ASC
      `;
      const [items] = await pool.query(itemsQuery, runIds);

      // Group items by runId
      const itemsByRunId = {};
      for (const item of items) {
        if (!itemsByRunId[item.runId]) {
          itemsByRunId[item.runId] = [];
        }
        itemsByRunId[item.runId].push(item);
      }

      for (const run of runs) {
        run.items = itemsByRunId[run.id] || [];
      }
    }

    res.json({
      success: true,
      stats: {
        totalRuns: Number(stats.totalRuns || 0),
        totalUnitsActive: Number(stats.totalUnitsActive || 0),
        totalUnitsCancelled: Number(stats.totalUnitsCancelled || 0),
        activeRunsCount: Number(stats.activeRunsCount || 0),
        cancelledRunsCount: Number(stats.cancelledRunsCount || 0),
        uniqueProjectsCount: Number(stats.uniqueProjectsCount || 0),
        totalPartsActive: Number(partsStats.totalPartsActive || 0),
        totalPartsReturned: Number(partsStats.totalPartsReturned || 0)
      },
      total: Number(stats.totalRuns || 0),
      limit: parseInt(limit, 10),
      offset: parseInt(offset, 10),
      items: runs
    });
  } catch (error) {
    console.error('Error fetching production report:', error);
    res.status(500).json({ error: 'Failed to fetch production report', details: error.message });
  }
});

// GET /api/reports/production/:id - single production run details
router.get('/production/:id', async (req, res) => {
  try {
    const runId = req.params.id;
    const [runs] = await pool.query(`
      SELECT 
        r.id,
        r.projectId,
        r.count,
        r.status,
        r.producedAt,
        r.cancelledAt,
        r.notes,
        p.projectName,
        p.photoUrl AS projectPhotoUrl,
        p.description AS projectDescription
      FROM t_production_runs r
      LEFT JOIN i_projects p ON r.projectId = p.id
      WHERE r.id = ?
    `, [runId]);

    if (runs.length === 0) {
      return res.status(404).json({ error: 'Production run not found' });
    }

    const run = runs[0];

    const [items] = await pool.query(`
      SELECT 
        pi.id,
        pi.runId,
        pi.componentId,
        pi.quantityPerUnit,
        pi.totalDeducted,
        pi.returnedStock,
        c.component,
        c.marking,
        c.shortDescription,
        c.qty AS currentStock,
        c.photoURL AS componentPhotoURL,
        cat.category,
        pkg.package
      FROM t_production_items pi
      LEFT JOIN i_components c ON pi.componentId = c.ID
      LEFT JOIN i_categories cat ON c.category_id = cat.ID
      LEFT JOIN i_packages pkg ON c.package_id = pkg.ID
      WHERE pi.runId = ?
      ORDER BY cat.category ASC, c.component ASC
    `, [runId]);

    run.items = items;
    res.json(run);
  } catch (error) {
    console.error('Error fetching production run details:', error);
    res.status(500).json({ error: 'Failed to fetch production run details', details: error.message });
  }
});

// POST /api/reports/production/:id/cancel - cancel production run and return components to stock
router.post('/production/:id/cancel', async (req, res) => {
  const runId = req.params.id;

  try {
    const [runs] = await pool.query(`
      SELECT r.*, p.projectName 
      FROM t_production_runs r
      LEFT JOIN i_projects p ON r.projectId = p.id
      WHERE r.id = ?
    `, [runId]);

    if (runs.length === 0) {
      return res.status(404).json({ error: 'Production run not found' });
    }

    const run = runs[0];
    if (run.status === 'cancelled') {
      return res.status(400).json({ error: 'This production run is already cancelled and components have been returned.' });
    }

    // Fetch items that were deducted during this run
    const [items] = await pool.query(`
      SELECT 
        pi.id,
        pi.componentId,
        pi.totalDeducted,
        c.component,
        c.qty AS currentStock
      FROM t_production_items pi
      LEFT JOIN i_components c ON pi.componentId = c.ID
      WHERE pi.runId = ?
    `, [runId]);

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      // Return components back to inventory
      for (const item of items) {
        if (item.componentId && item.totalDeducted > 0) {
          await conn.query(
            'UPDATE i_components SET qty = COALESCE(qty, 0) + ? WHERE ID = ?',
            [item.totalDeducted, item.componentId]
          );
          await conn.query(
            'UPDATE t_production_items SET returnedStock = 1 WHERE id = ?',
            [item.id]
          );
        }
      }

      // Mark production run as cancelled
      await conn.query(
        'UPDATE t_production_runs SET status = ?, cancelledAt = NOW() WHERE id = ?',
        ['cancelled', runId]
      );

      await conn.commit();

      res.json({
        success: true,
        runId: Number(runId),
        projectId: run.projectId,
        projectName: run.projectName,
        cancelledUnits: run.count,
        totalItemsRestored: items.length,
        totalComponentsRestored: items.reduce((acc, i) => acc + i.totalDeducted, 0),
        restoredItems: items
      });
    } catch (txError) {
      await conn.rollback();
      throw txError;
    } finally {
      conn.release();
    }
  } catch (error) {
    console.error('Error cancelling production run:', error);
    res.status(500).json({ error: 'Failed to cancel production run and return parts', details: error.message });
  }
});

module.exports = router;
