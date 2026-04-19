const http = require('http');

const PORT = parseInt(process.env.PORT, 10) || 8080;

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ ok: true }));
});

const listener = server.listen(PORT, '0.0.0.0', () => {
  console.log(`Listening on ${PORT}`);
  console.log(`Now accepting connections`);
});

listener.on('error', (e) => {
  console.error('Listen error:', e);
  process.exit(1);
});

process.on('uncaughtException', (e) => {
  console.error('Uncaught:', e);
});
