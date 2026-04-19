const http = require('http');
const PORT = process.env.PORT || 8080;

console.log('[START] PORT=' + PORT);

const srv = http.createServer((req, res) => {
  console.log('[REQ] ' + req.method + ' ' + req.url);
  res.writeHead(200, {'Content-Type': 'text/plain'});
  res.end('OK');
});

srv.on('error', (e) => {
  console.error('[ERROR]', e.code, e.message);
  process.exit(1);
});

srv.listen(PORT, '0.0.0.0', () => {
  console.log('[LISTEN] OK on ' + PORT);
});

setTimeout(() => console.log('[HEALTH] Running'), 5000);
