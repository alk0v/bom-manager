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

// GET /api/reports/purchases - list component purchase orders with stats
router.get('/purchases', async (req, res) => {
  try {
    const {
      search = '',
      status = 'all',
      startDate,
      endDate,
      componentId,
      limit = 200,
      offset = 0
    } = req.query;

    let whereClauses = [];
    let params = [];

    // Status filter ('pending', 'delivered', 'all')
    if (status && status !== 'all') {
      whereClauses.push('o.status = ?');
      params.push(status);
    }

    // Component filter
    if (componentId) {
      const cId = parseInt(componentId, 10);
      if (!isNaN(cId)) {
        whereClauses.push('o.componentId = ?');
        params.push(cId);
      }
    }

    // Search filter
    if (search && search.trim()) {
      const term = `%${search.trim()}%`;
      whereClauses.push('(c.component LIKE ? OR c.marking LIKE ? OR o.details LIKE ? OR o.url LIKE ?)');
      params.push(term, term, term, term);
    }

    // Date range filter
    if (startDate) {
      whereClauses.push('o.date >= ?');
      params.push(String(startDate).split('T')[0]);
    }
    if (endDate) {
      whereClauses.push('o.date <= ?');
      params.push(String(endDate).split('T')[0]);
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    // Summary statistics query
    const statsQuery = `
      SELECT 
        COUNT(*) AS totalOrders,
        COALESCE(SUM(o.qty), 0) AS totalUnits,
        COALESCE(SUM(CASE WHEN o.status != 'cancelled' THEN o.price * o.qty ELSE 0 END), 0) AS totalSpent,
        COUNT(CASE WHEN o.status = 'pending' THEN 1 END) AS pendingOrdersCount,
        COALESCE(SUM(CASE WHEN o.status = 'pending' THEN o.qty ELSE 0 END), 0) AS pendingUnits,
        COALESCE(SUM(CASE WHEN o.status = 'pending' THEN o.price * o.qty ELSE 0 END), 0) AS pendingSpent,
        COUNT(CASE WHEN o.status = 'delivered' OR o.status IS NULL THEN 1 END) AS deliveredOrdersCount,
        COALESCE(SUM(CASE WHEN o.status = 'delivered' OR o.status IS NULL THEN o.qty ELSE 0 END), 0) AS deliveredUnits,
        COALESCE(SUM(CASE WHEN o.status = 'delivered' OR o.status IS NULL THEN o.price * o.qty ELSE 0 END), 0) AS deliveredSpent,
        COUNT(CASE WHEN o.status = 'cancelled' THEN 1 END) AS cancelledOrdersCount,
        COALESCE(SUM(CASE WHEN o.status = 'cancelled' THEN o.qty ELSE 0 END), 0) AS cancelledUnits,
        COALESCE(SUM(CASE WHEN o.status = 'cancelled' THEN o.price * o.qty ELSE 0 END), 0) AS cancelledSpent,
        COUNT(DISTINCT o.componentId) AS uniqueComponentsCount
      FROM t_orders o
      LEFT JOIN i_components c ON o.componentId = c.ID
      ${whereSql}
    `;

    const [statsRows] = await pool.query(statsQuery, params);
    const stats = statsRows[0] || {};

    const parsedLimit = parseInt(limit, 10);
    const parsedOffset = parseInt(offset, 10);
    const hasPagination = !isNaN(parsedLimit) && parsedLimit > 0;

    let ordersQuery = `
      SELECT 
        o.id,
        o.componentId,
        o.price,
        o.qty,
        ROUND(o.price * o.qty, 4) AS totalCost,
        o.date,
        o.url,
        o.details,
        COALESCE(o.status, 'delivered') AS status,
        o.deliveredDate,
        o.storageId,
        c.component,
        c.marking,
        pkg.package,
        cat.category,
        c.photoURL,
        c.qty AS stockQuantity,
        s.storage AS storageName
      FROM t_orders o
      LEFT JOIN i_components c ON o.componentId = c.ID
      LEFT JOIN i_packages pkg ON c.package_id = pkg.ID
      LEFT JOIN i_categories cat ON c.category_id = cat.ID
      LEFT JOIN i_storages s ON o.storageId = s.ID
      ${whereSql}
      ORDER BY o.date DESC, o.id DESC
    `;

    let queryParams = [...params];
    if (hasPagination) {
      ordersQuery += ` LIMIT ? OFFSET ?`;
      queryParams.push(parsedLimit, isNaN(parsedOffset) ? 0 : parsedOffset);
    }

    const [orders] = await pool.query(ordersQuery, queryParams);

    res.json({
      orders: orders.map(o => ({
        ...o,
        price: parseFloat(o.price) || 0,
        totalCost: Math.round(((parseFloat(o.price) || 0) * (parseInt(o.qty, 10) || 0)) * 100) / 100
      })),
      stats: {
        totalOrders: Number(stats.totalOrders) || 0,
        totalUnits: Number(stats.totalUnits) || 0,
        totalSpent: Math.round((Number(stats.totalSpent) || 0) * 100) / 100,
        pendingOrdersCount: Number(stats.pendingOrdersCount) || 0,
        pendingUnits: Number(stats.pendingUnits) || 0,
        pendingSpent: Math.round((Number(stats.pendingSpent) || 0) * 100) / 100,
        deliveredOrdersCount: Number(stats.deliveredOrdersCount) || 0,
        deliveredUnits: Number(stats.deliveredUnits) || 0,
        deliveredSpent: Math.round((Number(stats.deliveredSpent) || 0) * 100) / 100,
        cancelledOrdersCount: Number(stats.cancelledOrdersCount) || 0,
        cancelledUnits: Number(stats.cancelledUnits) || 0,
        cancelledSpent: Math.round((Number(stats.cancelledSpent) || 0) * 100) / 100,
        uniqueComponentsCount: Number(stats.uniqueComponentsCount) || 0
      }
    });
  } catch (error) {
    console.error('Error fetching purchases report:', error);
    res.status(500).json({ error: 'Failed to fetch purchases report', details: error.message });
  }
});

module.exports = router;
