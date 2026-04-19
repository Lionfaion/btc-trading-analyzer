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

    const { symbol, side, qty, slPercent, tpPercent } = req.body;

    if (!symbol || !side || !qty) {
      return res.status(400).json({ error: 'symbol, side y qty son requeridos' });
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

    const stopLossPercent = slPercent || 2;
    const takeProfitPercent = tpPercent || 5;

    // Get current price
    const tickersResponse = await fetch(
      `${auth.baseURL}/v5/market/tickers?category=linear&symbol=${symbol}`
    );
    const tickersData = await tickersResponse.json();
    const currentPrice = parseFloat(tickersData.result?.list?.[0]?.lastPrice || 0);

    if (!currentPrice) {
      return res.status(400).json({ error: 'No se pudo obtener el precio actual' });
    }

    let stopLossPrice, takeProfitPrice;
    if (side === 'Buy') {
      stopLossPrice = (currentPrice * (100 - stopLossPercent) / 100).toFixed(4);
      takeProfitPrice = (currentPrice * (100 + takeProfitPercent) / 100).toFixed(4);
    } else {
      stopLossPrice = (currentPrice * (100 + stopLossPercent) / 100).toFixed(4);
      takeProfitPrice = (currentPrice * (100 - takeProfitPercent) / 100).toFixed(4);
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

    // Save trade to DB
    await supabase.from('trades').insert({
      user_id: user.id,
      symbol,
      entry_price: currentPrice,
      quantity: qty,
      entry_time: new Date().toISOString(),
      source: 'manual'
    });

    return res.status(200).json({
      success: true,
      orderId: result.orderId,
      symbol,
      side,
      qty,
      entryPrice: currentPrice,
      stopLoss: stopLossPrice,
      takeProfit: takeProfitPrice,
      message: `Orden colocada en ${credentials.is_testnet ? 'testnet' : 'live'}`
    });
  } catch (error) {
    console.error('Place order error:', error.message);
    return res.status(500).json({ error: error.message });
  }
};
