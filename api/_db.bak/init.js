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

async function insertTrade(trade) {
  try {
    const { data, error } = await supabase
      .from('trades')
      .insert([trade]);

    if (error) throw new Error(error.message);
    console.log(`✅ Trade saved: ${trade.symbol} @ ${trade.entry_price}`);
    return data;
  } catch (e) {
    console.error('❌ Trade insert error:', e.message);
    throw e;
  }
}

async function getTrades(symbol, limit = 100) {
  try {
    const { data, error } = await supabase
      .from('trades')
      .select('*')
      .eq('symbol', symbol)
      .order('entry_time', { ascending: false })
      .limit(limit);

    if (error) throw new Error(error.message);
    return data || [];
  } catch (e) {
    console.error('❌ Get trades error:', e.message);
    throw e;
  }
}

async function saveAnalysis(analysis) {
  try {
    const { data, error } = await supabase
      .from('analysis_history')
      .insert([analysis]);

    if (error) throw new Error(error.message);
    return data;
  } catch (e) {
    console.error('❌ Analysis save error:', e.message);
    throw e;
  }
}

async function getAnalysisHistory(symbol, limit = 50) {
  try {
    const { data, error } = await supabase
      .from('analysis_history')
      .select('*')
      .eq('symbol', symbol)
      .order('timestamp', { ascending: false })
      .limit(limit);

    if (error) throw new Error(error.message);
    return data || [];
  } catch (e) {
    console.error('❌ Get analysis error:', e.message);
    throw e;
  }
}

async function calculateStats(symbol) {
  try {
    const { data, error } = await supabase
      .from('trades')
      .select('*')
      .eq('symbol', symbol);

    if (error) throw new Error(error.message);

    const trades = data || [];
    if (trades.length === 0) {
      return {
        totalTrades: 0,
        winRate: 0,
        totalPnL: 0,
        roi: 0
      };
    }

    const winTrades = trades.filter(t => t.pnl > 0).length;
    const totalPnL = trades.reduce((sum, t) => sum + (t.pnl || 0), 0);
    const roi = (totalPnL / Math.abs(trades[0]?.entry_price || 1)) * 100;

    return {
      totalTrades: trades.length,
      winRate: ((winTrades / trades.length) * 100).toFixed(1),
      totalPnL: totalPnL.toFixed(2),
      roi: roi.toFixed(2)
    };
  } catch (e) {
    console.error('❌ Stats error:', e.message);
    throw e;
  }
}

module.exports = {
  supabase,
  insertCandles,
  getCandles,
  insertTrade,
  getTrades,
  saveAnalysis,
  getAnalysisHistory,
  calculateStats
};
