// Retry Middleware - PHASE 6 Error Handling & Resilience
// Implements exponential backoff and request queueing

class RetryManager {
  constructor(options = {}) {
    this.maxRetries = options.maxRetries || 3;
    this.initialDelay = options.initialDelay || 1000; // 1s
    this.maxDelay = options.maxDelay || 30000; // 30s
    this.backoffMultiplier = options.backoffMultiplier || 2;
    this.requestQueue = [];
    this.isProcessing = false;
    this.isOffline = false;

    // Monitor online/offline status
    this._monitorConnection();
  }

  /**
   * Retry function with exponential backoff
   * @param {Function} fn - Async function to retry
   * @param {number} retries - Current retry count
   * @param {number} delay - Current delay in ms
   * @returns {Promise} Result of function
   */
  async retry(fn, retries = 0, delay = this.initialDelay) {
    try {
      return await fn();
    } catch (error) {
      if (retries < this.maxRetries && this._isRetryableError(error)) {
        const waitTime = Math.min(delay * Math.pow(this.backoffMultiplier, retries), this.maxDelay);
        console.warn(`⚠️ Request failed, retrying in ${waitTime}ms (attempt ${retries + 1}/${this.maxRetries})`);

        await new Promise(resolve => setTimeout(resolve, waitTime));
        return this.retry(fn, retries + 1, delay);
      }

      throw error;
    }
  }

  /**
   * Queue request for later execution (offline mode)
   * @param {string} id - Request ID
   * @param {Function} fn - Function to execute
   * @returns {Promise} Result when executed
   */
  async queueRequest(id, fn) {
    return new Promise((resolve, reject) => {
      this.requestQueue.push({
        id,
        fn,
        resolve,
        reject,
        timestamp: Date.now()
      });

      console.log(`📋 Request queued: ${id} (queue size: ${this.requestQueue.length})`);
      this._processQueue();
    });
  }

  /**
   * Process queued requests when back online
   * @private
   */
  async _processQueue() {
    if (this.isProcessing || this.isOffline) return;

    this.isProcessing = true;

    while (this.requestQueue.length > 0) {
      const request = this.requestQueue.shift();

      try {
        console.log(`⚙️ Processing queued request: ${request.id}`);
        const result = await this.retry(request.fn);
        request.resolve(result);
      } catch (error) {
        console.error(`❌ Queued request failed: ${request.id}`, error);
        request.reject(error);
      }

      // Small delay between requests
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    this.isProcessing = false;
  }

  /**
   * Check if error is retryable
   * @private
   */
  _isRetryableError(error) {
    const code = error.code || error.status;

    // Retry on network errors and server errors
    const retryableCodes = [
      'ECONNREFUSED',
      'ECONNRESET',
      'ETIMEDOUT',
      'EHOSTUNREACH',
      408, // Request Timeout
      429, // Too Many Requests
      500, // Internal Server Error
      502, // Bad Gateway
      503, // Service Unavailable
      504  // Gateway Timeout
    ];

    return retryableCodes.includes(code) || !navigator.onLine;
  }

  /**
   * Monitor connection status
   * @private
   */
  _monitorConnection() {
    window.addEventListener('online', () => {
      this.isOffline = false;
      console.log('🌐 Connection restored');
      this._processQueue();
    });

    window.addEventListener('offline', () => {
      this.isOffline = true;
      console.log('📡 Connection lost - switching to offline mode');
    });
  }

  /**
   * Get current status
   */
  getStatus() {
    return {
      isOffline: this.isOffline,
      queuedRequests: this.requestQueue.length,
      isProcessing: this.isProcessing
    };
  }

  /**
   * Clear queue (discard pending requests)
   */
  clearQueue() {
    const count = this.requestQueue.length;
    this.requestQueue = [];
    console.log(`🗑️ Cleared ${count} queued requests`);
  }
}

module.exports = RetryManager;
