const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 8080;
const publicPath = path.join(__dirname, 'public');

const server = http.createServer((req, res) => {
  try {
    // API health check
    if (req.url === '/api/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'ok' }));
      return;
    }

    // Serve static files
    const filePath = path.join(publicPath, req.url === '/' ? 'index.html' : req.url);

    if (!filePath.startsWith(publicPath)) {
      res.writeHead(404);
      res.end('Not found');
      return;
    }

    try {
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
      // Fallback to index.html for SPA routing
      const indexContent = fs.readFileSync(path.join(publicPath, 'index.html'));
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(indexContent);
    }
  } catch (e) {
    res.writeHead(500);
    res.end('Error');
  }
});

server.listen(PORT, '0.0.0.0');
