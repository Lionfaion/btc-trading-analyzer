// Disable automated strategy execution
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get user from token
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ error: 'No autenticado' });
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return res.status(401).json({ error: 'No autenticado' });
    }

    const { strategyId, symbol } = req.body;

    if (!strategyId || !symbol) {
      return res.status(400).json({ error: 'strategyId y symbol son requeridos' });
    }

    // Update job to disable
    const { error: updateError } = await supabase
      .from('automation_jobs')
      .update({
        is_active: false,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', user.id)
      .eq('strategy_id', strategyId)
      .eq('symbol', symbol);

    if (updateError) {
      return res.status(500).json({ error: 'Error al desactivar estrategia' });
    }

    return res.status(200).json({
      success: true,
      message: `Automatización desactivada para ${symbol}`
    });
  } catch (error) {
    console.error('Error disabling automation:', error.message);
    return res.status(500).json({ error: error.message });
  }
};
