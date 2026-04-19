import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

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

export default async function handler(req, res) {
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
      const user = await getUser(req);
      if (!user) return res.status(401).json({ error: 'Unauthorized' });

      if (action === 'strategies') return res.json({ strategies: [] });
      if (action === 'backtests') return res.json({ backtests: [] });
      if (action === 'automation-jobs') return res.json({ automations: [] });
    }

    // Bybit endpoints
    if (section === 'bybit') {
      const body = await parseBody(req);
      const user = await getUser(req);

      if (action === 'status') {
        return res.json({ connected: false, balance: 0 });
      }
      if (action === 'balance') {
        return res.json({ totalBalance: 0, coins: [] });
      }
      if (action === 'positions') {
        return res.json({ positions: [], count: 0 });
      }
      if (action === 'connect' && req.method === 'POST') {
        if (!user) return res.status(401).json({ error: 'No estás autenticado' });
        return res.json({ success: true });
      }
    }

    res.status(404).json({ error: 'Endpoint not found' });
  } catch (error) {
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
}
