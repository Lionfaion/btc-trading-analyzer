// api/db/analysis.js - Analysis History endpoints (backtest results)
import { getSupabaseClient, getAuthUser, handleError, successResponse } from './init.js';

export default async function handler(req, res) {
  const { method } = req;

  try {
    const user = await getAuthUser(req);
    const supabase = getSupabaseClient();

    switch (method) {
      case 'GET':
        return await handleGetAnalysis(user.id, req, supabase);
      case 'POST':
        return await handleCreateAnalysis(user.id, req, supabase);
      case 'DELETE':
        return await handleDeleteAnalysis(user.id, req, supabase);
      default:
        return handleError({ message: 'Method not allowed' }, 405);
    }
  } catch (error) {
    return handleError(error, 401);
  }
}

async function handleGetAnalysis(userId, req, supabase) {
  const { searchParams } = new URL(req.url);
  const strategyId = searchParams.get('strategy_id');
  const limit = parseInt(searchParams.get('limit')) || 50;
  const offset = parseInt(searchParams.get('offset')) || 0;

  let query = supabase
    .from('analysis_history')
    .select('*')
    .eq('user_id', userId)
    .order('backtest_date', { ascending: false })
    .range(offset, offset + limit - 1);

  if (strategyId) {
    query = query.eq('strategy_id', strategyId);
  }

  const { data, error } = await query;

  if (error) throw error;
  return successResponse({ analyses: data || [], count: data?.length || 0 });
}

async function handleCreateAnalysis(userId, req, supabase) {
  const body = await req.json();

  const {
    strategy_id,
    total_trades = 0,
    win_rate = 0,
    profit_factor = 0,
    max_drawdown = 0,
    avg_win = 0,
    avg_loss = 0,
    total_pnl = 0,
    sharpe_ratio = 0,
    metadata = {},
  } = body;

  // Validate required fields
  if (!strategy_id) {
    return handleError(
      { message: 'Missing required field: strategy_id' },
      400
    );
  }

  // Verify strategy belongs to user
  const { data: strategy } = await supabase
    .from('strategies')
    .select('id')
    .eq('id', strategy_id)
    .eq('user_id', userId)
    .single();

  if (!strategy) {
    return handleError({ message: 'Strategy not found or unauthorized' }, 404);
  }

  const { data, error } = await supabase
    .from('analysis_history')
    .insert({
      user_id: userId,
      strategy_id,
      total_trades: parseInt(total_trades),
      win_rate: parseFloat(win_rate),
      profit_factor: parseFloat(profit_factor),
      max_drawdown: parseFloat(max_drawdown),
      avg_win: parseFloat(avg_win),
      avg_loss: parseFloat(avg_loss),
      total_pnl: parseFloat(total_pnl),
      sharpe_ratio: parseFloat(sharpe_ratio),
      metadata: typeof metadata === 'string' ? JSON.parse(metadata) : metadata,
    })
    .select();

  if (error) throw error;
  return successResponse({ analysis: data?.[0] }, 201);
}

async function handleDeleteAnalysis(userId, req, supabase) {
  const { searchParams } = new URL(req.url);
  const analysisId = searchParams.get('id');

  if (!analysisId) {
    return handleError({ message: 'Missing analysis id parameter' }, 400);
  }

  // Verify analysis belongs to user
  const { data: analysis } = await supabase
    .from('analysis_history')
    .select('id')
    .eq('id', analysisId)
    .eq('user_id', userId)
    .single();

  if (!analysis) {
    return handleError({ message: 'Analysis not found or unauthorized' }, 404);
  }

  const { error } = await supabase
    .from('analysis_history')
    .delete()
    .eq('id', analysisId);

  if (error) throw error;
  return successResponse({ message: 'Analysis deleted successfully' });
}
