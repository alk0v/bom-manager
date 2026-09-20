const express = require('express');
const router = express.Router();
const pool = require('../db');

// GET /api/shopping-list - list all basket items joined with component data and latest price
router.get('/', async (req, res) => {
  try {
    const { projectId } = req.query;
    let whereClause = '';
    const params = [];

    if (projectId) {
      const parsedProjectId = parseInt(projectId, 10);
      if (!isNaN(parsedProjectId)) {
        whereClause = `
          WHERE EXISTS (
            SELECT 1 FROM t_bom b_proj 
            WHERE b_proj.projectId = ? 
              AND (
                b_proj.componentId = b.componentId 
                OR EXISTS (
                  SELECT 1 FROM t_bom_substitutes s_proj 
                  WHERE s_proj.bomId = b_proj.id AND s_proj.componentId = b.componentId
                )
              )
          )
        `;
        params.push(parsedProjectId);
      }
    }

    const query = `
      SELECT 
        b.id,
        b.componentId,
        b.qty,
        b.date,
        c.component,
        c.description,
        c.shortDescription,
        c.marking,
        c.datasheetURL,
        c.photoURL,
        c.qty AS stockQuantity,
        c.minQty,
        cat.category,
        pkg.package,
        pkg.pinQuantity,
        pkg.isSmd,
        pkg.drawingURL,
        lo.latestPrice,
        lo.latestOrderDate,
        lo.latestOrderUrl,
        lo.latestOrderDetails
      FROM t_busket b
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
      ${whereClause}
      ORDER BY b.date DESC, b.id DESC
    `;
    const [rows] = await pool.query(query, params);
    res.json(rows);
  } catch (error) {
    console.error('Error fetching shopping list:', error);
    res.status(500).json({ error: 'Failed to fetch shopping list', details: error.message });
  }
});

// POST /api/shopping-list - add or increment component in basket
router.post('/', async (req, res) => {
  const { componentId, qty = 1, date = new Date().toISOString().slice(0, 10) } = req.body;
  if (!componentId) {
    return res.status(400).json({ error: 'componentId is required' });
  }

  try {
    // Check if component already in basket
    const [existing] = await pool.query('SELECT * FROM t_busket WHERE componentId = ?', [componentId]);
    if (existing.length > 0) {
      const newQty = existing[0].qty + parseInt(qty, 10);
      await pool.query('UPDATE t_busket SET qty = ? WHERE id = ?', [newQty, existing[0].id]);
      return res.json({ id: existing[0].id, componentId, qty: newQty, updated: true });
    }

    const [result] = await pool.query(
      'INSERT INTO t_busket (componentId, qty, date) VALUES (?, ?, ?)',
      [componentId, qty, date]
    );
    res.status(201).json({ id: result.insertId, componentId, qty, date });
  } catch (error) {
    console.error('Error adding to shopping list:', error);
    res.status(500).json({ error: 'Failed to add to shopping list', details: error.message });
  }
});

// POST /api/shopping-list/:id/purchase - Confirm purchase, insert into t_orders, update inventory stock, and clear/decrement basket
router.post('/:id/purchase', async (req, res) => {
  const basketId = req.params.id;
  const {
    price = 0,
    qty,
    date = new Date().toISOString().slice(0, 10),
    url = '',
    details = '',
    addToStock = true,
    storageId = null
  } = req.body;

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // 1. Fetch the basket item
    const [basketRows] = await conn.query(
      `SELECT b.*, c.component, c.qty AS currentStock 
       FROM t_busket b 
       JOIN i_components c ON b.componentId = c.ID 
       WHERE b.id = ?`,
      [basketId]
    );

    if (basketRows.length === 0) {
      await conn.rollback();
      return res.status(404).json({ error: 'Shopping list item not found' });
    }

    const basketItem = basketRows[0];
    const componentId = basketItem.componentId;
    const purchaseQty = qty !== undefined && parseInt(qty, 10) > 0 
      ? parseInt(qty, 10) 
      : basketItem.qty;
    const unitPrice = parseFloat(price) || 0;

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
    let newStock = basketItem.currentStock;
    if (addToStock) {
      await conn.query(
        'UPDATE i_components SET qty = COALESCE(qty, 0) + ? WHERE ID = ?',
        [purchaseQty, componentId]
      );
      newStock = (basketItem.currentStock || 0) + purchaseQty;

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

    // 4. Clear or decrement from t_busket
    let remainingInBasket = 0;
    if (purchaseQty >= basketItem.qty) {
      await conn.query('DELETE FROM t_busket WHERE id = ?', [basketId]);
      remainingInBasket = 0;
    } else {
      remainingInBasket = basketItem.qty - purchaseQty;
      await conn.query('UPDATE t_busket SET qty = ? WHERE id = ?', [remainingInBasket, basketId]);
    }

    await conn.commit();

    res.status(201).json({
      success: true,
      orderId,
      componentId,
      component: basketItem.component,
      price: unitPrice,
      qty: purchaseQty,
      totalCost: Math.round(unitPrice * purchaseQty * 100) / 100,
      date,
      url,
      details,
      addToStock,
      newStock,
      remainingInBasket
    });
  } catch (error) {
    await conn.rollback();
    console.error('Error confirming purchase for shopping list item:', error);
    res.status(500).json({ error: 'Failed to confirm purchase and create order', details: error.message });
  } finally {
    conn.release();
  }
});

// PUT /api/shopping-list/:id - update quantity
router.put('/:id', async (req, res) => {
  const { qty } = req.body;
  try {
    await pool.query('UPDATE t_busket SET qty = ? WHERE id = ?', [qty, req.params.id]);
    res.json({ success: true, id: req.params.id, qty });
  } catch (error) {
    console.error('Error updating shopping list item:', error);
    res.status(500).json({ error: 'Failed to update shopping list item', details: error.message });
  }
});

// DELETE /api/shopping-list/:id - remove item from basket
router.delete('/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM t_busket WHERE id = ?', [req.params.id]);
    res.json({ success: true, id: req.params.id });
  } catch (error) {
    console.error('Error removing shopping list item:', error);
    res.status(500).json({ error: 'Failed to remove shopping list item', details: error.message });
  }
});

module.exports = router;
