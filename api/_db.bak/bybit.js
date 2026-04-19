// api/db/bybit.js - Bybit Credentials management
// Note: In production, use a secure key manager (e.g., Supabase Vault or AWS Secrets Manager)
import { getSupabaseClient, getAuthUser, handleError, successResponse } from './init.js';

// Simple XOR encryption for demo (REPLACE with proper encryption in production)
function encryptKey(key) {
  return Buffer.from(key).toString('base64');
}

function decryptKey(encrypted) {
  return Buffer.from(encrypted, 'base64').toString('utf-8');
}

export default async function handler(req, res) {
  const { method } = req;

  try {
    const user = await getAuthUser(req);
    const supabase = getSupabaseClient();

    switch (method) {
      case 'GET':
        return await handleGetCredentials(user.id, req, supabase);
      case 'POST':
        return await handleCreateCredentials(user.id, req, supabase);
      case 'PUT':
        return await handleUpdateCredentials(user.id, req, supabase);
      case 'DELETE':
        return await handleDeleteCredentials(user.id, req, supabase);
      default:
        return handleError({ message: 'Method not allowed' }, 405);
    }
  } catch (error) {
    return handleError(error, 401);
  }
}

async function handleGetCredentials(userId, req, supabase) {
  const { data, error } = await supabase
    .from('bybit_credentials')
    .select('id, sandbox_mode, is_active, created_at, updated_at')
    .eq('user_id', userId)
    .single();

  if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows found
  if (!data) {
    return successResponse({ credentials: null });
  }

  return successResponse({ credentials: data });
}

async function handleCreateCredentials(userId, req, supabase) {
  const body = await req.json();

  const { api_key, api_secret, sandbox_mode = true } = body;

  // Validate required fields
  if (!api_key || !api_secret) {
    return handleError(
      { message: 'Missing required fields: api_key, api_secret' },
      400
    );
  }

  // Check if credentials already exist
  const { data: existing } = await supabase
    .from('bybit_credentials')
    .select('id')
    .eq('user_id', userId)
    .single();

  if (existing) {
    return handleError(
      { message: 'Credentials already exist. Use PUT to update.' },
      409
    );
  }

  const { data, error } = await supabase
    .from('bybit_credentials')
    .insert({
      user_id: userId,
      api_key_encrypted: encryptKey(api_key),
      api_secret_encrypted: encryptKey(api_secret),
      sandbox_mode,
      is_active: false, // User must explicitly activate
    })
    .select('id, sandbox_mode, is_active, created_at');

  if (error) throw error;
  return successResponse(
    { credentials: data?.[0], message: 'Credentials created. Activate with PUT.' },
    201
  );
}

async function handleUpdateCredentials(userId, req, supabase) {
  const body = await req.json();
  const { api_key, api_secret, sandbox_mode, is_active } = body;

  // Verify credentials exist
  const { data: existing } = await supabase
    .from('bybit_credentials')
    .select('id')
    .eq('user_id', userId)
    .single();

  if (!existing) {
    return handleError(
      { message: 'Credentials not found. Create them first with POST.' },
      404
    );
  }

  const updateData = { updated_at: new Date().toISOString() };

  if (api_key) {
    updateData.api_key_encrypted = encryptKey(api_key);
  }

  if (api_secret) {
    updateData.api_secret_encrypted = encryptKey(api_secret);
  }

  if (sandbox_mode !== undefined) {
    updateData.sandbox_mode = sandbox_mode;
  }

  if (is_active !== undefined) {
    updateData.is_active = is_active;
  }

  const { data, error } = await supabase
    .from('bybit_credentials')
    .update(updateData)
    .eq('user_id', userId)
    .select('id, sandbox_mode, is_active, updated_at');

  if (error) throw error;
  return successResponse({
    credentials: data?.[0],
    message: 'Credentials updated successfully',
  });
}

async function handleDeleteCredentials(userId, req, supabase) {
  // Verify credentials exist
  const { data: existing } = await supabase
    .from('bybit_credentials')
    .select('id')
    .eq('user_id', userId)
    .single();

  if (!existing) {
    return handleError({ message: 'Credentials not found' }, 404);
  }

  const { error } = await supabase
    .from('bybit_credentials')
    .delete()
    .eq('user_id', userId);

  if (error) throw error;
  return successResponse({ message: 'Credentials deleted successfully' });
}
