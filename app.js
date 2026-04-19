const http = require('http');

const PORT = process.env.PORT || 8080;

const server = http.createServer((req, res) => {
  try {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', time: Date.now() }));
  } catch (e) {
    try {
      res.writeHead(500);
      res.end('error');
    } catch (e2) {
      // ignore
    }
  }
});

server.listen(PORT, '0.0.0.0');
