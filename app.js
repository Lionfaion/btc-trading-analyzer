const http = require('http');
const PORT = parseInt(process.env.PORT || 8080);

const html = `<!DOCTYPE html>
<html>
<head>
  <title>Trading Analyzer</title>
</head>
<body>
  <h1>Dashboard Online</h1>
  <p>Server working</p>
</body>
</html>`;

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/html' });
  res.end(html);
});

server.listen(PORT, '0.0.0.0', () => {
  console.error('Listening on ' + PORT);
});

server.on('error', (err) => {
  console.error('Server error:', err);
  process.exit(1);
});
