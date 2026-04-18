const chartData = require('../../lib/chart-data');

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    res.writeHead(405, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Method not allowed' }));
    return;
  }

  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const symbol = url.searchParams.get('symbol') || 'BTCUSDT';
    const limit = parseInt(url.searchParams.get('limit') || '500');

    if (limit < 10 || limit > 5000) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Limit must be between 10 and 5000' }));
      return;
    }

    console.log(`📊 Fetching chart data for ${symbol} (${limit} candles)...`);

    const data = await chartData.formatCandlesForChart(symbol, limit);

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(data));
  } catch (e) {
    console.error('Chart API error:', e.message);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: e.message }));
  }
};
