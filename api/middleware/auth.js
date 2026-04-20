const { createClient } = require('@supabase/supabase-js');

function getSupabase() {
  return createClient(
    process.env.SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  );
}

async function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'No autenticado' });
  try {
    const { data } = await getSupabase().auth.getUser(token);
    if (!data?.user) return res.status(401).json({ error: 'Token inválido' });
    req.user = data.user;
    next();
  } catch {
    res.status(401).json({ error: 'Token inválido' });
  }
}

async function optionalAuthMiddleware(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (token) {
    try {
      const { data } = await getSupabase().auth.getUser(token);
      req.user = data?.user || null;
    } catch {
      req.user = null;
    }
  } else {
    req.user = null;
  }
  next();
}

module.exports = { authMiddleware, optionalAuthMiddleware };
