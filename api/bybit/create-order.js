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
      const params = JSON.parse(body || '{}');
      const { apiKey, apiSecret, isTestnet, symbol, side, qty, slPercent, tpPercent } = params;

      if (!apiKey || !apiSecret) {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Missing API credentials' }));
        return;
      }

      if (!symbol || !side || !qty) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Missing symbol, side, or qty' }));
        return;
      }

      const auth = new BybitAuth(apiKey, apiSecret, isTestnet !== false);
      const stopLossPercent = slPercent || 2;
      const takeProfitPercent = tpPercent || 5;

      // Fetch current price
      try {
        const tickersResponse = await fetch(
          `${auth.baseURL}/v5/market/tickers?category=linear&symbol=${symbol}`
        );
        const tickersData = await tickersResponse.json();
        const currentPrice = parseFloat(tickersData.result?.list?.[0]?.lastPrice || 0);

        if (!currentPrice) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Cannot fetch current price for symbol' }));
          return;
        }

        // Calculate stop loss and take profit prices
        let stopLossPrice, takeProfitPrice;
        if (side.toLowerCase() === 'buy') {
          stopLossPrice = (currentPrice * (100 - stopLossPercent) / 100).toFixed(4);
          takeProfitPrice = (currentPrice * (100 + takeProfitPercent) / 100).toFixed(4);
        } else {
          stopLossPrice = (currentPrice * (100 + stopLossPercent) / 100).toFixed(4);
          takeProfitPrice = (currentPrice * (100 - takeProfitPercent) / 100).toFixed(4);
        }

        const orderParams = {
          category: 'linear',
          symbol: symbol,
          side: side,
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
          symbol: symbol,
          side: side,
          qty: qty,
          entryPrice: currentPrice,
          stopLoss: stopLossPrice,
          takeProfit: takeProfitPrice,
          message: 'Order placed successfully on ' + (isTestnet !== false ? 'testnet' : 'live')
        }));
      } catch (priceError) {
        console.error('Price fetch error:', priceError.message);
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Cannot fetch price: ' + priceError.message }));
      }
    } catch (e) {
      console.error('Order creation error:', e.message);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: e.message }));
    }
  });
};
