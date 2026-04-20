const { createClient } = require('@supabase/supabase-js');

class SupabaseClient {
  constructor(projectUrlOrConfig, anonKey) {
    if (typeof projectUrlOrConfig === 'object' && projectUrlOrConfig !== null) {
      this.projectUrl = projectUrlOrConfig.projectUrl || '';
      this.anonKey = projectUrlOrConfig.anonKey || '';
    } else {
      this.projectUrl = projectUrlOrConfig || '';
      this.anonKey = anonKey || '';
    }
    this._client = null;
  }

  _getClient() {
    if (!this._client && this.projectUrl && this.anonKey) {
      this._client = createClient(this.projectUrl, this.anonKey);
    }
    return this._client;
  }

  async query(table, options = {}) {
    const client = this._getClient();
    if (!client) throw new Error('Supabase client not initialized');
    let q = client.from(table).select(options.select || '*');
    if (options.eq) Object.entries(options.eq).forEach(([k, v]) => { q = q.eq(k, v); });
    if (options.order) q = q.order(options.order.column, { ascending: options.order.ascending ?? false });
    if (options.limit) q = q.limit(options.limit);
    const { data, error } = await q;
    if (error) throw error;
    return data;
  }

  async getTrades(userId, limit = 100) {
    const client = this._getClient();
    if (!client) return [];
    const { data, error } = await client.from('trades').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(limit);
    if (error) throw error;
    return data || [];
  }

  async createTrade(trade) {
    const client = this._getClient();
    if (!client) throw new Error('No client');
    const { data, error } = await client.from('trades').insert(trade).select().single();
    if (error) throw error;
    return data;
  }

  async updateTrade(id, updates) {
    const client = this._getClient();
    if (!client) throw new Error('No client');
    const { data, error } = await client.from('trades').update(updates).eq('id', id).select().single();
    if (error) throw error;
    return data;
  }

  async getStrategies(userId) {
    const client = this._getClient();
    if (!client) return [];
    const { data, error } = await client.from('strategies').select('*').eq('user_id', userId).order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  }

  async createStrategy(strategy) {
    const client = this._getClient();
    if (!client) throw new Error('No client');
    const { data, error } = await client.from('strategies').insert(strategy).select().single();
    if (error) throw error;
    return data;
  }

  async updateStrategy(id, updates) {
    const client = this._getClient();
    if (!client) throw new Error('No client');
    const { data, error } = await client.from('strategies').update(updates).eq('id', id).select().single();
    if (error) throw error;
    return data;
  }

  async getCandles(symbol, timeframe = '1h', limit = 100) {
    const client = this._getClient();
    if (!client) return [];
    const { data, error } = await client.from('candles_ohlcv').select('*').eq('symbol', symbol).eq('timeframe', timeframe).order('open_time', { ascending: false }).limit(limit);
    if (error) throw error;
    return (data || []).reverse();
  }

  async insertCandles(candles) {
    const client = this._getClient();
    if (!client) throw new Error('No client');
    const { error } = await client.from('candles_ohlcv').upsert(candles, { onConflict: 'symbol,timeframe,open_time' });
    if (error) throw error;
    return candles.length;
  }

  async getAnalysis(userId, limit = 50) {
    const client = this._getClient();
    if (!client) return [];
    const { data, error } = await client.from('analysis_history').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(limit);
    if (error) throw error;
    return data || [];
  }

  async saveAnalysis(analysis) {
    const client = this._getClient();
    if (!client) throw new Error('No client');
    const { data, error } = await client.from('analysis_history').insert(analysis).select().single();
    if (error) throw error;
    return data;
  }
}

SupabaseClient.signUp = async function(email, password) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error('Missing Supabase env vars');
  const client = createClient(url, key);
  const { data, error } = await client.auth.signUp({ email, password });
  if (error) throw error;
  return data;
};

SupabaseClient.signIn = async function(email, password) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error('Missing Supabase env vars');
  const client = createClient(url, key);
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
};

SupabaseClient.getCurrentUser = async function(token) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  const client = createClient(url, key);
  const { data } = await client.auth.getUser(token);
  return data?.user || null;
};

module.exports = SupabaseClient;
