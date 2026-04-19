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

    const { symbol, orderId } = req.body;

    if (!symbol || !orderId) {
      return res.status(400).json({ error: 'symbol y orderId son requeridos' });
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
      message: 'Orden cancelada'
    });
  } catch (error) {
    console.error('Cancel order error:', error.message);
    return res.status(500).json({ error: error.message });
  }
};
