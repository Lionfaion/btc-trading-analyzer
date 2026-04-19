const http = require('http');
const PORT = process.env.PORT || 8080;

const server = http.createServer((req, res) => {
  res.writeHead(200, {'Content-Type': 'text/html; charset=utf-8'});
  res.end('<!DOCTYPE html><html><body style="background:#000;color:#0f0"><h1>Server OK</h1><p>Time: ' + new Date().toISOString() + '</p></body></html>');
});

server.listen(PORT, '0.0.0.0');
console.log('Server on port ' + PORT);
