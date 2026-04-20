const { createClient } = require('@supabase/supabase-js');

function getSupabase() {
  return createClient(process.env.SUPABASE_URL || '', process.env.SUPABASE_SERVICE_ROLE_KEY || '');
}

async function getStrategies(userId) {
  const { data, error } = await getSupabase().from('strategies').select('*').eq('user_id', userId).order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

async function createStrategy(strategy) {
  const { data, error } = await getSupabase().from('strategies').insert(strategy).select().single();
  if (error) throw error;
  return data;
}

async function updateStrategy(id, userId, updates) {
  const { data, error } = await getSupabase().from('strategies').update(updates).eq('id', id).eq('user_id', userId).select().single();
  if (error) throw error;
  return data;
}

module.exports = { getStrategies, createStrategy, updateStrategy };
