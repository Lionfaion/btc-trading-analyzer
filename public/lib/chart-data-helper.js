/**
 * Chart Data Helper - Utilidades para cargar y procesar datos OHLC
 * PHASE 4: Gráficos & Indicadores
 */

class ChartDataHelper {
  /**
   * Fetch historical OHLC data from API
   * @param {string} symbol - Cryptocurrency symbol (BTC, ETH, SOL)
   * @param {string} interval - Candle interval (1h, 4h, 1d)
   * @param {number} limit - Number of candles to fetch
   * @returns {Promise<Array>} OHLC data
   */
  static async fetchHistoricalData(symbol = 'BTC', interval = '1h', limit = 100) {
    try {
      const response = await fetch(
        `/api/historical?symbol=${symbol}&interval=${interval}&limit=${limit}`
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();

      if (!Array.isArray(data)) {
        throw new Error('Invalid response format');
      }

      return data;
    } catch (error) {
      console.error('Error fetching historical data:', error);
      return null;
    }
  }

  /**
   * Fetch liquidation data from API
   * @returns {Promise<Object>} Liquidation data { long, short }
   */
  static async fetchLiquidationData() {
    try {
      const response = await fetch('/api/liquidations');

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const { data } = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching liquidation data:', error);
      return null;
    }
  }

  /**
   * Fetch current price
   * @param {string} symbol - Cryptocurrency symbol
   * @returns {Promise<number>} Current price
   */
  static async fetchCurrentPrice(symbol = 'BTC') {
    try {
      const endpoint = symbol === 'BTC' ? '/api/binance-price' : '/api/market-price';
      const response = await fetch(
        symbol === 'BTC' ? endpoint : `${endpoint}?asset=${symbol}`
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      return parseFloat(data.price || data.current_price);
    } catch (error) {
      console.error('Error fetching current price:', error);
      return null;
    }
  }

  /**
   * Validate OHLC data
   * @param {Array} ohlcData - OHLC data to validate
   * @returns {boolean} True if valid
   */
  static validateOHLCData(ohlcData) {
    if (!Array.isArray(ohlcData) || ohlcData.length === 0) {
      console.error('OHLC data must be a non-empty array');
      return false;
    }

    for (const candle of ohlcData) {
      if (!candle.time || !candle.open || !candle.high || !candle.low || !candle.close) {
        console.error('Missing required fields: time, open, high, low, close');
        return false;
      }

      const o = parseFloat(candle.open);
      const h = parseFloat(candle.high);
      const l = parseFloat(candle.low);
      const c = parseFloat(candle.close);

      if (isNaN(o) || isNaN(h) || isNaN(l) || isNaN(c)) {
        console.error('Invalid price values in candle');
        return false;
      }

      if (h < l) {
        console.error('High must be >= Low');
        return false;
      }
    }

    return true;
  }

  /**
   * Transform data from different sources to standard format
   * @param {Array} rawData - Raw data from API
   * @param {string} source - Data source (binance, coingecko, etc)
   * @returns {Array} Normalized OHLC data
   */
  static normalizeData(rawData, source = 'binance') {
    if (!Array.isArray(rawData)) return [];

    const transformers = {
      binance: (candle) => ({
        time: candle[0] / 1000, // Convert from ms to seconds
        open: parseFloat(candle[1]),
        high: parseFloat(candle[2]),
        low: parseFloat(candle[3]),
        close: parseFloat(candle[4]),
        volume: parseFloat(candle[7]),
      }),
      coingecko: (candle) => ({
        time: candle[0] / 1000,
        open: parseFloat(candle[1]),
        high: parseFloat(candle[2]),
        low: parseFloat(candle[3]),
        close: parseFloat(candle[4]),
        volume: 0, // CoinGecko doesn't provide volume
      }),
      generic: (candle) => ({
        time: typeof candle.time === 'number'
          ? candle.time
          : Math.floor(new Date(candle.time).getTime() / 1000),
        open: parseFloat(candle.open),
        high: parseFloat(candle.high),
        low: parseFloat(candle.low),
        close: parseFloat(candle.close),
        volume: candle.volume || 0,
      }),
    };

    const transformer = transformers[source] || transformers.generic;

    return rawData
      .map(transformer)
      .filter(candle => !isNaN(candle.open) && !isNaN(candle.close))
      .sort((a, b) => a.time - b.time);
  }

  /**
   * Merge multiple datasets (e.g., combine local cache with new data)
   * @param {Array} existing - Existing OHLC data
   * @param {Array} newData - New OHLC data
   * @returns {Array} Merged data without duplicates, sorted
   */
  static mergeData(existing, newData) {
    if (!Array.isArray(existing)) existing = [];
    if (!Array.isArray(newData)) newData = [];

    const merged = [...existing, ...newData];
    const unique = {};

    // Deduplicate by time
    for (const candle of merged) {
      unique[candle.time] = candle;
    }

    // Convert back to array and sort
    return Object.values(unique)
      .sort((a, b) => a.time - b.time);
  }

  /**
   * Get latest candle
   * @param {Array} ohlcData - OHLC data
   * @returns {Object} Latest candle
   */
  static getLatestCandle(ohlcData) {
    if (!Array.isArray(ohlcData) || ohlcData.length === 0) {
      return null;
    }
    return ohlcData[ohlcData.length - 1];
  }

  /**
   * Get candle range
   * @param {Array} ohlcData - OHLC data
   * @param {number} limit - Number of recent candles
   * @returns {Array} Last N candles
   */
  static getRecentCandles(ohlcData, limit = 100) {
    if (!Array.isArray(ohlcData)) return [];

    if (ohlcData.length <= limit) {
      return ohlcData;
    }

    return ohlcData.slice(-limit);
  }

  /**
   * Calculate OHLC from tick data
   * @param {Array} ticks - Tick data [{ time, price, volume }, ...]
   * @param {number} intervalSeconds - Candle interval in seconds
   * @returns {Array} OHLC data
   */
  static aggregateTicksToOHLC(ticks, intervalSeconds = 3600) {
    if (!Array.isArray(ticks) || ticks.length === 0) {
      return [];
    }

    const candles = {};

    for (const tick of ticks) {
      const candleTime = Math.floor(tick.time / intervalSeconds) * intervalSeconds;

      if (!candles[candleTime]) {
        candles[candleTime] = {
          time: candleTime,
          open: tick.price,
          high: tick.price,
          low: tick.price,
          close: tick.price,
          volume: 0,
        };
      }

      const candle = candles[candleTime];
      candle.high = Math.max(candle.high, tick.price);
      candle.low = Math.min(candle.low, tick.price);
      candle.close = tick.price;
      candle.volume += tick.volume || 0;
    }

    return Object.values(candles)
      .sort((a, b) => a.time - b.time);
  }

  /**
   * Add technical indicators meta to OHLC
   * @param {Array} ohlcData - OHLC data
   * @param {Object} indicators - Calculated indicators
   * @returns {Array} OHLC data with indicator values
   */
  static enrichWithIndicators(ohlcData, indicators) {
    if (!Array.isArray(ohlcData)) return ohlcData;

    const enriched = [...ohlcData];

    // Add RSI values
    if (indicators.rsi && Array.isArray(indicators.rsi)) {
      for (let i = 0; i < enriched.length; i++) {
        const rsiValue = indicators.rsi.find(r => r.index === i);
        if (rsiValue) {
          enriched[i].rsi = rsiValue.value;
        }
      }
    }

    // Add MACD values
    if (indicators.macd && Array.isArray(indicators.macd)) {
      for (const macdValue of indicators.macd) {
        if (enriched[macdValue.index]) {
          enriched[macdValue.index].macd = macdValue;
        }
      }
    }

    // Add Bollinger Bands
    if (indicators.bollingerBands && Array.isArray(indicators.bollingerBands)) {
      for (const bbValue of indicators.bollingerBands) {
        if (enriched[bbValue.index]) {
          enriched[bbValue.index].bollingerBands = bbValue;
        }
      }
    }

    return enriched;
  }

  /**
   * Export data to CSV format
   * @param {Array} ohlcData - OHLC data
   * @param {string} filename - Output filename
   */
  static exportToCSV(ohlcData, filename = 'ohlc_data.csv') {
    if (!Array.isArray(ohlcData) || ohlcData.length === 0) {
      console.error('No data to export');
      return;
    }

    const headers = ['Time', 'Open', 'High', 'Low', 'Close', 'Volume'];
    const rows = ohlcData.map(candle => [
      new Date(candle.time * 1000).toISOString(),
      candle.open,
      candle.high,
      candle.low,
      candle.close,
      candle.volume || 0,
    ]);

    const csv = [headers, ...rows]
      .map(row => row.join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(url);
  }

  /**
   * Cache OHLC data locally
   * @param {Array} ohlcData - OHLC data to cache
   * @param {string} key - Cache key
   * @param {number} expiryMinutes - Cache expiry in minutes
   */
  static cacheData(ohlcData, key = 'ohlc_cache', expiryMinutes = 60) {
    if (!Array.isArray(ohlcData)) return;

    const cacheObj = {
      data: ohlcData,
      timestamp: Date.now(),
      expiry: expiryMinutes * 60 * 1000,
    };

    try {
      localStorage.setItem(key, JSON.stringify(cacheObj));
    } catch (error) {
      console.warn('Failed to cache data:', error);
    }
  }

  /**
   * Retrieve cached OHLC data
   * @param {string} key - Cache key
   * @returns {Array|null} Cached data or null if expired/not found
   */
  static getCachedData(key = 'ohlc_cache') {
    try {
      const cached = localStorage.getItem(key);
      if (!cached) return null;

      const cacheObj = JSON.parse(cached);
      const age = Date.now() - cacheObj.timestamp;

      if (age > cacheObj.expiry) {
        localStorage.removeItem(key);
        return null;
      }

      return cacheObj.data;
    } catch (error) {
      console.warn('Failed to retrieve cached data:', error);
      return null;
    }
  }

  /**
   * Clear cache
   * @param {string} key - Cache key (optional, clears all if not provided)
   */
  static clearCache(key = null) {
    if (key) {
      localStorage.removeItem(key);
    } else {
      localStorage.clear();
    }
  }
}

// Export for use
if (typeof window !== 'undefined') {
  window.ChartDataHelper = ChartDataHelper;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = ChartDataHelper;
}
