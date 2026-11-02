const fs = require('fs');
const path = require('path');
const AdmZip = require('adm-zip');

/**
 * Clean and sanitize a filename for zip or filesystem storage
 */
function sanitizeFileName(name) {
  if (!name) return 'component';
  return name.replace(/[^a-zA-Z0-9._-]/g, '_').replace(/_+/g, '_').trim();
}

/**
 * Export components and their media (photos, datasheets, package drawings) to a ZIP archive
 */
async function exportComponentsToZip(componentIds, pool, mediaDir, res) {
  let rows = [];
  if (Array.isArray(componentIds) && componentIds.length > 0) {
    const validIds = componentIds.map(id => parseInt(id, 10)).filter(id => !isNaN(id));
    if (validIds.length > 0) {
      const placeholders = validIds.map(() => '?').join(',');
      const [resRows] = await pool.query(`
        SELECT 
          c.ID,
          c.component,
          c.category_id,
          c.package_id,
          c.description,
          c.shortDescription,
          c.marking,
          c.datasheetURL,
          c.photoURL,
          c.qty,
          COALESCE(c.minQty, 0) AS minQty,
          cat.category AS categoryName,
          pkg.package AS packageName,
          pkg.pinQuantity,
          pkg.isSmd,
          pkg.drawingURL
        FROM i_components c
        LEFT JOIN i_categories cat ON c.category_id = cat.ID
        LEFT JOIN i_packages pkg ON c.package_id = pkg.ID
        WHERE c.ID IN (${placeholders})
        ORDER BY c.component ASC
      `, validIds);
      rows = resRows;
    }
  }

  if (rows.length === 0 && (!componentIds || componentIds.length === 0)) {
    const [allRows] = await pool.query(`
      SELECT 
        c.ID,
        c.component,
        c.category_id,
        c.package_id,
        c.description,
        c.shortDescription,
        c.marking,
        c.datasheetURL,
        c.photoURL,
        c.qty,
        COALESCE(c.minQty, 0) AS minQty,
        cat.category AS categoryName,
        pkg.package AS packageName,
        pkg.pinQuantity,
        pkg.isSmd,
        pkg.drawingURL
      FROM i_components c
      LEFT JOIN i_categories cat ON c.category_id = cat.ID
      LEFT JOIN i_packages pkg ON c.package_id = pkg.ID
      ORDER BY c.component ASC
    `);
    rows = allRows;
  }

  const foundIds = rows.map(r => r.ID);
  const customFieldsByComp = new Map();
  const warehouseByComp = new Map();

  if (foundIds.length > 0) {
    // 1. Fetch custom fields for components
    try {
      const placeholders = foundIds.map(() => '?').join(',');
      const [fieldRows] = await pool.query(`
        SELECT 
          cfv.componentId,
          cfv.fieldId,
          cfv.fieldValue,
          cfv.numValue,
          f.fieldName,
          f.fieldLabel,
          f.fieldType,
          f.unit
        FROM t_component_field_values cfv
        JOIN t_category_fields f ON cfv.fieldId = f.id
        WHERE cfv.componentId IN (${placeholders})
        ORDER BY f.sortOrder ASC, f.id ASC
      `, foundIds);

      fieldRows.forEach(f => {
        if (!customFieldsByComp.has(f.componentId)) {
          customFieldsByComp.set(f.componentId, []);
        }
        customFieldsByComp.get(f.componentId).push({
          fieldId: f.fieldId,
          fieldName: f.fieldName,
          fieldLabel: f.fieldLabel,
          fieldType: f.fieldType,
          unit: f.unit,
          fieldValue: f.fieldValue,
          numValue: f.numValue
        });
      });
    } catch (err) {
      console.warn('Failed to query custom fields for component export:', err.message);
    }

    // 2. Fetch warehouse storage distributions
    try {
      const placeholders = foundIds.map(() => '?').join(',');
      const [whRows] = await pool.query(`
        SELECT 
          w.componentId,
          w.storageId,
          s.storage AS storageName,
          w.quantity
        FROM t_warehouse w
        LEFT JOIN i_storages s ON w.storageId = s.ID
        WHERE w.componentId IN (${placeholders})
        ORDER BY s.storage ASC
      `, foundIds);

      whRows.forEach(w => {
        if (!warehouseByComp.has(w.componentId)) {
          warehouseByComp.set(w.componentId, []);
        }
        warehouseByComp.get(w.componentId).push({
          storageId: w.storageId,
          storage: w.storageName || null,
          quantity: w.quantity != null ? w.quantity : 0
        });
      });
    } catch (err) {
      console.warn('Failed to query warehouse stocks for component export:', err.message);
    }
  }

  // Collect unique packages referenced by the exported components
  const uniquePackagesMap = new Map();
  for (const r of rows) {
    if (r.packageName) {
      const pkgKey = r.packageName.trim().toLowerCase();
      if (!uniquePackagesMap.has(pkgKey)) {
        uniquePackagesMap.set(pkgKey, {
          ID: r.package_id,
          package: r.packageName.trim(),
          pinQuantity: r.pinQuantity,
          isSmd: r.isSmd,
          drawingURL: r.drawingURL || null
        });
      }
    }
  }

  const manifest = {
    format: 'bommanager-components-export',
    version: '1.0',
    appVersion: '0.3.6',
    exportedAt: new Date().toISOString(),
    componentsCount: rows.length,
    packagesCount: uniquePackagesMap.size,
    packages: Array.from(uniquePackagesMap.values()),
    components: rows.map(r => ({
      ID: r.ID,
      component: r.component,
      marking: r.marking || '',
      category_id: r.category_id,
      category: r.categoryName || '',
      package_id: r.package_id,
      package: r.packageName || '',
      pinQuantity: r.pinQuantity,
      isSmd: r.isSmd,
      description: r.description || '',
      shortDescription: r.shortDescription || '',
      datasheetURL: r.datasheetURL || '',
      photoURL: r.photoURL || '',
      drawingURL: r.drawingURL || '',
      qty: r.qty != null ? r.qty : 0,
      minQty: r.minQty != null ? r.minQty : 0,
      customFields: customFieldsByComp.get(r.ID) || [],
      warehouse: warehouseByComp.get(r.ID) || []
    }))
  };

  const zip = new AdmZip();
  zip.addFile('manifest.json', Buffer.from(JSON.stringify(manifest, null, 2), 'utf8'));

  const componentsMediaDir = path.join(mediaDir, 'components');
  const datasheetsMediaDir = path.join(mediaDir, 'datasheets');
  const packagesMediaDir = path.join(mediaDir, 'packages');

  const addedPhotos = new Set();
  const addedDatasheets = new Set();
  const addedDrawings = new Set();

  for (const c of rows) {
    // 1. Component Photo
    if (c.photoURL && !/^https?:\/\//i.test(c.photoURL)) {
      const cleanPhoto = path.basename(c.photoURL);
      if (!addedPhotos.has(cleanPhoto)) {
        const photoPath = path.join(componentsMediaDir, cleanPhoto);
        if (fs.existsSync(photoPath) && fs.statSync(photoPath).isFile()) {
          zip.addLocalFile(photoPath, 'components/photos');
          addedPhotos.add(cleanPhoto);
        }
      }
    }

    // 2. Component Datasheet
    if (c.datasheetURL && !/^https?:\/\//i.test(c.datasheetURL)) {
      const cleanDatasheet = path.basename(c.datasheetURL);
      if (!addedDatasheets.has(cleanDatasheet)) {
        const datasheetPath = path.join(datasheetsMediaDir, cleanDatasheet);
        if (fs.existsSync(datasheetPath) && fs.statSync(datasheetPath).isFile()) {
          zip.addLocalFile(datasheetPath, 'components/datasheets');
          addedDatasheets.add(cleanDatasheet);
        }
      }
    }

    // 3. Package Drawing
    if (c.drawingURL && !/^https?:\/\//i.test(c.drawingURL)) {
      const cleanDrawing = path.basename(c.drawingURL);
      if (!addedDrawings.has(cleanDrawing)) {
        const drawingPath = path.join(packagesMediaDir, cleanDrawing);
        if (fs.existsSync(drawingPath) && fs.statSync(drawingPath).isFile()) {
          zip.addLocalFile(drawingPath, 'packages');
          addedDrawings.add(cleanDrawing);
        }
      }
    }
  }

  const dateStr = new Date().toISOString().slice(0, 10);
  let zipFilename = `components_all_${dateStr}.zip`;
  if (Array.isArray(componentIds) && componentIds.length === 1 && rows.length === 1) {
    const safeTitle = sanitizeFileName(rows[0].component) || 'component';
    zipFilename = `${safeTitle}_export_${dateStr}.zip`;
  } else if (Array.isArray(componentIds) && componentIds.length > 0) {
    zipFilename = `components_selected_${rows.length}_${dateStr}.zip`;
  }

  const zipBuffer = zip.toBuffer();

  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(zipFilename)}"`);
  res.setHeader('Content-Length', zipBuffer.length);
  res.send(zipBuffer);
}

/**
 * Parse an uploaded components export archive (.zip or .json) and provide smart DB match candidates
 * for both components and packages
 */
async function parseComponentsExportPackage(fileBuffer, originalName, pool, mediaDir) {
  let manifest = null;
  let isZip = false;
  const tempDir = path.join(mediaDir, 'temp_imports');
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }

  const ext = path.extname(originalName).toLowerCase();
  let zip = null;

  if (ext === '.zip') {
    isZip = true;
    zip = new AdmZip(fileBuffer);
    const manifestEntry = zip.getEntry('manifest.json') || zip.getEntry('components.json');

    if (!manifestEntry) {
      throw new Error('Invalid components export: manifest.json not found inside ZIP archive');
    }

    const manifestText = zip.readAsText(manifestEntry);
    manifest = JSON.parse(manifestText);

    const tempFileId = `comp_import_${Date.now()}_${Math.random().toString(36).substring(2, 9)}.zip`;
    const tempZipPath = path.join(tempDir, tempFileId);
    fs.writeFileSync(tempZipPath, fileBuffer);
    manifest._tempFileId = tempFileId;
  } else if (ext === '.json') {
    const jsonText = fileBuffer.toString('utf8');
    manifest = JSON.parse(jsonText);

    const tempFileId = `comp_import_${Date.now()}_${Math.random().toString(36).substring(2, 9)}.json`;
    const tempJsonPath = path.join(tempDir, tempFileId);
    fs.writeFileSync(tempJsonPath, fileBuffer);
    manifest._tempFileId = tempFileId;
  } else {
    throw new Error('Unsupported file format. Please upload a .zip or .json components export file.');
  }

  // Extract raw components list (also support project export archives that have manifest.bom)
  let rawComponents = [];
  if (Array.isArray(manifest.components)) {
    rawComponents = manifest.components;
  } else if (Array.isArray(manifest.bom)) {
    rawComponents = manifest.bom.map(b => b.component).filter(Boolean);
  }

  if (rawComponents.length === 0) {
    throw new Error('No component definitions found in the uploaded file');
  }

  // Fetch existing catalog data for smart matching
  const [existingComponents] = await pool.query(`
    SELECT 
      c.ID,
      c.component,
      c.marking,
      c.description,
      c.shortDescription,
      c.qty,
      COALESCE(c.minQty, 0) AS minQty,
      c.category_id,
      c.package_id,
      c.photoURL,
      c.datasheetURL,
      cat.category,
      pkg.package,
      pkg.pinQuantity,
      pkg.isSmd
    FROM i_components c
    LEFT JOIN i_categories cat ON c.category_id = cat.ID
    LEFT JOIN i_packages pkg ON c.package_id = pkg.ID
    ORDER BY c.component ASC
  `);

  const [existingCategories] = await pool.query(
    'SELECT ID, category, groupId FROM i_categories ORDER BY category ASC'
  );

  const [existingPackages] = await pool.query(
    'SELECT ID, package, pinQuantity, isSmd, drawingURL FROM i_packages ORDER BY package ASC'
  );

  // Map and match each imported component
  const mappedComponents = rawComponents.map((comp, index) => {
    const compName = (comp.component || '').trim();
    const compMarking = (comp.marking || '').trim();
    const compCategory = (comp.category || comp.categoryName || '').trim();
    const compPackage = (comp.package || comp.packageName || '').trim();
    const pinQuantity = comp.pinQuantity !== undefined && comp.pinQuantity !== null ? parseInt(comp.pinQuantity, 10) : null;
    const isSmd = comp.isSmd !== undefined && comp.isSmd !== null ? parseInt(comp.isSmd, 10) : 1;
    const drawingURL = comp.drawingURL ? String(comp.drawingURL).trim() : null;
    const photoURL = comp.photoURL ? String(comp.photoURL).trim() : null;
    const datasheetURL = comp.datasheetURL ? String(comp.datasheetURL).trim() : null;

    // Smart matching against existing database components
    let matched = null;
    let matchType = 'none';
    let matchReason = 'New component';

    // 1. Exact match by Component Name AND Package Name
    if (compName && compPackage) {
      matched = existingComponents.find(ec =>
        (ec.component || '').trim().toLowerCase() === compName.toLowerCase() &&
        (ec.package || '').trim().toLowerCase() === compPackage.toLowerCase()
      );
      if (matched) {
        matchType = 'exact';
        matchReason = `Exact match #${matched.ID} (${matched.component} • ${matched.package})`;
      }
    }

    // 2. Exact match by Component Name only
    if (!matched && compName) {
      matched = existingComponents.find(ec =>
        (ec.component || '').trim().toLowerCase() === compName.toLowerCase()
      );
      if (matched) {
        matchType = 'exact';
        matchReason = `Matches part name #${matched.ID} (${matched.component})`;
      }
    }

    // 3. Suggested match by Marking code
    if (!matched && compMarking) {
      matched = existingComponents.find(ec =>
        ec.marking && ec.marking.trim().toLowerCase() === compMarking.toLowerCase()
      );
      if (matched) {
        matchType = 'suggested';
        matchReason = `Matches marking "${compMarking}" (#${matched.ID} ${matched.component})`;
      }
    }

    // Check if component photo is embedded in ZIP and build base64 preview
    let hasPhotoInZip = false;
    let photoPreviewDataUrl = null;
    if (isZip && zip && photoURL && !/^https?:\/\//i.test(photoURL)) {
      const basePhoto = path.basename(photoURL);
      const entry = zip.getEntry(`components/photos/${basePhoto}`) ||
                    zip.getEntry(`photos/${basePhoto}`) ||
                    zip.getEntry(`components/${basePhoto}`) ||
                    zip.getEntry(photoURL) ||
                    zip.getEntry(basePhoto);
      if (entry) {
        hasPhotoInZip = true;
        try {
          const entryExt = path.extname(basePhoto).toLowerCase();
          const mime = entryExt === '.jpg' || entryExt === '.jpeg'
            ? 'image/jpeg'
            : (entryExt === '.svg' ? 'image/svg+xml' : (entryExt === '.webp' ? 'image/webp' : 'image/png'));
          const base64 = entry.getData().toString('base64');
          photoPreviewDataUrl = `data:${mime};base64,${base64}`;
        } catch {
          // ignore preview failure
        }
      }
    }

    // Check if datasheet is embedded in ZIP
    let hasDatasheetInZip = false;
    if (isZip && zip && datasheetURL && !/^https?:\/\//i.test(datasheetURL)) {
      const baseDs = path.basename(datasheetURL);
      const dsEntry = zip.getEntry(`components/datasheets/${baseDs}`) ||
                      zip.getEntry(`datasheets/${baseDs}`) ||
                      zip.getEntry(datasheetURL) ||
                      zip.getEntry(baseDs);
      if (dsEntry) {
        hasDatasheetInZip = true;
      }
    }

    return {
      importIndex: index,
      selected: true,
      component: compName,
      marking: compMarking,
      category: compCategory,
      package: compPackage,
      pinQuantity,
      isSmd,
      drawingURL,
      description: comp.description || '',
      shortDescription: comp.shortDescription || '',
      datasheetURL,
      photoURL,
      hasPhotoInZip,
      photoPreviewDataUrl,
      hasDatasheetInZip,
      qty: comp.qty != null ? parseInt(comp.qty, 10) : 0,
      minQty: comp.minQty != null ? parseInt(comp.minQty, 10) : 0,
      customFields: Array.isArray(comp.customFields) ? comp.customFields : [],
      warehouse: Array.isArray(comp.warehouse) ? comp.warehouse : [],
      matchType, // 'exact' | 'suggested' | 'none'
      matchReason,
      targetComponentId: matched ? matched.ID : null,
      action: matched ? 'update' : 'create' // 'update' | 'create'
    };
  });

  // Extract unique packages from manifest.packages + mappedComponents
  const rawPackagesMap = new Map();
  if (Array.isArray(manifest.packages)) {
    for (const p of manifest.packages) {
      const pName = (p.package || '').trim();
      if (pName && !rawPackagesMap.has(pName.toLowerCase())) {
        rawPackagesMap.set(pName.toLowerCase(), {
          package: pName,
          pinQuantity: p.pinQuantity !== undefined && p.pinQuantity !== null ? parseInt(p.pinQuantity, 10) : null,
          isSmd: p.isSmd !== undefined && p.isSmd !== null ? parseInt(p.isSmd, 10) : 1,
          drawingURL: p.drawingURL ? String(p.drawingURL).trim() : null
        });
      }
    }
  }

  for (const c of mappedComponents) {
    const pName = (c.package || '').trim();
    if (pName && !rawPackagesMap.has(pName.toLowerCase())) {
      rawPackagesMap.set(pName.toLowerCase(), {
        package: pName,
        pinQuantity: c.pinQuantity,
        isSmd: c.isSmd,
        drawingURL: c.drawingURL
      });
    }
  }

  // Map and match each unique package against existingPackages
  const mappedPackages = Array.from(rawPackagesMap.values()).map((pkg, idx) => {
    const pkgName = pkg.package;
    const cleanTarget = pkgName.toLowerCase();
    const normTarget = cleanTarget.replace(/[^a-z0-9]/g, '');

    let matchedPkg = existingPackages.find(ep => ep.package.trim().toLowerCase() === cleanTarget);
    let matchType = matchedPkg ? 'exact' : 'none';

    if (!matchedPkg && normTarget) {
      matchedPkg = existingPackages.find(ep =>
        ep.package.toLowerCase().replace(/[^a-z0-9]/g, '') === normTarget
      );
      if (matchedPkg) {
        matchType = 'suggested';
      }
    }

    // Check if package drawing is embedded in ZIP
    let hasDrawingInZip = false;
    let previewDataUrl = null;
    if (isZip && zip && pkg.drawingURL && !/^https?:\/\//i.test(pkg.drawingURL)) {
      const baseDrawing = path.basename(pkg.drawingURL);
      const entry = zip.getEntry(`packages/${baseDrawing}`) ||
                    zip.getEntry(`drawings/${baseDrawing}`) ||
                    zip.getEntry(`packages/${pkg.drawingURL}`) ||
                    zip.getEntry(`drawings/${pkg.drawingURL}`) ||
                    zip.getEntry(pkg.drawingURL) ||
                    zip.getEntry(baseDrawing);
      if (entry) {
        hasDrawingInZip = true;
        try {
          const entryExt = path.extname(baseDrawing).toLowerCase();
          const mime = entryExt === '.jpg' || entryExt === '.jpeg'
            ? 'image/jpeg'
            : (entryExt === '.svg' ? 'image/svg+xml' : 'image/png');
          const base64 = entry.getData().toString('base64');
          previewDataUrl = `data:${mime};base64,${base64}`;
        } catch {
          // ignore preview data url failure
        }
      }
    }

    return {
      importIndex: idx,
      selected: true,
      package: pkgName,
      pinQuantity: pkg.pinQuantity,
      isSmd: pkg.isSmd,
      drawingURL: pkg.drawingURL,
      hasDrawingInZip,
      previewDataUrl,
      matchType,
      matchReason: matchedPkg ? `Matches existing package #${matchedPkg.ID} (${matchedPkg.package})` : 'New package footprint',
      targetPackageId: matchedPkg ? matchedPkg.ID : null,
      action: matchedPkg ? 'update' : 'create' // 'update' | 'create'
    };
  });

  return {
    success: true,
    tempFileId: manifest._tempFileId,
    format: manifest.format || 'bommanager-components-export',
    componentsCount: mappedComponents.length,
    packagesCount: mappedPackages.length,
    components: mappedComponents,
    packages: mappedPackages,
    existingComponents,
    existingPackages,
    existingCategories
  };
}

/**
 * Helper to sync custom field values for an imported component
 */
async function syncImportedCustomFields(conn, componentId, categoryId, customFields) {
  if (!categoryId || !Array.isArray(customFields) || customFields.length === 0) return;

  for (const f of customFields) {
    const fieldName = (f.fieldName || '').trim();
    const rawVal = f.fieldValue !== undefined && f.fieldValue !== null ? String(f.fieldValue).trim() : '';
    if (!fieldName || rawVal === '') continue;

    // Ensure field definition exists in t_category_fields for this category
    const [fRows] = await conn.query(
      'SELECT id, fieldType FROM t_category_fields WHERE categoryId = ? AND LOWER(fieldName) = LOWER(?)',
      [categoryId, fieldName]
    );

    let fieldId = fRows[0]?.id;
    if (!fieldId) {
      const [newField] = await conn.query(
        'INSERT INTO t_category_fields (categoryId, fieldName, fieldLabel, fieldType, unit, sortOrder) VALUES (?, ?, ?, ?, ?, ?)',
        [
          categoryId,
          fieldName,
          f.fieldLabel ? String(f.fieldLabel).trim() : fieldName,
          f.fieldType || 'number',
          f.unit || null,
          0
        ]
      );
      fieldId = newField.insertId;
    }

    const parsedNum = f.numValue !== undefined && f.numValue !== null && !isNaN(Number(f.numValue))
      ? Number(f.numValue)
      : (!isNaN(parseFloat(rawVal)) ? parseFloat(rawVal) : null);

    await conn.query(
      `INSERT INTO t_component_field_values (componentId, fieldId, fieldValue, numValue)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE fieldValue = VALUES(fieldValue), numValue = VALUES(numValue)`,
      [componentId, fieldId, rawVal, parsedNum]
    );
  }
}

/**
 * Execute components and packages import into the database
 */
async function executeComponentsImport(payload, pool, mediaDir) {
  const {
    tempFileId,
    components = [],
    packages = [],
    importStock = true
  } = payload;

  if (!Array.isArray(components) || components.length === 0) {
    throw new Error('No components provided for import');
  }

  const tempDir = path.join(mediaDir, 'temp_imports');
  const componentsMediaDir = path.join(mediaDir, 'components');
  const datasheetsMediaDir = path.join(mediaDir, 'datasheets');
  const packagesMediaDir = path.join(mediaDir, 'packages');

  [componentsMediaDir, datasheetsMediaDir, packagesMediaDir].forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });

  let zip = null;
  if (tempFileId) {
    const tempFilePath = path.join(tempDir, tempFileId);
    if (fs.existsSync(tempFilePath) && tempFileId.endsWith('.zip')) {
      try {
        zip = new AdmZip(tempFilePath);
      } catch (err) {
        console.warn('Could not read temporary zip archive during component import:', err.message);
      }
    }
  }

  let createdCount = 0;
  let updatedCount = 0;
  let skippedCount = 0;
  let createdPackagesCount = 0;
  let updatedPackagesCount = 0;
  let createdCategoriesCount = 0;

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // 1. Pre-load existing packages & process package mappings from Step 3
    const [dbPackages] = await conn.query('SELECT ID, package FROM i_packages');
    const resolvedPackageMap = new Map();
    dbPackages.forEach(p => {
      if (p.package) {
        resolvedPackageMap.set(p.package.trim().toLowerCase(), p.ID);
      }
    });

    if (Array.isArray(packages)) {
      for (const pkg of packages) {
        const pkgName = (pkg.package || '').trim();
        if (!pkgName) continue;

        const pins = pkg.pinQuantity !== undefined && pkg.pinQuantity !== null && pkg.pinQuantity !== ''
          ? parseInt(pkg.pinQuantity, 10)
          : null;
        const isSmd = pkg.isSmd !== undefined && pkg.isSmd !== null ? parseInt(pkg.isSmd, 10) : 1;
        let finalDrawingURL = pkg.drawingURL ? String(pkg.drawingURL).trim() : null;

        // Extract package drawing from zip if present
        if (zip && finalDrawingURL && !/^https?:\/\//i.test(finalDrawingURL)) {
          const baseDrawing = path.basename(finalDrawingURL);
          const entry = zip.getEntry(`packages/${baseDrawing}`) ||
                        zip.getEntry(`drawings/${baseDrawing}`) ||
                        zip.getEntry(`packages/${finalDrawingURL}`) ||
                        zip.getEntry(`drawings/${finalDrawingURL}`) ||
                        zip.getEntry(finalDrawingURL) ||
                        zip.getEntry(baseDrawing);
          if (entry) {
            const destFile = sanitizeFileName(path.parse(baseDrawing).name) + path.extname(baseDrawing).toLowerCase();
            const destPath = path.join(packagesMediaDir, destFile);
            fs.writeFileSync(destPath, entry.getData());
            finalDrawingURL = destFile;
          }
        }

        if (pkg.action === 'update' && pkg.targetPackageId) {
          if (finalDrawingURL) {
            await conn.query(
              'UPDATE i_packages SET pinQuantity = COALESCE(?, pinQuantity), isSmd = ?, drawingURL = ? WHERE ID = ?',
              [pins, isSmd, finalDrawingURL, pkg.targetPackageId]
            );
          } else {
            await conn.query(
              'UPDATE i_packages SET pinQuantity = COALESCE(?, pinQuantity), isSmd = ? WHERE ID = ?',
              [pins, isSmd, pkg.targetPackageId]
            );
          }
          resolvedPackageMap.set(pkgName.toLowerCase(), pkg.targetPackageId);
          updatedPackagesCount++;
        } else if (pkg.action === 'create') {
          const existingId = resolvedPackageMap.get(pkgName.toLowerCase());
          if (existingId) {
            if (finalDrawingURL) {
              await conn.query(
                'UPDATE i_packages SET pinQuantity = COALESCE(?, pinQuantity), isSmd = ?, drawingURL = ? WHERE ID = ?',
                [pins, isSmd, finalDrawingURL, existingId]
              );
            }
            resolvedPackageMap.set(pkgName.toLowerCase(), existingId);
          } else {
            const [insPkg] = await conn.query(
              'INSERT INTO i_packages (package, pinQuantity, isSmd, drawingURL) VALUES (?, ?, ?, ?)',
              [pkgName, pins, isSmd, finalDrawingURL]
            );
            resolvedPackageMap.set(pkgName.toLowerCase(), insPkg.insertId);
            createdPackagesCount++;
          }
        }
      }
    }

    // 2. Pre-load existing categories
    const [dbCategories] = await conn.query('SELECT ID, category FROM i_categories');
    const resolvedCategoryMap = new Map();
    dbCategories.forEach(cat => {
      if (cat.category) {
        resolvedCategoryMap.set(cat.category.trim().toLowerCase(), cat.ID);
      }
    });

    // 3. Process selected components
    for (const item of components) {
      if (!item.selected || item.action === 'skip') {
        skippedCount++;
        continue;
      }

      const compName = (item.component || '').trim();
      if (!compName) {
        skippedCount++;
        continue;
      }

      // Resolve Category ID (match by name or create new)
      let categoryId = null;
      const catName = (item.category || '').trim();
      if (catName) {
        const lowerCat = catName.toLowerCase();
        if (resolvedCategoryMap.has(lowerCat)) {
          categoryId = resolvedCategoryMap.get(lowerCat);
        } else {
          const [insCat] = await conn.query(
            'INSERT INTO i_categories (category, groupId) VALUES (?, 1)',
            [catName]
          );
          categoryId = insCat.insertId;
          resolvedCategoryMap.set(lowerCat, categoryId);
          createdCategoriesCount++;
        }
      }

      // Resolve Package ID from Step 3 mapping
      let packageId = 28;
      const pkgName = (item.package || '').trim();
      if (pkgName && resolvedPackageMap.has(pkgName.toLowerCase())) {
        packageId = resolvedPackageMap.get(pkgName.toLowerCase());
      }

      // Extract component photo from ZIP if present
      let finalPhotoURL = item.photoURL ? String(item.photoURL).trim() : null;
      if (zip && finalPhotoURL && !/^https?:\/\//i.test(finalPhotoURL)) {
        const basePhoto = path.basename(finalPhotoURL);
        const photoEntry = zip.getEntry(`components/photos/${basePhoto}`) ||
                           zip.getEntry(`photos/${basePhoto}`) ||
                           zip.getEntry(`components/${basePhoto}`) ||
                           zip.getEntry(finalPhotoURL) ||
                           zip.getEntry(basePhoto);
        if (photoEntry) {
          const destPhoto = sanitizeFileName(path.parse(basePhoto).name) + path.extname(basePhoto).toLowerCase();
          const destPhotoPath = path.join(componentsMediaDir, destPhoto);
          fs.writeFileSync(destPhotoPath, photoEntry.getData());
          finalPhotoURL = destPhoto;
        }
      }

      // Extract component datasheet from ZIP if present
      let finalDatasheetURL = item.datasheetURL ? String(item.datasheetURL).trim() : null;
      if (zip && finalDatasheetURL && !/^https?:\/\//i.test(finalDatasheetURL)) {
        const baseDs = path.basename(finalDatasheetURL);
        const dsEntry = zip.getEntry(`components/datasheets/${baseDs}`) ||
                        zip.getEntry(`datasheets/${baseDs}`) ||
                        zip.getEntry(finalDatasheetURL) ||
                        zip.getEntry(baseDs);
        if (dsEntry) {
          const destDs = sanitizeFileName(path.parse(baseDs).name) + path.extname(baseDs).toLowerCase();
          const destDsPath = path.join(datasheetsMediaDir, destDs);
          fs.writeFileSync(destDsPath, dsEntry.getData());
          finalDatasheetURL = destDs;
        }
      }

      const qty = importStock && item.qty !== undefined && item.qty !== null ? parseInt(item.qty, 10) : 0;
      const minQty = item.minQty !== undefined && item.minQty !== null ? parseInt(item.minQty, 10) : 0;

      if (item.action === 'update' && item.targetComponentId) {
        // Update existing component
        const updateQuery = importStock
          ? `UPDATE i_components
             SET category_id = COALESCE(?, category_id),
                 package_id = COALESCE(?, package_id),
                 description = COALESCE(NULLIF(?, ''), description),
                 shortDescription = COALESCE(NULLIF(?, ''), shortDescription),
                 marking = COALESCE(NULLIF(?, ''), marking),
                 datasheetURL = COALESCE(?, datasheetURL),
                 photoURL = COALESCE(?, photoURL),
                 qty = ?,
                 minQty = ?
             WHERE ID = ?`
          : `UPDATE i_components
             SET category_id = COALESCE(?, category_id),
                 package_id = COALESCE(?, package_id),
                 description = COALESCE(NULLIF(?, ''), description),
                 shortDescription = COALESCE(NULLIF(?, ''), shortDescription),
                 marking = COALESCE(NULLIF(?, ''), marking),
                 datasheetURL = COALESCE(?, datasheetURL),
                 photoURL = COALESCE(?, photoURL),
                 minQty = ?
             WHERE ID = ?`;

        const updateParams = importStock
          ? [
              categoryId,
              packageId,
              item.description || '',
              item.shortDescription || '',
              item.marking || '',
              finalDatasheetURL,
              finalPhotoURL,
              qty,
              minQty,
              item.targetComponentId
            ]
          : [
              categoryId,
              packageId,
              item.description || '',
              item.shortDescription || '',
              item.marking || '',
              finalDatasheetURL,
              finalPhotoURL,
              minQty,
              item.targetComponentId
            ];

        await conn.query(updateQuery, updateParams);

        // Lookup effective categoryId for custom fields
        let effectiveCategoryId = categoryId;
        if (!effectiveCategoryId) {
          const [cRows] = await conn.query('SELECT category_id FROM i_components WHERE ID = ?', [item.targetComponentId]);
          effectiveCategoryId = cRows[0]?.category_id || null;
        }
        await syncImportedCustomFields(conn, item.targetComponentId, effectiveCategoryId, item.customFields);

        updatedCount++;
      } else {
        // Create new component
        const [insComp] = await conn.query(
          `INSERT INTO i_components
           (component, category_id, package_id, description, shortDescription, marking, datasheetURL, photoURL, qty, minQty)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            compName,
            categoryId,
            packageId,
            item.description ? item.description.trim() : null,
            item.shortDescription ? item.shortDescription.trim() : null,
            item.marking ? item.marking.trim() : null,
            finalDatasheetURL,
            finalPhotoURL,
            qty,
            minQty
          ]
        );

        const newCompId = insComp.insertId;
        await syncImportedCustomFields(conn, newCompId, categoryId, item.customFields);
        createdCount++;
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
    createdPackagesCount,
    updatedPackagesCount,
    createdCategoriesCount,
    totalProcessed: createdCount + updatedCount
  };
}

module.exports = {
  sanitizeFileName,
  exportComponentsToZip,
  parseComponentsExportPackage,
  executeComponentsImport
};
