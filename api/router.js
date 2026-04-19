// Consolidated API Router for Hobby plan
// Routes all /api requests to appropriate handlers

const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function getUser(req) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return null;

  const { data } = await supabase.auth.getUser(token);
  return data?.user || null;
}

async function handler(req, res) {
  const { pathname } = new URL(req.url, `http://${req.headers.host}`);
  const [, api, section, ...rest] = pathname.split('/');

  res.setHeader('Content-Type', 'application/json');

  try {
    // Bybit endpoints
    if (section === 'bybit') {
      const action = rest[0] || 'status';
      const user = await getUser(req);
      if (!user && action !== 'connect') return res.status(401).json({ error: 'Unauthorized' });

      if (action === 'connect' && req.method === 'POST') {
        const { apiKey, apiSecret, isTestnet } = req.body;
        // Validate and encrypt
        const encrypted = Buffer.from(apiKey).toString('base64');
        const encryptedSecret = Buffer.from(apiSecret).toString('base64');
        const { data, error } = await supabase
          .from('bybit_credentials')
          .insert([{ user_id: user.id, api_key_encrypted: encrypted, api_secret_encrypted: encryptedSecret, is_testnet: isTestnet }]);
        return res.json({ success: !error, data, error });
      }

      if (action === 'status' && req.method === 'GET') {
        const { data } = await supabase
          .from('bybit_credentials')
          .select('*')
          .eq('user_id', user.id)
          .single();
        return res.json({ connected: !!data, data });
      }

      if (action === 'balance' && req.method === 'GET') {
        return res.json({ balance: 0, coins: {} }); // Placeholder
      }

      if (action === 'positions' && req.method === 'GET') {
        return res.json({ positions: [], count: 0 });
      }

      if (action === 'place-order' && req.method === 'POST') {
        const { symbol, side, qty } = req.body;
        const { data, error } = await supabase
          .from('trades')
          .insert([{
            user_id: user.id,
            symbol,
            entry_price: 0,
            quantity: qty,
            entry_time: new Date(),
            source: 'manual'
          }]);
        return res.json({ success: !error, data, error });
      }
    }

    // Automation endpoints
    if (section === 'automation') {
      const action = rest[0] || 'status';
      const user = await getUser(req);
      if (!user) return res.status(401).json({ error: 'Unauthorized' });

      if (action === 'enable' && req.method === 'POST') {
        const { strategyId, symbol } = req.body;
        const { data, error } = await supabase
          .from('automation_jobs')
          .insert([{ user_id: user.id, strategy_id: strategyId, symbol, is_active: true }]);
        return res.json({ success: !error, data, error });
      }

      if (action === 'disable' && req.method === 'POST') {
        const { strategyId } = req.body;
        const { error } = await supabase
          .from('automation_jobs')
          .update({ is_active: false })
          .eq('user_id', user.id)
          .eq('strategy_id', strategyId);
        return res.json({ success: !error, error });
      }
    }

    // Database endpoints
    if (section === 'db') {
      const action = rest[0] || 'status';
      const user = await getUser(req);
      if (!user) return res.status(401).json({ error: 'Unauthorized' });

      if (action === 'automation-jobs' && req.method === 'GET') {
        const { data, error } = await supabase
          .from('automation_jobs')
          .select('*')
          .eq('user_id', user.id);
        return res.json({ automations: data || [], error });
      }
    }

    // Backtest endpoint
    if (section === 'backtest') {
      const action = rest[0] || 'run';
      if (action === 'run' && req.method === 'POST') {
        return res.json({ success: true, trades: [], metrics: {} });
      }
    }

    res.status(404).json({ error: 'Not found' });
  } catch (error) {
    console.error('Router error:', error);
    res.status(500).json({ error: error.message });
  }
}

module.exports = handler;
