// Security Headers Middleware - PHASE 6.5 Security Hardening
// Implements OWASP recommended security headers

/**
 * Create Express middleware for security headers
 * @returns {Function} Express middleware
 */
function securityHeadersMiddleware() {
  return (req, res, next) => {
    // Content Security Policy - restrict script sources
    res.setHeader(
      'Content-Security-Policy',
      "default-src 'self'; " +
        "script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; " +
        "style-src 'self' 'unsafe-inline'; " +
        "img-src 'self' data: https:; " +
        "font-src 'self'; " +
        "connect-src 'self' https://api.coingecko.com https://api.bybit.com; " +
        "frame-ancestors 'none'; " +
        "base-uri 'self'; " +
        "form-action 'self'"
    );

    // Prevent MIME type sniffing
    res.setHeader('X-Content-Type-Options', 'nosniff');

    // Prevent clickjacking (framebust)
    res.setHeader('X-Frame-Options', 'DENY');

    // Enable XSS protection in older browsers
    res.setHeader('X-XSS-Protection', '1; mode=block');

    // Referrer Policy
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

    // Feature Policy / Permissions Policy
    res.setHeader(
      'Permissions-Policy',
      'geolocation=(), microphone=(), camera=(), payment=(), usb=()'
    );

    // Strict Transport Security (HTTPS only)
    if (process.env.NODE_ENV === 'production') {
      res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    }

    // Remove Server header
    res.removeHeader('Server');
    res.removeHeader('X-Powered-By');

    next();
  };
}

/**
 * Security Headers Configuration
 */
const SECURITY_HEADERS = {
  // CSP: Block inline scripts, only allow from trusted sources
  'Content-Security-Policy': {
    description: 'Prevent XSS attacks',
    value: "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'"
  },

  // X-Content-Type-Options: nosniff - prevent MIME type guessing
  'X-Content-Type-Options': {
    description: 'Prevent MIME type sniffing',
    value: 'nosniff'
  },

  // X-Frame-Options: DENY - prevent clickjacking
  'X-Frame-Options': {
    description: 'Prevent clickjacking (framebust)',
    value: 'DENY'
  },

  // X-XSS-Protection: enable XSS filter in older browsers
  'X-XSS-Protection': {
    description: 'Enable XSS protection in older browsers',
    value: '1; mode=block'
  },

  // Referrer-Policy: strict-origin-when-cross-origin
  'Referrer-Policy': {
    description: 'Control referrer information',
    value: 'strict-origin-when-cross-origin'
  },

  // Permissions-Policy: restrict browser features
  'Permissions-Policy': {
    description: 'Restrict browser features (geolocation, microphone, etc)',
    value: 'geolocation=(), microphone=(), camera=()'
  },

  // HSTS: Strict Transport Security (HTTPS only)
  'Strict-Transport-Security': {
    description: 'Force HTTPS (production only)',
    value: 'max-age=31536000; includeSubDomains'
  }
};

module.exports = {
  securityHeadersMiddleware,
  SECURITY_HEADERS
};
