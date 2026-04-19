#!/usr/bin/env node
const http = require('http');

// Railway environment setup
const PORT = process.env.PORT || 8080;
console.log(`[INIT] PORT env var: ${process.env.PORT}`);
console.log(`[INIT] Attempting to bind to port: ${PORT}`);

// Create server
const server = http.createServer((req, res) => {
  console.log(`[REQUEST] ${req.method} ${req.url} from ${req.socket.remoteAddress}`);

  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  res.writeHead(200);
  res.end(JSON.stringify({
    ok: true,
    time: new Date().toISOString(),
    port: PORT,
    env: process.env.NODE_ENV || 'development'
  }));
});

// Bind server with error handling
server.listen(PORT, '0.0.0.0', () => {
  console.log(`[SUCCESS] Server listening on 0.0.0.0:${PORT}`);
  console.log(`[SUCCESS] Ready to accept requests`);
});

// Port binding errors
server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`[ERROR] Port ${PORT} is already in use`);
  } else if (err.code === 'EACCES') {
    console.error(`[ERROR] Permission denied to use port ${PORT}`);
  } else {
    console.error(`[ERROR] Server error:`, err.message);
  }
  process.exit(1);
});

// Handle graceful shutdown (Railway sends SIGTERM)
process.on('SIGTERM', () => {
  console.log('[SHUTDOWN] SIGTERM received, closing server gracefully...');
  server.close(() => {
    console.log('[SHUTDOWN] Server closed');
    process.exit(0);
  });

  // Force exit after 10 seconds
  setTimeout(() => {
    console.error('[SHUTDOWN] Forced exit after timeout');
    process.exit(1);
  }, 10000);
});

process.on('SIGINT', () => {
  console.log('[SHUTDOWN] SIGINT received');
  process.exit(0);
});

// Catch uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('[FATAL] Uncaught exception:', err.message);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  console.error('[FATAL] Unhandled rejection:', reason);
  process.exit(1);
});
