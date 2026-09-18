const path = require('path');
// Load environment variables: root .env first, fallback to server/.env
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const explicitType = (process.env.DB_TYPE || process.env.DB_ENGINE || process.env.DB_CLIENT || '').toLowerCase().trim();

// Determine engine:
// If explicitly 'sqlite' -> sqlite
// If explicitly 'mysql' -> mysql
// Otherwise: if DB_HOST is present -> mysql (backward compatibility with existing setup); else -> sqlite
let engine = 'sqlite';
if (explicitType === 'sqlite') {
  engine = 'sqlite';
} else if (explicitType === 'mysql' || explicitType === 'mariadb') {
  engine = 'mysql';
} else if (process.env.DB_HOST) {
  engine = 'mysql';
} else {
  engine = 'sqlite';
}

console.log(`[Database] Active Database Engine: ${engine.toUpperCase()} (mode: ${explicitType ? 'explicit' : 'auto-detected'})`);

let dbDriver;
if (engine === 'sqlite') {
  dbDriver = require('./db/sqlite');
} else {
  dbDriver = require('./db/mysql');
}

module.exports = {
  engine,
  query: (...args) => dbDriver.query(...args),
  getConnection: (...args) => dbDriver.getConnection(...args),
  getDbInfo: (...args) => dbDriver.getDbInfo(...args),
  driver: dbDriver
};
