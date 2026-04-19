const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Load API handler once at startup
let apiHandler;
try {
  apiHandler = require('./api/handler.js');
  console.log('✅ API handler loaded');
} catch (e) {
  console.error('❌ Failed to load API handler:', e.message);
  process.exit(1);
}

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS headers
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
    return;
  }
  next();
});

// Static files from public directory (highest priority)
app.use(express.static(path.join(__dirname, 'public')));

// Static files from root directory
app.use(express.static(__dirname));

// Diagnostic endpoint
app.get('/api/diagnose', (req, res) => {
  res.json({
    status: 'ok',
    hasSupabaseUrl: !!process.env.SUPABASE_URL,
    hasAnonKey: !!process.env.SUPABASE_ANON_KEY,
    hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    supabaseUrl: process.env.SUPABASE_URL ? process.env.SUPABASE_URL.substring(0, 20) + '...' : 'MISSING',
    nodeEnv: process.env.NODE_ENV || 'development'
  });
});

// API routes
app.use('/api', (req, res, next) => {
  console.log(`📍 ${req.method} ${req.path}`);

  const route = req.path.slice(1).split('/').filter(Boolean);
  req.query = { route };

  console.log(`📍 Calling handler with route:`, route);

  try {
    const handlerPromise = apiHandler(req, res);
    console.log(`📍 Handler promise created`);

    Promise.resolve(handlerPromise).then(() => {
      console.log(`📍 Handler completed`);
    }).catch(err => {
      console.error('❌ Handler error:', err.message);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Internal server error', details: err.message });
      }
    });
  } catch (err) {
    console.error('❌ Sync handler error:', err.message);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Internal server error', details: err.message });
    }
  }
});

// SPA fallback - serve index.html for any unmatched routes
app.get('*', (req, res) => {
  console.log(`📍 SPA fallback for ${req.path}`);
  res.sendFile(path.join(__dirname, 'public', 'index.html'), err => {
    if (err) {
      console.error('Error serving index.html:', err.message);
      res.sendFile(path.join(__dirname, 'index.html'));
    }
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('❌ Express error:', err);
  res.status(500).json({ error: 'Internal server error', details: err.message });
});

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Starting Express server on port ${PORT}`);
  console.log(`✅ Server running on http://0.0.0.0:${PORT}`);
});

server.on('error', (err) => {
  console.error('❌ Server error:', err);
});
