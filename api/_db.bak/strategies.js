// Database Routes - Strategy management

const SupabaseClient = require('../../lib/supabase-client.js');
const supabase = new SupabaseClient();

/**
 * GET /api/db/strategies
 * Get user's strategies
 */
async function getStrategiesHandler(req, res) {
  const userId = req.user?.id;
  
  if (!userId) {
    return res.status(401).json({
      success: false,
      error: 'No autorizado'
    });
  }

  const result = await supabase.getStrategies(userId);
  
  if (!result.success) {
    return res.status(result.status || 500).json({
      success: false,
      error: 'Error al obtener estrategias'
    });
  }

  res.json({
    success: true,
    strategies: result.data,
    count: result.data.length
  });
}

/**
 * POST /api/db/strategies
 * Save a new strategy
 */
async function createStrategyHandler(req, res) {
  const userId = req.user?.id;
  
  if (!userId) {
    return res.status(401).json({
      success: false,
      error: 'No autorizado'
    });
  }

  const { name, parameters, rules } = req.body;

  if (!name) {
    return res.status(400).json({
      success: false,
      error: 'Parámetros inválidos',
      details: ['name is required']
    });
  }

  const strategy = {
    user_id: userId,
    name,
    parameters: parameters || {},
    rules: rules || ''
  };

  const result = await supabase.createStrategy(strategy);
  
  if (!result.success) {
    return res.status(result.status || 500).json({
      success: false,
      error: 'Error al guardar estrategia'
    });
  }

  res.status(201).json({
    success: true,
    strategy: result.data[0]
  });
}

/**
 * PATCH /api/db/strategies/:strategyId
 * Update a strategy
 */
async function updateStrategyHandler(req, res) {
  const userId = req.user?.id;
  const strategyId = req.params.strategyId;
  
  if (!userId) {
    return res.status(401).json({
      success: false,
      error: 'No autorizado'
    });
  }

  const updates = {};
  const allowedFields = ['name', 'parameters', 'rules'];
  
  allowedFields.forEach(field => {
    if (req.body[field] !== undefined) {
      updates[field] = req.body[field];
    }
  });

  const result = await supabase.updateStrategy(strategyId, updates);
  
  if (!result.success) {
    return res.status(result.status || 500).json({
      success: false,
      error: 'Error al actualizar estrategia'
    });
  }

  res.json({
    success: true,
    strategy: result.data[0]
  });
}

module.exports = {
  getStrategies: getStrategiesHandler,
  createStrategy: createStrategyHandler,
  updateStrategy: updateStrategyHandler
};
