const express = require('express');
const path = require('path');
const PORT = parseInt(process.env.PORT || 8080);

const app = express();

app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.error('Listening on ' + PORT);
});
