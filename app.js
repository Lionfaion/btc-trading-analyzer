const http = require('http');
const PORT = parseInt(process.env.PORT || 8080);

const server = http.createServer((req, res) => {
  res.writeHead(200, {'Content-Type': 'text/plain'});
  res.end('OK');
});

server.listen(PORT, '0.0.0.0', () => {
  console.error('Listening on ' + PORT);
});

server.on('error', (err) => {
  console.error('Server error:', err.code);
  process.exit(1);
});
