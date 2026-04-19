const BybitAuth = require('./auth');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.writeHead(405, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Method not allowed' }));
    return;
  }

  let body = '';
  req.on('data', chunk => body += chunk);
  req.on('end', async () => {
    try {
      const { apiKey, apiSecret, isTestnet, symbol } = JSON.parse(body || '{}');

      if (!apiKey || !apiSecret) {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Missing API credentials' }));
        return;
      }

      const auth = new BybitAuth(apiKey, apiSecret, isTestnet !== false);

      const params = {
        category: 'linear',
        settleCoin: 'USDT'
      };

      if (symbol) {
        params.symbol = symbol;
      }

      const result = await auth.request('GET', '/v5/position/list', params);

      const openPositions = (result.list || [])
        .filter(pos => parseFloat(pos.size) > 0)
        .map(pos => ({
          symbol: pos.symbol,
          side: pos.side,
          size: pos.size,
          entryPrice: pos.avgPrice,
          currentPrice: pos.markPrice,
          unrealizedPnL: pos.unrealizedPnl,
          unrealizedPnLPercent: pos.unrealizedPnlPcnt ? (parseFloat(pos.unrealizedPnlPcnt) * 100).toFixed(2) : '0',
          leverage: pos.leverage,
          stopLoss: pos.stopLoss || 'Not set',
          takeProfit: pos.takeProfit || 'Not set'
        }));

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: true,
        positions: openPositions,
        count: openPositions.length
      }));
    } catch (e) {
      console.error('Get positions error:', e.message);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: e.message }));
    }
  });
};
