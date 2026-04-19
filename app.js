const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 8080;
const publicPath = path.join(__dirname, 'public');

const server = http.createServer((req, res) => {
  try {
    // Root path - serve index.html
    if (req.url === '/') {
      const indexPath = path.join(publicPath, 'index.html');
      const content = fs.readFileSync(indexPath);
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(content);
      return;
    }

    // API health check
    if (req.url === '/api/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'ok' }));
      return;
    }

    // Bybit endpoints
    if (req.url === '/api/bybit/status') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ connected: false, balance: 0 }));
      return;
    }

    if (req.url === '/api/bybit/balance') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ totalBalance: 0, coins: [] }));
      return;
    }

    if (req.url === '/api/bybit/positions') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ positions: [], count: 0 }));
      return;
    }

    // Database endpoints
    if (req.url === '/api/db/strategies') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ strategies: [] }));
      return;
    }

    if (req.url === '/api/db/backtests') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ backtests: [] }));
      return;
    }

    if (req.url === '/api/db/trades') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ trades: [] }));
      return;
    }

    if (req.url === '/api/db/automation-jobs') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ automations: [] }));
      return;
    }

    if (req.url === '/api/bybit/connect' && req.method === 'POST') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, connected: true, balance: 0 }));
      return;
    }

    // Automation endpoints
    if (req.url.startsWith('/api/automation/')) {
      const parts = req.url.split('/');
      const action = parts[3];
      if (action === 'execute' || action === 'enable' || action === 'disable') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true }));
        return;
      }
    }

    // Strategy create endpoint
    if (req.url === '/api/db/strategies' && req.method === 'POST') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, strategyId: 'demo-1' }));
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
