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

pool.getConnection()
  .then((conn) => {
    console.log(`[Database] Connected to MySQL database "${process.env.DB_NAME}" as "${process.env.DB_USER}"`);
    conn.release();
  })
  .catch((err) => {
    console.error('[Database] Connection failed:', err.message);
  });

module.exports = pool;
