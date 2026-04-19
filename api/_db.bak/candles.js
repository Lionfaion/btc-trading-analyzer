// Database Routes - Candlestick data management

const SupabaseClient = require('../../lib/supabase-client.js');
const supabase = new SupabaseClient();

/**
 * GET /api/db/candles?symbol=BTC&timeframe=1h&limit=100
 * Get candlestick data from database
 */
async function getCandlesHandler(req, res) {
  const { symbol, timeframe = '1h', limit = 100 } = req.query;

  if (!symbol) {
    return res.status(400).json({
      success: false,
      error: 'Parámetros inválidos',
      details: ['symbol is required']
    });
  }

  const result = await supabase.getCandles(symbol, timeframe, parseInt(limit));
  
  if (!result.success) {
    return res.status(result.status || 500).json({
      success: false,
      error: 'Error al obtener candles'
    });
  }

  res.json({
    success: true,
    symbol,
    timeframe,
    candles: result.data,
    count: result.data.length,
    source: 'database'
  });
}

/**
 * POST /api/db/candles
 * Save candles to database (batch insert)
 */
async function insertCandlesHandler(req, res) {
  const { candles } = req.body;

  if (!Array.isArray(candles) || candles.length === 0) {
    return res.status(400).json({
      success: false,
      error: 'Parámetros inválidos',
      details: ['candles must be a non-empty array']
    });
  }

  // Validate each candle
  const validCandles = candles.map(c => ({
    symbol: c.symbol,
    timeframe: c.timeframe,
    open_time: c.time || c.open_time,
    open: parseFloat(c.open),
    high: parseFloat(c.high),
    low: parseFloat(c.low),
    close: parseFloat(c.close),
    volume: parseFloat(c.volume)
  }));

  const result = await supabase.insertCandles(validCandles);
  
  if (!result.success) {
    return res.status(result.status || 500).json({
      success: false,
      error: 'Error al guardar candles'
    });
  }

  res.status(201).json({
    success: true,
    inserted: result.data.length,
    candles: result.data
  });
}

module.exports = {
  getCandles: getCandlesHandler,
  insertCandles: insertCandlesHandler
};
