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
      const { apiKey, apiSecret, isTestnet, symbol, side, qty, slPercent, tpPercent } = JSON.parse(body || '{}');

      if (!apiKey || !apiSecret || !symbol || !side || !qty) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Missing required parameters' }));
        return;
      }

      const auth = new BybitAuth(apiKey, apiSecret, isTestnet !== false);
      const stopLossPercent = slPercent || 2;
      const takeProfitPercent = tpPercent || 5;

      const tickersResponse = await fetch(
        `${auth.baseURL}/v5/market/tickers?category=linear&symbol=${symbol}`
      );
      const tickersData = await tickersResponse.json();
      const currentPrice = parseFloat(tickersData.result?.list?.[0]?.lastPrice || 0);

      if (!currentPrice) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Cannot fetch current price' }));
        return;
      }

      let stopLossPrice, takeProfitPrice;
      if (side === 'Buy') {
        stopLossPrice = (currentPrice * (100 - stopLossPercent) / 100).toFixed(4);
        takeProfitPrice = (currentPrice * (100 + takeProfitPercent) / 100).toFixed(4);
      } else {
        stopLossPrice = (currentPrice * (100 + stopLossPercent) / 100).toFixed(4);
        takeProfitPrice = (currentPrice * (100 - takeProfitPercent) / 100).toFixed(4);
      }

      const orderParams = {
        category: 'linear',
        symbol,
        side,
        orderType: 'Market',
        qty: qty.toString(),
        stopLoss: stopLossPrice,
        takeProfit: takeProfitPrice,
        timeInForce: 'IOC'
      };

      const result = await auth.request('POST', '/v5/order/create', orderParams);

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: true,
        orderId: result.orderId,
        symbol,
        side,
        qty,
        entryPrice: currentPrice,
        stopLoss: stopLossPrice,
        takeProfit: takeProfitPrice,
        message: 'Order placed successfully on ' + (isTestnet !== false ? 'testnet' : 'live')
      }));
    } catch (e) {
      console.error('Place order error:', e.message);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: e.message }));
    }
  });
};
