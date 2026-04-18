// api/db/init.js - Supabase initialization and connection
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    'Missing Supabase credentials. Set SUPABASE_URL and SUPABASE_ANON_KEY in vercel.json env vars.'
  );
}

// Singleton Supabase client
let supabase = null;

export function getSupabaseClient() {
  if (!supabase) {
    supabase = createClient(supabaseUrl, supabaseKey);
  }
  return supabase;
}

// Get authenticated user from request headers
export async function getAuthUser(req) {
  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    throw new Error('Missing or invalid authorization header');
  }

  const token = authHeader.substring(7);
  const supabase = getSupabaseClient();

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) {
    throw new Error('Unauthorized: Invalid token');
  }

  return data.user;
}

// Utility: handle API errors with proper HTTP status codes
export function handleError(error, statusCode = 500) {
  console.error('[DB Error]', error);
  return new Response(
    JSON.stringify({
      error: error.message || 'Internal Server Error',
      code: error.code || 'UNKNOWN_ERROR',
    }),
    {
      status: statusCode,
      headers: { 'Content-Type': 'application/json' },
    }
  );
}

// Utility: success response
export function successResponse(data, statusCode = 200) {
  return new Response(JSON.stringify(data), {
    status: statusCode,
    headers: { 'Content-Type': 'application/json' },
  });
}
