// Database Routes - Analysis history management

const SupabaseClient = require('../../lib/supabase-client.js');
const supabase = new SupabaseClient();

/**
 * GET /api/db/analysis?limit=50
 * Get user's analysis history
 */
async function getAnalysisHandler(req, res) {
  const userId = req.user?.id;
  const limit = parseInt(req.query.limit) || 50;
  
  if (!userId) {
    return res.status(401).json({
      success: false,
      error: 'No autorizado'
    });
  }

  const result = await supabase.getAnalysis(userId, limit);
  
  if (!result.success) {
    return res.status(result.status || 500).json({
      success: false,
      error: 'Error al obtener análisis'
    });
  }

  res.json({
    success: true,
    analysis: result.data,
    count: result.data.length
  });
}

/**
 * POST /api/db/analysis
 * Save analysis from Claude
 */
async function saveAnalysisHandler(req, res) {
  const userId = req.user?.id;
  
  if (!userId) {
    return res.status(401).json({
      success: false,
      error: 'No autorizado'
    });
  }

  const { symbol, price, analysis, timestamp } = req.body;

  if (!symbol || !analysis) {
    return res.status(400).json({
      success: false,
      error: 'Parámetros inválidos',
      details: ['symbol and analysis are required']
    });
  }

  const record = {
    user_id: userId,
    symbol,
    price: price ? parseFloat(price) : null,
    analysis,
    timestamp: timestamp || new Date().toISOString()
  };

  const result = await supabase.saveAnalysis(record);
  
  if (!result.success) {
    return res.status(result.status || 500).json({
      success: false,
      error: 'Error al guardar análisis'
    });
  }

  res.status(201).json({
    success: true,
    analysis: result.data[0]
  });
}

module.exports = {
  getAnalysis: getAnalysisHandler,
  saveAnalysis: saveAnalysisHandler
};
