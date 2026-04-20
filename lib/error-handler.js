// Error Handler - PHASE 6 Error Handling & Resilience
// Unified error handling with Spanish messages and graceful degradation

class ErrorHandler {
  constructor() {
    this.errors = [];
    this.maxErrors = 50; // Keep last 50 errors for debugging
    this.fallbackData = {};
    this.MESSAGES = ErrorHandler.MESSAGES;
  }

  /**
   * User-friendly Spanish error messages
   */
  static MESSAGES = {
    NETWORK_ERROR: 'Error de conexión. Reintentando...',
    API_TIMEOUT: 'La solicitud tardó demasiado. Intenta de nuevo.',
    INVALID_DATA: 'Datos inválidos recibidos del servidor.',
    MISSING_REQUIRED: 'Campos requeridos faltantes.',
    RATE_LIMITED: 'Demasiadas solicitudes. Espera un momento.',
    SERVER_ERROR: 'Error del servidor. Intenta de nuevo más tarde.',
    OFFLINE: 'Sin conexión a internet. Las solicitudes se encolarán.',
    UNKNOWN_ERROR: 'Error desconocido. Contacta a soporte.',
    CACHE_ERROR: 'Error al acceder a caché local.',
    PARSING_ERROR: 'Error al procesar datos.',
    VALIDATION_ERROR: 'Los datos no cumplen con los requisitos.',
    UNAUTHORIZED: 'Acceso denegado. Verifica tus credenciales.',
    NOT_FOUND: 'Recurso no encontrado.',
    METHOD_NOT_ALLOWED: 'Operación no permitida.',
    CONFLICT: 'Conflicto de datos. Recarga la página.',
    INTERNAL_ERROR: 'Error interno del servidor.'
  };

  /**
   * Handle API error with Spanish message
   * @param {Error|Object} error - Error object
   * @param {string} context - Error context for logging
   * @returns {Object} Error details with user message
   */
  handleError(error, context = 'Unknown') {
    const errorObj = {
      timestamp: new Date().toISOString(),
      context,
      status: error.status || error.code || 'UNKNOWN',
      message: error.message || String(error),
      userMessage: this._getUserMessage(error),
      isRetryable: this._isRetryable(error),
      stack: error.stack
    };

    // Store for debugging
    this.errors.push(errorObj);
    if (this.errors.length > this.maxErrors) {
      this.errors.shift();
    }

    console.error(`❌ [${context}]`, errorObj);
    return errorObj;
  }

  /**
   * Get user-friendly Spanish message
   * @private
   */
  _getUserMessage(error) {
    const status = error.status || error.code;

    // Network errors
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      return ErrorHandler.MESSAGES.OFFLINE;
    }

    // HTTP status codes
    const statusMessages = {
      400: ErrorHandler.MESSAGES.INVALID_DATA,
      401: ErrorHandler.MESSAGES.UNAUTHORIZED,
      404: ErrorHandler.MESSAGES.NOT_FOUND,
      405: ErrorHandler.MESSAGES.METHOD_NOT_ALLOWED,
      408: ErrorHandler.MESSAGES.API_TIMEOUT,
      409: ErrorHandler.MESSAGES.CONFLICT,
      429: ErrorHandler.MESSAGES.RATE_LIMITED,
      500: ErrorHandler.MESSAGES.SERVER_ERROR,
      502: ErrorHandler.MESSAGES.SERVER_ERROR,
      503: ErrorHandler.MESSAGES.SERVER_ERROR,
      504: ErrorHandler.MESSAGES.SERVER_ERROR
    };

    if (statusMessages[status]) {
      return statusMessages[status];
    }

    // Network error codes
    const networkMessages = {
      'ECONNREFUSED': ErrorHandler.MESSAGES.NETWORK_ERROR,
      'ECONNRESET': ErrorHandler.MESSAGES.NETWORK_ERROR,
      'ETIMEDOUT': ErrorHandler.MESSAGES.API_TIMEOUT,
      'EHOSTUNREACH': ErrorHandler.MESSAGES.NETWORK_ERROR
    };

    if (networkMessages[status]) {
      return networkMessages[status];
    }

    // Check error message keywords
    if (error.message) {
      if (error.message.includes('parse')) return ErrorHandler.MESSAGES.PARSING_ERROR;
      if (error.message.includes('validate')) return ErrorHandler.MESSAGES.VALIDATION_ERROR;
      if (error.message.includes('timeout')) return ErrorHandler.MESSAGES.API_TIMEOUT;
    }

    return ErrorHandler.MESSAGES.UNKNOWN_ERROR;
  }

  /**
   * Check if error is retryable
   * @private
   */
  _isRetryable(error) {
    const status = error.status || error.code;
    const retryableStatuses = [408, 429, 500, 502, 503, 504, 'ECONNREFUSED', 'ECONNRESET', 'ETIMEDOUT', 'EHOSTUNREACH'];
    const isOffline = typeof navigator !== 'undefined' && !navigator.onLine;
    return retryableStatuses.includes(status) || isOffline;
  }

  /**
   * Get fallback data (demo data for offline/error states)
   * @param {string} dataType - Type of data to return
   * @returns {Object|Array} Fallback data
   */
  getFallbackData(dataType) {
    const fallbacks = {
      prices: {
        'BTC': 67234.50,
        'ETH': 3562.25,
        'SOL': 182.45
      },
      liquidations: [
        { side: 'long', volume: 425000000, price: 67200 },
        { side: 'short', volume: 380000000, price: 67300 },
        { side: 'long', volume: 250000000, price: 66800 }
      ],
      candles: this._generateDemoCandles(),
      stats: {
        winRate: '62.5%',
        avgWinLoss: '2.15x',
        profitFactor: '2.35',
        sharpeRatio: '1.42'
      },
      trades: this._generateDemoTrades()
    };

    return fallbacks[dataType] || fallbacks.prices;
  }

  /**
   * Generate demo candles for offline mode
   * @private
   */
  _generateDemoCandles() {
    const candles = [];
    let price = 67000;

    for (let i = 0; i < 100; i++) {
      const change = (Math.random() - 0.5) * 200;
      price += change;

      candles.push({
        time: Math.floor(Date.now() / 1000) - (100 - i) * 3600,
        open: price,
        high: price + Math.abs(Math.random() * 100),
        low: price - Math.abs(Math.random() * 100),
        close: price + (Math.random() - 0.5) * 50,
        volume: Math.floor(Math.random() * 1000000000)
      });
    }

    return candles;
  }

  /**
   * Generate demo trades for offline mode
   * @private
   */
  _generateDemoTrades() {
    return [
      { date: new Date(Date.now() - 86400000), symbol: 'BTC', entry: 67000, exit: 67500, pnl: 500, percent: 0.75 },
      { date: new Date(Date.now() - 172800000), symbol: 'ETH', entry: 3500, exit: 3450, pnl: -50, percent: -1.43 },
      { date: new Date(Date.now() - 259200000), symbol: 'SOL', entry: 180, exit: 185, pnl: 5, percent: 2.78 }
    ];
  }

  /**
   * Display error to user
   * @param {string} containerId - ID of container element
   * @param {string} message - Error message
   * @param {boolean} isWarning - Is warning (not error)
   */
  displayError(containerId, message, isWarning = false) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const type = isWarning ? 'warning' : 'error';
    const backgroundColor = isWarning ? 'rgba(255, 200, 0, 0.1)' : 'rgba(255, 68, 68, 0.1)';
    const borderColor = isWarning ? '#ffcc00' : '#ff4444';
    const color = isWarning ? '#ffcc00' : '#ff6666';

    const errorDiv = document.createElement('div');
    errorDiv.style.cssText = `
      background: ${backgroundColor};
      border: 1px solid ${borderColor};
      color: ${color};
      padding: 12px;
      border-radius: 6px;
      margin-top: 10px;
      font-size: 0.9em;
    `;

    errorDiv.textContent = message;
    container.appendChild(errorDiv);

    // Auto-remove after 5 seconds
    setTimeout(() => {
      if (errorDiv.parentElement) {
        errorDiv.remove();
      }
    }, 5000);
  }

  /**
   * Get error log for debugging
   */
  getErrorLog() {
    return this.errors.map(e => ({
      ...e,
      age: Date.now() - new Date(e.timestamp).getTime()
    }));
  }

  /**
   * Clear error log
   */
  clearErrorLog() {
    const count = this.errors.length;
    this.errors = [];
    console.log(`🧹 Cleared ${count} logged errors`);
  }
}

// Global error handler instance
const globalErrorHandler = new ErrorHandler();

module.exports = ErrorHandler;
