// Cache Middleware - PHASE 6 API Caching
// Reusable caching middleware for API endpoints with TTL

class CacheMiddleware {
  constructor() {
    this.cache = new Map();
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0
    };
  }

  /**
   * Create cache key from request
   * @param {Object} req - Request object
   * @param {string} prefix - Cache key prefix
   * @returns {string} Cache key
   */
  getCacheKey(req, prefix = '') {
    const url = req.url.split('?')[1] || '';
    return `${prefix}:${url}`;
  }

  /**
   * Get cached response
   * @param {string} key - Cache key
   * @returns {Object|null} Cached response or null
   */
  get(key) {
    const entry = this.cache.get(key);

    if (!entry) {
      this.stats.misses++;
      return null;
    }

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      this.stats.misses++;
      return null;
    }

    this.stats.hits++;
    return entry.data;
  }

  /**
   * Set cache entry
   * @param {string} key - Cache key
   * @param {Object} data - Data to cache
   * @param {number} ttl - Time to live in ms
   */
  set(key, data, ttl = 300000) {
    this.cache.set(key, {
      data,
      expiresAt: Date.now() + ttl
    });
    this.stats.sets++;
  }

  /**
   * Middleware wrapper for caching
   * @param {string} prefix - Cache key prefix
   * @param {number} ttl - Cache TTL in ms
   * @returns {Function} Middleware function
   */
  middleware(prefix = '', ttl = 300000) {
    return async (req, res, next) => {
      // Only cache GET requests
      if (req.method !== 'GET') {
        return next();
      }

      const cacheKey = this.getCacheKey(req, prefix);
      const cached = this.get(cacheKey);

      if (cached) {
        res.setHeader('X-Cache', 'HIT');
        return res.json(cached);
      }

      res.setHeader('X-Cache', 'MISS');

      // Intercept response
      const originalJson = res.json.bind(res);
      res.json = (data) => {
        // Cache successful responses only
        if (res.statusCode === 200) {
          this.set(cacheKey, data, ttl);
        }
        return originalJson(data);
      };

      next();
    };
  }

  /**
   * Clear all cache
   */
  clear() {
    this.cache.clear();
    console.log('🧹 Cache cleared');
  }

  /**
   * Get cache stats
   */
  getStats() {
    const hitRate = this.stats.hits + this.stats.misses > 0
      ? (this.stats.hits / (this.stats.hits + this.stats.misses) * 100).toFixed(1)
      : 0;

    return {
      hits: this.stats.hits,
      misses: this.stats.misses,
      hitRate: `${hitRate}%`,
      sets: this.stats.sets,
      entries: this.cache.size
    };
  }
}

module.exports = CacheMiddleware;
