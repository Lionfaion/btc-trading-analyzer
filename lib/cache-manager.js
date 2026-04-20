// Cache Manager - PHASE 6 Performance Optimization
// Handles API response caching with TTL and memory management

class CacheManager {
  constructor(defaultTTL = 300000) { // 5 minutes default
    this.cache = new Map();
    this.defaultTTL = defaultTTL;
    this.timers = new Map();
  }

  /**
   * Get cached value if not expired
   * @param {string} key - Cache key
   * @returns {any} Cached value or null if expired/not found
   */
  get(key) {
    if (!this.cache.has(key)) return null;

    const item = this.cache.get(key);
    if (Date.now() > item.expiresAt) {
      this.delete(key);
      return null;
    }

    return item.value;
  }

  /**
   * Set cache value with TTL
   * @param {string} key - Cache key
   * @param {any} value - Value to cache
   * @param {number} ttl - Time to live in ms (optional, uses defaultTTL)
   */
  set(key, value, ttl = this.defaultTTL) {
    // Clear existing timer if present
    if (this.timers.has(key)) {
      clearTimeout(this.timers.get(key));
    }

    const expiresAt = Date.now() + ttl;
    this.cache.set(key, { value, expiresAt });

    // Auto-delete after TTL
    const timer = setTimeout(() => this.delete(key), ttl);
    this.timers.set(key, timer);
  }

  /**
   * Delete cache entry
   * @param {string} key - Cache key
   */
  delete(key) {
    this.cache.delete(key);
    if (this.timers.has(key)) {
      clearTimeout(this.timers.get(key));
      this.timers.delete(key);
    }
  }

  /**
   * Clear all cache
   */
  clear() {
    this.timers.forEach(timer => clearTimeout(timer));
    this.cache.clear();
    this.timers.clear();
  }

  /**
   * Get cache stats for monitoring
   * @returns {Object} Cache statistics
   */
  getStats() {
    return {
      entries: this.cache.size,
      memory: this._estimateMemory(),
      keys: Array.from(this.cache.keys())
    };
  }

  /**
   * Estimate memory usage (rough estimate)
   * @returns {number} Estimated memory in bytes
   */
  _estimateMemory() {
    let total = 0;
    this.cache.forEach(item => {
      if (typeof item.value === 'string') {
        total += item.value.length * 2; // UTF-16
      } else if (Array.isArray(item.value)) {
        total += JSON.stringify(item.value).length;
      } else if (typeof item.value === 'object') {
        total += JSON.stringify(item.value).length;
      }
    });
    return total;
  }

  /**
   * Clear old entries to prevent memory bloat (cleanup when > 50MB)
   */
  cleanup() {
    const maxMemory = 52428800; // 50MB
    if (this._estimateMemory() > maxMemory) {
      const allKeys = Array.from(this.cache.keys());
      // Remove oldest 10% of entries
      const toRemove = Math.ceil(allKeys.length * 0.1);
      allKeys.slice(0, toRemove).forEach(key => this.delete(key));
      console.log(`💾 Cache cleanup: removed ${toRemove} entries`);
    }
  }
}

// Global cache instance
const globalCache = new CacheManager();

// Cleanup interval (every 5 minutes)
setInterval(() => globalCache.cleanup(), 300000);

module.exports = CacheManager;
