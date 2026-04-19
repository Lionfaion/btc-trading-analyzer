// Global Configuration
// Detect API URL automatically - works with Railway, Vercel, or localhost
function getAPIBaseURL() {
  // Check for explicit configuration
  if (typeof window !== 'undefined' && window.__API_BASE_URL__) {
    return window.__API_BASE_URL__;
  }

  // In production, derive from current origin (works on any hosting)
  if (typeof window !== 'undefined' && window.location) {
    // If frontend is same domain as API
    if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
      // For Vercel frontend, use Vercel API
      const isVercelFrontend = window.location.hostname.includes('vercel.app');
      if (isVercelFrontend) {
        return 'https://api-jeqjmp909-automates-projects-a5315662.vercel.app';
      }
      // For Railway/other, use the Railway API domain
      if (window.location.hostname.includes('btc-trading-analyzer')) {
        return 'https://btc-trading-analyzer-production.up.railway.app';
      }
      // For other deployments, use same domain
      return window.location.origin;
    }
  }

  // Fallback for development
  return 'http://localhost:3000';
}

const CONFIG = {
  // API Base URL - Auto-detects based on environment
  API_BASE_URL: getAPIBaseURL(),

  // Auth settings
  AUTH_TOKEN_KEY: 'authToken',

  // Default settings
  DEFAULT_SYMBOL: 'BTCUSDT',
  DEFAULT_TESTNET: true
};

// Helper function to build full API URLs
function getApiUrl(endpoint) {
  return CONFIG.API_BASE_URL + (endpoint.startsWith('/') ? endpoint : '/' + endpoint);
}

// Make available globally
if (typeof window !== 'undefined') {
  window.CONFIG = CONFIG;
  window.getApiUrl = getApiUrl;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { CONFIG, getApiUrl };
}
