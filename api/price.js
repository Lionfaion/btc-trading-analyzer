const CoinGeckoClient = require('../lib/coingecko-client');

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

    console.log(`📈 Fetching price for ${symbol}...`);

    const client = new CoinGeckoClient();
    const { price, marketCap, volume } = await client.getCurrentPrice(symbol);

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      symbol,
      price,
      marketCap,
      volume,
      timestamp: new Date().toISOString()
    }));
  } catch (e) {
    console.error('❌ Price fetch error:', e.message);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: e.message }));
  }
};
