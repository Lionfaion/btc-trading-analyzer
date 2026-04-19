const http = require('http');
const PORT = process.env.PORT || 8080;

http.createServer((req, res) => {
  res.writeHead(200, {'Content-Type': 'text/plain'});
  res.end('OK');
}).listen(PORT, '0.0.0.0');
