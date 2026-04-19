// Connect Bybit account - validate and store credentials
const { createClient } = require('@supabase/supabase-js');
const BybitAuth = require('./auth');

const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

function encryptKey(key) {
  return Buffer.from(key).toString('base64');
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No autenticado' });
    }

    const token = authHeader.substring(7);
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return res.status(401).json({ error: 'Token inválido' });
    }

    const { apiKey, apiSecret, isTestnet } = req.body || {};

    if (!apiKey || !apiSecret) {
      return res.status(400).json({ error: 'API key y secret requeridos' });
    }

    // Validate credentials with Bybit
    const auth = new BybitAuth(apiKey, apiSecret, isTestnet !== false);
    const validation = await auth.validateCredentials();

    if (!validation.valid) {
      return res.status(401).json({
        error: 'Credenciales inválidas',
        details: validation.error
      });
    }

    // Delete existing credentials if any
    await supabase
      .from('bybit_credentials')
      .delete()
      .eq('user_id', user.id);

    // Store encrypted credentials
    const { data, error } = await supabase
      .from('bybit_credentials')
      .insert({
        user_id: user.id,
        api_key_encrypted: encryptKey(apiKey),
        api_secret_encrypted: encryptKey(apiSecret),
        is_testnet: isTestnet !== false
      })
      .select('id');

    if (error) {
      return res.status(500).json({
        error: 'Error guardando credenciales',
        details: error.message
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Conectado a Bybit',
      balance: validation.balance,
      testnet: isTestnet !== false
    });
  } catch (error) {
    console.error('Connect error:', error.message);
    return res.status(500).json({
      error: 'Error conectando',
      details: error.message
    });
  }
};
