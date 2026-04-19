const express = require('express');
const path = require('path');

const PORT = parseInt(process.env.PORT || 8080);
const app = express();

const publicDir = path.join(__dirname, 'public');

app.use(express.static(publicDir, {
  setHeaders: (res, path, stat) => {
    if (path.endsWith('.js')) res.set('Content-Type', 'application/javascript');
    else if (path.endsWith('.css')) res.set('Content-Type', 'text/css');
    else if (path.endsWith('.woff2')) res.set('Content-Type', 'font/woff2');
  }
}));

app.get('/', (req, res) => {
  res.sendFile(path.join(publicDir, 'index.html'), (err) => {
    if (err) {
      res.status(500).end('Error loading dashboard');
    }
  });
});

app.get('*', (req, res) => {
  res.sendFile(path.join(publicDir, 'index.html'), (err) => {
    if (err) {
      res.status(500).end('Error loading dashboard');
    }
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.error('Listening on ' + PORT);
});
