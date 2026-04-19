// Check Bybit connection status - retrieves credentials from DB
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

    // Get credentials from DB
    const { data: credentials, error: dbError } = await supabase
      .from('bybit_credentials')
      .select('api_key_encrypted, api_secret_encrypted, is_testnet')
      .eq('user_id', user.id)
      .single();

    if (dbError || !credentials) {
      return res.status(404).json({
        connected: false,
        message: 'Credenciales no configuradas'
      });
    }

    // Decrypt and validate
    const apiKey = decryptKey(credentials.api_key_encrypted);
    const apiSecret = decryptKey(credentials.api_secret_encrypted);

    const auth = new BybitAuth(apiKey, apiSecret, credentials.is_testnet);
    const result = await auth.validateCredentials();

    return res.status(200).json({
      connected: result.valid,
      balance: result.balance || 0,
      testnet: credentials.is_testnet,
      message: result.valid ? 'Conectado' : 'Credenciales inválidas'
    });
  } catch (error) {
    console.error('Status check error:', error.message);
    return res.status(500).json({
      error: 'Error verificando estado',
      details: error.message
    });
  }
};
