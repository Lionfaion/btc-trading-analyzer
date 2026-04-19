// Get automation jobs for current user
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ error: 'No autenticado' });
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return res.status(401).json({ error: 'No autenticado' });
    }

    const { data: automations, error } = await supabase
      .from('automation_jobs')
      .select('id, user_id, strategy_id, symbol, is_active, last_run, created_at')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) {
      return res.status(500).json({ error: 'Error al obtener automatizaciones' });
    }

    return res.status(200).json({
      success: true,
      automations: automations || []
    });
  } catch (error) {
    console.error('Error getting automation jobs:', error.message);
    return res.status(500).json({ error: error.message });
  }
};
