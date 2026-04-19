const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function parseBody(req) {
  return new Promise((resolve, reject) => {
    if (req.method === 'GET') {
      resolve({});
      return;
    }

    let body = '';
    let resolved = false;

    const timeout = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        reject(new Error('Request body timeout'));
      }
    }, 5000);

    const cleanup = () => {
      clearTimeout(timeout);
      req.removeAllListeners('data');
      req.removeAllListeners('end');
      req.removeAllListeners('error');
    };

    req.on('data', chunk => {
      body += chunk.toString();
    });

    req.on('end', () => {
      if (!resolved) {
        resolved = true;
        cleanup();
        try {
          resolve(body ? JSON.parse(body) : {});
        } catch (e) {
          console.error('JSON parse error:', e);
          resolve({});
        }
      }
    });

    req.on('error', (err) => {
      if (!resolved) {
        resolved = true;
        cleanup();
        console.error('Request error in parseBody:', err);
        reject(err);
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

function jsonResponse(res, statusCode, data) {
  res.writeHead(statusCode, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
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
        return jsonResponse(res, 400, { success: false, error: 'Email y contraseña requeridos' });
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
        return jsonResponse(res, 400, { success: false, error: result.error_description || 'Error al registrarse' });
      }

      return jsonResponse(res, 201, {
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
        return jsonResponse(res, 400, { success: false, error: 'Email y contraseña requeridos' });
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
        return jsonResponse(res, 401, { success: false, error: result.error_description || 'Credenciales inválidas' });
      }

      return jsonResponse(res, 200, {
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
      return jsonResponse(res, 200, { status: 'ok' });
    }

    // DB endpoints - return empty data
    if (section === 'db') {
      // const user = await getUser(req);
      // if (!user) return jsonResponse(res, 401, { error: 'Unauthorized' });

      if (action === 'strategies') return jsonResponse(res, 200, { strategies: [] });
      if (action === 'backtests') return jsonResponse(res, 200, { backtests: [] });
      if (action === 'automation-jobs') return jsonResponse(res, 200, { automations: [] });
    }

    // Bybit endpoints
    if (section === 'bybit') {
      // const user = await getUser(req);

      if (action === 'status') {
        return jsonResponse(res, 200, { connected: false, balance: 0 });
      }
      if (action === 'balance') {
        return jsonResponse(res, 200, { totalBalance: 0, coins: [] });
      }
      if (action === 'positions') {
        return jsonResponse(res, 200, { positions: [], count: 0 });
      }
      if (action === 'connect' && req.method === 'POST') {
        // if (!user) return jsonResponse(res, 401, { error: 'No estás autenticado' });
        return jsonResponse(res, 200, { success: true });
      }
    }

    jsonResponse(res, 404, { error: 'Endpoint not found' });
  } catch (error) {
    console.error('❌ Handler error:', error);
    jsonResponse(res, 500, { error: error.message || 'Internal server error' });
  }
}

module.exports = handler;
