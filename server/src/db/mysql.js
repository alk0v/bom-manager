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

    // Ensure status, deliveredDate, storageId columns in t_orders
    const [statusCols] = await pool.query("SHOW COLUMNS FROM t_orders LIKE 'status'");
    if (statusCols.length === 0) {
      await pool.query("ALTER TABLE t_orders ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT 'delivered'");
      await pool.query("UPDATE t_orders SET status = 'delivered' WHERE status IS NULL OR status = ''");
      console.log('[Database:MySQL] Added "status" column to t_orders.');
    }

    const [delivCols] = await pool.query("SHOW COLUMNS FROM t_orders LIKE 'deliveredDate'");
    if (delivCols.length === 0) {
      await pool.query("ALTER TABLE t_orders ADD COLUMN deliveredDate DATE NULL");
      console.log('[Database:MySQL] Added "deliveredDate" column to t_orders.');
    }

    const [storageCols] = await pool.query("SHOW COLUMNS FROM t_orders LIKE 'storageId'");
    if (storageCols.length === 0) {
      await pool.query("ALTER TABLE t_orders ADD COLUMN storageId INT NULL");
      console.log('[Database:MySQL] Added "storageId" column to t_orders.');
    }

    // Ensure orderId column in t_busket
    const [busketOrderCols] = await pool.query("SHOW COLUMNS FROM t_busket LIKE 'orderId'");
    if (busketOrderCols.length === 0) {
      await pool.query("ALTER TABLE t_busket ADD COLUMN orderId INT NULL");
      console.log('[Database:MySQL] Added "orderId" column to t_busket.');
    }

    // Ensure t_exchange_rates table exists
    await pool.query(`
      CREATE TABLE IF NOT EXISTS t_exchange_rates (
        id INT AUTO_INCREMENT PRIMARY KEY,
        fromCurrency VARCHAR(10) NOT NULL,
        toCurrency VARCHAR(10) NOT NULL,
        rate DECIMAL(14, 6) NOT NULL,
        rateDate DATE NOT NULL,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_pair_date (fromCurrency, toCurrency, rateDate),
        INDEX idx_date (rateDate)
      )
    `);

    // Ensure currency column in t_orders
    const [currencyCols] = await pool.query("SHOW COLUMNS FROM t_orders LIKE 'currency'");
    if (currencyCols.length === 0) {
      await pool.query("ALTER TABLE t_orders ADD COLUMN currency VARCHAR(10) NOT NULL DEFAULT 'USD'");
      await pool.query("UPDATE t_orders SET currency = 'USD' WHERE currency IS NULL OR currency = ''");
      console.log('[Database:MySQL] Added "currency" column to t_orders.');
    }

    // Ensure convertedPrice column in t_orders
    const [convPriceCols] = await pool.query("SHOW COLUMNS FROM t_orders LIKE 'convertedPrice'");
    if (convPriceCols.length === 0) {
      await pool.query("ALTER TABLE t_orders ADD COLUMN convertedPrice FLOAT NULL");
      await pool.query("UPDATE t_orders SET convertedPrice = price WHERE convertedPrice IS NULL");
      console.log('[Database:MySQL] Added "convertedPrice" column to t_orders.');
    }

    // Ensure defaultCurrency and secondaryCurrencies in t_config
    const [defaultCurrRow] = await pool.query("SELECT id FROM t_config WHERE c_key = 'defaultCurrency'");
    if (defaultCurrRow.length === 0) {
      await pool.query("INSERT INTO t_config (c_key, c_value) VALUES ('defaultCurrency', 'USD')");
    }

    const [secCurrRow] = await pool.query("SELECT id FROM t_config WHERE c_key = 'secondaryCurrencies'");
    if (secCurrRow.length === 0) {
      await pool.query("INSERT INTO t_config (c_key, c_value) VALUES ('secondaryCurrencies', '[\"EUR\",\"UAH\",\"PLN\"]')");
    }

    // Seed default exchange rates if t_exchange_rates is empty
    const [rateCountRow] = await pool.query("SELECT COUNT(*) as cnt FROM t_exchange_rates");
    if (rateCountRow[0]?.cnt === 0) {
      const today = new Date().toISOString().slice(0, 10);
      await pool.query(`
        INSERT INTO t_exchange_rates (fromCurrency, toCurrency, rate, rateDate) VALUES
        ('EUR', 'USD', 1.085000, ?),
        ('UAH', 'USD', 0.024100, ?),
        ('PLN', 'USD', 0.250000, ?)
      `, [today, today, today]);
      console.log('[Database:MySQL] Seeded initial exchange rates in t_exchange_rates.');
    }

    // Ensure t_tags and t_project_tags tables exist
    await pool.query(`
      CREATE TABLE IF NOT EXISTS t_tags (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(50) NOT NULL UNIQUE,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_tag_name (name)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS t_project_tags (
        projectId INT NOT NULL,
        tagId INT NOT NULL,
        PRIMARY KEY (projectId, tagId),
        INDEX idx_pt_project (projectId),
        INDEX idx_pt_tag (tagId)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    console.log('[Database:MySQL] Verified tables "t_tags" and "t_project_tags" exist.');

    await pool.query(`
      CREATE TABLE IF NOT EXISTS t_category_packages (
        categoryId INT NOT NULL,
        packageId INT NOT NULL,
        PRIMARY KEY (categoryId, packageId),
        INDEX idx_cp_cat (categoryId),
        INDEX idx_cp_pkg (packageId)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS t_category_fields (
        id INT AUTO_INCREMENT PRIMARY KEY,
        categoryId INT NOT NULL,
        fieldName VARCHAR(100) NOT NULL,
        fieldLabel VARCHAR(255) NOT NULL,
        fieldType VARCHAR(50) NOT NULL DEFAULT 'number',
        unit VARCHAR(50) DEFAULT NULL,
        options TEXT DEFAULT NULL,
        sortOrder INT DEFAULT 0,
        INDEX idx_cf_cat (categoryId)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS t_component_field_values (
        id INT AUTO_INCREMENT PRIMARY KEY,
        componentId INT NOT NULL,
        fieldId INT NOT NULL,
        fieldValue TEXT,
        numValue DOUBLE DEFAULT NULL,
        UNIQUE KEY uq_comp_field (componentId, fieldId),
        INDEX idx_cfv_comp (componentId),
        INDEX idx_cfv_field (fieldId),
        INDEX idx_cfv_num (numValue)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    console.log('[Database:MySQL] Verified tables "t_category_packages", "t_category_fields", and "t_component_field_values" exist.');

    // Seed initial tags if t_tags is empty
    const [tagCountRow] = await pool.query('SELECT COUNT(*) as cnt FROM t_tags');
    if (tagCountRow[0]?.cnt === 0) {
      const initialTags = ['commodore 64', 'retro', 'diy', 'kicad', 'smd'];
      for (const t of initialTags) {
        await pool.query('INSERT IGNORE INTO t_tags (name) VALUES (?)', [t]);
      }
      console.log('[Database:MySQL] Seeded initial tags in t_tags.');
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
