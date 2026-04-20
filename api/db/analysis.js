const { createClient } = require('@supabase/supabase-js');

function getSupabase() {
  return createClient(process.env.SUPABASE_URL || '', process.env.SUPABASE_SERVICE_ROLE_KEY || '');
}

async function getAnalysis(userId, limit = 50) {
  const { data, error } = await getSupabase().from('analysis_history').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(limit);
  if (error) throw error;
  return data || [];
}

async function saveAnalysis(analysis) {
  const { data, error } = await getSupabase().from('analysis_history').insert(analysis).select().single();
  if (error) throw error;
  return data;
}

module.exports = { getAnalysis, saveAnalysis };
