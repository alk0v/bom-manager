const fs = require('fs');
const path = require('path');
const AdmZip = require('adm-zip');

/**
 * Clean and sanitize a filename for zip or filesystem storage
 */
function sanitizeFileName(name) {
  if (!name) return 'package';
  return name.replace(/[^a-zA-Z0-9._-]/g, '_').replace(/_+/g, '_').trim();
}

/**
 * Export packages and their drawings to a ZIP archive
 */
async function exportPackagesToZip(packageIds, pool, mediaDir, res) {
  let rows = [];
  if (Array.isArray(packageIds) && packageIds.length > 0) {
    const validIds = packageIds.map(id => parseInt(id, 10)).filter(id => !isNaN(id));
    if (validIds.length > 0) {
      const placeholders = validIds.map(() => '?').join(',');
      const [resRows] = await pool.query(
        `SELECT ID, package, pinQuantity, isSmd, drawingURL FROM i_packages WHERE ID IN (${placeholders}) ORDER BY package ASC`,
        validIds
      );
      rows = resRows;
    }
  }

  if (rows.length === 0) {
    const [allRows] = await pool.query(
      'SELECT ID, package, pinQuantity, isSmd, drawingURL FROM i_packages ORDER BY package ASC'
    );
    rows = allRows;
  }

  const manifest = {
    format: 'bommanager-packages-export',
    version: '1.0',
    appVersion: '0.3.5',
    exportedAt: new Date().toISOString(),
    packagesCount: rows.length,
    packages: rows.map(r => ({
      ID: r.ID,
      package: r.package,
      pinQuantity: r.pinQuantity,
      isSmd: r.isSmd,
      drawingURL: r.drawingURL || null
    }))
  };

  const zip = new AdmZip();
  zip.addFile('manifest.json', Buffer.from(JSON.stringify(manifest, null, 2), 'utf8'));

  const packagesMediaDir = path.join(mediaDir, 'packages');
  const addedDrawings = new Set();

  for (const pkg of rows) {
    if (pkg.drawingURL && !/^https?:\/\//i.test(pkg.drawingURL)) {
      const cleanDrawing = path.basename(pkg.drawingURL);
      if (!addedDrawings.has(cleanDrawing)) {
        const drawingPath = path.join(packagesMediaDir, cleanDrawing);
        if (fs.existsSync(drawingPath) && fs.statSync(drawingPath).isFile()) {
          zip.addLocalFile(drawingPath, 'drawings');
          addedDrawings.add(cleanDrawing);
        }
      }
    }
  }

  const zipFilename = `packages_export_${new Date().toISOString().slice(0, 10)}.zip`;
  const zipBuffer = zip.toBuffer();

  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(zipFilename)}"`);
  res.setHeader('Content-Length', zipBuffer.length);
  res.send(zipBuffer);
}

/**
 * Parse an uploaded packages export archive (.zip or .json) and provide DB match candidates
 */
async function parsePackagesExportPackage(fileBuffer, originalName, pool, mediaDir) {
  let manifest = null;
  let isZip = false;
  let tempZipPath = null;
  const tempDir = path.join(mediaDir, 'temp_imports');
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }

  const ext = path.extname(originalName).toLowerCase();
  let zip = null;

  if (ext === '.zip') {
    isZip = true;
    zip = new AdmZip(fileBuffer);
    const manifestEntry = zip.getEntry('manifest.json') || zip.getEntry('packages.json');

    if (!manifestEntry) {
      throw new Error('Invalid packages export: manifest.json not found inside ZIP archive');
    }

    const manifestText = zip.readAsText(manifestEntry);
    manifest = JSON.parse(manifestText);

    const tempFileId = `pkg_import_${Date.now()}_${Math.random().toString(36).substring(2, 9)}.zip`;
    tempZipPath = path.join(tempDir, tempFileId);
    fs.writeFileSync(tempZipPath, fileBuffer);
    manifest._tempFileId = tempFileId;
  } else if (ext === '.json') {
    const jsonText = fileBuffer.toString('utf8');
    manifest = JSON.parse(jsonText);

    const tempFileId = `pkg_import_${Date.now()}_${Math.random().toString(36).substring(2, 9)}.json`;
    tempZipPath = path.join(tempDir, tempFileId);
    fs.writeFileSync(tempZipPath, fileBuffer);
    manifest._tempFileId = tempFileId;
  } else {
    throw new Error('Unsupported file format. Please upload a .zip or .json packages export file.');
  }

  const importedPackages = Array.isArray(manifest.packages) ? manifest.packages : [];
  if (importedPackages.length === 0) {
    throw new Error('No package definitions found in the uploaded file');
  }

  // Fetch all existing packages from database for mapping
  const [existingPackages] = await pool.query(
    'SELECT ID, package, pinQuantity, isSmd, drawingURL FROM i_packages ORDER BY package ASC'
  );

  const mappedPackages = importedPackages.map((pkg, index) => {
    const pkgName = (pkg.package || '').trim();
    const pinQuantity = pkg.pinQuantity !== undefined && pkg.pinQuantity !== null ? parseInt(pkg.pinQuantity, 10) : null;
    const isSmd = pkg.isSmd !== undefined && pkg.isSmd !== null ? parseInt(pkg.isSmd, 10) : 0;
    const drawingURL = pkg.drawingURL ? String(pkg.drawingURL).trim() : null;

    // Try to map to existing package by name
    let matched = null;
    if (pkgName) {
      const cleanTarget = pkgName.toLowerCase();
      matched = existingPackages.find(ep => ep.package.toLowerCase().trim() === cleanTarget);
    }

    // Check if drawing image is embedded in ZIP
    let hasDrawingInZip = false;
    let previewDataUrl = null;
    if (isZip && zip && drawingURL && !/^https?:\/\//i.test(drawingURL)) {
      const baseDrawing = path.basename(drawingURL);
      const entry = zip.getEntry(`drawings/${baseDrawing}`) ||
                    zip.getEntry(`drawings/${drawingURL}`) ||
                    zip.getEntry(drawingURL) ||
                    zip.getEntry(`packages/${baseDrawing}`);
      if (entry) {
        hasDrawingInZip = true;
        try {
          const entryExt = path.extname(baseDrawing).toLowerCase();
          const mime = entryExt === '.jpg' || entryExt === '.jpeg' ? 'image/jpeg' : (entryExt === '.svg' ? 'image/svg+xml' : 'image/png');
          const base64 = entry.getData().toString('base64');
          previewDataUrl = `data:${mime};base64,${base64}`;
        } catch {
          // ignore preview data url failure
        }
      }
    }

    return {
      importIndex: index,
      selected: true,
      package: pkgName,
      pinQuantity,
      isSmd,
      drawingURL,
      hasDrawingInZip,
      previewDataUrl,
      matchType: matched ? 'exact' : 'none',
      matchReason: matched ? `Matches existing package #${matched.ID} (${matched.package})` : 'New package footprint',
      targetPackageId: matched ? matched.ID : null,
      action: matched ? 'update' : 'create' // 'update' | 'create' | 'skip'
    };
  });

  return {
    success: true,
    tempFileId: manifest._tempFileId,
    format: manifest.format || 'bommanager-packages-export',
    packagesCount: mappedPackages.length,
    packages: mappedPackages,
    existingPackages
  };
}

/**
 * Execute package import into the database
 */
async function executePackagesImport(payload, pool, mediaDir) {
  const { tempFileId, packages } = payload;
  if (!Array.isArray(packages) || packages.length === 0) {
    throw new Error('No package entries provided for import');
  }

  const tempDir = path.join(mediaDir, 'temp_imports');
  const packagesMediaDir = path.join(mediaDir, 'packages');
  if (!fs.existsSync(packagesMediaDir)) {
    fs.mkdirSync(packagesMediaDir, { recursive: true });
  }

  let zip = null;
  if (tempFileId) {
    const tempFilePath = path.join(tempDir, tempFileId);
    if (fs.existsSync(tempFilePath)) {
      try {
        if (tempFileId.endsWith('.zip')) {
          zip = new AdmZip(tempFilePath);
        }
      } catch (err) {
        console.warn('Could not read temporary zip archive during package import:', err.message);
      }
    }
  }

  let createdCount = 0;
  let updatedCount = 0;
  let skippedCount = 0;

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    for (const item of packages) {
      if (!item.selected || item.action === 'skip') {
        skippedCount++;
        continue;
      }

      const pkgName = (item.package || '').trim();
      if (!pkgName) {
        skippedCount++;
        continue;
      }

      const pins = item.pinQuantity !== undefined && item.pinQuantity !== null && item.pinQuantity !== ''
        ? parseInt(item.pinQuantity, 10)
        : null;
      const isSmd = item.isSmd !== undefined && item.isSmd !== null ? parseInt(item.isSmd, 10) : 0;
      let finalDrawingURL = item.drawingURL ? String(item.drawingURL).trim() : null;

      // Extract drawing file from zip if present
      if (zip && finalDrawingURL && !/^https?:\/\//i.test(finalDrawingURL)) {
        const baseDrawing = path.basename(finalDrawingURL);
        const entry = zip.getEntry(`drawings/${baseDrawing}`) ||
                      zip.getEntry(`drawings/${finalDrawingURL}`) ||
                      zip.getEntry(finalDrawingURL) ||
                      zip.getEntry(`packages/${baseDrawing}`);
        if (entry) {
          const destFile = sanitizeFileName(path.parse(baseDrawing).name) + path.extname(baseDrawing).toLowerCase();
          const destPath = path.join(packagesMediaDir, destFile);
          fs.writeFileSync(destPath, entry.getData());
          finalDrawingURL = destFile;
        }
      }

      if (item.action === 'update' && item.targetPackageId) {
        // Update existing package
        if (finalDrawingURL) {
          await conn.query(
            'UPDATE i_packages SET pinQuantity = ?, isSmd = ?, drawingURL = ? WHERE ID = ?',
            [pins, isSmd, finalDrawingURL, item.targetPackageId]
          );
        } else {
          await conn.query(
            'UPDATE i_packages SET pinQuantity = ?, isSmd = ? WHERE ID = ?',
            [pins, isSmd, item.targetPackageId]
          );
        }
        updatedCount++;
      } else {
        // Create as new package
        // Check if package with same name already exists to avoid SQL collision
        const [existing] = await conn.query(
          'SELECT ID FROM i_packages WHERE LOWER(package) = LOWER(?)',
          [pkgName]
        );

        if (existing.length > 0) {
          // If already exists, update it instead
          if (finalDrawingURL) {
            await conn.query(
              'UPDATE i_packages SET pinQuantity = ?, isSmd = ?, drawingURL = ? WHERE ID = ?',
              [pins, isSmd, finalDrawingURL, existing[0].ID]
            );
          } else {
            await conn.query(
              'UPDATE i_packages SET pinQuantity = ?, isSmd = ? WHERE ID = ?',
              [pins, isSmd, existing[0].ID]
            );
          }
          updatedCount++;
        } else {
          await conn.query(
            'INSERT INTO i_packages (package, pinQuantity, isSmd, drawingURL) VALUES (?, ?, ?, ?)',
            [pkgName, pins, isSmd, finalDrawingURL]
          );
          createdCount++;
        }
      }
    }

    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();

    // Clean up temporary file
    if (tempFileId) {
      const tempFilePath = path.join(tempDir, tempFileId);
      if (fs.existsSync(tempFilePath)) {
        try {
          fs.unlinkSync(tempFilePath);
        } catch {
          // ignore cleanup error
        }
      }
    }
  }

  return {
    success: true,
    createdCount,
    updatedCount,
    skippedCount,
    totalProcessed: createdCount + updatedCount
  };
}

module.exports = {
  exportPackagesToZip,
  parsePackagesExportPackage,
  executePackagesImport
};

