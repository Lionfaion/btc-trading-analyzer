const http = require('http');
const PORT = process.env.PORT || 3000;

http.createServer((req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/html; charset=utf-8',
    'Access-Control-Allow-Origin': '*'
  });
  res.end(`<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>BTC Trading Analyzer</title>
  <style>
    body { background: #1a1a1a; color: #0f0; font-family: monospace; padding: 40px; }
    h1 { color: #00ff00; }
  </style>
</head>
<body>
  <h1>✅ Servidor Activo</h1>
  <p>Hora: ${new Date().toISOString()}</p>
  <p>Puerto: ${PORT}</p>
  <p>Si ves esta página, el servidor está funcionando correctamente.</p>
</body>
</html>`);
}).listen(PORT, '0.0.0.0', () => {
  console.log(`[${new Date().toISOString()}] ✅ Servidor escuchando en puerto ${PORT}`);
});
