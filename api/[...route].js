// Dynamic API Router - Catches all /api/* routes
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function getUser(req) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return null;
  const { data } = await supabase.auth.getUser(token);
  return data?.user;
}

async function parseBody(req) {
  if (req.method === 'GET') return {};
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        resolve({});
      }
    });
    req.on('error', reject);
  });
}

export default async function handler(req, res) {
  const { route = [] } = req.query;
  const [section, action, ...rest] = Array.isArray(route) ? route : [route];

  res.setHeader('Content-Type', 'application/json');

  try {
    // Health check
    if (section === 'health') {
      return res.status(200).json({ status: 'ok' });
    }

    const body = await parseBody(req);
    const user = await getUser(req);

    // Bybit API
    if (section === 'bybit') {
      if (action === 'connect' && req.method === 'POST') {
        if (!user) {
          return res.status(401).json({ error: 'No estás autenticado' });
        }
        const { apiKey, apiSecret, isTestnet } = body;
        const encrypted = Buffer.from(apiKey).toString('base64');
        const encryptedSecret = Buffer.from(apiSecret).toString('base64');
        const { error } = await supabase.from('bybit_credentials').insert([{
          user_id: user.id,
          api_key_encrypted: encrypted,
          api_secret_encrypted: encryptedSecret,
          is_testnet: isTestnet
        }]);
        return res.json({ success: !error, error: error?.message });
      }

      if (!user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      if (action === 'status' && req.method === 'GET') {
        const { data } = await supabase
          .from('bybit_credentials')
          .select('*')
          .eq('user_id', user.id)
          .single();
        return res.json({ connected: !!data, balance: 0 });
      }

      if (action === 'balance' && req.method === 'GET') {
        return res.json({ totalBalance: 0, coins: [] });
      }

      if (action === 'positions' && req.method === 'GET') {
        return res.json({ positions: [], count: 0 });
      }

      if (action === 'place-order' && req.method === 'POST') {
        const { symbol, side, qty } = body;
        const { data, error } = await supabase.from('trades').insert([{
          user_id: user.id,
          symbol,
          entry_price: 50000,
          quantity: qty,
          entry_time: new Date().toISOString(),
          source: 'manual'
        }]);
        return res.json({ success: !error, orderId: data?.[0]?.id });
      }
    }

    // Automation API
    if (section === 'automation') {
      if (!user) return res.status(401).json({ error: 'Unauthorized' });

      if (action === 'enable' && req.method === 'POST') {
        const { strategyId, symbol } = body;
        const { error } = await supabase.from('automation_jobs').insert([{
          user_id: user.id,
          strategy_id: strategyId,
          symbol,
          is_active: true
        }]);
        return res.json({ success: !error });
      }

      if (action === 'disable' && req.method === 'POST') {
        const { strategyId } = body;
        const { error } = await supabase
          .from('automation_jobs')
          .update({ is_active: false })
          .eq('user_id', user.id)
          .eq('strategy_id', strategyId);
        return res.json({ success: !error });
      }
    }

    // Database API
    if (section === 'db') {
      if (!user) return res.status(401).json({ error: 'Unauthorized' });

      if (action === 'automation-jobs' && req.method === 'GET') {
        const { data, error } = await supabase
          .from('automation_jobs')
          .select('*')
          .eq('user_id', user.id);
        return res.json({ automations: data || [], error: error?.message });
      }

      if (action === 'strategies' && req.method === 'GET') {
        const { data, error } = await supabase
          .from('strategies')
          .select('*')
          .eq('user_id', user.id);
        return res.json({ strategies: data || [], error: error?.message });
      }

      if (action === 'backtests' && req.method === 'GET') {
        const { data, error } = await supabase
          .from('backtests')
          .select('*')
          .eq('user_id', user.id);
        return res.json({ backtests: data || [], error: error?.message });
      }
    }

    // Backtest API
    if (section === 'backtest' && action === 'run' && req.method === 'POST') {
      return res.json({ trades: [], metrics: { totalProfit: 0 } });
    }

    res.status(404).json({ error: 'Endpoint not found' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
}
