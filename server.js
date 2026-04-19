const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = process.env.PORT || 3000;

console.log('🚀 Starting server on port', PORT);

// Load API handler once at startup
let apiHandler;
try {
  apiHandler = require('./api/handler.js');
  console.log('✅ API handler loaded');
} catch (e) {
  console.error('❌ Failed to load API handler:', e.message);
  process.exit(1);
}

const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;

  console.log(`📍 ${req.method} ${pathname}`);

  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  // API routes - use pre-loaded handler
  if (pathname.startsWith('/api/')) {
    console.log(`📍 API request: ${req.method} ${pathname}`);
    try {
      // Extract route parts from pathname (e.g., /api/auth/signup -> ['auth', 'signup'])
      const route = pathname.slice(5).split('/').filter(Boolean);
      req.query = { route };
      console.log(`📍 Calling handler with route:`, route);

      // Call the pre-loaded API handler
      const handlerPromise = apiHandler(req, res);
      console.log(`📍 Handler promise created`);
      await handlerPromise;
      console.log(`📍 Handler completed`);
      return;
    } catch (e) {
      console.error('❌ API error:', e.message);
      console.error('Stack:', e.stack);
      if (!res.headersSent) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Internal server error', details: e.message }));
      }
      return;
    }
  }

  // Handle root
  if (pathname === '/' || pathname === '') {
    try {
      const indexPath = path.join(__dirname, 'index.html');
      const html = fs.readFileSync(indexPath, 'utf8');
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(html);
      return;
    } catch (e) {
      console.error('Error reading index.html:', e.message);
      res.writeHead(500);
      res.end('Error loading index.html');
      return;
    }
  }

  // Serve static files
  try {
    let filePath = path.join(__dirname, pathname);

    if (fs.existsSync(filePath) && !filePath.includes('api')) {
      const data = fs.readFileSync(filePath);
      const ext = path.extname(filePath);
      const mimes = {
        '.js': 'application/javascript',
        '.css': 'text/css',
        '.html': 'text/html',
        '.json': 'application/json'
      };
      res.writeHead(200, { 'Content-Type': mimes[ext] || 'application/octet-stream' });
      res.end(data);
      return;
    }
  } catch (e) {
    console.error('Error serving file:', e.message);
  }

  // Default: serve index.html for SPA routing
  try {
    const indexPath = path.join(__dirname, 'index.html');
    const html = fs.readFileSync(indexPath, 'utf8');
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(html);
  } catch (e) {
    res.writeHead(500);
    res.end('Server error');
  }
});

server.on('error', (err) => {
  console.error('❌ Server error:', err);
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Server running on http://0.0.0.0:${PORT}`);
});
