import { createClient } from '@supabase/supabase-js';
import { createCipheriv, createDecipheriv, randomBytes, createHash, createHmac } from 'crypto';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// AES-256-GCM encryption using server-side key
function _getEncKey() {
  const secret = process.env.ENCRYPTION_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || 'fallback-dev-key-32-chars-min!!';
  return createHash('sha256').update(secret).digest();
}

function encryptAES(text) {
  const key = _getEncKey();
  const iv = randomBytes(16);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
}

function decryptAES(data) {
  if (!data || !data.includes(':')) {
    return Buffer.from(data || '', 'base64').toString('utf-8');
  }
  const [ivHex, authTagHex, encHex] = data.split(':');
  const key = _getEncKey();
  const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(ivHex, 'hex'));
  decipher.setAuthTag(Buffer.from(authTagHex, 'hex'));
  return decipher.update(Buffer.from(encHex, 'hex')) + decipher.final('utf8');
}

// Bybit V5 API signed request
async function bybitRequest(apiKey, apiSecret, isTestnet, method, endpoint, params = {}) {
  const baseURL = isTestnet ? 'https://api-testnet.bybit.com' : 'https://api.bybit.com';
  const timestamp = Date.now().toString();
  const recvWindow = '5000';
  const queryString = new URLSearchParams(params).toString();
  const signPayload = timestamp + apiKey + recvWindow + queryString;
  const signature = createHmac('sha256', apiSecret).update(signPayload).digest('hex');

  const url = queryString ? `${baseURL}${endpoint}?${queryString}` : `${baseURL}${endpoint}`;
  const response = await fetch(url, {
    method,
    headers: {
      'X-BAPI-API-KEY': apiKey,
      'X-BAPI-TIMESTAMP': timestamp,
      'X-BAPI-SIGN': signature,
      'X-BAPI-RECV-WINDOW': recvWindow,
      'Content-Type': 'application/json'
    }
  });
  return response.json();
}

async function parseBody(req) {
  return new Promise((resolve) => {
    if (req.method === 'GET') {
      resolve({});
      return;
    }
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        resolve({});
      }
    });
  });
}

async function getUser(req) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return null;
  try {
    const { data } = await supabase.auth.getUser(token);
    return data?.user;
  } catch {
    return null;
  }
}

async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');

  try {
    const { route = [] } = req.query;
    const [section, action] = Array.isArray(route) ? route : [route];

    // Auth: Signup
    if (section === 'auth' && action === 'signup' && req.method === 'POST') {
      const body = await parseBody(req);
      const { email, password } = body;

      if (!email || !password) {
        return res.status(400).json({ success: false, error: 'Email y contraseña requeridos' });
      }

      const authUrl = `${process.env.SUPABASE_URL}/auth/v1/signup`;
      const response = await fetch(authUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
      });

      const result = await response.json();

      if (!response.ok) {
        return res.status(400).json({ success: false, error: result.error_description || 'Error al registrarse' });
      }

      return res.status(201).json({
        success: true,
        user: { id: result.user?.id || '', email: result.user?.email || '' },
        session: result.session ? {
          accessToken: result.session.access_token,
          refreshToken: result.session.refresh_token,
          expiresIn: result.session.expires_in
        } : null
      });
    }

    // Auth: Login
    if (section === 'auth' && action === 'login' && req.method === 'POST') {
      const body = await parseBody(req);
      const { email, password } = body;

      if (!email || !password) {
        return res.status(400).json({ success: false, error: 'Email y contraseña requeridos' });
      }

      const authUrl = `${process.env.SUPABASE_URL}/auth/v1/token?grant_type=password`;
      const response = await fetch(authUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
      });

      const result = await response.json();

      if (!response.ok) {
        return res.status(401).json({ success: false, error: result.error_description || 'Credenciales inválidas' });
      }

      return res.status(200).json({
        success: true,
        user: { id: result.user?.id || '', email: result.user?.email || '' },
        session: {
          accessToken: result.access_token,
          refreshToken: result.refresh_token,
          expiresIn: result.expires_in
        }
      });
    }

    // Health check
    if (section === 'health') {
      return res.json({ status: 'ok' });
    }

    // DB endpoints - return empty data
    if (section === 'db') {
      // const user = await getUser(req);
      // if (!user) return res.status(401).json({ error: 'Unauthorized' });

      if (action === 'strategies') return res.json({ strategies: [] });
      if (action === 'backtests') return res.json({ backtests: [] });
      if (action === 'automation-jobs') return res.json({ automations: [] });
    }

    // Bybit endpoints
    if (section === 'bybit') {
      const body = await parseBody(req);
      const user = await getUser(req);

      if (action === 'connect' && req.method === 'POST') {
        if (!user) return res.status(401).json({ error: 'No estás autenticado' });

        const { apiKey, apiSecret, isTestnet = true } = body;
        if (!apiKey || !apiSecret) {
          return res.status(400).json({ error: 'API key y secret requeridos' });
        }

        // Validate credentials with Bybit before saving
        const validation = await bybitRequest(apiKey, apiSecret, isTestnet, 'GET', '/v5/account/wallet-balance', { accountType: 'UNIFIED' });
        if (validation.retCode !== 0) {
          return res.status(401).json({ error: 'Credenciales inválidas en Bybit', details: validation.retMsg });
        }

        const balance = parseFloat(validation.result?.list?.[0]?.totalWalletBalance || 0);

        // Delete old credentials then save AES-256-GCM encrypted ones
        await supabase.from('bybit_credentials').delete().eq('user_id', user.id);
        const { error: dbErr } = await supabase.from('bybit_credentials').insert({
          user_id: user.id,
          api_key_encrypted: encryptAES(apiKey),
          api_secret_encrypted: encryptAES(apiSecret),
          is_testnet: isTestnet
        });

        if (dbErr) {
          return res.status(500).json({ error: 'Error guardando credenciales', details: dbErr.message });
        }

        return res.json({ success: true, message: 'Conectado a Bybit', balance, testnet: isTestnet });
      }

      if (action === 'status') {
        if (!user) return res.json({ connected: false, balance: 0, message: 'No autenticado' });

        const { data: creds, error: dbErr } = await supabase
          .from('bybit_credentials')
          .select('api_key_encrypted, api_secret_encrypted, is_testnet')
          .eq('user_id', user.id)
          .single();

        if (dbErr || !creds) return res.json({ connected: false, message: 'Credenciales no configuradas' });

        const apiKey = decryptAES(creds.api_key_encrypted);
        const apiSecret = decryptAES(creds.api_secret_encrypted);
        const data = await bybitRequest(apiKey, apiSecret, creds.is_testnet, 'GET', '/v5/account/wallet-balance', { accountType: 'UNIFIED' });

        if (data.retCode !== 0) {
          return res.json({ connected: false, message: 'Credenciales inválidas', error: data.retMsg });
        }

        const balance = parseFloat(data.result?.list?.[0]?.totalWalletBalance || 0);
        return res.json({ connected: true, balance, testnet: creds.is_testnet, message: 'Conectado' });
      }

      if (action === 'balance') {
        if (!user) return res.json({ totalBalance: 0, coins: [] });

        const { data: creds } = await supabase
          .from('bybit_credentials')
          .select('api_key_encrypted, api_secret_encrypted, is_testnet')
          .eq('user_id', user.id)
          .single();

        if (!creds) return res.json({ totalBalance: 0, coins: [] });

        const apiKey = decryptAES(creds.api_key_encrypted);
        const apiSecret = decryptAES(creds.api_secret_encrypted);
        const data = await bybitRequest(apiKey, apiSecret, creds.is_testnet, 'GET', '/v5/account/wallet-balance', { accountType: 'UNIFIED' });

        if (data.retCode !== 0) return res.json({ totalBalance: 0, coins: [], error: data.retMsg });

        const account = data.result?.list?.[0] || {};
        const coins = (account.coin || []).map(c => ({
          coin: c.coin,
          balance: parseFloat(c.walletBalance || 0),
          usdValue: parseFloat(c.usdValue || 0)
        })).filter(c => c.balance > 0);

        return res.json({ totalBalance: parseFloat(account.totalWalletBalance || 0), coins });
      }

      if (action === 'positions') {
        if (!user) return res.json({ positions: [], count: 0 });

        const { data: creds } = await supabase
          .from('bybit_credentials')
          .select('api_key_encrypted, api_secret_encrypted, is_testnet')
          .eq('user_id', user.id)
          .single();

        if (!creds) return res.json({ positions: [], count: 0 });

        const apiKey = decryptAES(creds.api_key_encrypted);
        const apiSecret = decryptAES(creds.api_secret_encrypted);
        const data = await bybitRequest(apiKey, apiSecret, creds.is_testnet, 'GET', '/v5/position/list', { category: 'linear', settleCoin: 'USDT' });

        if (data.retCode !== 0) return res.json({ positions: [], count: 0, error: data.retMsg });

        const positions = (data.result?.list || [])
          .filter(p => parseFloat(p.size) > 0)
          .map(p => ({
            symbol: p.symbol,
            side: p.side,
            size: parseFloat(p.size),
            entryPrice: parseFloat(p.avgPrice),
            unrealisedPnl: parseFloat(p.unrealisedPnl),
            leverage: p.leverage
          }));

        return res.json({ positions, count: positions.length });
      }
    }

    res.status(404).json({ error: 'Endpoint not found' });
  } catch (error) {
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
}

// Export for both Vercel (ES modules) and Node.js (CommonJS)
module.exports = { default: handler };
module.exports.default = handler;
