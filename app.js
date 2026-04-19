const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const MIME_TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf'
};

async function handleApiRoute(req, res, pathname) {
  try {
    const parts = pathname.slice(5).split('/').filter(Boolean);
    const [section, action] = parts;

    // Health check (no dependencies)
    if (section === 'health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'ok' }));
      return;
    }

    // Initialize Supabase for other endpoints
    let supabase = null;
    if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
      const { createClient } = require('@supabase/supabase-js');
      supabase = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
      );
    }

    async function parseBody(req) {
      return new Promise((resolve) => {
        if (req.method === 'GET') {
          resolve({});
          return;
        }
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
          try {
            resolve(body ? JSON.parse(body) : {});
          } catch {
            resolve({});
          }
        });
      });
    }

    async function getUser(req) {
      if (!supabase) return null;
      const token = req.headers.authorization?.replace('Bearer ', '');
      if (!token) return null;
      try {
        const { data } = await supabase.auth.getUser(token);
        return data?.user;
      } catch {
        return null;
      }
    }

    function jsonResponse(status, data) {
      res.writeHead(status, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(data));
    }

    // Auth: Signup
    if (section === 'auth' && action === 'signup' && req.method === 'POST') {
      if (!supabase) {
        return jsonResponse(500, { error: 'Supabase not configured' });
      }

      const body = await parseBody(req);
      const { email, password } = body;

      if (!email || !password) {
        return jsonResponse(400, { success: false, error: 'Email y contraseña requeridos' });
      }

      const authUrl = `${process.env.SUPABASE_URL}/auth/v1/signup`;
      const response = await fetch(authUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
      });

      const result = await response.json();

      if (!response.ok) {
        return jsonResponse(400, { success: false, error: result.error_description || 'Error al registrarse' });
      }

      return jsonResponse(201, {
        success: true,
        user: { id: result.user?.id || '', email: result.user?.email || '' },
        session: result.session ? {
          accessToken: result.session.access_token,
          refreshToken: result.session.refresh_token,
          expiresIn: result.session.expires_in
        } : null
      });
    }

    // Auth: Login
    if (section === 'auth' && action === 'login' && req.method === 'POST') {
      if (!supabase) {
        return jsonResponse(500, { error: 'Supabase not configured' });
      }

      const body = await parseBody(req);
      const { email, password } = body;

      if (!email || !password) {
        return jsonResponse(400, { success: false, error: 'Email y contraseña requeridos' });
      }

      const authUrl = `${process.env.SUPABASE_URL}/auth/v1/token?grant_type=password`;
      const response = await fetch(authUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
      });

      const result = await response.json();

      if (!response.ok) {
        return jsonResponse(401, { success: false, error: result.error_description || 'Credenciales inválidas' });
      }

      return jsonResponse(200, {
        success: true,
        user: { id: result.user?.id || '', email: result.user?.email || '' },
        session: {
          accessToken: result.access_token,
          refreshToken: result.refresh_token,
          expiresIn: result.expires_in
        }
      });
    }

    // DB endpoints - return empty data
    if (section === 'db') {
      if (action === 'strategies') return jsonResponse(200, { strategies: [] });
      if (action === 'backtests') return jsonResponse(200, { backtests: [] });
      if (action === 'automation-jobs') return jsonResponse(200, { automations: [] });
    }

    // Bybit endpoints
    if (section === 'bybit') {
      if (action === 'status') {
        return jsonResponse(200, { connected: false, balance: 0 });
      }
      if (action === 'balance') {
        return jsonResponse(200, { totalBalance: 0, coins: [] });
      }
      if (action === 'positions') {
        return jsonResponse(200, { positions: [], count: 0 });
      }
      if (action === 'connect' && req.method === 'POST') {
        return jsonResponse(200, { success: true });
      }
    }

    jsonResponse(404, { error: 'Endpoint not found' });
  } catch (error) {
    console.error('❌ API error:', error);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: error.message || 'Internal server error' }));
  }
}

const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;

  // API routes
  if (pathname.startsWith('/api/')) {
    return handleApiRoute(req, res, pathname);
  }

  // Static file serving
  const publicPath = path.join(__dirname, 'public');
  let filePath = path.join(publicPath, pathname === '/' ? 'index.html' : pathname);

  // Security: prevent directory traversal
  if (!filePath.startsWith(publicPath)) {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
    return;
  }

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
  } catch (err) {
    // 404: serve index.html for SPA routing
    try {
      const indexPath = path.join(publicPath, 'index.html');
      const indexContent = fs.readFileSync(indexPath);
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(indexContent);
    } catch {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Not found' }));
    }
  }
});

const PORT = process.env.PORT || 8080;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`✓ Server running on port ${PORT}`);
});

server.on('error', (err) => {
  console.error('❌ Server error:', err);
  process.exit(1);
});
