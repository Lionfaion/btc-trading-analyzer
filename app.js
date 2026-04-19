const http = require('http');

const PORT = process.env.PORT || 8080;

const html = '<!DOCTYPE html><html><body style="background:#1a1a1a;color:#0f0;font-family:monospace;padding:40px"><h1>✅ Trading Analyzer</h1><p>Online en puerto ' + PORT + '</p></body></html>';

const server = http.createServer((req, res) => {
  try {
    res.writeHead(200, {
      'Content-Type': 'text/html; charset=utf-8',
      'Content-Length': Buffer.byteLength(html),
      'Connection': 'keep-alive'
    });
    res.end(html);
  } catch (e) {
    console.error('Error:', e.message);
    res.writeHead(500);
    res.end('Error');
  }
});

server.setTimeout(30000);
server.keepAliveTimeout = 65000;

server.listen(PORT, '0.0.0.0', () => {
  console.log('OK:' + PORT);
});

process.on('SIGTERM', () => {
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 10000);
});

process.on('uncaughtException', (err) => {
  console.error('Fatal:', err.message);
  process.exit(1);
});
