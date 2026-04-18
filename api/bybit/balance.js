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
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Missing API credentials' }));
        return;
      }

      const auth = new BybitAuth(apiKey, apiSecret, isTestnet !== false);

      const params = {
        category: 'linear',
        accountType: 'UNIFIED'
      };

      const result = await auth.request('GET', '/v5/account/wallet-balance', params);
      const wallet = result.list?.[0] || {};

      const coins = (wallet.coin || []).map(coin => ({
        coin: coin.coin,
        walletBalance: coin.walletBalance,
        availableBalance: coin.availableBalance,
        unrealizedPnL: coin.unrealizedPnL
      }));

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: true,
        totalWalletBalance: wallet.totalWalletBalance,
        totalAvailableBalance: wallet.totalAvailableBalance,
        totalMarginBalance: wallet.totalMarginBalance,
        totalUPL: wallet.totalUPL,
        coins: coins
      }));
    } catch (e) {
      console.error('Balance fetch error:', e.message);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: e.message }));
    }
  });
};
