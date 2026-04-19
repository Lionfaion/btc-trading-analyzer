// Close an existing position
const { createClient } = require('@supabase/supabase-js');
const BybitAuth = require('./auth');

function decryptKey(encrypted) {
  try {
    return Buffer.from(encrypted, 'base64').toString('utf-8');
  } catch {
    return encrypted;
  }
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const supabase = createClient(
      process.env.SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    );

    // Get user from token
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ error: 'No autenticado' });
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return res.status(401).json({ error: 'No autenticado' });
    }

    const { symbol, side } = req.body;

    if (!symbol || !side) {
      return res.status(400).json({ error: 'symbol y side son requeridos' });
    }

    // Get credentials from DB
    const { data: credentials, error: credError } = await supabase
      .from('bybit_credentials')
      .select('api_key_encrypted, api_secret_encrypted, is_testnet')
      .eq('user_id', user.id)
      .single();

    if (credError || !credentials) {
      return res.status(400).json({ error: 'Credenciales no configuradas' });
    }

    const apiKey = decryptKey(credentials.api_key_encrypted);
    const apiSecret = decryptKey(credentials.api_secret_encrypted);
    const auth = new BybitAuth(apiKey, apiSecret, credentials.is_testnet);

    // Get current position to determine quantity
    const positionsRes = await auth.request('GET', '/v5/position/list', {
      category: 'linear',
      symbol
    });

    const position = positionsRes.list?.find(p => p.symbol === symbol);
    if (!position || parseFloat(position.size) === 0) {
      return res.status(400).json({ error: 'No hay posición abierta' });
    }

    const closeSide = side === 'Buy' ? 'Sell' : 'Buy';
    const qty = Math.abs(parseFloat(position.size)).toString();

    // Get current price
    const tickersResponse = await fetch(
      `${auth.baseURL}/v5/market/tickers?category=linear&symbol=${symbol}`
    );
    const tickersData = await tickersResponse.json();
    const currentPrice = parseFloat(tickersData.result?.list?.[0]?.lastPrice || 0);

    if (!currentPrice) {
      return res.status(400).json({ error: 'No se pudo obtener el precio actual' });
    }

    // Place market order to close position
    const orderParams = {
      category: 'linear',
      symbol,
      side: closeSide,
      orderType: 'Market',
      qty: qty,
      timeInForce: 'IOC',
      reduce_only: true
    };

    const result = await auth.request('POST', '/v5/order/create', orderParams);

    // Update trade record with exit
    const pnl = parseFloat(position.unrealisedPnL) || 0;
    const pnlPercent = parseFloat(position.unrealisedPnLPcnt) || 0;

    await supabase.from('trades')
      .update({
        exit_price: currentPrice,
        exit_time: new Date().toISOString(),
        pnl,
        pnl_percent: pnlPercent,
        is_win: pnl >= 0
      })
      .eq('user_id', user.id)
      .eq('symbol', symbol)
      .is('exit_price', null);

    return res.status(200).json({
      success: true,
      orderId: result.orderId,
      symbol,
      side: closeSide,
      qty: qty,
      exitPrice: currentPrice,
      pnl: pnl.toFixed(2),
      pnlPercent: pnlPercent.toFixed(2),
      message: 'Posición cerrada exitosamente'
    });
  } catch (error) {
    console.error('Close position error:', error.message);
    return res.status(500).json({ error: error.message });
  }
};
