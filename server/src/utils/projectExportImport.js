const fs = require('fs');
const path = require('path');
const archiver = require('archiver');
const AdmZip = require('adm-zip');

/**
 * Clean and sanitize a filename for zip or filesystem storage
 */
function sanitizeFileName(name) {
  if (!name) return 'project';
  return name.replace(/[^a-zA-Z0-9._-]/g, '_').replace(/_+/g, '_').trim();
}

/**
 * Find matching category from catalog
 */
function findMatchingCategory(catName, categories) {
  if (!catName || !categories?.length) return null;
  const clean = catName.trim().toLowerCase();
  const match = categories.find(c => c.category.toLowerCase() === clean);
  return match ? match.ID : null;
}

/**
 * Find matching package from catalog
 */
function findMatchingPackage(pkgName, packages) {
  if (!pkgName || !packages?.length) return null;
  const clean = pkgName.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
  const match = packages.find(p => {
    const pClean = p.package.toLowerCase().replace(/[^a-z0-9]/g, '');
    return pClean === clean;
  });
  return match ? match.ID : null;
}

/**
 * Match exported components against existing database catalog
 */
async function matchExportedComponents(bomItems, pool) {
  const [components] = await pool.query(`
    SELECT 
      c.ID, 
      c.component, 
      c.marking, 
      c.description, 
      c.shortDescription, 
      c.qty, 
      c.category_id, 
      c.package_id,
      cat.category,
      pkg.package
    FROM i_components c
    LEFT JOIN i_categories cat ON c.category_id = cat.ID
    LEFT JOIN i_packages pkg ON c.package_id = pkg.ID
  `);

  const [categories] = await pool.query('SELECT ID, category FROM i_categories ORDER BY category ASC');
  const [packages] = await pool.query('SELECT ID, package, isSmd FROM i_packages ORDER BY package ASC');

  return (bomItems || []).map((item, idx) => {
    const rawComp = item.component || {};
    const compName = (rawComp.component || '').trim();
    const compMarking = (rawComp.marking || '').trim();
    const compPkgName = (rawComp.package || rawComp.packageName || '').trim();
    const compCatName = (rawComp.category || rawComp.categoryName || '').trim();

    let matched = null;
    let matchConfidence = 'none';
    let matchReason = '';

    // 1. Exact match by Component Name AND Package Name
    if (compName && compPkgName) {
      matched = components.find(c => {
        const nameMatch = (c.component || '').toLowerCase() === compName.toLowerCase();
        const pkgMatch = (c.package || '').toLowerCase() === compPkgName.toLowerCase();
        return nameMatch && pkgMatch;
      });
      if (matched) {
        matchConfidence = 'exact';
        matchReason = `Exact match by part name "${compName}" and package "${compPkgName}"`;
      }
    }

    // 2. Exact match by Component Name only
    if (!matched && compName) {
      matched = components.find(c => (c.component || '').toLowerCase() === compName.toLowerCase());
      if (matched) {
        matchConfidence = 'exact';
        matchReason = `Matched component name "${compName}"`;
      }
    }

    // 3. Match by Marking
    if (!matched && compMarking) {
      matched = components.find(c => (c.marking || '').toLowerCase() === compMarking.toLowerCase());
      if (matched) {
        matchConfidence = 'suggested';
        matchReason = `Matched marking code "${compMarking}"`;
      }
    }

    // Resolve suggested category and package
    const suggestedCatId = findMatchingCategory(compCatName, categories);
    const suggestedPkgId = findMatchingPackage(compPkgName, packages) || (packages.find(p => p.package.toLowerCase() === 'unknown')?.ID || 1);

    const hasMatch = !!matched;

    return {
      index: idx + 1,
      quantity: parseInt(item.quantity || 1, 10),
      comment: item.comment || '',
      designators: item.comment || '',
      value: compName,
      footprint: compPkgName,
      cleanedFootprint: compPkgName,
      categoryName: compCatName,
      packageName: compPkgName,
      matchedComponent: matched ? {
        ID: matched.ID,
        component: matched.component,
        marking: matched.marking,
        package: matched.package,
        package_id: matched.package_id,
        category: matched.category,
        category_id: matched.category_id,
        shortDescription: matched.shortDescription,
        qty: matched.qty
      } : null,
      selectedComponentId: matched ? matched.ID : null,
      matchConfidence,
      matchReason,
      createAsNew: !hasMatch,
      selected: true,
      suggestedCategoryId: suggestedCatId,
      suggestedPackageId: suggestedPkgId,
      originalComponentData: rawComp,
      newCompData: {
        component: compName || 'New Component',
        category_id: suggestedCatId,
        package_id: suggestedPkgId,
        marking: compMarking,
        description: rawComp.description || '',
        shortDescription: rawComp.shortDescription || (compName ? `${compName} ${compPkgName}`.trim() : ''),
        datasheetURL: rawComp.datasheetURL || '',
        photoURL: rawComp.photoURL || '',
        qty: 0,
        customFields: Array.isArray(rawComp.customFields) ? rawComp.customFields : []
      }
    };
  });
}

/**
 * Export project with BOM, components, custom fields, and attachments to a ZIP stream
 */
async function exportProjectToZip(projectId, pool, mediaDir, res) {
  // 1. Fetch Project Data
  const [projRows] = await pool.query(
    'SELECT id, projectName, description, url, photoUrl FROM i_projects WHERE id = ?',
    [projectId]
  );
  if (projRows.length === 0) {
    throw new Error(`Project #${projectId} not found`);
  }
  const project = projRows[0];

  // 2. Fetch Project Tags
  const [tagRows] = await pool.query(
    `SELECT t.name FROM t_project_tags pt JOIN t_tags t ON pt.tagId = t.id WHERE pt.projectId = ? ORDER BY t.name ASC`,
    [projectId]
  );
  const tags = tagRows.map(r => r.name);

  // 3. Fetch BOM and Component Details
  const [bomRows] = await pool.query(
    `SELECT 
      b.id AS bomId,
      b.quantity,
      b.comment,
      c.ID AS componentId,
      c.component,
      c.marking,
      c.description,
      c.shortDescription,
      c.datasheetURL,
      c.photoURL,
      cat.category AS categoryName,
      pkg.package AS packageName,
      pkg.isSmd,
      pkg.pinQuantity,
      pkg.drawingURL
     FROM t_bom b
     JOIN i_components c ON b.componentId = c.ID
     LEFT JOIN i_categories cat ON c.category_id = cat.ID
     LEFT JOIN i_packages pkg ON c.package_id = pkg.ID
     WHERE b.projectId = ?
     ORDER BY b.id ASC`,
    [projectId]
  );

  // 4. Fetch Custom Field Values for Components in BOM
  const componentIds = [...new Set(bomRows.map(r => r.componentId).filter(Boolean))];
  const customFieldsByComp = new Map();

  if (componentIds.length > 0) {
    try {
      const placeholders = componentIds.map(() => '?').join(',');
      const [fieldRows] = await pool.query(
        `SELECT 
          cfv.componentId,
          f.fieldName,
          f.fieldLabel,
          f.fieldType,
          f.unit,
          cfv.fieldValue
         FROM t_component_field_values cfv
         JOIN t_category_fields f ON cfv.fieldId = f.id
         WHERE cfv.componentId IN (${placeholders}) 
           AND cfv.fieldValue IS NOT NULL 
           AND TRIM(cfv.fieldValue) != ''`,
        componentIds
      );

      fieldRows.forEach(r => {
        if (!customFieldsByComp.has(r.componentId)) {
          customFieldsByComp.set(r.componentId, []);
        }
        customFieldsByComp.get(r.componentId).push({
          fieldName: r.fieldName,
          fieldLabel: r.fieldLabel,
          fieldType: r.fieldType,
          unit: r.unit,
          fieldValue: r.fieldValue
        });
      });
    } catch (err) {
      console.warn('Failed to query custom field values for project export:', err.message);
    }
  }

  // 5. Fetch Attached Files
  const [fileRows] = await pool.query(
    `SELECT id, fileName, originalName, fileSize, fileType, mimeType, description 
     FROM t_project_files 
     WHERE projectId = ? 
     ORDER BY uploadedAt DESC, id DESC`,
    [projectId]
  );

  // Format BOM items for manifest
  const bomItems = bomRows.map(r => ({
    quantity: r.quantity,
    comment: r.comment || '',
    component: {
      component: r.component,
      marking: r.marking || '',
      description: r.description || '',
      shortDescription: r.shortDescription || '',
      category: r.categoryName || '',
      package: r.packageName || '',
      isSmd: r.isSmd,
      pinQuantity: r.pinQuantity,
      drawingURL: r.drawingURL || '',
      datasheetURL: r.datasheetURL || '',
      photoURL: r.photoURL || '',
      customFields: customFieldsByComp.get(r.componentId) || []
    }
  }));

  // Format Attachments for manifest
  const attachments = fileRows.map(f => ({
    fileName: f.fileName,
    originalName: f.originalName,
    fileSize: f.fileSize,
    fileType: f.fileType,
    mimeType: f.mimeType,
    description: f.description || '',
    archivePath: `attachments/${f.fileName}`
  }));

  // Build Manifest Object
  const manifest = {
    format: 'bommanager-project-export',
    version: '1.0',
    appVersion: '0.3.4',
    exportedAt: new Date().toISOString(),
    project: {
      projectName: project.projectName,
      description: project.description || '',
      url: project.url || '',
      photoUrl: project.photoUrl || '',
      tags
    },
    bom: bomItems,
    attachments
  };

  // 6. Build ZIP archive with AdmZip
  const safeTitle = sanitizeFileName(project.projectName) || `project_${projectId}`;
  const zipFilename = `${safeTitle}_export.zip`;

  const zip = new AdmZip();

  // Append manifest.json
  zip.addFile('manifest.json', Buffer.from(JSON.stringify(manifest, null, 2), 'utf8'));

  // Append Project Photo if it exists on disk
  if (project.photoUrl && !/^https?:\/\//i.test(project.photoUrl)) {
    const photoPath = path.join(mediaDir, 'projects', project.photoUrl);
    if (fs.existsSync(photoPath) && fs.statSync(photoPath).isFile()) {
      zip.addLocalFile(photoPath, 'photo');
    }
  }

  // Append Attachment Files if they exist on disk
  for (const f of fileRows) {
    const filePath = path.join(mediaDir, 'projects', 'attachments', String(projectId), f.fileName);
    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      zip.addLocalFile(filePath, 'attachments');
    }
  }

  // Append Component Photos
  const compPhotos = [...new Set(bomRows.map(r => r.photoURL).filter(p => p && !/^https?:\/\//i.test(p)))];
  for (const p of compPhotos) {
    const pPath = path.join(mediaDir, 'components', p);
    if (fs.existsSync(pPath) && fs.statSync(pPath).isFile()) {
      zip.addLocalFile(pPath, 'components/photos');
    }
  }

  // Append Component Datasheets
  const compDatasheets = [...new Set(bomRows.map(r => r.datasheetURL).filter(d => d && !/^https?:\/\//i.test(d)))];
  for (const d of compDatasheets) {
    const dPath = path.join(mediaDir, 'datasheets', d);
    if (fs.existsSync(dPath) && fs.statSync(dPath).isFile()) {
      zip.addLocalFile(dPath, 'components/datasheets');
    }
  }

  // Append Package Drawings
  const pkgDrawings = [...new Set(bomRows.map(r => r.drawingURL).filter(dr => dr && !/^https?:\/\//i.test(dr)))];
  for (const dr of pkgDrawings) {
    const drPath = path.join(mediaDir, 'packages', dr);
    if (fs.existsSync(drPath) && fs.statSync(drPath).isFile()) {
      zip.addLocalFile(drPath, 'packages');
    }
  }

  const zipBuffer = zip.toBuffer();

  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(zipFilename)}"`);
  res.setHeader('Content-Length', zipBuffer.length);
  res.send(zipBuffer);
}

/**
 * Parse an uploaded project archive (.zip or .json) and provide DB match candidates
 */
async function parseProjectExportPackage(fileBuffer, originalName, pool, mediaDir) {
  let manifest = null;
  let isZip = false;
  let tempZipPath = null;
  const tempDir = path.join(mediaDir, 'temp_imports');
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }

  const ext = path.extname(originalName).toLowerCase();

  if (ext === '.zip') {
    isZip = true;
    const zip = new AdmZip(fileBuffer);
    const manifestEntry = zip.getEntry('manifest.json') || zip.getEntry('project.json');

    if (!manifestEntry) {
      throw new Error('Invalid project export: manifest.json not found inside ZIP archive');
    }

    const manifestText = zip.readAsText(manifestEntry);
    manifest = JSON.parse(manifestText);

    // Save temporary zip for the execution step
    const tempFileId = `proj_import_${Date.now()}_${Math.random().toString(36).substring(2, 9)}.zip`;
    tempZipPath = path.join(tempDir, tempFileId);
    fs.writeFileSync(tempZipPath, fileBuffer);
    manifest._tempFileId = tempFileId;
  } else if (ext === '.json') {
    const jsonText = fileBuffer.toString('utf8');
    manifest = JSON.parse(jsonText);

    const tempFileId = `proj_import_${Date.now()}_${Math.random().toString(36).substring(2, 9)}.json`;
    tempZipPath = path.join(tempDir, tempFileId);
    fs.writeFileSync(tempZipPath, fileBuffer);
    manifest._tempFileId = tempFileId;
  } else {
    throw new Error('Unsupported file format. Please upload a .zip or .json project export file.');
  }

  if (!manifest.project || !manifest.project.projectName) {
    throw new Error('Invalid project manifest: missing project metadata');
  }

  // Match BOM items against database
  const mappedItems = await matchExportedComponents(manifest.bom || [], pool);

  // Check which attachments are present in ZIP
  let availableAttachments = [];
  if (Array.isArray(manifest.attachments)) {
    availableAttachments = manifest.attachments.map(att => ({
      ...att,
      selected: true
    }));
  }

  return {
    success: true,
    tempFileId: manifest._tempFileId,
    format: manifest.format || 'bommanager-project-export',
    appVersion: manifest.appVersion || 'unknown',
    exportedAt: manifest.exportedAt || null,
    project: {
      projectName: manifest.project.projectName,
      description: manifest.project.description || '',
      url: manifest.project.url || '',
      photoUrl: manifest.project.photoUrl || '',
      tags: Array.isArray(manifest.project.tags) ? manifest.project.tags : [],
      hasPhotoFile: isZip && !!manifest.project.photoUrl
    },
    bomCount: mappedItems.length,
    totalQuantity: mappedItems.reduce((sum, it) => sum + it.quantity, 0),
    items: mappedItems,
    attachments: availableAttachments
  };
}

/**
 * Helper to extract a file from zip if present
 */
function extractZipEntryIfMissing(zip, possibleZipPaths, targetDir, targetFilename) {
  if (!zip || !targetFilename) return false;
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }
  const destPath = path.join(targetDir, targetFilename);
  if (fs.existsSync(destPath)) return true; // already exists

  for (const zPath of possibleZipPaths) {
    const entry = zip.getEntry(zPath);
    if (entry) {
      fs.writeFileSync(destPath, entry.getData());
      return true;
    }
  }
  return false;
}

/**
 * Execute the project import into the database
 */
async function executeProjectImport(importData, pool, mediaDir) {
  const {
    tempFileId,
    project,
    items = [],
    attachments = []
  } = importData;

  if (!project || !project.projectName || !project.projectName.trim()) {
    throw new Error('Project name is required');
  }

  const tempDir = path.join(mediaDir, 'temp_imports');
  const tempFilePath = tempFileId ? path.join(tempDir, tempFileId) : null;
  let zip = null;

  if (tempFilePath && fs.existsSync(tempFilePath)) {
    if (tempFilePath.endsWith('.zip')) {
      zip = new AdmZip(tempFilePath);
    }
  }

  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();

    // 1. Insert Project Record
    let finalPhotoUrl = null;

    // If photo is present in ZIP archive, extract to media/projects/
    if (zip && project.photoUrl && !/^https?:\/\//i.test(project.photoUrl)) {
      const photoEntry = zip.getEntry(`photo/${project.photoUrl}`) || zip.getEntry(project.photoUrl);
      if (photoEntry) {
        const projectsDir = path.join(mediaDir, 'projects');
        if (!fs.existsSync(projectsDir)) {
          fs.mkdirSync(projectsDir, { recursive: true });
        }

        const ext = path.extname(project.photoUrl);
        const safeBase = sanitizeFileName(path.parse(project.photoUrl).name) || 'proj_photo';
        let targetPhotoName = `${safeBase}_${Date.now()}${ext}`;
        let targetPhotoPath = path.join(projectsDir, targetPhotoName);

        fs.writeFileSync(targetPhotoPath, photoEntry.getData());
        finalPhotoUrl = targetPhotoName;
      }
    }

    const [projResult] = await conn.query(
      'INSERT INTO i_projects (projectName, description, url, photoUrl) VALUES (?, ?, ?, ?)',
      [
        project.projectName.trim(),
        project.description ? project.description.trim() : null,
        project.url ? project.url.trim() : null,
        finalPhotoUrl
      ]
    );

    const newProjectId = projResult.insertId;

    // 2. Sync Project Tags
    if (Array.isArray(project.tags) && project.tags.length > 0) {
      const uniqueTags = [...new Set(
        project.tags
          .map(t => typeof t === 'string' ? t.trim().toLowerCase() : (t?.name || '').trim().toLowerCase())
          .filter(Boolean)
      )];

      for (const tagName of uniqueTags) {
        await conn.query('INSERT IGNORE INTO t_tags (name) VALUES (?)', [tagName]);
        const [rows] = await conn.query('SELECT id FROM t_tags WHERE LOWER(name) = ?', [tagName]);
        if (rows.length > 0) {
          await conn.query('INSERT IGNORE INTO t_project_tags (projectId, tagId) VALUES (?, ?)', [newProjectId, rows[0].id]);
        }
      }
    }

    // 3. Extract & Save Attachments
    if (zip && Array.isArray(attachments)) {
      const targetAttachDir = path.join(mediaDir, 'projects', 'attachments', String(newProjectId));
      if (!fs.existsSync(targetAttachDir)) {
        fs.mkdirSync(targetAttachDir, { recursive: true });
      }

      for (const att of attachments) {
        if (!att.selected && att.selected !== undefined) continue;

        const archivePath = att.archivePath || `attachments/${att.fileName}`;
        const entry = zip.getEntry(archivePath) || zip.getEntry(att.fileName);

        if (entry) {
          const safeName = sanitizeFileName(att.fileName) || `attachment_${Date.now()}`;
          const destPath = path.join(targetAttachDir, safeName);
          fs.writeFileSync(destPath, entry.getData());

          await conn.query(
            `INSERT INTO t_project_files 
             (projectId, fileName, originalName, fileSize, fileType, mimeType, description) 
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
              newProjectId,
              safeName,
              att.originalName || safeName,
              att.fileSize || entry.header.size,
              att.fileType || 'other',
              att.mimeType || 'application/octet-stream',
              att.description || null
            ]
          );
        }
      }
    }

    // 4. Create New Components & Save BOM Rows
    const [categories] = await conn.query('SELECT ID, category FROM i_categories');
    const [packages] = await conn.query('SELECT ID, package, drawingURL FROM i_packages');

    let createdComponentsCount = 0;
    let importedBomCount = 0;

    for (const item of items) {
      if (!item.selected && item.selected !== undefined) continue;

      let finalComponentId = item.selectedComponentId;

      // Create new component if required
      if (item.createAsNew && item.newCompData) {
        const nc = item.newCompData;
        const compName = (nc.component || item.value || 'New Component').trim();
        let catId = nc.category_id || null;
        let pkgId = nc.package_id || null;

        // If category is missing but categoryName given, find or create
        if (!catId && item.categoryName) {
          const existingCat = categories.find(c => c.category.toLowerCase() === item.categoryName.trim().toLowerCase());
          if (existingCat) {
            catId = existingCat.ID;
          } else {
            const [newCat] = await conn.query('INSERT INTO i_categories (category, groupId) VALUES (?, ?)', [item.categoryName.trim(), 1]);
            catId = newCat.insertId;
            categories.push({ ID: catId, category: item.categoryName.trim() });
          }
        }

        // If package is missing but packageName given, find or create
        if (!pkgId && item.packageName) {
          const existingPkg = packages.find(p => p.package.toLowerCase() === item.packageName.trim().toLowerCase());
          if (existingPkg) {
            pkgId = existingPkg.ID;
          } else {
            const isSmd = item.originalComponentData?.isSmd ?? 1;
            const pinQty = item.originalComponentData?.pinQuantity ?? 0;
            let pkgDrawing = item.originalComponentData?.drawingURL || null;

            // Extract package drawing from zip if present
            if (zip && pkgDrawing && !/^https?:\/\//i.test(pkgDrawing)) {
              const safeDrName = path.basename(pkgDrawing);
              extractZipEntryIfMissing(
                zip,
                [`packages/${safeDrName}`, `packages/${pkgDrawing}`, safeDrName],
                path.join(mediaDir, 'packages'),
                safeDrName
              );
              pkgDrawing = safeDrName;
            }

            const [newPkg] = await conn.query(
              'INSERT INTO i_packages (package, isSmd, pinQuantity, drawingURL) VALUES (?, ?, ?, ?)',
              [item.packageName.trim(), isSmd, pinQty, pkgDrawing]
            );
            pkgId = newPkg.insertId;
            packages.push({ ID: pkgId, package: item.packageName.trim(), drawingURL: pkgDrawing });
          }
        }

        // Extract component photo from zip if present
        let compPhoto = nc.photoURL ? nc.photoURL.trim() : null;
        if (zip && compPhoto && !/^https?:\/\//i.test(compPhoto)) {
          const safePhotoName = path.basename(compPhoto);
          extractZipEntryIfMissing(
            zip,
            [`components/photos/${safePhotoName}`, `components/${safePhotoName}`, `photo/${safePhotoName}`, safePhotoName],
            path.join(mediaDir, 'components'),
            safePhotoName
          );
          compPhoto = safePhotoName;
        }

        // Extract component datasheet from zip if present
        let compDatasheet = nc.datasheetURL ? nc.datasheetURL.trim() : null;
        if (zip && compDatasheet && !/^https?:\/\//i.test(compDatasheet)) {
          const safeDsName = path.basename(compDatasheet);
          extractZipEntryIfMissing(
            zip,
            [`components/datasheets/${safeDsName}`, `datasheets/${safeDsName}`, safeDsName],
            path.join(mediaDir, 'datasheets'),
            safeDsName
          );
          compDatasheet = safeDsName;
        }

        const [compResult] = await conn.query(
          `INSERT INTO i_components 
           (component, category_id, package_id, description, shortDescription, marking, datasheetURL, photoURL, qty) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            compName,
            catId,
            pkgId || 28,
            nc.description ? nc.description.trim() : null,
            nc.shortDescription ? nc.shortDescription.trim() : null,
            nc.marking ? nc.marking.trim() : null,
            compDatasheet,
            compPhoto,
            parseInt(nc.qty || 0, 10)
          ]
        );

        finalComponentId = compResult.insertId;
        createdComponentsCount++;

        // Save Custom Fields for this new component if category and fields exist
        if (catId && Array.isArray(nc.customFields) && nc.customFields.length > 0) {
          for (const f of nc.customFields) {
            if (f.fieldName && f.fieldValue) {
              // Ensure field exists in category
              const [fRows] = await conn.query(
                'SELECT id FROM t_category_fields WHERE categoryId = ? AND LOWER(fieldName) = LOWER(?)',
                [catId, f.fieldName.trim()]
              );
              let fieldId = fRows[0]?.id;
              if (!fieldId) {
                const [newField] = await conn.query(
                  'INSERT INTO t_category_fields (categoryId, fieldName, fieldLabel, fieldType, unit, sortOrder) VALUES (?, ?, ?, ?, ?, ?)',
                  [catId, f.fieldName.trim(), f.fieldLabel ? f.fieldLabel.trim() : f.fieldName.trim(), f.fieldType || 'number', f.unit || null, 0]
                );
                fieldId = newField.insertId;
              }

              // Insert component field value
              await conn.query(
                'INSERT INTO t_component_field_values (componentId, fieldId, fieldValue) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE fieldValue = VALUES(fieldValue)',
                [finalComponentId, fieldId, String(f.fieldValue).trim()]
              );
            }
          }
        }
      } else if (zip && item.matchedComponent) {
        // If matched component already exists, make sure any media files from package exist in local media dir if missing
        if (item.matchedComponent.photoURL && !/^https?:\/\//i.test(item.matchedComponent.photoURL)) {
          const photoBase = path.basename(item.matchedComponent.photoURL);
          extractZipEntryIfMissing(
            zip,
            [`components/photos/${photoBase}`, `components/${photoBase}`, `photo/${photoBase}`, photoBase],
            path.join(mediaDir, 'components'),
            photoBase
          );
        }
        if (item.matchedComponent.datasheetURL && !/^https?:\/\//i.test(item.matchedComponent.datasheetURL)) {
          const dsBase = path.basename(item.matchedComponent.datasheetURL);
          extractZipEntryIfMissing(
            zip,
            [`components/datasheets/${dsBase}`, `datasheets/${dsBase}`, dsBase],
            path.join(mediaDir, 'datasheets'),
            dsBase
          );
        }
      }

      // Insert BOM Entry
      if (finalComponentId) {
        const qty = parseInt(item.quantity || 1, 10);
        const comment = (item.comment || item.designators || '').trim();

        await conn.query(
          'INSERT INTO t_bom (projectId, componentId, quantity, comment) VALUES (?, ?, ?, ?)',
          [newProjectId, finalComponentId, qty, comment]
        );
        importedBomCount++;
      }
    }

    await conn.commit();

    // Clean up temporary file
    if (tempFilePath && fs.existsSync(tempFilePath)) {
      try {
        fs.unlinkSync(tempFilePath);
      } catch (e) {
        // ignore
      }
    }

    return {
      success: true,
      projectId: newProjectId,
      projectName: project.projectName.trim(),
      createdComponentsCount,
      importedBomCount,
      attachmentsCount: attachments.length
    };
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}

module.exports = {
  exportProjectToZip,
  parseProjectExportPackage,
  executeProjectImport
};
