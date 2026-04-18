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
      const { apiKey, apiSecret, isTestnet, symbol, orderId } = JSON.parse(body || '{}');

      if (!apiKey || !apiSecret || !symbol || !orderId) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Missing required parameters' }));
        return;
      }

      const auth = new BybitAuth(apiKey, apiSecret, isTestnet !== false);

      const params = {
        category: 'linear',
        symbol,
        orderId
      };

      const result = await auth.request('POST', '/v5/order/cancel', params);

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: true,
        orderId: result.orderId,
        symbol,
        message: 'Order cancelled successfully'
      }));
    } catch (e) {
      console.error('Cancel order error:', e.message);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: e.message }));
    }
  });
};
