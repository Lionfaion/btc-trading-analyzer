const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 8080;

function loadIndexHTML() {
  try {
    const indexPath = path.join(__dirname, 'public', 'index.html');
    if (fs.existsSync(indexPath)) {
      return fs.readFileSync(indexPath, 'utf8');
    }
  } catch (e) {
    console.log('[WARNING] No se pudo cargar public/index.html');
  }

  return '<!DOCTYPE html><html><body><h1>Dashboard</h1></body></html>';
}

const indexHTML = loadIndexHTML();

const server = http.createServer((req, res) => {
  res.writeHead(200, {'Content-Type': 'text/html; charset=utf-8'});
  res.end(indexHTML);
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`[STARTUP] Servidor escuchando en 0.0.0.0:${PORT}`);
  console.log('[STARTUP] Dashboard cargado y listo');
});

process.on('SIGTERM', () => {
  console.log('[SHUTDOWN] SIGTERM recibido');
  server.close(() => {
    console.log('[SHUTDOWN] Servidor cerrado');
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10000);
});
