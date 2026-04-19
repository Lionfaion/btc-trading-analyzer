const http = require('http');

console.log('='.repeat(60));
console.log('[DEBUG] Información del entorno');
console.log('='.repeat(60));
console.log('PORT:', process.env.PORT);
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('PWD:', process.env.PWD);
console.log('HOME:', process.env.HOME);
console.log('USER:', process.env.USER);
console.log('Node version:', process.version);
console.log('CWD:', process.cwd());
console.log('='.repeat(60));

const PORT = process.env.PORT || 8080;

const server = http.createServer((req, res) => {
  const log = `[${new Date().toISOString()}] ${req.method} ${req.url} from ${req.socket.remoteAddress}`;
  console.log(log);

  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({
    ok: true,
    message: 'Server is responding',
    port: PORT,
    time: new Date().toISOString(),
    env: {
      PORT: process.env.PORT,
      NODE_ENV: process.env.NODE_ENV,
      PWD: process.env.PWD
    }
  }));
});

console.log(`[STARTUP] Intentando escuchar en puerto ${PORT}...`);

const listenPromise = new Promise((resolve, reject) => {
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`[SUCCESS] ✅ Servidor escuchando en 0.0.0.0:${PORT}`);
    console.log('[SUCCESS] ✅ Listo para recibir requests');
    resolve();
  });

  server.on('error', (err) => {
    console.error(`[ERROR] No se pudo escuchar en puerto ${PORT}: ${err.message}`);
    reject(err);
  });
});

listenPromise.catch(err => {
  console.error('[FATAL] No se pudo iniciar el servidor');
  process.exit(1);
});

process.on('SIGTERM', () => {
  console.log('[SHUTDOWN] SIGTERM - cerrando servidor');
  server.close(() => {
    console.log('[SHUTDOWN] Servidor cerrado');
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10000);
});

process.on('uncaughtException', (err) => {
  console.error('[FATAL] Excepción no capturada:', err.message);
  process.exit(1);
});
