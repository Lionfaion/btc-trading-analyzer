const BybitAuth = require('../bybit/auth');

export default async function handler(req, res) {
  try {
    const { apiKey, apiSecret, isTestnet, symbol, strategyId } = req.body;

    if (!apiKey || !apiSecret || !symbol) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    const auth = new BybitAuth(apiKey, apiSecret, isTestnet !== false);

    const credCheck = await auth.validateCredentials();
    if (!credCheck.valid) {
      return res.status(401).json({ error: 'Invalid API credentials', details: credCheck.error });
    }

    const tickersResponse = await fetch(
      `${auth.baseURL}/v5/market/tickers?category=linear&symbol=${symbol}`
    );
    const tickersData = await tickersResponse.json();
    const currentPrice = parseFloat(tickersData.result?.list?.[0]?.lastPrice || 0);

    if (!currentPrice) {
      return res.status(400).json({ error: 'Cannot fetch price' });
    }

    // Default strategy: Buy signal
    const side = 'Buy';
    const qty = '0.01';

    const orderParams = {
      category: 'linear',
      symbol,
      side,
      orderType: 'Market',
      qty: qty.toString(),
      stopLoss: (currentPrice * 0.98).toFixed(2),
      takeProfit: (currentPrice * 1.05).toFixed(2),
      timeInForce: 'IOC'
    };

    const orderResult = await auth.request('POST', '/v5/order/create', orderParams);

    return res.status(200).json({
      success: true,
      message: 'Order executed',
      orderId: orderResult.orderId,
      symbol,
      side,
      entryPrice: currentPrice,
      stopLoss: (currentPrice * 0.98).toFixed(2),
      takeProfit: (currentPrice * 1.05).toFixed(2)
    });
  } catch (error) {
    console.error('Automation error:', error);
    return res.status(500).json({ error: error.message });
  }
}
