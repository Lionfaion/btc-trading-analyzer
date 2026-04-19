// Database Routes - Asset/Symbol management

const SupabaseClient = require('../../lib/supabase-client.js');

const SUPPORTED_ASSETS = {
  BTC: { name: 'Bitcoin', emoji: '₿' },
  ETH: { name: 'Ethereum', emoji: 'Ξ' },
  SOL: { name: 'Solana', emoji: '◎' },
  XRP: { name: 'Ripple', emoji: '✕' },
  ADA: { name: 'Cardano', emoji: '₳' },
  DOGE: { name: 'Dogecoin', emoji: '🐕' },
  MATIC: { name: 'Polygon', emoji: '⬟' },
  AVAX: { name: 'Avalanche', emoji: '▲' }
};

/**
 * GET /api/db/assets
 * Get list of supported assets with metadata
 */
async function getAssetsHandler(req, res) {
  const assets = Object.entries(SUPPORTED_ASSETS).map(([symbol, info]) => ({
    symbol,
    name: info.name,
    emoji: info.emoji
  }));

  res.json({
    success: true,
    assets,
    count: assets.length
  });
}

/**
 * GET /api/db/assets/:symbol/stats
 * Get stats for a specific asset (latest price, candle count, date range)
 */
async function getAssetStatsHandler(req, res) {
  const { symbol } = req.params;

  if (!SUPPORTED_ASSETS[symbol]) {
    return res.status(400).json({
      success: false,
      error: 'Activo no soportado'
    });
  }

  const supabase = new SupabaseClient();

  // Get latest candle and count
  const { data: latest, error: latestError } = await supabase.client
    .from('candles_ohlcv')
    .select('*')
    .eq('symbol', symbol)
    .order('open_time', { ascending: false })
    .limit(1);

  if (latestError) {
    return res.status(500).json({
      success: false,
      error: 'Error al obtener datos'
    });
  }

  // Get total candle count
  const { count, error: countError } = await supabase.client
    .from('candles_ohlcv')
    .select('id', { count: 'exact', head: true })
    .eq('symbol', symbol);

  if (countError) {
    return res.status(500).json({
      success: false,
      error: 'Error al obtener datos'
    });
  }

  res.json({
    success: true,
    symbol,
    name: SUPPORTED_ASSETS[symbol].name,
    candles_total: count || 0,
    latest_candle: latest?.[0] || null
  });
}

module.exports = {
  getAssets: getAssetsHandler,
  getAssetStats: getAssetStatsHandler
};
