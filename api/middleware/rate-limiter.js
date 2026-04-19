// Rate Limiter Middleware - PHASE 6.5 Security Hardening
// Prevents API abuse with per-IP rate limiting

class RateLimiter {
  constructor(options = {}) {
    this.requestsPerMinute = options.requestsPerMinute || 100;
    this.windowMs = options.windowMs || 60000; // 1 minute
    this.store = new Map(); // IP → {count, resetTime}
  }

  /**
   * Get client IP address
   * @param {Object} req - Express request
   * @returns {string} Client IP
   */
  getClientIp(req) {
    return (
      req.headers['x-forwarded-for']?.split(',')[0].trim() ||
      req.connection.remoteAddress ||
      req.socket.remoteAddress ||
      'unknown'
    );
  }

  /**
   * Check if request is allowed
   * @param {string} ip - Client IP
   * @returns {Object} {allowed, remaining, resetTime}
   */
  checkLimit(ip) {
    const now = Date.now();
    const record = this.store.get(ip);

    // First request or window expired
    if (!record || now > record.resetTime) {
      this.store.set(ip, {
        count: 1,
        resetTime: now + this.windowMs
      });
      return {
        allowed: true,
        remaining: this.requestsPerMinute - 1,
        resetTime: now + this.windowMs
      };
    }

    // Check limit
    if (record.count >= this.requestsPerMinute) {
      return {
        allowed: false,
        remaining: 0,
        resetTime: record.resetTime
      };
    }

    // Increment counter
    record.count++;
    return {
      allowed: true,
      remaining: this.requestsPerMinute - record.count,
      resetTime: record.resetTime
    };
  }

  /**
   * Create Express middleware for rate limiting
   * @returns {Function} Express middleware
   */
  middleware() {
    return (req, res, next) => {
      const ip = this.getClientIp(req);
      const limit = this.checkLimit(ip);

      // Set rate limit headers
      res.setHeader('X-RateLimit-Limit', this.requestsPerMinute);
      res.setHeader('X-RateLimit-Remaining', Math.max(0, limit.remaining));
      res.setHeader('X-RateLimit-Reset', new Date(limit.resetTime).toISOString());

      if (!limit.allowed) {
        const resetTime = new Date(limit.resetTime);
        return res.status(429).json({
          success: false,
          error: 'Demasiadas solicitudes',
          message: `Rate limit exceeded. Reset at ${resetTime.toISOString()}`,
          retryAfter: Math.ceil((limit.resetTime - Date.now()) / 1000)
        });
      }

      next();
    };
  }

  /**
   * Reset limits for specific IP
   * @param {string} ip - Client IP to reset
   */
  reset(ip) {
    this.store.delete(ip);
  }

  /**
   * Clear all limits
   */
  clear() {
    this.store.clear();
  }

  /**
   * Get current stats
   * @returns {Object} Rate limiter statistics
   */
  getStats() {
    return {
      trackedIPs: this.store.size,
      limit: this.requestsPerMinute,
      windowMs: this.windowMs
    };
  }
}

module.exports = RateLimiter;
