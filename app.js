const express = require('express');
const path = require('path');

const PORT = parseInt(process.env.PORT || 8080);
const app = express();

const publicPath = path.join(__dirname, 'public');

// Middleware
app.use(express.static(publicPath));

// Root route
app.get('/', (req, res) => {
  res.sendFile(path.join(publicPath, 'index.html'));
});

// SPA fallback - catch all other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(publicPath, 'index.html'));
});

// Start server
const server = app.listen(PORT, '0.0.0.0', () => {
  console.error('Listening on ' + PORT);
});

server.on('error', (err) => {
  console.error('Server error:', err.code);
  process.exit(1);
});
