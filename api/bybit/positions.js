const BybitAuth = require('./auth');

export default async function handler(req, res) {
  try {
    const { apiKey, apiSecret, isTestnet } = req.body;

    if (!apiKey || !apiSecret) {
      return res.status(400).json({ error: 'Missing API credentials' });
    }

    const auth = new BybitAuth(apiKey, apiSecret, isTestnet !== false);

    const params = {
      category: 'linear',
      settleCoin: 'USDT'
    };

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
        unrealizedPnLPercent: pos.unrealizedPnlPct,
        leverage: pos.leverage,
        stopLoss: pos.stopLoss || 'Not set',
        takeProfit: pos.takeProfit || 'Not set'
      }));

    return res.status(200).json({
      success: true,
      positions: openPositions,
      count: openPositions.length
    });
  } catch (error) {
    console.error('Get positions error:', error);
    return res.status(500).json({ error: error.message });
  }
}
