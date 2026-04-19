const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 8080;

let indexHtml = null;
try {
  const indexPath = path.join(__dirname, 'public', 'index.html');
  indexHtml = fs.readFileSync(indexPath, 'utf8');
  console.log('[STARTUP] Cargado index.html desde public/');
} catch (e) {
  console.error('[ERROR] No se pudo cargar public/index.html:', e.message);
  try {
    const indexPath = path.join(__dirname, 'index.html');
    indexHtml = fs.readFileSync(indexPath, 'utf8');
    console.log('[STARTUP] Cargado index.html desde raíz');
  } catch (e2) {
    console.error('[ERROR] No se encontró index.html en ningún lado');
    process.exit(1);
  }
}

const server = http.createServer((req, res) => {
  console.log(`[REQUEST] ${req.method} ${req.url}`);

  // API routes
  if (req.url.startsWith('/api/')) {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true }));
    return;
  }

  // Health check
  if (req.url === '/ping') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ pong: true }));
    return;
  }

  // Todos los demás requests sirven index.html (SPA)
  res.writeHead(200, {
    'Content-Type': 'text/html; charset=utf-8',
    'Access-Control-Allow-Origin': '*'
  });
  res.end(indexHtml);
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`[SUCCESS] Servidor escuchando en puerto ${PORT}`);
});

// Handle shutdown signals (importante para Railway)
process.on('SIGTERM', () => {
  console.log('[SHUTDOWN] SIGTERM recibido');
  server.close(() => {
    console.log('[SHUTDOWN] Servidor cerrado correctamente');
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10000);
});

process.on('SIGINT', () => {
  console.log('[SHUTDOWN] SIGINT recibido');
  process.exit(0);
});

server.on('error', (err) => {
  console.error('[ERROR] Error del servidor:', err.message);
  process.exit(1);
});

process.on('uncaughtException', (err) => {
  console.error('[FATAL] Excepción no capturada:', err.message);
  process.exit(1);
});
