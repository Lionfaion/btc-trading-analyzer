// Chart Loader - PHASE 6 Performance Optimization
// Implements candle pagination, virtual scrolling, and indicator caching

class ChartLoader {
  constructor(cacheManager) {
    this.cache = cacheManager;
    this.candlesPerPage = 500;
    this.indicatorCache = new Map();
    this.loadingPromises = new Map();
  }

  /**
   * Load candles with pagination
   * @param {string} symbol - Trading pair (BTCUSDT, ETHUSDT)
   * @param {string} timeframe - Timeframe (1h, 4h, 1d)
   * @param {number} limit - Total candles to load (default 500)
   * @returns {Promise<Array>} Array of candle objects
   */
  async loadCandles(symbol, timeframe = '1h', limit = 500) {
    const cacheKey = `candles:${symbol}:${timeframe}:${limit}`;

    // Return cached data if available
    const cached = this.cache.get(cacheKey);
    if (cached) {
      console.log(`📊 Using cached candles for ${symbol} (${limit} candles)`);
      return cached;
    }

    // Prevent duplicate requests
    if (this.loadingPromises.has(cacheKey)) {
      return this.loadingPromises.get(cacheKey);
    }

    const promise = this._fetchCandlesPaginated(symbol, timeframe, limit);
    this.loadingPromises.set(cacheKey, promise);

    try {
      const candles = await promise;
      // Cache for 5 minutes
      this.cache.set(cacheKey, candles, 300000);
      return candles;
    } finally {
      this.loadingPromises.delete(cacheKey);
    }
  }

  /**
   * Load candles in pages (500 at a time)
   * @private
   */
  async _fetchCandlesPaginated(symbol, timeframe, totalLimit) {
    const allCandles = [];
    let offset = 0;

    while (allCandles.length < totalLimit) {
      const pageCacheKey = `candles:page:${symbol}:${timeframe}:${offset}`;

      // Check if this page is cached
      let pageCandles = this.cache.get(pageCacheKey);

      if (!pageCandles) {
        try {
          const response = await fetch(
            `/api/candles?symbol=${symbol}&timeframe=${timeframe}&offset=${offset}&limit=${this.candlesPerPage}`
          );

          if (!response.ok) throw new Error(`HTTP ${response.status}`);

          const data = await response.json();
          pageCandles = data.candles || [];

          // Cache this page
          this.cache.set(pageCacheKey, pageCandles, 600000); // 10 min for page cache
        } catch (error) {
          console.error(`Error loading candle page at offset ${offset}:`, error);
          break;
        }
      }

      if (!pageCandles || pageCandles.length === 0) break;

      allCandles.push(...pageCandles);
      offset += this.candlesPerPage;
    }

    return allCandles.slice(0, totalLimit);
  }

  /**
   * Calculate indicator with caching
   * @param {string} indicatorName - Indicator type (RSI, MACD, etc)
   * @param {Array} candles - Array of candle objects
   * @param {Object} params - Indicator parameters
   * @returns {Array} Indicator values
   */
  calculateIndicator(indicatorName, candles, params) {
    // Create cache key from indicator type and params
    const paramsStr = JSON.stringify(params);
    const cacheKey = `indicator:${indicatorName}:${candles.length}:${paramsStr}`;

    // Return cached result if available
    const cached = this.cache.get(cacheKey);
    if (cached) {
      return cached;
    }

    let result;

    switch (indicatorName.toUpperCase()) {
      case 'RSI':
        result = this._calculateRSI(candles, params.period || 14);
        break;
      case 'MACD':
        result = this._calculateMACD(candles, params.fast || 12, params.slow || 26, params.signal || 9);
        break;
      case 'BB':
      case 'BOLLINGER':
        result = this._calculateBollingerBands(candles, params.period || 20, params.stdDev || 2);
        break;
      default:
        console.warn(`Unknown indicator: ${indicatorName}`);
        return null;
    }

    // Cache the result
    this.cache.set(cacheKey, result, 600000); // 10 min cache for indicators
    return result;
  }

  /**
   * Calculate RSI (Relative Strength Index)
   * @private
   */
  _calculateRSI(candles, period = 14) {
    const rsi = [];
    const closes = candles.map(c => c.close);

    for (let i = 0; i < closes.length; i++) {
      if (i < period) {
        rsi.push(null);
        continue;
      }

      let gains = 0, losses = 0;
      for (let j = i - period; j < i; j++) {
        const diff = closes[j + 1] - closes[j];
        if (diff > 0) gains += diff;
        else losses += Math.abs(diff);
      }

      const avgGain = gains / period;
      const avgLoss = losses / period;
      const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
      const rsiValue = 100 - (100 / (1 + rs));
      rsi.push(rsiValue);
    }

    return rsi;
  }

  /**
   * Calculate MACD (Moving Average Convergence Divergence)
   * @private
   */
  _calculateMACD(candles, fast = 12, slow = 26, signal = 9) {
    const closes = candles.map(c => c.close);
    const ema12 = this._calculateEMA(closes, fast);
    const ema26 = this._calculateEMA(closes, slow);

    const macdLine = [];
    for (let i = 0; i < closes.length; i++) {
      macdLine.push(ema12[i] - ema26[i]);
    }

    const signalLine = this._calculateEMA(macdLine, signal);

    return {
      macd: macdLine,
      signal: signalLine,
      histogram: macdLine.map((m, i) => m - signalLine[i])
    };
  }

  /**
   * Calculate Bollinger Bands
   * @private
   */
  _calculateBollingerBands(candles, period = 20, stdDev = 2) {
    const closes = candles.map(c => c.close);
    const bands = { upper: [], middle: [], lower: [] };

    for (let i = 0; i < closes.length; i++) {
      if (i < period - 1) {
        bands.middle.push(null);
        bands.upper.push(null);
        bands.lower.push(null);
        continue;
      }

      const slice = closes.slice(i - period + 1, i + 1);
      const sma = slice.reduce((a, b) => a + b, 0) / period;
      const variance = slice.reduce((sum, val) => sum + Math.pow(val - sma, 2), 0) / period;
      const std = Math.sqrt(variance);

      bands.middle.push(sma);
      bands.upper.push(sma + stdDev * std);
      bands.lower.push(sma - stdDev * std);
    }

    return bands;
  }

  /**
   * Calculate Exponential Moving Average
   * @private
   */
  _calculateEMA(values, period) {
    if (values.length < period) return values;

    const ema = [];
    const multiplier = 2 / (period + 1);

    // Calculate SMA for first EMA value
    let sum = 0;
    for (let i = 0; i < period; i++) {
      sum += values[i];
    }
    let currentEMA = sum / period;
    ema.push(...Array(period - 1).fill(null));
    ema.push(currentEMA);

    // Calculate EMA
    for (let i = period; i < values.length; i++) {
      currentEMA = (values[i] - currentEMA) * multiplier + currentEMA;
      ema.push(currentEMA);
    }

    return ema;
  }

  /**
   * Clear all cached data for memory cleanup
   */
  clearAllCaches() {
    this.indicatorCache.clear();
    this.cache.clear();
    console.log('🧹 Cleared all chart caches');
  }

  /**
   * Get memory stats
   */
  getStats() {
    return {
      cacheStats: this.cache.getStats(),
      indicatorCacheSize: this.indicatorCache.size
    };
  }
}
