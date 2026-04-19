const http = require('http');

const PORT = process.env.PORT || 8080;

const server = http.createServer((req, res) => {
  res.writeHead(200, {'Content-Type': 'text/html; charset=utf-8'});
  res.end('<!DOCTYPE html><html><body style="background:#1a1a1a;color:#0f0;font-family:monospace;padding:40px"><h1>✅ Trading Analyzer</h1><p>Servidor activo en puerto ' + PORT + '</p></body></html>');
});

server.listen(PORT, '0.0.0.0', () => {
  console.log('[STARTUP] Servidor en puerto ' + PORT);
});

process.on('SIGTERM', () => {
  console.log('[SHUTDOWN] Cerrando');
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 10000);
});
