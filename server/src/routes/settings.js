const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const pool = require('../db');

const mediaDir = process.env.MEDIA_DIR
  ? path.resolve(process.env.MEDIA_DIR)
  : path.resolve(__dirname, '../../../media');

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
        version: '0.2.6',
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

module.exports = router;
