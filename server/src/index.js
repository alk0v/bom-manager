const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const projectsRouter = require('./routes/projects');
const componentsRouter = require('./routes/components');
const shoppingListRouter = require('./routes/shoppingList');
const metaRouter = require('./routes/meta');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// API Routes
app.use('/api/projects', projectsRouter);
app.use('/api/components', componentsRouter);
app.use('/api/shopping-list', shoppingListRouter);
app.use('/api', metaRouter);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Serve frontend static build in production
const clientDist = path.resolve(__dirname, '../../client/dist');
app.use(express.static(clientDist));
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(clientDist, 'index.html'), (err) => {
      if (err) {
        res.status(404).send('Not Found');
      }
    });
  }
});

app.listen(PORT, () => {
  console.log(`[BOM Manager API] Server listening on http://localhost:${PORT}`);
});
