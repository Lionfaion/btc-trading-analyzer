// Input Validator Middleware - PHASE 6.5 Security Hardening
// Validates and sanitizes all API parameters

class InputValidator {
  /**
   * Validate symbol parameter (e.g., BTC, ETH, SOL)
   * @param {string} symbol - Asset symbol
   * @returns {boolean} Valid symbol
   */
  static validateSymbol(symbol) {
    const validSymbols = ['BTC', 'ETH', 'SOL', 'XRP', 'ADA', 'DOGE', 'MATIC', 'AVAX'];
    return validSymbols.includes(symbol?.toUpperCase?.());
  }

  /**
   * Validate timeframe (1h, 4h, 1d, etc)
   * @param {string} timeframe - Timeframe string
   * @returns {boolean} Valid timeframe
   */
  static validateTimeframe(timeframe) {
    const validTimeframes = ['1m', '5m', '15m', '1h', '4h', '1d', '1w', '1M'];
    return validTimeframes.includes(timeframe?.toLowerCase?.());
  }

  /**
   * Validate date format (ISO 8601)
   * @param {string} dateStr - Date string
   * @returns {boolean} Valid date
   */
  static validateDate(dateStr) {
    if (!dateStr) return false;
    const date = new Date(dateStr);
    return !isNaN(date.getTime()) && /^\d{4}-\d{2}-\d{2}/.test(dateStr);
  }

  /**
   * Validate number range
   * @param {number} value - Value to check
   * @param {number} min - Minimum value
   * @param {number} max - Maximum value
   * @returns {boolean} Valid range
   */
  static validateRange(value, min, max) {
    const num = Number(value);
    return !isNaN(num) && num >= min && num <= max;
  }

  /**
   * Sanitize HTML to prevent XSS
   * @param {string} text - Text to sanitize
   * @returns {string} Sanitized text
   */
  static sanitizeHtml(text) {
    if (typeof text !== 'string') return '';
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;');
  }

  /**
   * Validate API request parameters
   * @param {Object} params - Request parameters
   * @param {Object} rules - Validation rules
   * @returns {Object} Validation result {valid, errors}
   */
  static validate(params, rules) {
    const errors = [];

    Object.entries(rules).forEach(([field, rule]) => {
      const value = params[field];

      // Required field
      if (rule.required && (value === undefined || value === null || value === '')) {
        errors.push(`${field} is required`);
        return;
      }

      if (!value) return; // Skip validation if not required and empty

      // Type validation
      if (rule.type && typeof value !== rule.type) {
        errors.push(`${field} must be ${rule.type}`);
      }

      // Custom validator
      if (rule.validator && !rule.validator(value)) {
        errors.push(rule.errorMessage || `${field} is invalid`);
      }

      // Range validation
      if (rule.min !== undefined && Number(value) < rule.min) {
        errors.push(`${field} must be >= ${rule.min}`);
      }
      if (rule.max !== undefined && Number(value) > rule.max) {
        errors.push(`${field} must be <= ${rule.max}`);
      }

      // Length validation
      if (rule.minLength && value.length < rule.minLength) {
        errors.push(`${field} must be >= ${rule.minLength} characters`);
      }
      if (rule.maxLength && value.length > rule.maxLength) {
        errors.push(`${field} must be <= ${rule.maxLength} characters`);
      }

      // Enum validation
      if (rule.enum && !rule.enum.includes(value)) {
        errors.push(`${field} must be one of: ${rule.enum.join(', ')}`);
      }
    });

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Create Express middleware for validation
   * @param {Object} rules - Validation rules for query/body
   * @returns {Function} Express middleware
   */
  static middleware(rules) {
    return (req, res, next) => {
      const params = { ...req.query, ...req.body };
      const validation = InputValidator.validate(params, rules);

      if (!validation.valid) {
        return res.status(400).json({
          success: false,
          error: 'Parámetros inválidos',
          details: validation.errors
        });
      }

      next();
    };
  }
}

module.exports = InputValidator;
