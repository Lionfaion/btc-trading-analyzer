// API Client Utilities - Centralized API call handling

class ApiClient {
  static getToken() {
    return localStorage.getItem('sb-token');
  }

  static getHeaders(includeAuth = true) {
    const headers = {
      'Content-Type': 'application/json'
    };

    if (includeAuth) {
      const token = this.getToken();
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    }

    return headers;
  }

  static async request(endpoint, options = {}) {
    const {
      method = 'GET',
      body = null,
      requireAuth = true
    } = options;

    const headers = this.getHeaders(requireAuth);

    const fetchOptions = {
      method,
      headers
    };

    if (body && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
      fetchOptions.body = JSON.stringify(body);
    }

    // Use current domain for API calls
    const baseUrl = window.location.origin;
    const fullUrl = endpoint.startsWith('http') ? endpoint : baseUrl + endpoint;

    try {
      const response = await fetch(fullUrl, fetchOptions);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `HTTP ${response.status}`);
      }

      return {
        success: true,
        data,
        status: response.status
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        status: null
      };
    }
  }

  // Bybit Endpoints
  static async connectBybit(apiKey, apiSecret, isTestnet = true) {
    return this.request('/api/bybit/connect', {
      method: 'POST',
      body: { apiKey, apiSecret, isTestnet }
    });
  }

  static async getBybitStatus() {
    return this.request('/api/bybit/status');
  }

  static async getBybitBalance() {
    return this.request('/api/bybit/balance');
  }

  static async getBybitPositions() {
    return this.request('/api/bybit/positions');
  }

  static async placeOrder(symbol, side, qty, slPercent = 2, tpPercent = 5) {
    return this.request('/api/bybit/place-order', {
      method: 'POST',
      body: { symbol, side, qty, slPercent, tpPercent }
    });
  }

  static async cancelOrder(symbol, orderId) {
    return this.request('/api/bybit/cancel-order', {
      method: 'POST',
      body: { symbol, orderId }
    });
  }

  static async closePosition(symbol, side) {
    return this.request('/api/bybit/close-position', {
      method: 'POST',
      body: { symbol, side }
    });
  }

  // Automation Endpoints
  static async executeStrategy(strategyId, symbol, demoMode = false) {
    return this.request('/api/automation/execute', {
      method: 'POST',
      body: { strategyId, symbol, demoMode }
    });
  }

  static async enableAutomation(strategyId, symbol) {
    return this.request('/api/automation/enable', {
      method: 'POST',
      body: { strategyId, symbol }
    });
  }

  static async disableAutomation(strategyId, symbol) {
    return this.request('/api/automation/disable', {
      method: 'POST',
      body: { strategyId, symbol }
    });
  }

  static async getAutomations() {
    return this.request('/api/db/automation-jobs');
  }

  // Strategy Endpoints
  static async getStrategies() {
    return this.request('/api/db/strategies');
  }

  static async createStrategy(name, description, parameters) {
    return this.request('/api/db/strategies', {
      method: 'POST',
      body: { name, description, parameters }
    });
  }

  // Trade History
  static async getTrades(limit = 50) {
    return this.request(`/api/db/trades?limit=${limit}`);
  }
}

// Make available globally if needed
if (typeof window !== 'undefined') {
  window.ApiClient = ApiClient;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = ApiClient;
}
