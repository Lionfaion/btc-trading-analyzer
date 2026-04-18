const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function insertCandles(candles) {
  console.log(`💾 Inserting ${candles.length} candles...`);

  try {
    const { data, error } = await supabase
      .from('candles_ohlcv')
      .upsert(candles, { onConflict: 'symbol,timeframe,open_time' });

    if (error) {
      throw new Error(error.message);
    }

    console.log(`✅ Inserted ${candles.length} candles`);
    return data;
  } catch (e) {
    console.error('❌ Insert error:', e.message);
    throw e;
  }
}

async function getCandles(symbol, limit = 100) {
  try {
    const { data, error } = await supabase
      .from('candles_ohlcv')
      .select('*')
      .eq('symbol', symbol)
      .order('open_time', { ascending: false })
      .limit(limit);

    if (error) throw new Error(error.message);
    return data || [];
  } catch (e) {
    console.error('❌ Fetch error:', e.message);
    throw e;
  }
}

module.exports = {
  supabase,
  insertCandles,
  getCandles
};
