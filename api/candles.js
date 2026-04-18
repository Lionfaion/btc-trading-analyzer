const { getCandles } = require('./db/init');

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    res.writeHead(405, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Method not allowed' }));
    return;
  }

  try {
    const symbol = req.url.includes('?symbol=') 
      ? req.url.split('?symbol=')[1].split('&')[0]
      : 'BTCUSDT';

    const limit = req.url.includes('&limit=')
      ? parseInt(req.url.split('&limit=')[1])
      : 100;

    console.log(`📊 Fetching ${limit} candles for ${symbol}...`);

    const candles = await getCandles(symbol, limit);

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      symbol,
      count: candles.length,
      candles: candles.reverse()
    }));
  } catch (e) {
    console.error('❌ Candles fetch error:', e.message);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: e.message }));
  }
};
