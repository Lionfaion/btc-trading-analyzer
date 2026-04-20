// Database Client - Frontend wrapper for API calls

class DatabaseClient {
  constructor(authPanel) {
    this.authPanel = authPanel;
    const apiBase = (typeof CONFIG !== 'undefined' && CONFIG.API_BASE_URL)
      ? CONFIG.API_BASE_URL
      : 'https://api-jeqjmp909-automates-projects-a5315662.vercel.app';
    this.baseUrl = apiBase + '/api/db';
  }

  getHeaders() {
    const headers = { 'Content-Type': 'application/json' };
    const authHeaders = this.authPanel.getAuthHeader();
    return { ...headers, ...authHeaders };
  }

  async getTrades() {
    try {
      const response = await fetch(`${this.baseUrl}/trades`, {
        method: 'GET',
        headers: this.getHeaders()
      });

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching trades:', error);
      return { success: false, error: 'Error de conexión' };
    }
  }

  async createTrade(trade) {
    try {
      const response = await fetch(`${this.baseUrl}/trades`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(trade)
      });

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error creating trade:', error);
      return { success: false, error: 'Error de conexión' };
    }
  }

  async updateTrade(tradeId, updates) {
    try {
      const response = await fetch(`${this.baseUrl}/trades/${tradeId}`, {
        method: 'PATCH',
        headers: this.getHeaders(),
        body: JSON.stringify(updates)
      });

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error updating trade:', error);
      return { success: false, error: 'Error de conexión' };
    }
  }

  async getStrategies() {
    try {
      const response = await fetch(`${this.baseUrl}/strategies`, {
        method: 'GET',
        headers: this.getHeaders()
      });

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching strategies:', error);
      return { success: false, error: 'Error de conexión' };
    }
  }

  async createStrategy(strategy) {
    try {
      const response = await fetch(`${this.baseUrl}/strategies`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(strategy)
      });

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error creating strategy:', error);
      return { success: false, error: 'Error de conexión' };
    }
  }

  async getCandles(symbol, timeframe = '1h', limit = 100) {
    try {
      const params = new URLSearchParams({ symbol, timeframe, limit });
      const response = await fetch(`${this.baseUrl}/candles?${params}`, {
        method: 'GET',
        headers: this.getHeaders()
      });

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching candles:', error);
      return { success: false, error: 'Error de conexión' };
    }
  }

  async saveCandles(candles) {
    try {
      const response = await fetch(`${this.baseUrl}/candles`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ candles })
      });

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error saving candles:', error);
      return { success: false, error: 'Error de conexión' };
    }
  }

  async getAnalysis(limit = 50) {
    try {
      const response = await fetch(`${this.baseUrl}/analysis?limit=${limit}`, {
        method: 'GET',
        headers: this.getHeaders()
      });

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching analysis:', error);
      return { success: false, error: 'Error de conexión' };
    }
  }

  async saveAnalysis(analysisData) {
    try {
      const response = await fetch(`${this.baseUrl}/analysis`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(analysisData)
      });

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error saving analysis:', error);
      return { success: false, error: 'Error de conexión' };
    }
  }
}
