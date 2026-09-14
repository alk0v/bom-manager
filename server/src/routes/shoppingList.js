const express = require('express');
const router = express.Router();
const pool = require('../db');

// GET /api/shopping-list - list all basket items joined with component data
router.get('/', async (req, res) => {
  try {
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
        cat.category,
        pkg.package
      FROM t_busket b
      LEFT JOIN i_components c ON b.componentId = c.ID
      LEFT JOIN i_categories cat ON c.category_id = cat.ID
      LEFT JOIN i_packages pkg ON c.package_id = pkg.ID
      ORDER BY b.date DESC, b.id DESC
    `;
    const [rows] = await pool.query(query);
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
