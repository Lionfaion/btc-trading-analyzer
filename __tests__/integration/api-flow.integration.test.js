describe('API Integration Flow', () => {
  let CacheManager;
  let RetryManager;
  let ErrorHandler;
  let cache;
  let retryManager;
  let errorHandler;

  beforeAll(() => {
    CacheManager = require('./../../lib/cache-manager.js');
    RetryManager = require('./../../api/middleware/retry.js');
    ErrorHandler = require('./../../lib/error-handler.js');
  });

  beforeEach(() => {
    cache = new CacheManager(5000);
    retryManager = new RetryManager({
      maxRetries: 2,
      initialDelay: 1,
      maxDelay: 10
    });
    errorHandler = new ErrorHandler();
  });

  afterEach(() => {
    global.navigator.onLine = true;
  });

  describe('Successful API Call with Caching', () => {
    test('should cache successful API responses', async () => {
      const apiCall = jest.fn().mockResolvedValue({ price: 67000 });

      const result1 = await retryManager.retry(apiCall);

      expect(result1).toEqual({ price: 67000 });
      expect(apiCall).toHaveBeenCalledTimes(1);

      cache.set('BTC_price', result1);

      const cachedResult = cache.get('BTC_price');
      expect(cachedResult).toEqual({ price: 67000 });
    });

    test('should invalidate cache after TTL', async () => {
      cache.set('data', { value: 'test' }, 1);
      expect(cache.get('data')).toEqual({ value: 'test' });

      await new Promise(resolve => setTimeout(resolve, 10));
      expect(cache.get('data')).toBeNull();
    });
  });

  describe('Failed API Call with Retry & Error Handling', () => {
    test('should retry failed call and handle error gracefully', async () => {
      const networkError = new Error('Network timeout');
      networkError.code = 'ETIMEDOUT';

      const fn = jest
        .fn()
        .mockRejectedValueOnce(networkError)
        .mockResolvedValueOnce({ price: 67000 });

      const result = await retryManager.retry(fn);
      expect(result).toEqual({ price: 67000 });
      expect(fn).toHaveBeenCalledTimes(2);
    });

    test('should handle exhausted retries with fallback data', async () => {
      const apiError = new Error('Server error');
      apiError.status = 503;

      const fn = jest.fn().mockRejectedValue(apiError);

      try {
        await retryManager.retry(fn);
      } catch (error) {
        const errorInfo = errorHandler.handleError(error, 'priceAPI');
        const fallbackData = errorHandler.getFallbackData('prices');

        expect(fallbackData).toHaveProperty('BTC');
        expect(fallbackData.BTC).toBeGreaterThan(0);
      }
    });
  });

  describe('Offline Mode with Queue', () => {
    test('should queue requests when offline and not process them', () => {
      retryManager.isOffline = true;

      const apiCall1 = jest.fn().mockResolvedValue({ data: 'price1' });
      const apiCall2 = jest.fn().mockResolvedValue({ data: 'price2' });

      retryManager.queueRequest('price-1', apiCall1).catch(() => {});
      retryManager.queueRequest('price-2', apiCall2).catch(() => {});

      expect(retryManager.getStatus().isOffline).toBe(true);
      expect(retryManager.getStatus().queuedRequests).toBe(2);

      retryManager.clearQueue();
    });

    test('should use fallback data while offline', () => {
      global.navigator.onLine = false;

      const error = new Error('Offline');
      const errorInfo = errorHandler.handleError(error, 'offline');

      expect(errorInfo.userMessage).toBe(errorHandler.MESSAGES.OFFLINE);

      const fallback = errorHandler.getFallbackData('prices');
      expect(fallback).toBeDefined();

      global.navigator.onLine = true;
    });
  });

  describe('Multi-Step API Flow', () => {
    test('should handle complete fetch → cache → retry flow', async () => {
      const cacheKey = 'candles_BTC_1h';

      let candles = cache.get(cacheKey);
      expect(candles).toBeNull();

      const timeoutError = new Error('timeout');
      timeoutError.status = 408;

      const fn = jest
        .fn()
        .mockRejectedValueOnce(timeoutError)
        .mockResolvedValueOnce([
          { time: 1, close: 100 },
          { time: 2, close: 105 }
        ]);

      const data = await retryManager.retry(fn);

      cache.set(cacheKey, data, 5000);

      const cachedCandles = cache.get(cacheKey);
      expect(cachedCandles).toEqual(data);
    });

    test('should handle degraded service with fallbacks', async () => {
      const cacheKey = 'prices';

      const apiError = new Error('Service unavailable');
      apiError.status = 503;

      let data = cache.get(cacheKey);

      if (!data) {
        const fn = jest.fn().mockRejectedValue(apiError);

        try {
          await retryManager.retry(fn);
        } catch (error) {
          errorHandler.handleError(error, 'gracefulDegradation');
          data = errorHandler.getFallbackData('prices');
        }
      }

      expect(data).toBeDefined();
      expect(data).toHaveProperty('BTC');
    });
  });

  describe('Error Recovery Chain', () => {
    test('should recover from transient failures', async () => {
      let attempts = 0;
      const fn = jest.fn(() => {
        attempts++;
        if (attempts < 3) {
          const error = new Error('Transient error');
          error.status = 502;
          return Promise.reject(error);
        }
        return Promise.resolve({ success: true });
      });

      const result = await retryManager.retry(fn);
      expect(result.success).toBe(true);
    });

    test('should escalate permanent failures to error handler', async () => {
      const error = new Error('Invalid data');
      error.status = 400;

      const fn = jest.fn().mockRejectedValue(error);

      try {
        await retryManager.retry(fn);
      } catch (err) {
        const errorInfo = errorHandler.handleError(err, 'api');
        expect(errorInfo.isRetryable).toBe(false);
        expect(errorInfo.userMessage).toBe(
          errorHandler.MESSAGES.INVALID_DATA
        );
      }
    });
  });
});
