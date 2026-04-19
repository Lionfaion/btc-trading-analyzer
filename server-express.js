const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

console.log('📍 Environment variables check:');
console.log('  SUPABASE_URL:', process.env.SUPABASE_URL ? 'SET' : 'MISSING');
console.log('  SUPABASE_ANON_KEY:', process.env.SUPABASE_ANON_KEY ? 'SET' : 'MISSING');
console.log('  SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? 'SET' : 'MISSING');

let apiHandler;
try {
  apiHandler = require('./api/handler.js');
  console.log('✅ API handler loaded');
} catch (e) {
  console.error('❌ Failed to load API handler:', e.message);
  process.exit(1);
}

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS
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

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// API routes
app.use('/api', (req, res, next) => {
  console.log(`📍 ${req.method} ${req.path}`);
  const route = req.path.slice(1).split('/').filter(Boolean);
  req.query = { route };

  try {
    const handlerPromise = apiHandler(req, res);
    Promise.resolve(handlerPromise).catch(err => {
      console.error('❌ Handler error:', err.message);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Internal server error', details: err.message });
      }
    });
  } catch (err) {
    console.error('❌ Sync error:', err.message);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Internal server error', details: err.message });
    }
  }
});

// Static files
try {
  app.use(express.static(path.join(__dirname, 'public')));
  app.use(express.static(__dirname));
} catch (e) {
  console.error('Error setting up static files:', e.message);
}

// SPA fallback
app.get('*', (req, res) => {
  const publicIndexPath = path.join(__dirname, 'public', 'index.html');
  const rootIndexPath = path.join(__dirname, 'index.html');

  res.sendFile(publicIndexPath, (err) => {
    if (err) {
      res.sendFile(rootIndexPath, (err2) => {
        if (err2) {
          res.status(404).send('index.html not found');
        }
      });
    }
  });
});

// Error handler
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
