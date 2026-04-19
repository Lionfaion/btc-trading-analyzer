require('http').createServer((req, res) => {
  res.writeHead(200);
  res.end('OK');
}).listen(process.env.PORT || 8080, '0.0.0.0', () => {
  console.log('Ready');
});
