const BybitAuth = require('./auth');

export default async function handler(req, res) {
  try {
    const { apiKey, apiSecret, isTestnet, symbol, orderId } = req.body;

    if (!apiKey || !apiSecret || !symbol || !orderId) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    const auth = new BybitAuth(apiKey, apiSecret, isTestnet !== false);

    const params = {
      category: 'linear',
      symbol,
      orderId
    };

    const result = await auth.request('POST', '/v5/order/cancel', params);

    return res.status(200).json({
      success: true,
      orderId: result.orderId,
      symbol,
      message: 'Order cancelled successfully'
    });
  } catch (error) {
    console.error('Cancel order error:', error);
    return res.status(500).json({ error: error.message });
  }
}
