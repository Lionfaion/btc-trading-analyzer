import { createClient } from '@supabase/supabase-js';
import { createCipheriv, createDecipheriv, randomBytes, createHash, createHmac } from 'crypto';
import { createRequire } from 'module';
const _require = createRequire(import.meta.url);
const BacktestEngine = _require('../lib/backtest-engine-server.js');
const CoinGeckoClient = _require('../public/lib/coingecko-client.js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// In-memory rate limiter: 60 req/min per IP
const _rateStore = new Map();
function checkRateLimit(req) {
  const ip = req.headers['x-forwarded-for']?.split(',')[0].trim() || req.socket?.remoteAddress || 'unknown';
  const now = Date.now();
  const record = _rateStore.get(ip);
  if (!record || now > record.reset) {
    _rateStore.set(ip, { count: 1, reset: now + 60000 });
    return { allowed: true, remaining: 59, reset: now + 60000 };
  }
  if (record.count >= 60) return { allowed: false, remaining: 0, reset: record.reset };
  record.count++;
  return { allowed: true, remaining: 60 - record.count, reset: record.reset };
}
// Cleanup old entries every 5 minutes
setInterval(() => { const now = Date.now(); for (const [ip, r] of _rateStore) if (now > r.reset) _rateStore.delete(ip); }, 300000);

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
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');

  if (req.method === 'OPTIONS') return res.status(204).end();

  const rateCheck = checkRateLimit(req);
  res.setHeader('X-RateLimit-Limit', '60');
  res.setHeader('X-RateLimit-Remaining', String(rateCheck.remaining));
  if (!rateCheck.allowed) {
    return res.status(429).json({ error: 'Demasiadas solicitudes. Intenta en 1 minuto.' });
  }

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

    // DB endpoints
    if (section === 'db') {
      const user = await getUser(req);
      if (!user) return res.status(401).json({ error: 'No autenticado' });

      const body = await parseBody(req);

      // Trades
      if (action === 'trades') {
        if (req.method === 'GET') {
          const { data, error } = await supabase.from('trades').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(200);
          if (error) return res.status(500).json({ error: error.message });
          return res.json({ success: true, trades: data || [] });
        }
        if (req.method === 'POST') {
          const { data, error } = await supabase.from('trades').insert({ ...body, user_id: user.id }).select().single();
          if (error) return res.status(500).json({ error: error.message });
          return res.status(201).json({ success: true, trade: data });
        }
      }

      // Trade by ID (PATCH)
      const [dbAction, resourceId] = action ? action.split('/') : [];
      if (dbAction === 'trades' && resourceId && req.method === 'PATCH') {
        const { data, error } = await supabase.from('trades').update(body).eq('id', resourceId).eq('user_id', user.id).select().single();
        if (error) return res.status(500).json({ error: error.message });
        return res.json({ success: true, trade: data });
      }

      // Strategies
      if (action === 'strategies') {
        if (req.method === 'GET') {
          const { data, error } = await supabase.from('strategies').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
          if (error) return res.status(500).json({ error: error.message });
          return res.json({ success: true, strategies: data || [] });
        }
        if (req.method === 'POST') {
          const { data, error } = await supabase.from('strategies').insert({ ...body, user_id: user.id }).select().single();
          if (error) return res.status(500).json({ error: error.message });
          return res.status(201).json({ success: true, strategy: data });
        }
      }

      // Candles (public read, authenticated write)
      if (action === 'candles') {
        if (req.method === 'GET') {
          const url = new URL(req.url, 'http://localhost');
          const symbol = url.searchParams.get('symbol') || 'BTCUSDT';
          const timeframe = url.searchParams.get('timeframe') || '1h';
          const limit = parseInt(url.searchParams.get('limit') || '100');
          const { data, error } = await supabase.from('candles_ohlcv').select('*').eq('symbol', symbol).eq('timeframe', timeframe).order('open_time', { ascending: false }).limit(limit);
          if (error) return res.status(500).json({ error: error.message });
          return res.json({ success: true, candles: (data || []).reverse() });
        }
        if (req.method === 'POST') {
          const { candles = [] } = body;
          const { error } = await supabase.from('candles_ohlcv').upsert(candles, { onConflict: 'symbol,timeframe,open_time' });
          if (error) return res.status(500).json({ error: error.message });
          return res.json({ success: true, inserted: candles.length });
        }
      }

      // Analysis history
      if (action === 'analysis') {
        if (req.method === 'GET') {
          const url = new URL(req.url, 'http://localhost');
          const limit = parseInt(url.searchParams.get('limit') || '50');
          const { data, error } = await supabase.from('analysis_history').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(limit);
          if (error) return res.status(500).json({ error: error.message });
          return res.json({ success: true, analysis: data || [] });
        }
        if (req.method === 'POST') {
          const { data, error } = await supabase.from('analysis_history').insert({ ...body, user_id: user.id }).select().single();
          if (error) return res.status(500).json({ error: error.message });
          return res.status(201).json({ success: true, analysis: data });
        }
      }

      // Backtests CRUD (stored in analysis_history with analysis_type='backtest')
      if (action === 'backtests') {
        if (req.method === 'GET') {
          const { data, error } = await supabase
            .from('analysis_history')
            .select('*')
            .eq('user_id', user.id)
            .eq('analysis_type', 'backtest')
            .order('created_at', { ascending: false })
            .limit(50);
          if (error) return res.status(500).json({ error: error.message });
          const backtests = (data || []).map(row => ({
            id: row.id,
            symbol: row.symbol,
            strategy: row.strategy_type,
            roi: row.roi,
            winRate: row.win_rate,
            totalTrades: row.total_trades,
            createdAt: row.created_at,
            summary: row.result_data?.summary,
            stats: row.result_data?.stats
          }));
          return res.json({ success: true, backtests });
        }
        if (req.method === 'POST') {
          const { symbol, strategyType, summary, stats, trades, equityCurve } = body;
          const { data, error } = await supabase.from('analysis_history').insert({
            user_id: user.id,
            analysis_type: 'backtest',
            symbol: symbol || 'BTC',
            strategy_type: strategyType,
            roi: parseFloat(summary?.roi) || 0,
            win_rate: parseFloat(summary?.winRate) || 0,
            total_trades: summary?.totalTrades || 0,
            result_data: { summary, stats, trades: trades?.slice(-50), equityCurve }
          }).select().single();
          if (error) return res.status(500).json({ error: error.message });
          return res.status(201).json({ success: true, backtest: data });
        }
        if (req.method === 'DELETE') {
          const url = new URL(req.url, 'http://localhost');
          const id = url.searchParams.get('id');
          if (!id) return res.status(400).json({ error: 'ID requerido' });
          const { error } = await supabase.from('analysis_history').delete()
            .eq('id', id).eq('user_id', user.id);
          if (error) return res.status(500).json({ error: error.message });
          return res.json({ success: true });
        }
      }

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

    // Backtest execution endpoint
    if (section === 'backtest' && action === 'run' && req.method === 'POST') {
      const body = await parseBody(req);
      const { symbol = 'BTC', strategyType = 'MULTI_INDICATOR', initialBalance = 10000, riskPercentage = 2, days = 365 } = body;

      const indicatorMap = {
        RSI_CROSSOVER: ['RSI'],
        MACD_CROSSOVER: ['MACD'],
        SMA_CROSSOVER: ['SMA'],
        MULTI_INDICATOR: ['RSI', 'MACD', 'BB']
      };
      const indicators = indicatorMap[strategyType] || ['RSI', 'MACD', 'BB'];

      // 1. Try DB cache first
      const { data: cached } = await supabase
        .from('candles_ohlcv')
        .select('*')
        .eq('symbol', symbol.toUpperCase())
        .eq('timeframe', '1d')
        .order('open_time', { ascending: true })
        .limit(days);

      let candles = cached || [];

      // 2. Fetch from CoinGecko if not enough data
      if (candles.length < 30) {
        const gecko = new CoinGeckoClient();
        candles = await gecko.getHistoricalCandles(symbol, days);

        // Cache in Supabase (fire-and-forget)
        if (candles.length > 0) {
          supabase.from('candles_ohlcv').upsert(
            candles.map(c => ({ ...c, symbol: symbol.toUpperCase() })),
            { onConflict: 'symbol,timeframe,open_time' }
          ).then(() => {}).catch(() => {});
        }
      }

      if (candles.length < 30) {
        return res.status(422).json({ error: 'No hay suficientes datos históricos' });
      }

      const engine = new BacktestEngine({ initialBalance, riskPercentage, indicators });
      engine.loadCandles(candles);
      const result = await engine.run();

      return res.json({ success: true, ...result, symbol, strategyType });
    }

    res.status(404).json({ error: 'Endpoint not found' });
  } catch (error) {
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
}

// Export for both Vercel (ES modules) and Node.js (CommonJS)
module.exports = { default: handler };
module.exports.default = handler;
