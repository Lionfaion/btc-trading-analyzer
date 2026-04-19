// api/db/strategy.js - Strategy CRUD endpoints
import { getSupabaseClient, getAuthUser, handleError, successResponse } from './init.js';

export default async function handler(req, res) {
  const { method } = req;

  try {
    const user = await getAuthUser(req);
    const supabase = getSupabaseClient();

    switch (method) {
      case 'GET':
        return await handleGetStrategies(user.id, req, supabase);
      case 'POST':
        return await handleCreateStrategy(user.id, req, supabase);
      case 'PUT':
        return await handleUpdateStrategy(user.id, req, supabase);
      case 'DELETE':
        return await handleDeleteStrategy(user.id, req, supabase);
      default:
        return handleError({ message: 'Method not allowed' }, 405);
    }
  } catch (error) {
    return handleError(error, 401);
  }
}

async function handleGetStrategies(userId, req, supabase) {
  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status');
  const limit = parseInt(searchParams.get('limit')) || 50;
  const offset = parseInt(searchParams.get('offset')) || 0;
  const strategyId = searchParams.get('id');

  let query = supabase
    .from('strategies')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  // Get single strategy by ID
  if (strategyId) {
    const { data, error } = await query.eq('id', strategyId).single();
    if (error) throw error;
    if (!data) {
      return handleError({ message: 'Strategy not found' }, 404);
    }
    return successResponse({ strategy: data });
  }

  // Filter by status if provided
  if (status) {
    query = query.eq('status', status);
  }

  query = query.range(offset, offset + limit - 1);

  const { data, error } = await query;

  if (error) throw error;
  return successResponse({ strategies: data || [], count: data?.length || 0 });
}

async function handleCreateStrategy(userId, req, supabase) {
  const body = await req.json();

  const {
    name,
    description = null,
    entry_condition,
    exit_condition,
    risk_per_trade = 1.0,
    max_open_trades = 1,
    status = 'draft',
  } = body;

  // Validate required fields
  if (!name || !entry_condition || !exit_condition) {
    return handleError(
      {
        message:
          'Missing required fields: name, entry_condition, exit_condition',
      },
      400
    );
  }

  const { data, error } = await supabase
    .from('strategies')
    .insert({
      user_id: userId,
      name,
      description,
      entry_condition:
        typeof entry_condition === 'string'
          ? JSON.parse(entry_condition)
          : entry_condition,
      exit_condition:
        typeof exit_condition === 'string'
          ? JSON.parse(exit_condition)
          : exit_condition,
      risk_per_trade: parseFloat(risk_per_trade),
      max_open_trades: parseInt(max_open_trades),
      status,
    })
    .select();

  if (error) throw error;
  return successResponse({ strategy: data?.[0] }, 201);
}

async function handleUpdateStrategy(userId, req, supabase) {
  const { searchParams } = new URL(req.url);
  const strategyId = searchParams.get('id');
  const body = await req.json();

  if (!strategyId) {
    return handleError({ message: 'Missing strategy id parameter' }, 400);
  }

  // Verify strategy belongs to user
  const { data: strategy } = await supabase
    .from('strategies')
    .select('id')
    .eq('id', strategyId)
    .eq('user_id', userId)
    .single();

  if (!strategy) {
    return handleError({ message: 'Strategy not found or unauthorized' }, 404);
  }

  // Transform JSON fields if provided
  const updateData = { updated_at: new Date().toISOString() };

  Object.keys(body).forEach((key) => {
    if (key === 'entry_condition' || key === 'exit_condition') {
      updateData[key] =
        typeof body[key] === 'string' ? JSON.parse(body[key]) : body[key];
    } else if (key === 'risk_per_trade') {
      updateData[key] = parseFloat(body[key]);
    } else if (key === 'max_open_trades') {
      updateData[key] = parseInt(body[key]);
    } else {
      updateData[key] = body[key];
    }
  });

  const { data, error } = await supabase
    .from('strategies')
    .update(updateData)
    .eq('id', strategyId)
    .select();

  if (error) throw error;
  return successResponse({ strategy: data?.[0] });
}

async function handleDeleteStrategy(userId, req, supabase) {
  const { searchParams } = new URL(req.url);
  const strategyId = searchParams.get('id');

  if (!strategyId) {
    return handleError({ message: 'Missing strategy id parameter' }, 400);
  }

  // Verify strategy belongs to user
  const { data: strategy } = await supabase
    .from('strategies')
    .select('id')
    .eq('id', strategyId)
    .eq('user_id', userId)
    .single();

  if (!strategy) {
    return handleError({ message: 'Strategy not found or unauthorized' }, 404);
  }

  const { error } = await supabase
    .from('strategies')
    .delete()
    .eq('id', strategyId);

  if (error) throw error;
  return successResponse({ message: 'Strategy deleted successfully' });
}
