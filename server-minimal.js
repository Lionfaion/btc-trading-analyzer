#!/usr/bin/env node
const http = require('http');

console.log('🟢 [START] Creating HTTP server...');

const server = http.createServer((req, res) => {
  console.log(`🟢 [REQUEST] ${req.method} ${req.url}`);

  res.setHeader('Content-Type', 'application/json');
  res.writeHead(200);
  res.end(JSON.stringify({ ok: true, time: new Date().toISOString() }));
});

const PORT = process.env.PORT || 3000;

console.log(`🟢 [LISTENING] Starting on port ${PORT}...`);

server.listen(PORT, '0.0.0.0', () => {
  console.log(`🟢 [SUCCESS] Server is listening on 0.0.0.0:${PORT}`);
});

server.on('error', (err) => {
  console.error(`🔴 [ERROR] Server error:`, err.message);
  process.exit(1);
});

process.on('uncaughtException', (err) => {
  console.error(`🔴 [FATAL] Uncaught exception:`, err.message);
  process.exit(1);
});
