const express = require('express');
const router = express.Router();
const pool = require('../db');

// GET /api/categories
router.get('/categories', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT ID, category FROM i_categories ORDER BY category ASC');
    res.json(rows);
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ error: 'Failed to fetch categories', details: error.message });
  }
});

// GET /api/packages
router.get('/packages', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT ID, package, pinQuantity, isSmd, drawingURL FROM i_packages ORDER BY package ASC');
    res.json(rows);
  } catch (error) {
    console.error('Error fetching packages:', error);
    res.status(500).json({ error: 'Failed to fetch packages', details: error.message });
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

    // Fallbacks or overrides from environment
    const mediaBaseUrl = process.env.MEDIA_BASE_URL || configMap.rootPath || 'http://192.168.31.122:8085';

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

module.exports = router;
