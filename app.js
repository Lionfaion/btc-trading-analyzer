const express = require('express');
const path = require('path');
const PORT = parseInt(process.env.PORT || 8080);

const app = express();
const publicPath = path.join(__dirname, 'public');

app.use(express.static(publicPath, { maxAge: '1h' }));

app.get('/', (req, res) => {
  res.sendFile(path.join(publicPath, 'index.html'));
});

app.get('*', (req, res) => {
  res.sendFile(path.join(publicPath, 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.error('Listening on ' + PORT);
});

process.on('unhandledRejection', (err) => {
  console.error('Unhandled rejection:', err);
});
