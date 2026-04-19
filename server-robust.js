const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 8080;

// HTML fallback mínimo en caso de que no encuentre los archivos
const fallbackHTML = `<!DOCTYPE html>
<html>
<head>
  <title>BTC Trading Analyzer</title>
</head>
<body>
  <h1>Servidor corriendo</h1>
  <p>Si ves errores, intenta recargar la página.</p>
</body>
</html>`;

// Intentar cargar HTML, pero no fallar si no existe
function loadIndexHTML() {
  try {
    const publicPath = path.join(__dirname, 'public', 'index.html');
    if (fs.existsSync(publicPath)) {
      return fs.readFileSync(publicPath, 'utf8');
    }
  } catch (e) {
    console.log('[WARNING] No se pudo cargar public/index.html');
  }

  try {
    const rootPath = path.join(__dirname, 'index.html');
    if (fs.existsSync(rootPath)) {
      return fs.readFileSync(rootPath, 'utf8');
    }
  } catch (e) {
    console.log('[WARNING] No se pudo cargar index.html desde raíz');
  }

  console.log('[WARNING] Usando HTML fallback');
  return fallbackHTML;
}

let indexHtml = loadIndexHTML();

const server = http.createServer((req, res) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);

  // API routes
  if (req.url.startsWith('/api/')) {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true, api: true }));
    return;
  }

  // Health check
  if (req.url === '/ping') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ pong: true }));
    return;
  }

  // Servir HTML para todo lo demás (SPA fallback)
  res.writeHead(200, {
    'Content-Type': 'text/html; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Cache-Control': 'no-cache'
  });
  res.end(indexHtml);
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`[STARTUP] Servidor escuchando en 0.0.0.0:${PORT}`);
  console.log(`[STARTUP] Listo para recibir requests`);
});

// Manejar señales de shutdown
process.on('SIGTERM', () => {
  console.log('[SHUTDOWN] SIGTERM recibido');
  server.close(() => {
    console.log('[SHUTDOWN] Servidor cerrado');
    process.exit(0);
  });
  setTimeout(() => {
    console.error('[SHUTDOWN] Timeout forzado');
    process.exit(1);
  }, 10000);
});

process.on('SIGINT', () => {
  console.log('[SHUTDOWN] SIGINT recibido');
  process.exit(0);
});

server.on('error', (err) => {
  console.error(`[ERROR] ${err.code}: ${err.message}`);
  process.exit(1);
});

process.on('uncaughtException', (err) => {
  console.error(`[FATAL] ${err.message}`);
  process.exit(1);
});
