// Global Configuration
const CONFIG = {
  // API Base URL - Points to Vercel deployment
  API_BASE_URL: 'https://api-jeqjmp909-automates-projects-a5315662.vercel.app',

  // Auth settings
  AUTH_TOKEN_KEY: 'sb-token',

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
