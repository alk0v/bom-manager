const express = require('express');
const router = express.Router({ mergeParams: true });
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const pool = require('../db');
const { unwrapGitHubHtml } = require('../utils/ibomParser');

const mediaDir = process.env.MEDIA_DIR
  ? path.resolve(process.env.MEDIA_DIR)
  : path.resolve(__dirname, '../../../media');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 100 * 1024 * 1024 // 100MB limit for archives/firmware/ibom
  }
});

/**
 * Determine file type classification based on extension and content
 */
function detectFileType(originalName, buffer) {
  const ext = path.extname(originalName).toLowerCase();
  
  // 1. iBOM check
  if (ext === '.html' || ext === '.htm') {
    if (buffer) {
      const snippet = buffer.subarray(0, 2 * 1024 * 1024).toString('utf8');
      if (
        snippet.includes('pcbdata') || 
        snippet.includes('Interactive HTML BOM') || 
        snippet.includes('LZString') ||
        snippet.includes('react-app.embeddedData')
      ) {
        return 'ibom';
      }
    }
    if (originalName.toLowerCase().includes('ibom') || originalName.toLowerCase().includes('bom')) {
      return 'ibom';
    }
    return 'document';
  }

  // 2. Images (PNG, JPG, SVG, WebP, GIF, BMP)
  if (['.png', '.jpg', '.jpeg', '.svg', '.webp', '.gif', '.bmp', '.ico'].includes(ext)) {
    return 'image';
  }

  // 3. Archives / Gerbers
  if (['.zip', '.tar', '.gz', '.7z', '.rar', '.tgz'].includes(ext)) {
    return 'archive';
  }

  // 4. Firmware / ROMs
  if (['.bin', '.hex', '.rom', '.elf', '.dfu', '.img'].includes(ext)) {
    return 'firmware';
  }

  // 5. Documents / Schematics / Datasheets
  if (['.pdf', '.txt', '.md', '.csv'].includes(ext)) {
    return 'document';
  }

  if (['.kicad_pcb', '.kicad_sch', '.sch', '.brd', '.step', '.stp'].includes(ext)) {
    return 'schematic';
  }

  return 'other';
}

// GET /api/projects/:id/files - List all attached files for a project
router.get('/', async (req, res) => {
  const projectId = req.params.id;

  try {
    const [rows] = await pool.query(
      `SELECT 
        id, 
        projectId, 
        fileName, 
        originalName, 
        fileSize, 
        fileType, 
        mimeType, 
        description, 
        uploadedAt 
       FROM t_project_files 
       WHERE projectId = ? 
       ORDER BY uploadedAt DESC, id DESC`,
      [projectId]
    );

    const files = rows.map(f => {
      const filePath = path.join(mediaDir, 'projects', 'attachments', String(projectId), f.fileName);
      const exists = fs.existsSync(filePath);
      return {
        ...f,
        existsOnDisk: exists,
        url: `/media/projects/attachments/${projectId}/${encodeURIComponent(f.fileName)}`
      };
    });

    res.json(files);
  } catch (error) {
    console.error('Error fetching project files:', error);
    res.status(500).json({ error: 'Failed to fetch project files', details: error.message });
  }
});

// POST /api/projects/:id/files - Upload a file attachment to the project
router.post('/', (req, res) => {
  const projectId = req.params.id;

  upload.single('file')(req, res, async (err) => {
    if (err) {
      console.error('Project file upload error:', err);
      return res.status(400).json({ error: err.message || 'File upload failed' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded. Please provide a file under "file"' });
    }

    try {
      // Verify project exists
      const [projRows] = await pool.query('SELECT id, projectName FROM i_projects WHERE id = ?', [projectId]);
      if (projRows.length === 0) {
        return res.status(404).json({ error: 'Project not found' });
      }

      // Target directory: media/projects/attachments/:projectId/
      const targetDir = path.join(mediaDir, 'projects', 'attachments', String(projectId));
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }

      // Sanitize filename
      const originalName = req.file.originalname;
      const parsed = path.parse(originalName);
      let safeBase = parsed.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      if (!safeBase) safeBase = `file_${Date.now()}`;
      let finalName = `${safeBase}${parsed.ext}`;

      // Avoid collision
      let destPath = path.join(targetDir, finalName);
      if (fs.existsSync(destPath)) {
        finalName = `${safeBase}_${Date.now()}${parsed.ext}`;
        destPath = path.join(targetDir, finalName);
      }

      // If HTML file was saved from a GitHub blob page, unwrap it into pure HTML
      let fileBuffer = req.file.buffer;
      if (parsed.ext.toLowerCase() === '.html' || parsed.ext.toLowerCase() === '.htm') {
        const rawStr = fileBuffer.toString('utf8');
        const unwrapped = unwrapGitHubHtml(rawStr);
        if (unwrapped !== rawStr) {
          fileBuffer = Buffer.from(unwrapped, 'utf8');
        }
      }

      // Write file to disk
      fs.writeFileSync(destPath, fileBuffer);

      // Auto-detect file type
      const detectedType = req.body.fileType || detectFileType(originalName, req.file.buffer);
      const description = (req.body.description || '').trim();

      // Insert record
      const [result] = await pool.query(
        `INSERT INTO t_project_files 
         (projectId, fileName, originalName, fileSize, fileType, mimeType, description) 
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          projectId,
          finalName,
          originalName,
          fileBuffer.length,
          detectedType,
          req.file.mimetype || 'application/octet-stream',
          description
        ]
      );

      res.status(201).json({
        id: result.insertId,
        projectId: Number(projectId),
        fileName: finalName,
        originalName,
        fileSize: fileBuffer.length,
        fileType: detectedType,
        mimeType: req.file.mimetype,
        description,
        uploadedAt: new Date().toISOString(),
        url: `/media/projects/attachments/${projectId}/${encodeURIComponent(finalName)}`
      });
    } catch (error) {
      console.error('Error saving project file:', error);
      res.status(500).json({ error: 'Failed to save project file', details: error.message });
    }
  });
});

// DELETE /api/projects/:id/files/:fileId - Delete an attached file
router.delete('/:fileId', async (req, res) => {
  const { id: projectId, fileId } = req.params;

  try {
    const [rows] = await pool.query(
      'SELECT id, fileName FROM t_project_files WHERE id = ? AND projectId = ?',
      [fileId, projectId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'File attachment not found' });
    }

    const { fileName } = rows[0];
    const filePath = path.join(mediaDir, 'projects', 'attachments', String(projectId), fileName);

    // Delete DB record
    await pool.query('DELETE FROM t_project_files WHERE id = ?', [fileId]);

    // Delete disk file if exists
    if (fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
      } catch (unlinkErr) {
        console.warn('Failed to delete file on disk:', unlinkErr.message);
      }
    }

    res.json({ success: true, fileId: Number(fileId) });
  } catch (error) {
    console.error('Error deleting project file:', error);
    res.status(500).json({ error: 'Failed to delete project file', details: error.message });
  }
});

// GET /api/projects/:id/files/:fileId/download - Download attached file
router.get('/:fileId/download', async (req, res) => {
  const { id: projectId, fileId } = req.params;

  try {
    const [rows] = await pool.query(
      'SELECT fileName, originalName, mimeType FROM t_project_files WHERE id = ? AND projectId = ?',
      [fileId, projectId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'File attachment not found' });
    }

    const { fileName, originalName, mimeType } = rows[0];
    const filePath = path.join(mediaDir, 'projects', 'attachments', String(projectId), fileName);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found on disk' });
    }

    res.setHeader('Content-Type', mimeType || 'application/octet-stream');
    res.download(filePath, originalName);
  } catch (error) {
    console.error('Error downloading file:', error);
    res.status(500).json({ error: 'Failed to download file', details: error.message });
  }
});

module.exports = router;
