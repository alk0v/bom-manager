const fs = require('fs');
const path = require('path');

function syncDemoMedia(demoDir, mediaDir) {
  const demoMediaDir = path.join(demoDir, 'media');
  if (!fs.existsSync(demoMediaDir)) return 0;

  const subdirs = ['projects', 'components', 'packages', 'datasheets'];
  let copiedCount = 0;

  subdirs.forEach(sub => {
    const srcSub = path.join(demoMediaDir, sub);
    const destSub = path.join(mediaDir, sub);
    if (fs.existsSync(srcSub)) {
      if (!fs.existsSync(destSub)) {
        fs.mkdirSync(destSub, { recursive: true });
      }
      const files = fs.readdirSync(srcSub);
      files.forEach(f => {
        const srcFile = path.join(srcSub, f);
        const destFile = path.join(destSub, f);
        if (!fs.existsSync(destFile)) {
          fs.copyFileSync(srcFile, destFile);
          copiedCount++;
        }
      });
    }
  });

  return copiedCount;
}

function loadDemoData(db, demoDir, mediaDir) {
  const dataFile = path.join(demoDir, 'demo_data.json');
  if (!fs.existsSync(dataFile)) {
    console.warn('[Database:Demo] demo_data.json not found at', dataFile);
    return false;
  }

  const data = JSON.parse(fs.readFileSync(dataFile, 'utf8'));

  db.exec('BEGIN TRANSACTION');
  try {
    // 1. Categories
    const insCat = db.prepare('INSERT OR IGNORE INTO i_categories (ID, category) VALUES (?, ?)');
    data.categories.forEach(c => insCat.run(c.ID, c.category));

    // 2. Packages
    const insPkg = db.prepare('INSERT OR IGNORE INTO i_packages (ID, package, pinQuantity, isSmd, drawingURL) VALUES (?, ?, ?, ?, ?)');
    data.packages.forEach(p => insPkg.run(p.ID, p.package, p.pinQuantity || 0, p.isSmd || 0, p.drawingURL || null));

    // 3. Storages
    const insStorage = db.prepare('INSERT OR IGNORE INTO i_storages (ID, storage) VALUES (?, ?)');
    data.storages.forEach(s => insStorage.run(s.ID, s.storage));

    // 4. Components
    const insComp = db.prepare(`
      INSERT OR REPLACE INTO i_components 
        (ID, component, category_id, package_id, description, shortDescription, marking, datasheetURL, photoURL, qty, minQty) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    data.components.forEach(c => insComp.run(
      c.ID,
      c.component,
      c.category_id || null,
      c.package_id || 28,
      c.description || null,
      c.shortDescription || null,
      c.marking || null,
      c.datasheetURL || null,
      c.photoURL || null,
      c.qty || 0,
      c.minQty || 0
    ));

    // 5. Projects
    const insProj = db.prepare('INSERT OR REPLACE INTO i_projects (id, projectName, description, url, photoUrl) VALUES (?, ?, ?, ?, ?)');
    data.projects.forEach(p => insProj.run(p.id, p.projectName, p.description || null, p.url || null, p.photoUrl || null));

    // 6. BOM
    const insBom = db.prepare('INSERT OR REPLACE INTO t_bom (id, projectId, componentId, quantity, comment) VALUES (?, ?, ?, ?, ?)');
    data.bom.forEach(b => insBom.run(b.id, b.projectId, b.componentId, b.quantity || 1, b.comment || null));

    // 7. Orders
    const insOrder = db.prepare('INSERT OR REPLACE INTO t_orders (id, componentId, price, qty, date, url, details) VALUES (?, ?, ?, ?, ?, ?, ?)');
    data.orders.forEach(o => insOrder.run(o.id, o.componentId, o.price || 0, o.qty || 1, o.date || null, o.url || null, o.details || null));

    // 8. Warehouse
    const insWh = db.prepare('INSERT OR REPLACE INTO t_warehouse (id, componentId, storageId, quantity) VALUES (?, ?, ?, ?)');
    data.warehouse.forEach(w => insWh.run(w.id, w.componentId, w.storageId, w.quantity || 0));

    // 9. Production Runs
    const insRun = db.prepare('INSERT OR REPLACE INTO t_production_runs (id, projectId, count, status, producedAt, cancelledAt, notes) VALUES (?, ?, ?, ?, ?, ?, ?)');
    data.productionRuns.forEach(r => insRun.run(r.id, r.projectId, r.count || 1, r.status || 'completed', r.producedAt || null, r.cancelledAt || null, r.notes || null));

    // 10. Production Items
    const insItem = db.prepare('INSERT OR REPLACE INTO t_production_items (id, runId, componentId, quantityPerUnit, totalDeducted, returnedStock) VALUES (?, ?, ?, ?, ?, ?)');
    data.productionItems.forEach(i => insItem.run(i.id, i.runId, i.componentId, i.quantityPerUnit || 1, i.totalDeducted || 1, i.returnedStock || 0));

    // 11. Default config
    const insConfig = db.prepare('INSERT OR IGNORE INTO t_config (c_key, c_value) VALUES (?, ?)');
    insConfig.run('rootPath', '/media/');
    insConfig.run('projectPhotoFolder', 'projects/');
    insConfig.run('componentPhotoFolder', 'components/');
    insConfig.run('packagePhotoFolder', 'packages/');
    insConfig.run('datasheetFolder', 'datasheets/');

    db.exec('COMMIT');
    console.log(`[Database:Demo] Loaded demo database (${data.projects.length} projects, ${data.components.length} components, ${data.bom.length} BOM items, ${data.orders.length} orders).`);

    // Sync media files
    if (mediaDir) {
      const copied = syncDemoMedia(demoDir, mediaDir);
      console.log(`[Database:Demo] Synced demo media files (${copied} new files copied to ${mediaDir}).`);
    }

    return true;
  } catch (err) {
    db.exec('ROLLBACK');
    console.error('[Database:Demo] Failed to load demo data:', err);
    throw err;
  }
}

module.exports = {
  loadDemoData,
  syncDemoMedia
};
