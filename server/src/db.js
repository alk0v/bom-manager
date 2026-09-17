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
  } catch (err) {
    console.warn('[Database] Table verification note (t_project_files):', err.message);
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
