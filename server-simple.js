const http = require('http');
const PORT = process.env.PORT || 3000;

const server = http.createServer((req, res) => {
  console.log(`${req.method} ${req.url}`);

  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');

  if (req.url === '/ping') {
    res.writeHead(200);
    res.end(JSON.stringify({ pong: true }));
  } else if (req.url === '/api/health') {
    res.writeHead(200);
    res.end(JSON.stringify({ status: 'ok' }));
  } else {
    res.writeHead(404);
    res.end(JSON.stringify({ error: 'not found' }));
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Native HTTP server running on port ${PORT}`);
});

server.on('error', (err) => {
  console.error('❌ Server error:', err);
});
