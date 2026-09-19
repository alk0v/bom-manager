const mysql = require('mysql2/promise');
const path = require('path');
// Load environment variables: root .env first, fallback to server/.env
require('dotenv').config({ path: path.resolve(__dirname, '../../../.env') });
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const config = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306', 10),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'bommanager',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  charset: 'utf8mb4'
};

const pool = mysql.createPool(config);

async function ensureTables() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS t_project_files (
        id INT AUTO_INCREMENT PRIMARY KEY,
        projectId INT NOT NULL,
        fileName VARCHAR(255) NOT NULL,
        originalName VARCHAR(255) NOT NULL,
        fileSize BIGINT DEFAULT 0,
        fileType VARCHAR(50) DEFAULT 'other',
        mimeType VARCHAR(100) DEFAULT NULL,
        description VARCHAR(500) DEFAULT NULL,
        uploadedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_project_id (projectId)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    console.log('[Database:MySQL] Verified table "t_project_files" exists.');

    await pool.query(`
      CREATE TABLE IF NOT EXISTS t_production_runs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        projectId INT NOT NULL,
        count INT NOT NULL DEFAULT 1,
        status VARCHAR(50) NOT NULL DEFAULT 'completed',
        producedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        cancelledAt DATETIME DEFAULT NULL,
        notes VARCHAR(500) DEFAULT NULL,
        INDEX idx_prod_project (projectId),
        INDEX idx_prod_status (status),
        INDEX idx_prod_date (producedAt)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    console.log('[Database:MySQL] Verified table "t_production_runs" exists.');

    await pool.query(`
      CREATE TABLE IF NOT EXISTS t_production_items (
        id INT AUTO_INCREMENT PRIMARY KEY,
        runId INT NOT NULL,
        componentId INT NOT NULL,
        quantityPerUnit INT NOT NULL DEFAULT 1,
        totalDeducted INT NOT NULL DEFAULT 1,
        returnedStock INT NOT NULL DEFAULT 0,
        INDEX idx_run_id (runId),
        INDEX idx_comp_id (componentId)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    console.log('[Database:MySQL] Verified table "t_production_items" exists.');

    await pool.query(`
      CREATE TABLE IF NOT EXISTS t_bom_substitutes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        bomId INT NOT NULL,
        componentId INT NOT NULL,
        notes TEXT,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_sub_bom (bomId),
        INDEX idx_sub_comp (componentId)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    console.log('[Database:MySQL] Verified table "t_bom_substitutes" exists.');

    // Ensure minQty column in i_components
    const [cols] = await pool.query("SHOW COLUMNS FROM i_components LIKE 'minQty'");
    if (cols.length === 0) {
      await pool.query('ALTER TABLE i_components ADD COLUMN minQty INT NOT NULL DEFAULT 0');
      console.log('[Database:MySQL] Added "minQty" column to i_components table.');
    } else {
      console.log('[Database:MySQL] Verified column "minQty" exists in i_components.');
    }
  } catch (err) {
    console.warn('[Database:MySQL] Table verification note:', err.message);
  }
}

pool.getConnection()
  .then(async (conn) => {
    console.log(`[Database:MySQL] Connected to MySQL database "${config.database}" at ${config.host}:${config.port} as "${config.user}"`);
    conn.release();
    await ensureTables();
  })
  .catch((err) => {
    console.error('[Database:MySQL] Connection failed:', err.message);
  });

async function query(sql, params) {
  return pool.query(sql, params);
}

async function getConnection() {
  return pool.getConnection();
}

async function getDbInfo() {
  let counts = {
    projects: 0,
    components: 0,
    bomItems: 0,
    orders: 0,
    storages: 0,
    productionRuns: 0,
    files: 0
  };

  try {
    const [[p]] = await pool.query('SELECT COUNT(*) as c FROM i_projects');
    const [[c]] = await pool.query('SELECT COUNT(*) as c FROM i_components');
    const [[b]] = await pool.query('SELECT COUNT(*) as c FROM t_bom');
    const [[o]] = await pool.query('SELECT COUNT(*) as c FROM t_orders');
    const [[s]] = await pool.query('SELECT COUNT(*) as c FROM i_storages');
    const [[pr]] = await pool.query('SELECT COUNT(*) as c FROM t_production_runs');
    const [[pf]] = await pool.query('SELECT COUNT(*) as c FROM t_project_files');
    counts = {
      projects: Number(p?.c || 0),
      components: Number(c?.c || 0),
      bomItems: Number(b?.c || 0),
      orders: Number(o?.c || 0),
      storages: Number(s?.c || 0),
      productionRuns: Number(pr?.c || 0),
      files: Number(pf?.c || 0)
    };
  } catch (err) {
    console.warn('[Database:MySQL] Error counting entities for getDbInfo:', err.message);
  }

  return {
    engine: 'mysql',
    displayName: 'MySQL / MariaDB (External Database)',
    status: 'connected',
    host: config.host,
    port: config.port,
    database: config.database,
    user: config.user,
    counts
  };
}

module.exports = {
  query,
  getConnection,
  getDbInfo,
  pool
};
