const http = require('http');
const fs = require('fs');
const path = require('path');

console.log('=== INICIANDO SERVIDOR ===');

const server = http.createServer((req, res) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);

  try {
    // Health check
    if (req.url === '/api/health' || req.url.startsWith('/api/health')) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'ok', timestamp: new Date().toISOString() }));
      return;
    }

    // Serve static files
    const publicDir = path.join(__dirname, 'public');
    let filePath = req.url === '/' ? path.join(publicDir, 'index.html') : path.join(publicDir, req.url);

    // Prevent directory traversal
    if (!filePath.startsWith(publicDir)) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not found');
      return;
    }

    // Try to serve file
    try {
      const stat = fs.statSync(filePath);
      if (stat.isDirectory()) {
        filePath = path.join(filePath, 'index.html');
      }

      const content = fs.readFileSync(filePath);
      let contentType = 'application/octet-stream';

      if (filePath.endsWith('.html')) contentType = 'text/html; charset=utf-8';
      else if (filePath.endsWith('.css')) contentType = 'text/css';
      else if (filePath.endsWith('.js')) contentType = 'application/javascript';
      else if (filePath.endsWith('.json')) contentType = 'application/json';
      else if (filePath.endsWith('.svg')) contentType = 'image/svg+xml';

      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content);
    } catch (e) {
      // File not found, serve index.html (SPA routing)
      try {
        const indexPath = path.join(publicDir, 'index.html');
        const content = fs.readFileSync(indexPath);
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(content);
      } catch (e2) {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('Internal server error');
      }
    }
  } catch (e) {
    console.error('ERROR:', e.message);
    res.writeHead(500, { 'Content-Type': 'text/plain' });
    res.end('Server error');
  }
});

const PORT = process.env.PORT || 8080;

server.on('clientError', (err, socket) => {
  console.error('CLIENT ERROR:', err.message);
  if (socket.writable) {
    socket.end('HTTP/1.1 400 Bad Request\r\n\r\n');
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`✓ Server running on port ${PORT}`);
});

server.on('error', (err) => {
  console.error('SERVER ERROR:', err);
  process.exit(1);
});
