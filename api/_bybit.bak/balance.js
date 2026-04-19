const { createClient } = require('@supabase/supabase-js');
const BybitAuth = require('./auth');

const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

function decryptKey(encrypted) {
  try {
    return Buffer.from(encrypted, 'base64').toString('utf-8');
  } catch {
    return encrypted;
  }
}

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    res.writeHead(405, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Método no permitido' }));
    return;
  }

  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'No autenticado' }));
      return;
    }

    const token = authHeader.substring(7);
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Token inválido' }));
      return;
    }

    const { data: credentials, error: dbError } = await supabase
      .from('bybit_credentials')
      .select('api_key_encrypted, api_secret_encrypted, is_testnet')
      .eq('user_id', user.id)
      .single();

    if (dbError || !credentials) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Credenciales no configuradas' }));
      return;
    }

    const apiKey = decryptKey(credentials.api_key_encrypted);
    const apiSecret = decryptKey(credentials.api_secret_encrypted);
    const auth = new BybitAuth(apiKey, apiSecret, credentials.is_testnet);

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
};
