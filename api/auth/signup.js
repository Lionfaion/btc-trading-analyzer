// Authentication - Sign up

const SupabaseClient = require('../../lib/supabase-client.js');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.writeHead(405, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: false, error: 'Method not allowed' }));
    return;
  }

  let body = '';
  req.on('data', chunk => body += chunk);
  req.on('end', async () => {
    try {
      const { email, password } = JSON.parse(body);

      if (!email || !password) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: false,
          error: 'Parámetros inválidos',
          details: ['email and password are required']
        }));
        return;
      }

      const result = await SupabaseClient.signUp(email, password);

      if (result.error) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: false,
          error: result.error.message || 'Error al registrarse'
        }));
        return;
      }

      res.writeHead(201, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: true,
        user: {
          id: result.user.id,
          email: result.user.email
        },
        session: result.session ? {
          accessToken: result.session.access_token,
          refreshToken: result.session.refresh_token,
          expiresIn: result.session.expires_in
        } : null
      }));
    } catch (error) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: false,
        error: 'Error del servidor'
      }));
    }
  });
};
