const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const fs = require('fs');

const sqlitePath = process.env.SQLITE_FILE || process.env.DB_FILE || path.resolve(__dirname, '../../../data/bommanager.sqlite');

// Ensure database directory exists
const dbDir = path.dirname(sqlitePath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

console.log(`[Database] Initializing SQLite database at: ${sqlitePath}`);
const db = new DatabaseSync(sqlitePath);

// Enable WAL mode for high concurrency and resilience
db.exec('PRAGMA journal_mode = WAL;');
db.exec('PRAGMA synchronous = NORMAL;');
db.exec('PRAGMA foreign_keys = ON;');

// Register compatibility scalar functions for MySQL queries
db.function('GREATEST', { varargs: true }, (...args) => {
  const nums = args.map(Number).filter(n => !isNaN(n));
  return nums.length ? Math.max(...nums) : null;
});

db.function('LEAST', { varargs: true }, (...args) => {
  const nums = args.map(Number).filter(n => !isNaN(n));
  return nums.length ? Math.min(...nums) : null;
});

db.function('NOW', () => {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
});

db.function('CONCAT', { varargs: true }, (...args) => {
  return args.filter(a => a !== null && a !== undefined).join('');
});

// Create tables
function initSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS i_projects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      projectName TEXT,
      description TEXT,
      url TEXT,
      photoUrl TEXT
    );

    CREATE TABLE IF NOT EXISTS i_categories (
      ID INTEGER PRIMARY KEY AUTOINCREMENT,
      category TEXT
    );

    CREATE TABLE IF NOT EXISTS i_packages (
      ID INTEGER PRIMARY KEY AUTOINCREMENT,
      package TEXT,
      pinQuantity INTEGER DEFAULT 0,
      isSmd INTEGER DEFAULT 0,
      drawingURL TEXT
    );

    CREATE TABLE IF NOT EXISTS i_components (
      ID INTEGER PRIMARY KEY AUTOINCREMENT,
      component TEXT,
      category_id INTEGER,
      package_id INTEGER DEFAULT 28,
      description TEXT,
      shortDescription TEXT,
      marking TEXT,
      datasheetURL TEXT,
      photoURL TEXT,
      qty INTEGER DEFAULT 0,
      minQty INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS t_bom (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      projectId INTEGER,
      componentId INTEGER,
      quantity INTEGER DEFAULT 1,
      comment TEXT
    );

    CREATE TABLE IF NOT EXISTS t_bom_substitutes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      bomId INTEGER NOT NULL,
      componentId INTEGER NOT NULL,
      notes TEXT,
      createdAt TEXT DEFAULT (datetime('now', 'localtime')),
      FOREIGN KEY (bomId) REFERENCES t_bom(id) ON DELETE CASCADE,
      FOREIGN KEY (componentId) REFERENCES i_components(ID) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS t_busket (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      componentId INTEGER,
      qty INTEGER DEFAULT 1,
      date TEXT,
      orderId INTEGER DEFAULT NULL
    );

    CREATE TABLE IF NOT EXISTS t_config (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      c_key TEXT UNIQUE,
      c_value TEXT
    );

    CREATE TABLE IF NOT EXISTS t_orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      componentId INTEGER,
      price REAL DEFAULT 0,
      qty INTEGER DEFAULT 1,
      date TEXT,
      url TEXT,
      details TEXT,
      status TEXT DEFAULT 'delivered',
      deliveredDate TEXT DEFAULT NULL,
      storageId INTEGER DEFAULT NULL
    );

    CREATE TABLE IF NOT EXISTS i_storages (
      ID INTEGER PRIMARY KEY AUTOINCREMENT,
      storage TEXT
    );

    CREATE TABLE IF NOT EXISTS t_warehouse (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      componentId INTEGER,
      storageId INTEGER,
      quantity INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS t_project_files (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      projectId INTEGER NOT NULL,
      fileName TEXT NOT NULL,
      originalName TEXT NOT NULL,
      fileSize INTEGER DEFAULT 0,
      fileType TEXT DEFAULT 'other',
      mimeType TEXT,
      description TEXT,
      uploadedAt TEXT DEFAULT (datetime('now', 'localtime'))
    );

    CREATE TABLE IF NOT EXISTS t_production_runs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      projectId INTEGER NOT NULL,
      count INTEGER NOT NULL DEFAULT 1,
      status TEXT NOT NULL DEFAULT 'completed',
      producedAt TEXT DEFAULT (datetime('now', 'localtime')),
      cancelledAt TEXT DEFAULT NULL,
      notes TEXT DEFAULT NULL
    );

    CREATE TABLE IF NOT EXISTS t_production_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      runId INTEGER NOT NULL,
      componentId INTEGER NOT NULL,
      quantityPerUnit INTEGER NOT NULL DEFAULT 1,
      totalDeducted INTEGER NOT NULL DEFAULT 1,
      returnedStock INTEGER NOT NULL DEFAULT 0
    );

    -- Create indexes
    CREATE INDEX IF NOT EXISTS idx_pf_project ON t_project_files (projectId);
    CREATE INDEX IF NOT EXISTS idx_pr_project ON t_production_runs (projectId);
    CREATE INDEX IF NOT EXISTS idx_pi_run ON t_production_items (runId);
    CREATE INDEX IF NOT EXISTS idx_pi_comp ON t_production_items (componentId);
    CREATE INDEX IF NOT EXISTS idx_bom_proj ON t_bom (projectId);
    CREATE INDEX IF NOT EXISTS idx_bom_comp ON t_bom (componentId);
    CREATE INDEX IF NOT EXISTS idx_sub_bom ON t_bom_substitutes (bomId);
    CREATE INDEX IF NOT EXISTS idx_sub_comp ON t_bom_substitutes (componentId);
    CREATE INDEX IF NOT EXISTS idx_comp_cat ON i_components (category_id);
    CREATE INDEX IF NOT EXISTS idx_comp_pkg ON i_components (package_id);
    CREATE INDEX IF NOT EXISTS idx_wh_comp ON t_warehouse (componentId);
  `);

  // Ensure migration columns for t_orders
  try {
    const orderCols = db.prepare("PRAGMA table_info(t_orders)").all();
    if (!orderCols.some(c => c.name === 'status')) {
      db.prepare("ALTER TABLE t_orders ADD COLUMN status TEXT DEFAULT 'delivered'").run();
      db.prepare("UPDATE t_orders SET status = 'delivered' WHERE status IS NULL").run();
      console.log('[Database:SQLite] Added "status" column to t_orders.');
    }
    if (!orderCols.some(c => c.name === 'deliveredDate')) {
      db.prepare("ALTER TABLE t_orders ADD COLUMN deliveredDate TEXT DEFAULT NULL").run();
      console.log('[Database:SQLite] Added "deliveredDate" column to t_orders.');
    }
    if (!orderCols.some(c => c.name === 'storageId')) {
      db.prepare("ALTER TABLE t_orders ADD COLUMN storageId INTEGER DEFAULT NULL").run();
      console.log('[Database:SQLite] Added "storageId" column to t_orders.');
    }
    if (!orderCols.some(c => c.name === 'currency')) {
      db.prepare("ALTER TABLE t_orders ADD COLUMN currency TEXT DEFAULT 'USD'").run();
      db.prepare("UPDATE t_orders SET currency = 'USD' WHERE currency IS NULL").run();
      console.log('[Database:SQLite] Added "currency" column to t_orders.');
    }
    if (!orderCols.some(c => c.name === 'convertedPrice')) {
      db.prepare("ALTER TABLE t_orders ADD COLUMN convertedPrice REAL DEFAULT NULL").run();
      db.prepare("UPDATE t_orders SET convertedPrice = price WHERE convertedPrice IS NULL").run();
      console.log('[Database:SQLite] Added "convertedPrice" column to t_orders.');
    }
  } catch (err) {
    console.warn('[Database:SQLite] Migration notice on t_orders:', err.message);
  }

  // Ensure t_exchange_rates table exists
  try {
    db.prepare(`
      CREATE TABLE IF NOT EXISTS t_exchange_rates (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        fromCurrency TEXT NOT NULL,
        toCurrency TEXT NOT NULL,
        rate REAL NOT NULL,
        rateDate TEXT NOT NULL,
        createdAt TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `).run();
    db.prepare(`
      CREATE INDEX IF NOT EXISTS idx_rates_pair_date ON t_exchange_rates (fromCurrency, toCurrency, rateDate)
    `).run();

    const rateCount = db.prepare('SELECT COUNT(*) as count FROM t_exchange_rates').get()?.count || 0;
    if (rateCount === 0) {
      const today = new Date().toISOString().slice(0, 10);
      const ins = db.prepare('INSERT INTO t_exchange_rates (fromCurrency, toCurrency, rate, rateDate) VALUES (?, ?, ?, ?)');
      ins.run('EUR', 'USD', 1.085, today);
      ins.run('UAH', 'USD', 0.0241, today);
      ins.run('PLN', 'USD', 0.25, today);
      console.log('[Database:SQLite] Seeded initial exchange rates into t_exchange_rates.');
    }
  } catch (err) {
    console.warn('[Database:SQLite] Migration notice on t_exchange_rates:', err.message);
  }

  // Ensure migration column for t_busket
  try {
    const busketCols = db.prepare("PRAGMA table_info(t_busket)").all();
    if (!busketCols.some(c => c.name === 'orderId')) {
      db.prepare("ALTER TABLE t_busket ADD COLUMN orderId INTEGER DEFAULT NULL").run();
      console.log('[Database:SQLite] Added "orderId" column to t_busket.');
    }
  } catch (err) {
    console.warn('[Database:SQLite] Migration notice on t_busket:', err.message);
  }

  // Seed default t_config if empty
  const configCount = db.prepare('SELECT COUNT(*) as count FROM t_config').get()?.count || 0;
  if (configCount === 0) {
    const insertConfig = db.prepare('INSERT INTO t_config (c_key, c_value) VALUES (?, ?)');
    insertConfig.run('rootPath', '/media/');
    insertConfig.run('projectPhotoFolder', 'projects/');
    insertConfig.run('componentPhotoFolder', 'components/');
    insertConfig.run('packagePhotoFolder', 'packages/');
    insertConfig.run('datasheetFolder', 'datasheets/');
    console.log('[Database:SQLite] Seeded default system configuration into t_config.');
  }

  // Seed default storage if empty
  const storageCount = db.prepare('SELECT COUNT(*) as count FROM i_storages').get()?.count || 0;
  if (storageCount === 0) {
    db.prepare('INSERT INTO i_storages (storage) VALUES (?)').run('Default Storage');
    console.log('[Database:SQLite] Seeded default storage.');
  }

  // Seed default categories if empty
  const catCount = db.prepare('SELECT COUNT(*) as count FROM i_categories').get()?.count || 0;
  if (catCount === 0) {
    const insertCat = db.prepare('INSERT INTO i_categories (category) VALUES (?)');
    const defaultCategories = [
      'Capacitors',
      'Resistors',
      'Inductors & Chokes',
      'Diodes & Rectifiers',
      'Transistors & MOSFETs',
      'Integrated Circuits (ICs)',
      'Microcontrollers & Processors',
      'Connectors & Headers',
      'Modules & Boards',
      'Switches & Relays',
      'Sensors',
      'Optoelectronics & LEDs',
      'Crystals & Oscillators',
      'Power & Voltage Regulators',
      'Mechanical & Hardware'
    ];
    for (const cat of defaultCategories) {
      insertCat.run(cat);
    }
    console.log(`[Database:SQLite] Seeded ${defaultCategories.length} default categories.`);
  }

  // Seed default packages if empty
  const pkgCount = db.prepare('SELECT COUNT(*) as count FROM i_packages').get()?.count || 0;
  if (pkgCount === 0) {
    const insertPkg = db.prepare('INSERT INTO i_packages (package, pinQuantity, isSmd) VALUES (?, ?, ?)');
    const defaultPackages = [
      ['0402', 2, 1],
      ['0603', 2, 1],
      ['0805', 2, 1],
      ['1206', 2, 1],
      ['SOT-23', 3, 1],
      ['SOT-223', 4, 1],
      ['SOIC-8', 8, 1],
      ['SOIC-14', 14, 1],
      ['SOIC-16', 16, 1],
      ['TSSOP-8', 8, 1],
      ['TSSOP-16', 16, 1],
      ['QFP-32', 32, 1],
      ['QFP-44', 44, 1],
      ['QFN-32', 32, 1],
      ['DIP-8', 8, 0],
      ['DIP-14', 14, 0],
      ['DIP-16', 16, 0],
      ['DIP-28', 28, 0],
      ['TO-92', 3, 0],
      ['TO-220', 3, 0],
      ['Axial', 2, 0],
      ['Radial', 2, 0],
      ['Module', 0, 0],
      ['Custom / Other', 0, 0]
    ];
    for (const [pkg, pins, isSmd] of defaultPackages) {
      insertPkg.run(pkg, pins, isSmd);
    }
    console.log(`[Database:SQLite] Seeded ${defaultPackages.length} default packages.`);
  }

  // Load demo database if requested via DEMO_DATA=true or INIT_MODE=demo
  const demoRequested = process.env.DEMO_DATA === 'true' ||
                        process.env.INIT_MODE === 'demo' ||
                        process.env.LOAD_DEMO === 'true';

  if (demoRequested) {
    const projCount = db.prepare('SELECT COUNT(*) as count FROM i_projects').get()?.count || 0;
    if (projCount === 0) {
      const { loadDemoData } = require('./demoLoader');
      const demoDir = path.resolve(__dirname, '../../../demo');
      const mediaDir = process.env.MEDIA_DIR
        ? path.resolve(process.env.MEDIA_DIR)
        : path.resolve(__dirname, '../../../media');
      loadDemoData(db, demoDir, mediaDir);
    }
  }
}

initSchema();

/**
 * Format SQLite queries to normalize params (e.g. converting undefined to null)
 */
function normalizeParams(params) {
  if (!params) return [];
  if (!Array.isArray(params)) return [params];
  return params.map(p => (p === undefined ? null : p));
}

/**
 * Execute query and return [rows, fields] in mysql2 compatible style
 */
async function query(sql, params = []) {
  const normParams = normalizeParams(params);
  const trimmed = sql.trim();
  const firstWord = trimmed.split(/\s+/)[0].toUpperCase();

  const isSelect = ['SELECT', 'PRAGMA', 'EXPLAIN', 'WITH'].includes(firstWord);

  try {
    if (isSelect) {
      const stmt = db.prepare(trimmed);
      const rows = stmt.all(...normParams);
      return [rows, []];
    } else {
      const stmt = db.prepare(trimmed);
      const result = stmt.run(...normParams);
      return [
        {
          insertId: Number(result.lastInsertRowid),
          affectedRows: result.changes
        },
        []
      ];
    }
  } catch (err) {
    console.error(`[Database:SQLite Query Error] SQL: ${trimmed.slice(0, 100)}...`, err.message);
    throw err;
  }
}

/**
 * Connection wrapper for transactions
 */
async function getConnection() {
  return {
    beginTransaction: async () => {
      db.exec('BEGIN TRANSACTION');
    },
    query: async (sql, params) => {
      return query(sql, params);
    },
    commit: async () => {
      db.exec('COMMIT');
    },
    rollback: async () => {
      db.exec('ROLLBACK');
    },
    release: () => {
      // no-op for single connection SQLite
    }
  };
}

/**
 * Diagnostic and status information
 */
async function getDbInfo() {
  const stat = fs.existsSync(sqlitePath) ? fs.statSync(sqlitePath) : null;
  const counts = {
    projects: Number(db.prepare('SELECT COUNT(*) as c FROM i_projects').get()?.c || 0),
    components: Number(db.prepare('SELECT COUNT(*) as c FROM i_components').get()?.c || 0),
    bomItems: Number(db.prepare('SELECT COUNT(*) as c FROM t_bom').get()?.c || 0),
    orders: Number(db.prepare('SELECT COUNT(*) as c FROM t_orders').get()?.c || 0),
    storages: Number(db.prepare('SELECT COUNT(*) as c FROM i_storages').get()?.c || 0),
    productionRuns: Number(db.prepare('SELECT COUNT(*) as c FROM t_production_runs').get()?.c || 0),
    files: Number(db.prepare('SELECT COUNT(*) as c FROM t_project_files').get()?.c || 0)
  };

  return {
    engine: 'sqlite',
    displayName: 'SQLite 3 (Autonomous Self-Hosted)',
    status: 'connected',
    databaseFile: sqlitePath,
    fileSizeBytes: stat ? stat.size : 0,
    journalMode: 'WAL',
    counts
  };
}

module.exports = {
  query,
  getConnection,
  getDbInfo,
  db
};
