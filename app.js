const http = require('http');
const PORT = parseInt(process.env.PORT || 8080);

const server = http.createServer((req, res) => {
  res.writeHead(200, {'Content-Type': 'text/html'});
  res.end('<!DOCTYPE html><html><body><h1>Server is online!</h1></body></html>');
});

server.listen(PORT, '0.0.0.0', () => {
  console.error('Listening on ' + PORT);
});

server.on('error', (err) => {
  console.error('Server error:', err.code);
  process.exit(1);
});
