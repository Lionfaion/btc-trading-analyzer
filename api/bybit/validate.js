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
      const { apiKey, apiSecret, isTestnet } = JSON.parse(body || '{}');

      if (!apiKey || !apiSecret) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Missing apiKey or apiSecret' }));
        return;
      }

      const auth = new BybitAuth(apiKey, apiSecret, isTestnet !== false);
      const result = await auth.validateCredentials();

      if (result.valid) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: true,
          message: 'Credentials validated successfully',
          balance: result.balance,
          testnet: isTestnet !== false
        }));
      } else {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: false,
          error: result.error || 'Invalid credentials'
        }));
      }
    } catch (e) {
      console.error('Validation error:', e.message);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: e.message }));
    }
  });
};
