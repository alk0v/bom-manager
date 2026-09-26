const express = require('express');
const router = express.Router();
const pool = require('../db');
const currencyService = require('../services/currencyService');

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
        b.orderId,
        ord.status AS activeOrderStatus,
        ord.currency AS activeOrderCurrency,
        ord.date AS activeOrderDate,
        ord.price AS activeOrderPrice,
        ord.convertedPrice AS activeOrderConvertedPrice,
        ord.qty AS activeOrderQty,
        ord.url AS activeOrderUrl,
        ord.details AS activeOrderDetails,
        ord.storageId AS activeOrderStorageId,
        ord.deliveredDate AS activeOrderDeliveredDate,
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
        COALESCE(ord.convertedPrice, ord.price, lo.latestPrice) AS latestPrice,
        COALESCE(ord.date, lo.latestOrderDate) AS latestOrderDate,
        COALESCE(ord.url, lo.latestOrderUrl) AS latestOrderUrl,
        COALESCE(ord.details, lo.latestOrderDetails) AS latestOrderDetails
      FROM t_busket b
      LEFT JOIN t_orders ord ON b.orderId = ord.id
      LEFT JOIN i_components c ON b.componentId = c.ID
      LEFT JOIN i_categories cat ON c.category_id = cat.ID
      LEFT JOIN i_packages pkg ON c.package_id = pkg.ID
      LEFT JOIN (
        SELECT componentId, COALESCE(convertedPrice, price) AS latestPrice, date AS latestOrderDate, url AS latestOrderUrl, details AS latestOrderDetails
        FROM (
          SELECT componentId, price, convertedPrice, date, url, details,
                 ROW_NUMBER() OVER (PARTITION BY componentId ORDER BY date DESC, id DESC) as rn
          FROM t_orders
          WHERE componentId IS NOT NULL AND (status IS NULL OR status != 'cancelled')
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
    // Check if unpurchased component already in basket
    const [existing] = await pool.query(
      'SELECT * FROM t_busket WHERE componentId = ? AND orderId IS NULL',
      [componentId]
    );
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

// POST /api/shopping-list/:id/purchase - Confirm purchase, insert into t_orders, update delivery status/stock, and update basket
router.post('/:id/purchase', async (req, res) => {
  const basketId = req.params.id;
  const {
    price = 0,
    qty,
    date = new Date().toISOString().slice(0, 10),
    url = '',
    details = '',
    addToStock = true,
    storageId = null,
    deliveryStatus = 'pending',
    currency = null
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
    const isPending = deliveryStatus !== 'delivered';
    const parsedStorageId = (storageId !== null && storageId !== undefined && !isNaN(parseInt(storageId, 10)))
      ? parseInt(storageId, 10)
      : null;

    const formattedDate = date ? String(date).split('T')[0] : new Date().toISOString().slice(0, 10);

    // Currency calculation
    const defaultCurrency = await currencyService.getDefaultCurrency(conn);
    const orderCurrency = (currency && currencyService.SUPPORTED_CURRENCIES.includes(String(currency).toUpperCase().trim()))
      ? String(currency).toUpperCase().trim()
      : defaultCurrency;
    const allRates = await currencyService.getAllRates(conn);
    const rateInfo = currencyService.findNearestRate(allRates, orderCurrency, defaultCurrency, formattedDate);
    const convertedPrice = Math.round(unitPrice * rateInfo.rate * 10000) / 10000;

    // 2. Insert into t_orders
    const [orderResult] = await conn.query(
      `INSERT INTO t_orders (componentId, price, qty, date, url, details, status, deliveredDate, storageId, currency, convertedPrice) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        componentId,
        unitPrice,
        purchaseQty,
        formattedDate,
        url ? url.trim() : '',
        details ? details.trim() : '',
        isPending ? 'pending' : 'delivered',
        isPending ? null : formattedDate,
        parsedStorageId,
        orderCurrency,
        convertedPrice
      ]
    );
    const orderId = orderResult.insertId;

    let newStock = basketItem.currentStock || 0;
    let remainingInBasket = 0;

    if (isPending) {
      // Pending delivery: stock is NOT incremented yet (will be added when delivery is confirmed)
      if (purchaseQty >= basketItem.qty) {
        // Link this basket item to the order
        await conn.query('UPDATE t_busket SET orderId = ?, qty = ? WHERE id = ?', [orderId, purchaseQty, basketId]);
        remainingInBasket = 0;
      } else {
        // Partial purchase: decrement current unpurchased basket item, and insert new basket item linked to the order
        remainingInBasket = basketItem.qty - purchaseQty;
        await conn.query('UPDATE t_busket SET qty = ? WHERE id = ?', [remainingInBasket, basketId]);
        await conn.query(
          'INSERT INTO t_busket (componentId, qty, date, orderId) VALUES (?, ?, ?, ?)',
          [componentId, purchaseQty, date, orderId]
        );
      }
    } else {
      // Immediate delivery: update stock now
      if (addToStock) {
        await conn.query(
          'UPDATE i_components SET qty = COALESCE(qty, 0) + ? WHERE ID = ?',
          [purchaseQty, componentId]
        );
        newStock += purchaseQty;

        if (parsedStorageId !== null) {
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

      // Clear or decrement from t_busket
      if (purchaseQty >= basketItem.qty) {
        await conn.query('DELETE FROM t_busket WHERE id = ?', [basketId]);
        remainingInBasket = 0;
      } else {
        remainingInBasket = basketItem.qty - purchaseQty;
        await conn.query('UPDATE t_busket SET qty = ? WHERE id = ?', [remainingInBasket, basketId]);
      }
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
      status: isPending ? 'pending' : 'delivered',
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

// POST /api/shopping-list/:id/confirm-delivery - Confirm physical delivery of awaiting item, add to stock, and remove from basket
router.post('/:id/confirm-delivery', async (req, res) => {
  const basketId = req.params.id;
  const {
    deliveryDate = new Date().toISOString().slice(0, 10),
    qty,
    storageId = null,
    addToStock = true
  } = req.body;

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [basketRows] = await conn.query(
      `SELECT b.*, c.component, c.qty AS currentStock, ord.id AS linkedOrderId, ord.qty AS orderQty, ord.price AS orderPrice, ord.storageId AS initialStorageId
       FROM t_busket b
       JOIN i_components c ON b.componentId = c.ID
       LEFT JOIN t_orders ord ON b.orderId = ord.id
       WHERE b.id = ?`,
      [basketId]
    );

    if (basketRows.length === 0) {
      await conn.rollback();
      return res.status(404).json({ error: 'Shopping list item not found' });
    }

    const item = basketRows[0];
    const componentId = item.componentId;
    const deliveredQty = qty !== undefined && parseInt(qty, 10) > 0
      ? parseInt(qty, 10)
      : (item.orderQty || item.qty);
    const targetStorageId = (storageId !== null && storageId !== undefined && !isNaN(parseInt(storageId, 10)))
      ? parseInt(storageId, 10)
      : item.initialStorageId;

    const finalDeliveryDate = deliveryDate ? String(deliveryDate).split('T')[0] : new Date().toISOString().split('T')[0];

    // 1. Update t_orders if orderId exists
    if (item.orderId) {
      await conn.query(
        'UPDATE t_orders SET status = ?, deliveredDate = ?, storageId = ? WHERE id = ?',
        ['delivered', finalDeliveryDate, targetStorageId || null, item.orderId]
      );
    }

    // 2. Update stock in i_components (if requested)
    let newStock = item.currentStock || 0;
    if (addToStock) {
      await conn.query(
        'UPDATE i_components SET qty = COALESCE(qty, 0) + ? WHERE ID = ?',
        [deliveredQty, componentId]
      );
      newStock += deliveredQty;

      if (targetStorageId && !isNaN(targetStorageId)) {
        const [whRows] = await conn.query(
          'SELECT id, quantity FROM t_warehouse WHERE componentId = ? AND storageId = ?',
          [componentId, targetStorageId]
        );
        if (whRows.length > 0) {
          await conn.query(
            'UPDATE t_warehouse SET quantity = quantity + ? WHERE id = ?',
            [deliveredQty, whRows[0].id]
          );
        } else {
          await conn.query(
            'INSERT INTO t_warehouse (componentId, storageId, quantity) VALUES (?, ?, ?)',
            [componentId, targetStorageId, deliveredQty]
          );
        }
      }
    }

    // 3. Remove from t_busket
    await conn.query('DELETE FROM t_busket WHERE id = ?', [basketId]);

    await conn.commit();

    res.json({
      success: true,
      componentId,
      component: item.component,
      orderId: item.orderId,
      deliveredQty,
      deliveryDate,
      addToStock,
      newStock
    });
  } catch (err) {
    await conn.rollback();
    console.error('Error confirming delivery for shopping list item:', err);
    res.status(500).json({ error: 'Failed to confirm delivery', details: err.message });
  } finally {
    conn.release();
  }
});

// POST /api/shopping-list/:id/cancel-order - Cancel awaiting order linked to basket item
router.post('/:id/cancel-order', async (req, res) => {
  const basketId = req.params.id;
  const { returnToShoppingList = true, reason = '' } = req.body;

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

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
    const orderId = basketItem.orderId;
    const componentId = basketItem.componentId;
    const basketQty = basketItem.qty || 1;

    if (orderId) {
      // Order exists in t_orders: update status and details
      const [orderRows] = await conn.query(
        'SELECT * FROM t_orders WHERE id = ?',
        [orderId]
      );
      if (orderRows.length > 0) {
        const order = orderRows[0];
        let updatedDetails = order.details || '';
        if (reason && String(reason).trim()) {
          const trimmedReason = String(reason).trim();
          updatedDetails = updatedDetails 
            ? `${updatedDetails} [Cancelled: ${trimmedReason}]`
            : `[Cancelled: ${trimmedReason}]`;
        }
        await conn.query(
          'UPDATE t_orders SET status = ?, details = ? WHERE id = ?',
          ['cancelled', updatedDetails, orderId]
        );
      }
    }

    if (returnToShoppingList) {
      // Check if there is already another unpurchased item for this component
      const [unpurchasedRows] = await conn.query(
        'SELECT id, qty FROM t_busket WHERE componentId = ? AND orderId IS NULL AND id != ?',
        [componentId, basketId]
      );

      if (unpurchasedRows.length > 0) {
        await conn.query(
          'UPDATE t_busket SET qty = qty + ? WHERE id = ?',
          [basketQty, unpurchasedRows[0].id]
        );
        await conn.query('DELETE FROM t_busket WHERE id = ?', [basketId]);
      } else {
        await conn.query(
          'UPDATE t_busket SET orderId = NULL WHERE id = ?',
          [basketId]
        );
      }
    } else {
      await conn.query('DELETE FROM t_busket WHERE id = ?', [basketId]);
    }

    await conn.commit();

    res.json({
      success: true,
      basketId: parseInt(basketId, 10),
      orderId: orderId ? parseInt(orderId, 10) : null,
      componentId,
      component: basketItem.component,
      status: 'cancelled',
      returnToShoppingList
    });
  } catch (err) {
    await conn.rollback();
    console.error('Error cancelling order from shopping list item:', err);
    res.status(500).json({ error: 'Failed to cancel order', details: err.message });
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
