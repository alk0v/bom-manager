const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const pool = mysql.createPool({
  host: process.env.DB_HOST || '192.168.31.122',
  port: parseInt(process.env.DB_PORT || '3306', 10),
  user: process.env.DB_USER || 'admin_ro',
  password: process.env.DB_PASSWORD || 'cv96vWvmAGtQ',
  database: process.env.DB_NAME || 'retool_bommanager',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  charset: 'utf8mb4'
});

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
    console.log('[Database] Verified table "t_project_files" exists.');

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
    console.log('[Database] Verified table "t_production_runs" exists.');

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
    console.log('[Database] Verified table "t_production_items" exists.');

    // Ensure minQty column in i_components
    const [cols] = await pool.query("SHOW COLUMNS FROM i_components LIKE 'minQty'");
    if (cols.length === 0) {
      await pool.query('ALTER TABLE i_components ADD COLUMN minQty INT NOT NULL DEFAULT 0');
      console.log('[Database] Added "minQty" column to i_components table.');
    } else {
      console.log('[Database] Verified column "minQty" exists in i_components.');
    }
  } catch (err) {
    console.warn('[Database] Table verification note:', err.message);
  }
}

pool.getConnection()
  .then(async (conn) => {
    console.log(`[Database] Connected to MySQL database "${process.env.DB_NAME}" as "${process.env.DB_USER}"`);
    conn.release();
    await ensureTables();
  })
  .catch((err) => {
    console.error('[Database] Connection failed:', err.message);
  });

module.exports = pool;
