const http = require('http');
const fs = require('fs');
const path = require('path');
const PORT = parseInt(process.env.PORT || 8080);

const publicPath = path.join(__dirname, 'public');
const indexPath = path.join(publicPath, 'index.html');

const server = http.createServer((req, res) => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');

  fs.readFile(indexPath, 'utf8', (err, data) => {
    if (err) {
      res.writeHead(500);
      res.end('Error');
      return;
    }
    res.writeHead(200);
    res.end(data);
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.error('Listening on ' + PORT);
});

server.on('error', (err) => {
  console.error('Server error:', err.code);
  process.exit(1);
});
