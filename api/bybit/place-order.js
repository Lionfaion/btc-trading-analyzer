const BybitAuth = require('./auth');

export default async function handler(req, res) {
  try {
    const { apiKey, apiSecret, isTestnet, symbol, side, qty, slPercent, tpPercent } = req.body;

    if (!apiKey || !apiSecret || !symbol || !side || !qty) {
      return res.status(400).json({ error: 'Missing required parameters' });
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
      return res.status(400).json({ error: 'Cannot fetch current price' });
    }

    let stopLossPrice, takeProfitPrice;
    if (side === 'Buy') {
      stopLossPrice = (currentPrice * (100 - stopLossPercent) / 100).toFixed(2);
      takeProfitPrice = (currentPrice * (100 + takeProfitPercent) / 100).toFixed(2);
    } else {
      stopLossPrice = (currentPrice * (100 + stopLossPercent) / 100).toFixed(2);
      takeProfitPrice = (currentPrice * (100 - takeProfitPercent) / 100).toFixed(2);
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

    return res.status(200).json({
      success: true,
      orderId: result.orderId,
      symbol,
      side,
      qty,
      entryPrice: currentPrice,
      stopLoss: stopLossPrice,
      takeProfit: takeProfitPrice,
      message: 'Order placed successfully'
    });
  } catch (error) {
    console.error('Place order error:', error);
    return res.status(500).json({ error: error.message });
  }
}
