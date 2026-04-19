const http = require('http');

const PORT = parseInt(process.env.PORT, 10) || 8080;
const HOST = '0.0.0.0';

const server = http.createServer((req, res) => {
  res.setHeader('Connection', 'keep-alive');
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ status: 'online', port: PORT, time: new Date().toISOString() }));
});

server.keepAliveTimeout = 65000;
server.headersTimeout = 66000;

server.listen(PORT, HOST, () => {
  console.log(`Ready: ${HOST}:${PORT}`);
  process.stdout.write('');
});

server.on('error', (err) => {
  console.error('Error:', err.message);
  process.exit(1);
});

process.on('SIGTERM', () => {
  console.log('SIGTERM received');
  server.close(() => {
    console.log('Shut down gracefully');
    process.exit(0);
  });
});
