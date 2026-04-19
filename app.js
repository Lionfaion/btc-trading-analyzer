const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

console.log('[STARTUP] Iniciando servidor...');
console.log('[STARTUP] __dirname:', __dirname);
console.log('[STARTUP] process.env.PORT:', process.env.PORT);

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf'
};

const publicPath = path.join(__dirname, 'public');

const server = http.createServer((req, res) => {
  try {
    const parsedUrl = url.parse(req.url, true);
    const pathname = parsedUrl.pathname;

    console.log(`[REQUEST] ${req.method} ${pathname}`);

    // API health check - simplest endpoint
    if (pathname === '/api/health') {
      console.log('[API] health check');
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'ok' }));
      return;
    }

    // Serve static files from /public
    let filePath = path.join(publicPath, pathname === '/' ? 'index.html' : pathname);

    // Security: prevent directory traversal
    if (!filePath.startsWith(publicPath)) {
      console.log('[SECURITY] Directory traversal attempt:', filePath);
      res.writeHead(404);
      res.end('Not found');
      return;
    }

    // Try to serve file
    try {
      const stats = fs.statSync(filePath);

      if (stats.isDirectory()) {
        filePath = path.join(filePath, 'index.html');
        fs.statSync(filePath);
      }

      const ext = path.extname(filePath);
      const mimeType = MIME_TYPES[ext] || 'application/octet-stream';

      const fileContent = fs.readFileSync(filePath);
      res.writeHead(200, { 'Content-Type': mimeType });
      res.end(fileContent);
      console.log('[FILE] Served:', filePath.substring(publicPath.length));
    } catch (err) {
      console.log('[FALLBACK] File not found, serving index.html:', err.code);
      // Fallback to index.html for SPA routing
      const indexPath = path.join(publicPath, 'index.html');
      const indexContent = fs.readFileSync(indexPath);
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(indexContent);
    }
  } catch (error) {
    console.error('[ERROR]', error);
    res.writeHead(500);
    res.end('Internal server error');
  }
});

const PORT = process.env.PORT || 8080;
const HOST = '0.0.0.0';

server.listen(PORT, HOST, () => {
  console.log(`✓ Server listening on ${HOST}:${PORT}`);
  console.log(`✓ Public path: ${publicPath}`);
  console.log('[READY] Waiting for requests...');
});

server.on('error', (err) => {
  console.error('[SERVER_ERROR]', err.code, err.message);
  process.exit(1);
});

process.on('uncaughtException', (err) => {
  console.error('[UNCAUGHT]', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('[REJECTION]', reason);
  process.exit(1);
});
