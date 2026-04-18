const { supabase } = require('../db/init');
const BybitAuth = require('../bybit/auth');

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
      const {
        apiKey, apiSecret, isTestnet,
        strategyId, symbol, enabled
      } = params;

      if (!apiKey || !apiSecret) {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Missing API credentials' }));
        return;
      }

      if (!symbol) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Missing symbol parameter' }));
        return;
      }

      // Validate credentials before enabling
      const auth = new BybitAuth(apiKey, apiSecret, isTestnet !== false);
      const validation = await auth.validateCredentials();

      if (!validation.valid) {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: false,
          error: 'Invalid Bybit credentials: ' + validation.error
        }));
        return;
      }

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: true,
        message: enabled ? 'Automation enabled' : 'Automation disabled',
        symbol: symbol,
        strategyId: strategyId,
        testnet: isTestnet !== false,
        accountBalance: validation.balance,
        automated: enabled,
        note: 'In production, this would store automation config in DB and run scheduler'
      }));
    } catch (e) {
      console.error('Automation error:', e.message);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: e.message }));
    }
  });
};
