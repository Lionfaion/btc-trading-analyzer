async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'Email y contraseña requeridos' });

  const url = `${process.env.SUPABASE_URL}/auth/v1/signup`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${process.env.SUPABASE_ANON_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  const result = await response.json();
  if (!response.ok) return res.status(400).json({ success: false, error: result.error_description || 'Error al registrarse' });
  return res.status(201).json({
    success: true,
    user: { id: result.user?.id || '', email: result.user?.email || '' },
    session: result.session ? { accessToken: result.session.access_token, expiresIn: result.session.expires_in } : null
  });
}

module.exports = handler;
