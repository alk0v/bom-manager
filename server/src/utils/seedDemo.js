const path = require('path');
// Load environment variables
require('dotenv').config({ path: path.resolve(__dirname, '../../../.env') });
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const db = require('../db');
const { loadDemoData } = require('../db/demoLoader');

const demoDir = path.resolve(__dirname, '../../../demo');
const mediaDir = process.env.MEDIA_DIR
  ? path.resolve(process.env.MEDIA_DIR)
  : path.resolve(__dirname, '../../../media');

async function seed() {
  console.log(`[Demo Seeder] Target database engine: ${db.engine.toUpperCase()}`);
  if (db.engine === 'sqlite') {
    loadDemoData(db.driver.db, demoDir, mediaDir);
    console.log('[Demo Seeder] Demo seeding complete!');
    process.exit(0);
  } else {
    console.log('[Demo Seeder] Notice: Active database engine is MySQL. Demo seeding is designed for autonomous SQLite instances.');
    process.exit(0);
  }
}

seed().catch(err => {
  console.error('[Demo Seeder] Error seeding demo data:', err);
  process.exit(1);
});
