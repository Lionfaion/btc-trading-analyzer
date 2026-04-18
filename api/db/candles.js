// api/db/candles.js - OHLCV Candles CRUD endpoints
import { getSupabaseClient, getAuthUser, handleError, successResponse } from './init.js';

export default async function handler(req, res) {
  const { method } = req;

  try {
    const user = await getAuthUser(req);
    const supabase = getSupabaseClient();

    switch (method) {
      case 'GET':
        return await handleGetCandles(user.id, req, supabase);
      case 'POST':
        return await handleCreateCandles(user.id, req, supabase);
      case 'DELETE':
        return await handleDeleteCandles(user.id, req, supabase);
      default:
        return handleError({ message: 'Method not allowed' }, 405);
    }
  } catch (error) {
    return handleError(error, 401);
  }
}

async function handleGetCandles(userId, req, supabase) {
  const { searchParams } = new URL(req.url);
  const symbol = searchParams.get('symbol') || 'BTCUSDT';
  const timeframe = searchParams.get('timeframe') || '1h';
  const limit = parseInt(searchParams.get('limit')) || 100;
  const offset = parseInt(searchParams.get('offset')) || 0;
  const startTime = searchParams.get('start_time');
  const endTime = searchParams.get('end_time');

  let query = supabase
    .from('candles_ohlcv')
    .select('*')
    .eq('user_id', userId)
    .eq('symbol', symbol)
    .eq('timeframe', timeframe)
    .order('open_time', { ascending: false })
    .range(offset, offset + limit - 1);

  if (startTime) {
    query = query.gte('open_time', new Date(startTime).toISOString());
  }

  if (endTime) {
    query = query.lte('open_time', new Date(endTime).toISOString());
  }

  const { data, error } = await query;

  if (error) throw error;
  return successResponse({ candles: data || [], count: data?.length || 0 });
}

async function handleCreateCandles(userId, req, supabase) {
  const body = await req.json();

  // Accept array or single candle
  const candles = Array.isArray(body) ? body : [body];

  // Validate and transform candles
  const validatedCandles = candles.map((candle) => {
    const {
      open_time,
      open,
      high,
      low,
      close,
      volume,
      turnover = null,
      symbol = 'BTCUSDT',
      timeframe = '1h',
    } = candle;

    if (!open_time || !open || !high || !low || !close || !volume) {
      throw new Error(
        'Missing required fields: open_time, open, high, low, close, volume'
      );
    }

    return {
      user_id: userId,
      symbol,
      timeframe,
      open_time: new Date(open_time).toISOString(),
      open: parseFloat(open),
      high: parseFloat(high),
      low: parseFloat(low),
      close: parseFloat(close),
      volume: parseFloat(volume),
      turnover: turnover ? parseFloat(turnover) : null,
    };
  });

  const { data, error } = await supabase
    .from('candles_ohlcv')
    .upsert(validatedCandles, { onConflict: 'user_id,symbol,timeframe,open_time' })
    .select();

  if (error) throw error;
  return successResponse(
    { candles: data || [], inserted: data?.length || 0 },
    201
  );
}

async function handleDeleteCandles(userId, req, supabase) {
  const { searchParams } = new URL(req.url);
  const symbol = searchParams.get('symbol');
  const timeframe = searchParams.get('timeframe');
  const beforeTime = searchParams.get('before_time');

  if (!symbol || !timeframe) {
    return handleError(
      { message: 'Missing required parameters: symbol, timeframe' },
      400
    );
  }

  let query = supabase
    .from('candles_ohlcv')
    .delete()
    .eq('user_id', userId)
    .eq('symbol', symbol)
    .eq('timeframe', timeframe);

  if (beforeTime) {
    query = query.lt('open_time', new Date(beforeTime).toISOString());
  }

  const { error, count } = await query;

  if (error) throw error;
  return successResponse({
    message: `${count || 0} candles deleted`,
    deleted: count || 0,
  });
}
