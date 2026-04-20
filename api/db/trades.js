const { createClient } = require('@supabase/supabase-js');

function getSupabase() {
  return createClient(process.env.SUPABASE_URL || '', process.env.SUPABASE_SERVICE_ROLE_KEY || '');
}

async function getTrades(userId, limit = 100) {
  const { data, error } = await getSupabase().from('trades').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(limit);
  if (error) throw error;
  return data || [];
}

async function createTrade(trade) {
  const { data, error } = await getSupabase().from('trades').insert(trade).select().single();
  if (error) throw error;
  return data;
}

async function updateTrade(id, userId, updates) {
  const { data, error } = await getSupabase().from('trades').update(updates).eq('id', id).eq('user_id', userId).select().single();
  if (error) throw error;
  return data;
}

module.exports = { getTrades, createTrade, updateTrade };
