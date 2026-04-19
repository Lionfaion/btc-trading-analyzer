const express = require('express');
const path = require('path');
const fs = require('fs');

const PORT = parseInt(process.env.PORT || 8080);
const app = express();

// Verificar que public existe
const publicPath = path.resolve(__dirname, 'public');
const indexPath = path.resolve(publicPath, 'index.html');

if (!fs.existsSync(publicPath)) {
  console.error('ERROR: public directory not found at', publicPath);
  process.exit(1);
}

if (!fs.existsSync(indexPath)) {
  console.error('ERROR: index.html not found at', indexPath);
  process.exit(1);
}

console.error('Public path:', publicPath);
console.error('Index path:', indexPath);

// Middleware
app.use(express.static(publicPath));

// Routes
app.get('/', (req, res, next) => {
  res.sendFile(indexPath, (err) => {
    if (err) {
      console.error('Error sending index.html:', err);
      next(err);
    }
  });
});

// SPA fallback
app.get('*', (req, res, next) => {
  res.sendFile(indexPath, (err) => {
    if (err) {
      console.error('Error sending index.html for', req.path, ':', err);
      next(err);
    }
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Express error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

const server = app.listen(PORT, '0.0.0.0', () => {
  console.error('✅ Server listening on port ' + PORT);
  console.error('✅ Public directory ready');
});

server.on('error', (err) => {
  console.error('Server error:', err);
  process.exit(1);
});
