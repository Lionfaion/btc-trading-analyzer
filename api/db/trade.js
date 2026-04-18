// api/db/trade.js - Trade CRUD endpoints
import { getSupabaseClient, getAuthUser, handleError, successResponse } from './init.js';

export default async function handler(req, res) {
  const { method } = req;

  try {
    const user = await getAuthUser(req);
    const supabase = getSupabaseClient();

    switch (method) {
      case 'GET':
        return await handleGetTrades(user.id, req, supabase);
      case 'POST':
        return await handleCreateTrade(user.id, req, supabase);
      case 'PUT':
        return await handleUpdateTrade(user.id, req, supabase);
      case 'DELETE':
        return await handleDeleteTrade(user.id, req, supabase);
      default:
        return handleError({ message: 'Method not allowed' }, 405);
    }
  } catch (error) {
    return handleError(error, 401);
  }
}

async function handleGetTrades(userId, req, supabase) {
  const { searchParams } = new URL(req.url);
  const strategyId = searchParams.get('strategy_id');
  const status = searchParams.get('status');
  const limit = parseInt(searchParams.get('limit')) || 50;
  const offset = parseInt(searchParams.get('offset')) || 0;

  let query = supabase
    .from('trades')
    .select('*')
    .eq('user_id', userId)
    .order('entry_time', { ascending: false })
    .range(offset, offset + limit - 1);

  if (strategyId) {
    query = query.eq('strategy_id', strategyId);
  }

  if (status) {
    query = query.eq('status', status);
  }

  const { data, error } = await query;

  if (error) throw error;
  return successResponse({ trades: data || [], count: data?.length || 0 });
}

async function handleCreateTrade(userId, req, supabase) {
  const body = await req.json();

  const {
    strategy_id,
    entry_time,
    entry_price,
    quantity,
    exit_time = null,
    exit_price = null,
    status = 'open',
  } = body;

  // Validate required fields
  if (!strategy_id || !entry_time || !entry_price || !quantity) {
    return handleError(
      { message: 'Missing required fields: strategy_id, entry_time, entry_price, quantity' },
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
    .from('trades')
    .insert({
      user_id: userId,
      strategy_id,
      entry_time: new Date(entry_time).toISOString(),
      entry_price: parseFloat(entry_price),
      exit_time: exit_time ? new Date(exit_time).toISOString() : null,
      exit_price: exit_price ? parseFloat(exit_price) : null,
      quantity: parseFloat(quantity),
      status,
    })
    .select();

  if (error) throw error;

  // Calculate P&L if trade is closed
  if (data && data[0] && exit_price) {
    const pnl = (exit_price - entry_price) * quantity;
    const pnl_percent = ((exit_price - entry_price) / entry_price) * 100;

    await supabase
      .from('trades')
      .update({ pnl, pnl_percent, status: 'closed' })
      .eq('id', data[0].id);
  }

  return successResponse({ trade: data?.[0] }, 201);
}

async function handleUpdateTrade(userId, req, supabase) {
  const { searchParams } = new URL(req.url);
  const tradeId = searchParams.get('id');
  const body = await req.json();

  if (!tradeId) {
    return handleError({ message: 'Missing trade id parameter' }, 400);
  }

  // Verify trade belongs to user
  const { data: trade } = await supabase
    .from('trades')
    .select('id')
    .eq('id', tradeId)
    .eq('user_id', userId)
    .single();

  if (!trade) {
    return handleError({ message: 'Trade not found or unauthorized' }, 404);
  }

  const updateData = {
    updated_at: new Date().toISOString(),
    ...body,
  };

  // Calculate P&L if updating exit price
  if (body.exit_price && body.entry_price === undefined) {
    const { data: currentTrade } = await supabase
      .from('trades')
      .select('entry_price, quantity')
      .eq('id', tradeId)
      .single();

    if (currentTrade) {
      const pnl = (body.exit_price - currentTrade.entry_price) * currentTrade.quantity;
      const pnl_percent = ((body.exit_price - currentTrade.entry_price) / currentTrade.entry_price) * 100;
      updateData.pnl = pnl;
      updateData.pnl_percent = pnl_percent;
      updateData.status = 'closed';
    }
  }

  const { data, error } = await supabase
    .from('trades')
    .update(updateData)
    .eq('id', tradeId)
    .select();

  if (error) throw error;
  return successResponse({ trade: data?.[0] });
}

async function handleDeleteTrade(userId, req, supabase) {
  const { searchParams } = new URL(req.url);
  const tradeId = searchParams.get('id');

  if (!tradeId) {
    return handleError({ message: 'Missing trade id parameter' }, 400);
  }

  // Verify trade belongs to user
  const { data: trade } = await supabase
    .from('trades')
    .select('id')
    .eq('id', tradeId)
    .eq('user_id', userId)
    .single();

  if (!trade) {
    return handleError({ message: 'Trade not found or unauthorized' }, 404);
  }

  const { error } = await supabase.from('trades').delete().eq('id', tradeId);

  if (error) throw error;
  return successResponse({ message: 'Trade deleted successfully' });
}
