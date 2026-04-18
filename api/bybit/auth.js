const crypto = require('crypto');

class BybitAuth {
  constructor(apiKey, apiSecret, isTestnet = true) {
    this.apiKey = apiKey;
    this.apiSecret = apiSecret;
    this.baseURL = isTestnet
      ? 'https://api-testnet.bybit.com'
      : 'https://api.bybit.com';
    this.isTestnet = isTestnet;
  }

  generateSignature(queryString) {
    const timestamp = Date.now();
    const message = `${queryString}${timestamp}`;
    const signature = crypto
      .createHmac('sha256', this.apiSecret)
      .update(message)
      .digest('hex');
    return { signature, timestamp };
  }

  async validateCredentials() {
    try {
      const timestamp = Date.now();
      const params = new URLSearchParams({
        api_key: this.apiKey,
        timestamp: timestamp.toString()
      });

      const message = params.toString() + timestamp;
      const signature = crypto
        .createHmac('sha256', this.apiSecret)
        .update(message)
        .digest('hex');

      const response = await fetch(
        `${this.baseURL}/v5/account/wallet-balance?category=linear&${params}&sign=${signature}`,
        {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        }
      );

      const data = await response.json();

      if (data.retCode === 0) {
        const balance = data.result?.list?.[0]?.totalWalletBalance || 0;
        return { valid: true, balance: parseFloat(balance), error: null };
      }

      return { valid: false, balance: null, error: data.retMsg };
    } catch (error) {
      return { valid: false, balance: null, error: error.message };
    }
  }

  buildRequest(method, endpoint, params = {}) {
    const timestamp = Date.now();
    const paramsWithAuth = {
      api_key: this.apiKey,
      timestamp: timestamp.toString(),
      ...params
    };

    const queryString = new URLSearchParams(paramsWithAuth).toString();
    const message = queryString + timestamp;
    const signature = crypto
      .createHmac('sha256', this.apiSecret)
      .update(message)
      .digest('hex');

    return {
      url: `${this.baseURL}${endpoint}?${queryString}&sign=${signature}`,
      method,
      headers: { 'Content-Type': 'application/json' }
    };
  }

  async request(method, endpoint, params = {}) {
    try {
      const request = this.buildRequest(method, endpoint, params);
      const response = await fetch(request.url, {
        method: request.method,
        headers: request.headers
      });

      const data = await response.json();

      if (data.retCode !== 0) {
        const error = new Error(data.retMsg || 'Unknown API error');
        error.code = data.retCode;
        throw error;
      }

      return data.result || data;
    } catch (error) {
      console.error(`API request failed: ${endpoint}`, error.message);
      throw error;
    }
  }
}

module.exports = BybitAuth;
