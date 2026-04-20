describe('ErrorHandler', () => {
  let ErrorHandler;
  let handler;

  beforeAll(() => {
    ErrorHandler = require('./../../lib/error-handler.js');
  });

  beforeEach(() => {
    handler = new ErrorHandler();
  });

  describe('Error Handling', () => {
    test('should handle network errors', () => {
      const error = new Error('Network error');
      error.code = 'ECONNREFUSED';

      const result = handler.handleError(error, 'test');
      expect(result).toHaveProperty('timestamp');
      expect(result).toHaveProperty('context', 'test');
      expect(result).toHaveProperty('status', 'ECONNREFUSED');
      expect(result).toHaveProperty('isRetryable', true);
    });

    test('should handle HTTP errors', () => {
      const error = new Error('Server error');
      error.status = 500;

      const result = handler.handleError(error, 'api');
      expect(result.status).toBe(500);
      expect(result.isRetryable).toBe(true);
    });

    test('should handle client errors', () => {
      const error = new Error('Bad request');
      error.status = 400;

      const result = handler.handleError(error, 'api');
      expect(result.status).toBe(400);
      expect(result.isRetryable).toBe(false);
    });

    test('should log errors with context', () => {
      const error = new Error('Test error');
      handler.handleError(error, 'myContext');

      const log = handler.getErrorLog();
      expect(log.length).toBeGreaterThan(0);
      expect(log[0].context).toBe('myContext');
    });

    test('should maintain error history', () => {
      handler.handleError(new Error('Error 1'), 'ctx1');
      handler.handleError(new Error('Error 2'), 'ctx2');
      handler.handleError(new Error('Error 3'), 'ctx3');

      const log = handler.getErrorLog();
      expect(log.length).toBe(3);
      expect(log[0].context).toBe('ctx1');
      expect(log[2].context).toBe('ctx3');
    });

    test('should respect max errors limit', () => {
      handler.maxErrors = 5;

      for (let i = 0; i < 10; i++) {
        handler.handleError(new Error(`Error ${i}`), `ctx${i}`);
      }

      const log = handler.getErrorLog();
      expect(log.length).toBe(5);
    });
  });

  describe('User Messages', () => {
    test('should return Spanish user message for network error', () => {
      const error = new Error('Network error');
      error.code = 'ECONNREFUSED';

      const result = handler.handleError(error, 'test');
      expect(result.userMessage).toBe(ErrorHandler.MESSAGES.NETWORK_ERROR);
    });

    test('should return Spanish message for timeout', () => {
      const error = new Error('Request timeout');
      error.status = 408;

      const result = handler.handleError(error, 'test');
      expect(result.userMessage).toBe(ErrorHandler.MESSAGES.API_TIMEOUT);
    });

    test('should return Spanish message for rate limit', () => {
      const error = new Error('Too many requests');
      error.status = 429;

      const result = handler.handleError(error, 'test');
      expect(result.userMessage).toBe(ErrorHandler.MESSAGES.RATE_LIMITED);
    });

    test('should return Spanish message for server error', () => {
      const error = new Error('Server error');
      error.status = 503;

      const result = handler.handleError(error, 'test');
      expect(result.userMessage).toBe(ErrorHandler.MESSAGES.SERVER_ERROR);
    });

    test('should detect offline status', () => {
      global.navigator.onLine = false;
      const error = new Error('Offline');

      const result = handler.handleError(error, 'test');
      expect(result.userMessage).toBe(ErrorHandler.MESSAGES.OFFLINE);

      global.navigator.onLine = true;
    });
  });

  describe('Fallback Data', () => {
    test('should return fallback prices', () => {
      const prices = handler.getFallbackData('prices');
      expect(prices).toHaveProperty('BTC');
      expect(prices).toHaveProperty('ETH');
      expect(prices).toHaveProperty('SOL');
    });

    test('should return fallback liquidations', () => {
      const liq = handler.getFallbackData('liquidations');
      expect(Array.isArray(liq)).toBe(true);
      expect(liq.length).toBeGreaterThan(0);
      expect(liq[0]).toHaveProperty('side');
      expect(liq[0]).toHaveProperty('volume');
      expect(liq[0]).toHaveProperty('price');
    });

    test('should return fallback candles', () => {
      const candles = handler.getFallbackData('candles');
      expect(Array.isArray(candles)).toBe(true);
      expect(candles.length).toBeGreaterThan(0);
      expect(candles[0]).toHaveProperty('time');
      expect(candles[0]).toHaveProperty('open');
      expect(candles[0]).toHaveProperty('high');
      expect(candles[0]).toHaveProperty('low');
      expect(candles[0]).toHaveProperty('close');
      expect(candles[0]).toHaveProperty('volume');
    });

    test('should return fallback stats', () => {
      const stats = handler.getFallbackData('stats');
      expect(stats).toHaveProperty('winRate');
      expect(stats).toHaveProperty('sharpeRatio');
    });

    test('should return fallback trades', () => {
      const trades = handler.getFallbackData('trades');
      expect(Array.isArray(trades)).toBe(true);
      expect(trades.length).toBeGreaterThan(0);
      expect(trades[0]).toHaveProperty('symbol');
      expect(trades[0]).toHaveProperty('entry');
      expect(trades[0]).toHaveProperty('exit');
    });

    test('should return prices as default for unknown type', () => {
      const data = handler.getFallbackData('unknown');
      expect(data).toHaveProperty('BTC');
    });
  });

  describe('Error Log', () => {
    test('should get error log with timestamps', () => {
      handler.handleError(new Error('Error 1'), 'ctx1');
      const log = handler.getErrorLog();

      expect(log[0]).toHaveProperty('timestamp');
      expect(log[0]).toHaveProperty('age');
      expect(log[0].age).toBeGreaterThanOrEqual(0);
    });

    test('should clear error log', () => {
      handler.handleError(new Error('Error 1'), 'ctx1');
      handler.handleError(new Error('Error 2'), 'ctx2');

      expect(handler.getErrorLog().length).toBe(2);

      handler.clearErrorLog();
      expect(handler.getErrorLog().length).toBe(0);
    });
  });

  describe('Retryable Errors', () => {
    test('should identify retryable status codes', () => {
      const retryable = [408, 429, 500, 502, 503, 504];
      retryable.forEach(status => {
        const error = new Error();
        error.status = status;
        const result = handler.handleError(error, 'test');
        expect(result.isRetryable).toBe(true);
      });
    });

    test('should identify non-retryable status codes', () => {
      const nonRetryable = [400, 401, 404, 405, 409];
      nonRetryable.forEach(status => {
        const error = new Error();
        error.status = status;
        const result = handler.handleError(error, 'test');
        expect(result.isRetryable).toBe(false);
      });
    });

    test('should identify retryable network codes', () => {
      const codes = ['ECONNREFUSED', 'ECONNRESET', 'ETIMEDOUT', 'EHOSTUNREACH'];
      codes.forEach(code => {
        const error = new Error();
        error.code = code;
        const result = handler.handleError(error, 'test');
        expect(result.isRetryable).toBe(true);
      });
    });
  });
});
