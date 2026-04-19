// Enable automated strategy execution
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

    // Check strategy exists
    const { data: strategy, error: stratError } = await supabase
      .from('strategies')
      .select('id')
      .eq('id', strategyId)
      .eq('user_id', user.id)
      .single();

    if (stratError || !strategy) {
      return res.status(404).json({ error: 'Estrategia no encontrada' });
    }

    // Check if job already exists
    const { data: existingJob } = await supabase
      .from('automation_jobs')
      .select('id')
      .eq('user_id', user.id)
      .eq('strategy_id', strategyId)
      .eq('symbol', symbol)
      .single();

    if (existingJob) {
      // Update existing job
      const { error: updateError } = await supabase
        .from('automation_jobs')
        .update({
          is_active: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingJob.id);

      if (updateError) {
        return res.status(500).json({ error: 'Error al activar estrategia' });
      }
    } else {
      // Create new job
      const { error: insertError } = await supabase
        .from('automation_jobs')
        .insert({
          user_id: user.id,
          strategy_id: strategyId,
          symbol,
          is_active: true,
          created_at: new Date().toISOString()
        });

      if (insertError) {
        return res.status(500).json({ error: 'Error al crear automatización' });
      }
    }

    return res.status(200).json({
      success: true,
      message: `Automatización activada para ${symbol}`
    });
  } catch (error) {
    console.error('Error enabling automation:', error.message);
    return res.status(500).json({ error: error.message });
  }
};
