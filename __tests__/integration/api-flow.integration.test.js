describe('API Integration Flow', () => {
  let CacheManager;
  let RetryManager;
  let ErrorHandler;
  let cache;
  let retryManager;
  let errorHandler;

  beforeAll(() => {
    const fs = require('fs');

    const cacheCode = fs.readFileSync('./lib/cache-manager.js', 'utf8');
    eval(cacheCode.split('const globalCache')[0]);

    const retryCode = fs.readFileSync('./api/middleware/retry.js', 'utf8');
    eval(retryCode.split('module.exports')[0]);

    const errorCode = fs.readFileSync('./lib/error-handler.js', 'utf8');
    eval(errorCode.split('const globalErrorHandler')[0]);
  });

  beforeEach(() => {
    jest.useFakeTimers();
    cache = new CacheManager(5000);
    retryManager = new RetryManager({
      maxRetries: 2,
      initialDelay: 100,
      maxDelay: 500
    });
    errorHandler = new ErrorHandler();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  describe('Successful API Call with Caching', () => {
    test('should cache successful API responses', async () => {
      const apiCall = jest.fn().mockResolvedValue({ price: 67000 });

      // First call - cache miss
      const promise1 = retryManager.retry(apiCall);
      jest.runAllTimers();
      const result1 = await promise1;

      expect(result1).toEqual({ price: 67000 });
      expect(apiCall).toHaveBeenCalledTimes(1);

      // Cache the result
      cache.set('BTC_price', result1);

      // Second call - should be instant from cache
      const cachedResult = cache.get('BTC_price');
      expect(cachedResult).toEqual({ price: 67000 });
    });

    test('should invalidate cache after TTL', async () => {
      cache.set('data', { value: 'test' }, 1000);
      expect(cache.get('data')).toEqual({ value: 'test' });

      jest.advanceTimersByTime(1001);
      expect(cache.get('data')).toBeNull();
    });
  });

  describe('Failed API Call with Retry & Error Handling', () => {
    test('should retry failed call and handle error gracefully', async () => {
      const apiCall = jest
        .fn()
        .mockRejectedValueOnce(new Error('Network timeout'))
        .mockRejectedValueOnce(new Error('Still failing'))
        .mockResolvedValueOnce({ price: 67000 });

      const networkError = new Error('Network timeout');
      networkError.code = 'ETIMEDOUT';

      const fn = jest
        .fn()
        .mockRejectedValueOnce(networkError)
        .mockResolvedValueOnce({ price: 67000 });

      const promise = retryManager.retry(fn);
      jest.advanceTimersByTime(100); // First retry
      jest.runAllTimers();

      const result = await promise;
      expect(result).toEqual({ price: 67000 });
      expect(fn).toHaveBeenCalledTimes(2);
    });

    test('should handle exhausted retries with fallback data', async () => {
      const apiError = new Error('Server error');
      apiError.status = 503;

      const fn = jest.fn().mockRejectedValue(apiError);

      const promise = retryManager.retry(fn);
      jest.runAllTimers();

      try {
        await promise;
      } catch (error) {
        const errorInfo = errorHandler.handleError(error, 'priceAPI');
        const fallbackData = errorHandler.getFallbackData('prices');

        expect(fallbackData).toHaveProperty('BTC');
        expect(fallbackData.BTC).toBeGreaterThan(0);
      }
    });
  });

  describe('Offline Mode with Queue', () => {
    test('should queue requests when offline and process on reconnection', async () => {
      global.navigator.onLine = false;

      const apiCall1 = jest.fn().mockResolvedValue({ data: 'price1' });
      const apiCall2 = jest.fn().mockResolvedValue({ data: 'price2' });

      // Queue requests while offline
      const promise1 = retryManager.queueRequest('price-1', apiCall1);
      const promise2 = retryManager.queueRequest('price-2', apiCall2);

      expect(retryManager.getStatus().isOffline).toBe(true);
      expect(retryManager.getStatus().queuedRequests).toBe(2);

      // Go online
      global.navigator.onLine = true;
      window.dispatchEvent(new Event('online'));

      jest.advanceTimersByTime(300);
      jest.runAllTimers();

      // All should be processed
      expect(retryManager.getStatus().queuedRequests).toBe(0);
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

      // Step 1: Check cache (miss)
      let candles = cache.get(cacheKey);
      expect(candles).toBeNull();

      // Step 2: Fetch from API with retry
      const apiCall = jest
        .fn()
        .mockRejectedValueOnce(new Error('timeout'))
        .mockResolvedValueOnce([
          { time: 1, close: 100 },
          { time: 2, close: 105 }
        ]);

      const timeoutError = new Error('timeout');
      timeoutError.status = 408;

      const fn = jest
        .fn()
        .mockRejectedValueOnce(timeoutError)
        .mockResolvedValueOnce([
          { time: 1, close: 100 },
          { time: 2, close: 105 }
        ]);

      const promise = retryManager.retry(fn);
      jest.advanceTimersByTime(100);
      jest.runAllTimers();

      const data = await promise;

      // Step 3: Cache the result
      cache.set(cacheKey, data, 5000);

      // Step 4: Subsequent calls hit cache
      const cachedCandles = cache.get(cacheKey);
      expect(cachedCandles).toEqual(data);
    });

    test('should handle degraded service with fallbacks', async () => {
      const cacheKey = 'prices';

      // API is down
      const apiError = new Error('Service unavailable');
      apiError.status = 503;

      // Try cache first
      let data = cache.get(cacheKey);

      if (!data) {
        // Try API with retry
        const fn = jest.fn().mockRejectedValue(apiError);
        const promise = retryManager.retry(fn);
        jest.runAllTimers();

        try {
          await promise;
        } catch (error) {
          // Fall back to demo data
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

      const promise = retryManager.retry(fn);
      jest.advanceTimersByTime(100);
      jest.advanceTimersByTime(200);
      jest.runAllTimers();

      const result = await promise;
      expect(result.success).toBe(true);
    });

    test('should escalate permanent failures to error handler', async () => {
      const error = new Error('Invalid data');
      error.status = 400;

      const fn = jest.fn().mockRejectedValue(error);

      const promise = retryManager.retry(fn);
      jest.runAllTimers();

      try {
        await promise;
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
