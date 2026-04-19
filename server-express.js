const express = require('express');
const path = require('path');

console.log('⏱️ [1] Starting server initialization...');

const app = express();
const PORT = process.env.PORT || 3000;

console.log('⏱️ [2] Environment variables:');
console.log('   SUPABASE_URL:', process.env.SUPABASE_URL ? 'SET' : 'MISSING');
console.log('   SUPABASE_ANON_KEY:', process.env.SUPABASE_ANON_KEY ? 'SET' : 'MISSING');
console.log('   SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? 'SET' : 'MISSING');

let apiHandler;
console.log('⏱️ [3] Loading API handler...');
try {
  apiHandler = require('./api/handler.js');
  console.log('✅ [4] API handler loaded successfully');
} catch (e) {
  console.error('❌ [4] Failed to load API handler:', e.message);
  process.exit(1);
}

console.log('⏱️ [5] Setting up middleware...');
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

console.log('⏱️ [6] Setting up CORS...');
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

console.log('⏱️ [7] Setting up simple health check...');
app.get('/ping', (req, res) => {
  res.json({ pong: true });
});

console.log('⏱️ [8] Setting up /api/health endpoint...');
app.get('/api/health', (req, res) => {
  console.log('  📍 /api/health called');
  res.json({ status: 'ok' });
});

console.log('⏱️ [9] Setting up API routes...');
app.use('/api', (req, res, next) => {
  console.log(`  📍 API: ${req.method} ${req.path}`);
  const route = req.path.slice(1).split('/').filter(Boolean);
  req.query = { route };

  try {
    const handlerPromise = apiHandler(req, res);
    Promise.resolve(handlerPromise).catch(err => {
      console.error('  ❌ Handler error:', err.message);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Internal server error' });
      }
    });
  } catch (err) {
    console.error('  ❌ Sync error:', err.message);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});

console.log('⏱️ [10] Setting up static files...');
try {
  app.use(express.static(path.join(__dirname, 'public')));
  app.use(express.static(__dirname));
} catch (e) {
  console.error('⚠️  Warning setting up static files:', e.message);
}

console.log('⏱️ [11] Setting up SPA fallback...');
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'), (err) => {
    if (err) {
      res.sendFile(path.join(__dirname, 'index.html'), (err2) => {
        if (err2) {
          res.status(404).send('Not found');
        }
      });
    }
  });
});

console.log('⏱️ [12] Setting up error handler...');
app.use((err, req, res, next) => {
  console.error('❌ Express error:', err.message);
  res.status(500).json({ error: 'Internal server error' });
});

console.log('⏱️ [13] Creating server...');
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log('');
  console.log('════════════════════════════════════');
  console.log(`✅ Server is listening on port ${PORT}`);
  console.log(`✅ Ready to accept requests`);
  console.log('════════════════════════════════════');
  console.log('');
});

server.on('error', (err) => {
  console.error('❌ Server error:', err);
});

process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught exception:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled rejection:', reason);
});
