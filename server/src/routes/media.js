const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const mediaDir = process.env.MEDIA_DIR
  ? path.resolve(process.env.MEDIA_DIR)
  : path.resolve(__dirname, '../../../media');

const FOLDER_MAP = {
  package: 'packages',
  packages: 'packages',
  component: 'components',
  components: 'components',
  datasheet: 'datasheets',
  datasheets: 'datasheets',
  project: 'projects',
  projects: 'projects',
  projecs: 'projects'
};

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB
  }
});

// POST /api/media/upload
router.post('/upload', (req, res) => {
  upload.single('file')(req, res, (err) => {
    if (err) {
      console.error('Media upload error:', err);
      return res.status(400).json({ error: err.message || 'File upload failed' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded. Please attach a file under key "file"' });
    }

    const rawFolder = req.body.folder || req.query.folder || 'projects';
    const targetFolder = FOLDER_MAP[rawFolder.toLowerCase()];
    if (!targetFolder) {
      return res.status(400).json({
        error: `Invalid target folder "${rawFolder}". Allowed folders: packages, components, datasheets, projects`
      });
    }

    const destDir = path.join(mediaDir, targetFolder);
    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true });
    }

    let baseName = req.body.filename || req.query.filename || req.file.originalname;
    baseName = path.basename(baseName).replace(/[^a-zA-Z0-9._-]/g, '_');
    if (!baseName || baseName === '.' || baseName === '..') {
      baseName = `media_${Date.now()}${path.extname(req.file.originalname)}`;
    }

    const destPath = path.join(destDir, baseName);
    fs.writeFileSync(destPath, req.file.buffer);

    res.json({
      success: true,
      folder: targetFolder,
      filename: baseName,
      url: `/media/${targetFolder}/${baseName}`,
      size: req.file.size,
      mimetype: req.file.mimetype
    });
  });
});

module.exports = router;
