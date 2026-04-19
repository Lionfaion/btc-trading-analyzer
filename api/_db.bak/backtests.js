// Database Handler - Backtest results persistence

const SupabaseClient = require('../../lib/supabase-client.js');

/**
 * GET /api/db/backtests
 * Get list of backtests with filters and pagination
 */
async function getBacktests(req, res) {
  try {
    const supabase = new SupabaseClient();

    // Query params for filtering
    const { symbol, strategy, limit = 50, offset = 0 } = req.query || {};

    let query = supabase.client
      .from('backtest_results')
      .select('id, name, symbol, strategy_type, initial_balance, final_balance, roi, win_rate, max_drawdown, total_trades, created_at')
      .order('created_at', { ascending: false });

    if (symbol) {
      query = query.eq('symbol', symbol.toUpperCase());
    }

    if (strategy) {
      query = query.eq('strategy_type', strategy);
    }

    // Apply pagination
    query = query.range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

    const { data, error, count } = await supabase.client
      .from('backtest_results')
      .select('*', { count: 'exact' })
      .then(result => {
        if (symbol) {
          return { ...result, data: result.data?.filter(b => b.symbol === symbol.toUpperCase()) };
        }
        if (strategy) {
          return { ...result, data: result.data?.filter(b => b.strategy_type === strategy) };
        }
        return result;
      });

    if (error) {
      return res.status(500).json({
        success: false,
        error: 'Error al obtener backtests'
      });
    }

    res.json({
      success: true,
      backtests: data || [],
      count: data?.length || 0,
      total: count || 0
    });
  } catch (err) {
    console.error('Backtest GET error:', err);
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
}

/**
 * POST /api/db/backtests
 * Save a new backtest result
 */
async function saveBacktest(req, res) {
  try {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      const backtest = JSON.parse(body);

      // Validate required fields
      if (!backtest.name || !backtest.symbol || !backtest.strategy_type) {
        return res.status(400).json({
          success: false,
          error: 'name, symbol, strategy_type son requeridos'
        });
      }

      const supabase = new SupabaseClient();

      const backtestData = {
        name: backtest.name,
        symbol: backtest.symbol.toUpperCase(),
        strategy_type: backtest.strategy_type,
        strategy_params: backtest.strategy_params || {},
        initial_balance: backtest.initial_balance || 10000,
        final_balance: backtest.final_balance || 0,
        total_profit: backtest.total_profit || 0,
        roi: backtest.roi || 0,
        total_trades: backtest.total_trades || 0,
        win_trades: backtest.win_trades || 0,
        lose_trades: backtest.lose_trades || 0,
        win_rate: backtest.win_rate || 0,
        avg_win: backtest.avg_win || 0,
        avg_loss: backtest.avg_loss || 0,
        profit_factor: backtest.profit_factor || 0,
        max_drawdown: backtest.max_drawdown || 0,
        sharpe_ratio: backtest.sharpe_ratio || 0,
        trades: backtest.trades || [],
        equity_curve: backtest.equity_curve || [],
        created_at: new Date().toISOString()
      };

      const { data, error } = await supabase.client
        .from('backtest_results')
        .insert([backtestData]);

      if (error) {
        return res.status(500).json({
          success: false,
          error: 'Error al guardar backtest'
        });
      }

      res.status(201).json({
        success: true,
        backtest: data?.[0] || backtestData,
        message: `✅ Backtest "${backtest.name}" guardado`
      });
    });
  } catch (err) {
    console.error('Backtest POST error:', err);
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
}

/**
 * GET /api/db/backtests/:id
 * Get a specific backtest by ID
 */
async function getBacktestById(req, res) {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        error: 'ID es requerido'
      });
    }

    const supabase = new SupabaseClient();

    const { data, error } = await supabase.client
      .from('backtest_results')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) {
      return res.status(404).json({
        success: false,
        error: 'Backtest no encontrado'
      });
    }

    res.json({
      success: true,
      backtest: data
    });
  } catch (err) {
    console.error('Backtest GET by ID error:', err);
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
}

/**
 * DELETE /api/db/backtests/:id
 * Delete a backtest by ID
 */
async function deleteBacktest(req, res) {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        error: 'ID es requerido'
      });
    }

    const supabase = new SupabaseClient();

    const { error } = await supabase.client
      .from('backtest_results')
      .delete()
      .eq('id', id);

    if (error) {
      return res.status(500).json({
        success: false,
        error: 'Error al eliminar backtest'
      });
    }

    res.json({
      success: true,
      message: '✅ Backtest eliminado'
    });
  } catch (err) {
    console.error('Backtest DELETE error:', err);
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
}

module.exports = {
  getBacktests,
  saveBacktest,
  getBacktestById,
  deleteBacktest
};
