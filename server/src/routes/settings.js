const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const pool = require('../db');
const currencyService = require('../services/currencyService');

const mediaDir = process.env.MEDIA_DIR
  ? path.resolve(process.env.MEDIA_DIR)
  : path.resolve(__dirname, '../../../media');

let serverVersion = '0.3.1';
try {
  serverVersion = require('../../../package.json').version || require('../../package.json').version || '0.3.1';
} catch (e) {
  // ignore
}

// GET /api/settings - retrieve full system configuration and status
router.get('/', async (req, res) => {
  try {
    const dbInfo = await pool.getDbInfo();

    // Fetch t_config
    const [configRows] = await pool.query('SELECT c_key, c_value FROM t_config');
    const configMap = {};
    configRows.forEach(r => {
      configMap[r.c_key] = r.c_value;
    });

    // Check media subdirectories
    const subfolders = ['projects', 'components', 'packages', 'datasheets', 'projects/attachments'];
    const mediaFolderStatus = subfolders.map(sub => {
      const fullPath = path.join(mediaDir, sub);
      const exists = fs.existsSync(fullPath);
      let fileCount = 0;
      if (exists) {
        try {
          fileCount = fs.readdirSync(fullPath).length;
        } catch (e) {
          // ignore
        }
      }
      return {
        subfolder: sub,
        exists,
        fileCount
      };
    });

    const mediaBaseUrl = process.env.MEDIA_BASE_URL !== undefined
      ? process.env.MEDIA_BASE_URL
      : (configMap.rootPath || '/media');

    res.json({
      app: {
        name: 'BOM Manager',
        version: serverVersion,
        environment: process.env.NODE_ENV || 'development',
        nodeVersion: process.version,
        platform: process.platform,
        uptimeSeconds: Math.floor(process.uptime())
      },
      database: dbInfo,
      media: {
        mediaDir,
        mediaBaseUrl,
        folderStatus: mediaFolderStatus
      },
      config: {
        rootPath: configMap.rootPath || '/media/',
        projectPhotoFolder: configMap.projectPhotoFolder || 'projects/',
        componentPhotoFolder: configMap.componentPhotoFolder || 'components/',
        packagePhotoFolder: configMap.packagePhotoFolder || 'packages/',
        datasheetFolder: configMap.datasheetFolder || 'datasheets/'
      }
    });
  } catch (error) {
    console.error('Error fetching settings:', error);
    res.status(500).json({ error: 'Failed to fetch settings', details: error.message });
  }
});

// PUT /api/settings/config - update system config values in t_config
router.put('/config', async (req, res) => {
  const { config } = req.body;
  if (!config || typeof config !== 'object') {
    return res.status(400).json({ error: 'Config object is required' });
  }

  const allowedKeys = [
    'rootPath',
    'projectPhotoFolder',
    'componentPhotoFolder',
    'packagePhotoFolder',
    'datasheetFolder'
  ];

  try {
    for (const [key, value] of Object.entries(config)) {
      if (allowedKeys.includes(key) && typeof value === 'string') {
        const [existing] = await pool.query('SELECT id FROM t_config WHERE c_key = ?', [key]);
        if (existing.length > 0) {
          await pool.query('UPDATE t_config SET c_value = ? WHERE c_key = ?', [value.trim(), key]);
        } else {
          await pool.query('INSERT INTO t_config (c_key, c_value) VALUES (?, ?)', [key, value.trim()]);
        }
      }
    }

    res.json({ success: true, message: 'Configuration saved successfully' });
  } catch (error) {
    console.error('Error updating config:', error);
    res.status(500).json({ error: 'Failed to update configuration', details: error.message });
  }
});

// GET /api/settings/diagnostics - test database responsiveness & system health
router.get('/diagnostics', async (req, res) => {
  const startTime = Date.now();
  try {
    await pool.query('SELECT 1');
    const latencyMs = Date.now() - startTime;
    const mem = process.memoryUsage();

    res.json({
      status: 'healthy',
      engine: pool.engine,
      latencyMs,
      memory: {
        rssMb: Math.round((mem.rss / 1024 / 1024) * 100) / 100,
        heapUsedMb: Math.round((mem.heapUsed / 1024 / 1024) * 100) / 100,
        heapTotalMb: Math.round((mem.heapTotal / 1024 / 1024) * 100) / 100
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      engine: pool.engine,
      error: error.message
    });
  }
});

// GET /api/settings/currencies - fetch current currency configuration & rates
router.get('/currencies', async (req, res) => {
  try {
    const defaultCurrency = await currencyService.getDefaultCurrency();
    const secondaryCurrencies = await currencyService.getSecondaryCurrencies();
    const rates = await currencyService.getAllRates();

    res.json({
      defaultCurrency,
      secondaryCurrencies,
      supportedCurrencies: currencyService.SUPPORTED_CURRENCIES,
      currencyMetadata: currencyService.CURRENCY_METADATA,
      rates
    });
  } catch (error) {
    console.error('Error fetching currency settings:', error);
    res.status(500).json({ error: 'Failed to fetch currency settings', details: error.message });
  }
});

// PUT /api/settings/currencies - update default currency and secondary currencies
router.put('/currencies', async (req, res) => {
  try {
    const { defaultCurrency, secondaryCurrencies } = req.body;
    if (defaultCurrency && currencyService.SUPPORTED_CURRENCIES.includes(defaultCurrency)) {
      const [existing] = await pool.query('SELECT id FROM t_config WHERE c_key = ?', ['defaultCurrency']);
      if (existing.length > 0) {
        await pool.query('UPDATE t_config SET c_value = ? WHERE c_key = ?', [defaultCurrency, 'defaultCurrency']);
      } else {
        await pool.query('INSERT INTO t_config (c_key, c_value) VALUES (?, ?)', ['defaultCurrency', defaultCurrency]);
      }
    }

    if (Array.isArray(secondaryCurrencies)) {
      const validSecondary = secondaryCurrencies
        .filter(c => currencyService.SUPPORTED_CURRENCIES.includes(c) && c !== defaultCurrency)
        .slice(0, 3);
      const jsonVal = JSON.stringify(validSecondary);
      const [existing] = await pool.query('SELECT id FROM t_config WHERE c_key = ?', ['secondaryCurrencies']);
      if (existing.length > 0) {
        await pool.query('UPDATE t_config SET c_value = ? WHERE c_key = ?', [jsonVal, 'secondaryCurrencies']);
      } else {
        await pool.query('INSERT INTO t_config (c_key, c_value) VALUES (?, ?)', ['secondaryCurrencies', jsonVal]);
      }
    }

    // Automatically recalculate all orders based on updated default currency
    const recalc = await currencyService.recalculateAllOrders();

    res.json({
      success: true,
      message: 'Currency settings updated and orders recalculated successfully',
      recalculated: recalc
    });
  } catch (error) {
    console.error('Error updating currency settings:', error);
    res.status(500).json({ error: 'Failed to update currency settings', details: error.message });
  }
});

// POST /api/settings/exchange-rates - add or update an exchange rate entry
router.post('/exchange-rates', async (req, res) => {
  try {
    const { fromCurrency, toCurrency, rate, rateDate } = req.body;
    const defaultCurr = await currencyService.getDefaultCurrency();
    const from = (fromCurrency || '').toUpperCase().trim();
    const to = (toCurrency || defaultCurr).toUpperCase().trim();
    const numRate = parseFloat(rate);
    const dateVal = rateDate ? String(rateDate).slice(0, 10) : new Date().toISOString().slice(0, 10);

    if (!from || !to || from === to) {
      return res.status(400).json({ error: 'Valid distinct fromCurrency and toCurrency are required' });
    }
    if (isNaN(numRate) || numRate <= 0) {
      return res.status(400).json({ error: 'Rate must be a positive number' });
    }

    // Insert into t_exchange_rates
    const [result] = await pool.query(
      'INSERT INTO t_exchange_rates (fromCurrency, toCurrency, rate, rateDate) VALUES (?, ?, ?, ?)',
      [from, to, numRate, dateVal]
    );

    // Recalculate orders to nearest exchange rate
    const recalc = await currencyService.recalculateAllOrders();

    res.json({
      success: true,
      id: result.insertId,
      rate: { id: result.insertId, fromCurrency: from, toCurrency: to, rate: numRate, rateDate: dateVal },
      recalculated: recalc
    });
  } catch (error) {
    console.error('Error adding exchange rate:', error);
    res.status(500).json({ error: 'Failed to add exchange rate', details: error.message });
  }
});

// DELETE /api/settings/exchange-rates/:id - delete an exchange rate entry
router.delete('/exchange-rates/:id', async (req, res) => {
  try {
    const rateId = parseInt(req.params.id, 10);
    if (isNaN(rateId)) {
      return res.status(400).json({ error: 'Invalid exchange rate ID' });
    }

    await pool.query('DELETE FROM t_exchange_rates WHERE id = ?', [rateId]);
    const recalc = await currencyService.recalculateAllOrders();

    res.json({ success: true, message: 'Exchange rate deleted successfully', recalculated: recalc });
  } catch (error) {
    console.error('Error deleting exchange rate:', error);
    res.status(500).json({ error: 'Failed to delete exchange rate', details: error.message });
  }
});

// POST /api/settings/currencies/recalculate - manual recalculation of order costs
router.post('/currencies/recalculate', async (req, res) => {
  try {
    const result = await currencyService.recalculateAllOrders();
    res.json({ success: true, message: 'All order costs recalculated to default currency', ...result });
  } catch (error) {
    console.error('Error recalculating orders:', error);
    res.status(500).json({ error: 'Failed to recalculate orders', details: error.message });
  }
});

module.exports = router;
