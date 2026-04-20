const { createClient } = require('@supabase/supabase-js');

function getSupabase() {
  return createClient(process.env.SUPABASE_URL || '', process.env.SUPABASE_SERVICE_ROLE_KEY || '');
}

async function getCandles(symbol, timeframe = '1h', limit = 100) {
  const { data, error } = await getSupabase().from('candles_ohlcv').select('*').eq('symbol', symbol).eq('timeframe', timeframe).order('open_time', { ascending: false }).limit(limit);
  if (error) throw error;
  return (data || []).reverse();
}

async function insertCandles(candles) {
  const { error } = await getSupabase().from('candles_ohlcv').upsert(candles, { onConflict: 'symbol,timeframe,open_time' });
  if (error) throw error;
  return candles.length;
}

module.exports = { getCandles, insertCandles };
