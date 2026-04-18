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

    return res.status(200).json({
      success: true,
      totalWalletBalance: wallet.totalWalletBalance,
      totalAvailableBalance: wallet.totalAvailableBalance,
      totalMarginBalance: wallet.totalMarginBalance,
      totalPerpUPL: wallet.totalUPL,
      coins
    });
  } catch (error) {
    console.error('Get balance error:', error);
    return res.status(500).json({ error: error.message });
  }
}
