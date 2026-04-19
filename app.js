const express = require('express');
const path = require('path');
const fs = require('fs');

const PORT = parseInt(process.env.PORT || 8080);
const app = express();

const publicPath = path.join(__dirname, 'public');
const indexPath = path.join(publicPath, 'index.html');

// Middleware
app.use(express.static(publicPath));

// Healthcheck
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Root route
app.get('/', (req, res) => {
  fs.readFile(indexPath, 'utf8', (err, data) => {
    if (err) {
      console.error('Error reading index.html:', err);
      res.status(500).send('Error reading index.html');
      return;
    }
    res.type('text/html').send(data);
  });
});

// SPA fallback - catch all other routes
app.get('*', (req, res) => {
  fs.readFile(indexPath, 'utf8', (err, data) => {
    if (err) {
      console.error('Error reading index.html:', err);
      res.status(500).send('Error reading index.html');
      return;
    }
    res.type('text/html').send(data);
  });
});

// Start server
const server = app.listen(PORT, '0.0.0.0', () => {
  console.error('Listening on ' + PORT);
});

server.on('error', (err) => {
  console.error('Server error:', err.code);
  process.exit(1);
});
