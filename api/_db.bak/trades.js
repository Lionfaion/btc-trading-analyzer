// Database Routes - Trade persistence

const SupabaseClient = require('../../lib/supabase-client.js');
const supabase = new SupabaseClient();

/**
 * GET /api/db/trades
 * Get user's trade history
 */
async function getTradesHandler(req, res) {
  const userId = req.user?.id;
  
  if (!userId) {
    return res.status(401).json({
      success: false,
      error: 'No autorizado'
    });
  }

  const result = await supabase.getTrades(userId);
  
  if (!result.success) {
    return res.status(result.status || 500).json({
      success: false,
      error: 'Error al obtener trades'
    });
  }

  res.json({
    success: true,
    trades: result.data,
    count: result.data.length
  });
}

/**
 * POST /api/db/trades
 * Save a new trade
 */
async function createTradeHandler(req, res) {
  const userId = req.user?.id;
  
  if (!userId) {
    return res.status(401).json({
      success: false,
      error: 'No autorizado'
    });
  }

  const { symbol, entry_price, exit_price, entry_time, exit_time, quantity, pnl, pnl_percent, is_win, source } = req.body;

  // Validation
  if (!symbol || entry_price === undefined || quantity === undefined || !entry_time) {
    return res.status(400).json({
      success: false,
      error: 'Parámetros inválidos',
      details: ['symbol, entry_price, quantity, entry_time required']
    });
  }

  const trade = {
    user_id: userId,
    symbol,
    entry_price: parseFloat(entry_price),
    exit_price: exit_price ? parseFloat(exit_price) : null,
    entry_time,
    exit_time: exit_time || null,
    quantity: parseFloat(quantity),
    pnl: pnl ? parseFloat(pnl) : null,
    pnl_percent: pnl_percent ? parseFloat(pnl_percent) : null,
    is_win: is_win || null,
    source: source || 'manual'
  };

  const result = await supabase.createTrade(trade);
  
  if (!result.success) {
    return res.status(result.status || 500).json({
      success: false,
      error: 'Error al guardar trade'
    });
  }

  res.status(201).json({
    success: true,
    trade: result.data[0]
  });
}

/**
 * PATCH /api/db/trades/:tradeId
 * Update a trade
 */
async function updateTradeHandler(req, res) {
  const userId = req.user?.id;
  const tradeId = req.params.tradeId;
  
  if (!userId) {
    return res.status(401).json({
      success: false,
      error: 'No autorizado'
    });
  }

  const updates = {};
  const allowedFields = ['exit_price', 'exit_time', 'pnl', 'pnl_percent', 'is_win'];
  
  allowedFields.forEach(field => {
    if (req.body[field] !== undefined) {
      updates[field] = req.body[field];
    }
  });

  const result = await supabase.updateTrade(tradeId, updates);
  
  if (!result.success) {
    return res.status(result.status || 500).json({
      success: false,
      error: 'Error al actualizar trade'
    });
  }

  res.json({
    success: true,
    trade: result.data[0]
  });
}

module.exports = {
  getTrades: getTradesHandler,
  createTrade: createTradeHandler,
  updateTrade: updateTradeHandler
};
