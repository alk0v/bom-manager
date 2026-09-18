const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
// Load environment variables: root .env first, fallback to server/.env
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const projectsRouter = require('./routes/projects');
const componentsRouter = require('./routes/components');
const shoppingListRouter = require('./routes/shoppingList');
const reportsRouter = require('./routes/reports');
const metaRouter = require('./routes/meta');
const mediaRouter = require('./routes/media');
const settingsRouter = require('./routes/settings');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Autonomous data directory setup (for SQLite)
const dataDir = process.env.DATA_DIR
  ? path.resolve(process.env.DATA_DIR)
  : path.resolve(__dirname, '../../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Media assets directory setup
const mediaDir = process.env.MEDIA_DIR
  ? path.resolve(process.env.MEDIA_DIR)
  : path.resolve(__dirname, '../../media');

const standardSubdirs = ['packages', 'components', 'datasheets', 'projects'];
if (!fs.existsSync(mediaDir)) {
  fs.mkdirSync(mediaDir, { recursive: true });
}
standardSubdirs.forEach(sub => {
  const subPath = path.join(mediaDir, sub);
  if (!fs.existsSync(subPath)) {
    fs.mkdirSync(subPath, { recursive: true });
  }
});

const attachmentsDir = path.join(mediaDir, 'projects', 'attachments');
if (!fs.existsSync(attachmentsDir)) {
  fs.mkdirSync(attachmentsDir, { recursive: true });
}

// Serve media static assets
app.use('/media', express.static(mediaDir, {
  maxAge: '1d',
  fallthrough: true
}));

// Folder alias compatibility: projects <-> projecs
app.use('/media/projects', (req, res, next) => {
  const decodedPath = decodeURIComponent(req.path);
  const projecsPath = path.join(mediaDir, 'projecs', decodedPath);
  if (fs.existsSync(projecsPath) && fs.statSync(projecsPath).isFile()) {
    return res.sendFile(projecsPath);
  }
  next();
});

app.use('/media/projecs', (req, res, next) => {
  const decodedPath = decodeURIComponent(req.path);
  const projectsPath = path.join(mediaDir, 'projects', decodedPath);
  if (fs.existsSync(projectsPath) && fs.statSync(projectsPath).isFile()) {
    return res.sendFile(projectsPath);
  }
  next();
});

// API Routes
app.use('/api/projects', projectsRouter);
app.use('/api/components', componentsRouter);
app.use('/api/shopping-list', shoppingListRouter);
app.use('/api/reports', reportsRouter);
app.use('/api/media', mediaRouter);
app.use('/api/settings', settingsRouter);
app.use('/api', metaRouter);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Serve frontend static build in production
const clientDist = path.resolve(__dirname, '../../client/dist');
app.use(express.static(clientDist));
app.get('*', (req, res) => {
  if (req.path.startsWith('/api') || req.path.startsWith('/media')) {
    return res.status(404).send('Not Found');
  }
  res.sendFile(path.join(clientDist, 'index.html'), (err) => {
    if (err) {
      res.status(404).send('Not Found');
    }
  });
});

const server = app.listen(PORT, () => {
  console.log(`[BOM Manager API] Server listening on http://localhost:${PORT}`);
  console.log(`[BOM Manager Media] Serving media assets from ${mediaDir}`);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\n[BOM Manager] Port ${PORT} is already in use by another process.`);
    console.error(`To use a different port, set PORT in your .env file or run:`);
    console.error(`  $env:PORT="${Number(PORT) + 1}"; npm run start  (PowerShell)`);
    console.error(`  PORT=${Number(PORT) + 1} npm run start        (Linux / Mac / Bash)\n`);
    process.exit(1);
  } else {
    throw err;
  }
});
