// Supabase Client - Database wrapper with error handling

class SupabaseClient {
  constructor(config = {}) {
    this.projectUrl = config.projectUrl || process.env.SUPABASE_URL;
    this.anonKey = config.anonKey || process.env.SUPABASE_ANON_KEY;
    this.serviceKey = config.serviceKey || process.env.SUPABASE_SERVICE_KEY;
    this.headers = {
      'Authorization': `Bearer ${this.anonKey}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    };
  }

  // Generic query method
  async query(method, endpoint, body = null) {
    try {
      const url = `${this.projectUrl}/rest/v1/${endpoint}`;
      const options = {
        method,
        headers: this.headers
      };

      if (body && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
        options.body = JSON.stringify(body);
      }

      const response = await fetch(url, options);
      const data = await response.json();

      if (!response.ok) {
        throw {
          status: response.status,
          error: data.message || 'Database error',
          details: data
        };
      }

      return { success: true, data };
    } catch (error) {
      return {
        success: false,
        error: error.error || 'Database connection failed',
        status: error.status || 503
      };
    }
  }

  // Trades
  async getTrades(userId) {
    return this.query('GET', `trades?user_id=eq.${userId}&order=created_at.desc`);
  }

  async createTrade(trade) {
    return this.query('POST', 'trades', trade);
  }

  async updateTrade(tradeId, updates) {
    return this.query('PATCH', `trades?id=eq.${tradeId}`, updates);
  }

  // Strategies
  async getStrategies(userId) {
    return this.query('GET', `strategies?user_id=eq.${userId}`);
  }

  async createStrategy(strategy) {
    return this.query('POST', 'strategies', strategy);
  }

  async updateStrategy(strategyId, updates) {
    return this.query('PATCH', `strategies?id=eq.${strategyId}`, updates);
  }

  // Candles
  async getCandles(symbol, timeframe, limit = 100) {
    const filter = `symbol=eq.${symbol}&timeframe=eq.${timeframe}`;
    return this.query('GET', `candles_ohlcv?${filter}&order=open_time.desc&limit=${limit}`);
  }

  async insertCandles(candles) {
    return this.query('POST', 'candles_ohlcv', candles);
  }

  // Analysis History
  async getAnalysis(userId, limit = 50) {
    return this.query('GET', `analysis_history?user_id=eq.${userId}&order=created_at.desc&limit=${limit}`);
  }

  async saveAnalysis(analysis) {
    return this.query('POST', 'analysis_history', analysis);
  }

  // Bybit Credentials
  async getBybitCredentials(userId) {
    return this.query('GET', `bybit_credentials?user_id=eq.${userId}`);
  }

  async saveBybitCredentials(credentials) {
    return this.query('POST', 'bybit_credentials', credentials);
  }

  // Auth helpers
  static async signUp(email, password) {
    const response = await fetch(
      `${process.env.SUPABASE_URL}/auth/v1/signup`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
      }
    );
    return response.json();
  }

  static async signIn(email, password) {
    const response = await fetch(
      `${process.env.SUPABASE_URL}/auth/v1/token?grant_type=password`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
      }
    );
    return response.json();
  }

  static async getCurrentUser(accessToken) {
    const response = await fetch(
      `${process.env.SUPABASE_URL}/auth/v1/user`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );
    return response.json();
  }
}

module.exports = SupabaseClient;
