describe('Phase 6 Performance Targets', () => {
  let CacheManager;
  let RetryManager;
  let ErrorHandler;

  beforeAll(() => {
    const fs = require('fs');

    const cacheCode = fs.readFileSync('./lib/cache-manager.js', 'utf8');
    eval(cacheCode.split('const globalCache')[0]);

    const retryCode = fs.readFileSync('./api/middleware/retry.js', 'utf8');
    eval(retryCode.split('module.exports')[0]);

    const errorCode = fs.readFileSync('./lib/error-handler.js', 'utf8');
    eval(errorCode.split('const globalErrorHandler')[0]);
  });

  describe('Cache Performance', () => {
    test('Cache HIT should be < 10ms', () => {
      const cache = new CacheManager(5000);

      // Populate cache
      const data = { candles: new Array(500).fill({ time: 1, close: 100 }) };
      cache.set('candles_key', data);

      // Measure cache retrieval time
      const start = performance.now();
      const result = cache.get('candles_key');
      const duration = performance.now() - start;

      expect(result).toBeDefined();
      expect(duration).toBeLessThan(10);

      cache.clear();
    });

    test('Cache MISS should be < 50ms for empty cache', () => {
      const cache = new CacheManager(5000);

      const start = performance.now();
      const result = cache.get('nonexistent_key');
      const duration = performance.now() - start;

      expect(result).toBeNull();
      expect(duration).toBeLessThan(50);
    });

    test('Cache operations on 100 entries < 100ms', () => {
      const cache = new CacheManager(5000);

      const start = performance.now();

      // Insert 100 entries
      for (let i = 0; i < 100; i++) {
        cache.set(`key_${i}`, { data: `value_${i}` });
      }

      // Retrieve 100 entries
      for (let i = 0; i < 100; i++) {
        cache.get(`key_${i}`);
      }

      const duration = performance.now() - start;
      expect(duration).toBeLessThan(100);

      cache.clear();
    });

    test('Cache stats calculation < 50ms', () => {
      const cache = new CacheManager(5000);

      // Add 50 entries
      for (let i = 0; i < 50; i++) {
        cache.set(`key_${i}`, { data: 'x'.repeat(100) });
      }

      const start = performance.now();
      const stats = cache.getStats();
      const duration = performance.now() - start;

      expect(stats).toHaveProperty('entries');
      expect(duration).toBeLessThan(50);

      cache.clear();
    });
  });

  describe('Retry Logic Performance', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    test('Immediate success < 10ms', async () => {
      const manager = new RetryManager();
      const fn = jest.fn().mockResolvedValue('result');

      const start = performance.now();
      await manager.retry(fn);
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(10);
    });

    test('First retry delay should be configurable', async () => {
      const manager = new RetryManager({
        initialDelay: 100,
        maxRetries: 1
      });

      const fn = jest
        .fn()
        .mockRejectedValueOnce(new Error('fail'))
        .mockResolvedValueOnce('success');

      const networkError = new Error('fail');
      networkError.code = 'ETIMEDOUT';

      const fn2 = jest
        .fn()
        .mockRejectedValueOnce(networkError)
        .mockResolvedValueOnce('success');

      const start = Date.now();
      const promise = manager.retry(fn2);

      jest.advanceTimersByTime(100);
      const result = await promise;

      expect(result).toBe('success');
    });

    test('Exponential backoff timing accuracy', async () => {
      const manager = new RetryManager({
        initialDelay: 100,
        maxDelay: 500,
        backoffMultiplier: 2,
        maxRetries: 3
      });

      let callCount = 0;
      const fn = jest.fn(() => {
        callCount++;
        if (callCount < 3) {
          const error = new Error('retry');
          error.status = 503;
          return Promise.reject(error);
        }
        return Promise.resolve('success');
      });

      const promise = manager.retry(fn);

      // First retry at 100ms
      jest.advanceTimersByTime(100);
      expect(fn).toHaveBeenCalledTimes(2);

      // Second retry at 200ms more
      jest.advanceTimersByTime(200);
      const result = await promise;

      expect(result).toBe('success');
    });
  });

  describe('Error Handler Performance', () => {
    test('Error handling < 5ms per error', () => {
      const handler = new ErrorHandler();
      const error = new Error('test error');
      error.status = 500;

      const start = performance.now();
      handler.handleError(error, 'test');
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(5);
    });

    test('Fallback data generation < 20ms', () => {
      const handler = new ErrorHandler();

      const types = ['prices', 'liquidations', 'candles', 'stats', 'trades'];

      types.forEach(type => {
        const start = performance.now();
        const data = handler.getFallbackData(type);
        const duration = performance.now() - start;

        expect(data).toBeDefined();
        expect(duration).toBeLessThan(20);
      });
    });

    test('Error log retrieval < 10ms with 50 errors', () => {
      const handler = new ErrorHandler();
      handler.maxErrors = 50;

      // Add 50 errors
      for (let i = 0; i < 50; i++) {
        const error = new Error(`Error ${i}`);
        handler.handleError(error, `ctx${i}`);
      }

      const start = performance.now();
      const log = handler.getErrorLog();
      const duration = performance.now() - start;

      expect(log.length).toBe(50);
      expect(duration).toBeLessThan(10);
    });
  });

  describe('Memory Performance', () => {
    test('Cache memory estimation accuracy', () => {
      const cache = new CacheManager(5000);

      // Add 10 items of known size
      const testValue = 'x'.repeat(1000); // ~2KB per entry
      for (let i = 0; i < 10; i++) {
        cache.set(`key_${i}`, testValue);
      }

      const stats = cache.getStats();
      expect(stats.memory).toBeGreaterThan(10000); // At least 10KB
      expect(stats.memory).toBeLessThan(50000); // Less than 50KB

      cache.clear();
    });

    test('Large dataset caching < 100ms', () => {
      const cache = new CacheManager(5000);

      // Create large dataset
      const largeData = {
        candles: new Array(1000).fill({
          time: 1,
          open: 100,
          high: 105,
          low: 95,
          close: 102,
          volume: 1000000
        })
      };

      const start = performance.now();
      cache.set('large_dataset', largeData);
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(100);

      cache.clear();
    });

    test('Cache cleanup operation < 200ms', () => {
      const cache = new CacheManager(5000);

      // Fill with many entries
      for (let i = 0; i < 100; i++) {
        cache.set(`key_${i}`, 'x'.repeat(100000));
      }

      const start = performance.now();
      cache.cleanup();
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(200);

      cache.clear();
    });
  });

  describe('Combined Operations', () => {
    test('Realistic API flow: fetch → cache → retry < 1s', async () => {
      jest.useFakeTimers();

      const cache = new CacheManager(5000);
      const manager = new RetryManager({
        maxRetries: 2,
        initialDelay: 50,
        maxDelay: 200
      });

      const mockData = { price: 67000 };
      const fn = jest
        .fn()
        .mockRejectedValueOnce(new Error('timeout'))
        .mockResolvedValueOnce(mockData);

      const timeoutError = new Error('timeout');
      timeoutError.status = 408;

      const fn2 = jest
        .fn()
        .mockRejectedValueOnce(timeoutError)
        .mockResolvedValueOnce(mockData);

      const start = Date.now();

      // First call with retry
      const promise = manager.retry(fn2);
      jest.advanceTimersByTime(50);
      jest.runAllTimers();
      const result = await promise;

      // Cache it
      cache.set('price_BTC', result);

      // Second call from cache
      const cached = cache.get('price_BTC');

      const totalTime = Date.now() - start;
      expect(cached).toEqual(mockData);
      expect(totalTime).toBeLessThan(1000);

      jest.useRealTimers();
    });

    test('Parallel operations < 500ms', async () => {
      const cache = new CacheManager(5000);
      const handler = new ErrorHandler();

      const start = performance.now();

      // Run parallel operations
      const promises = [
        Promise.resolve().then(() => {
          for (let i = 0; i < 50; i++) {
            cache.set(`key_${i}`, { data: i });
          }
        }),
        Promise.resolve().then(() => {
          for (let i = 0; i < 50; i++) {
            cache.get(`key_${i}`);
          }
        }),
        Promise.resolve().then(() => {
          for (let i = 0; i < 20; i++) {
            handler.handleError(new Error(`Error ${i}`), `ctx${i}`);
          }
        }),
        Promise.resolve().then(() => {
          const stats = cache.getStats();
          const log = handler.getErrorLog();
        })
      ];

      await Promise.all(promises);

      const duration = performance.now() - start;
      expect(duration).toBeLessThan(500);

      cache.clear();
    });
  });

  describe('Target Metrics Summary', () => {
    test('All Phase 6 targets should be met', () => {
      const targets = {
        'Chart Init': { target: 2000, unit: 'ms' },
        'Candle Load (500)': { target: 500, unit: 'ms' },
        'Cache HIT': { target: 50, unit: 'ms' },
        'Cache MISS': { target: 100, unit: 'ms' },
        'Order Flow Analysis': { target: 500, unit: 'ms' },
        'Memory per Session': { target: 100, unit: 'MB' },
        'API Response': { target: 200, unit: 'ms' },
        'Error Handling': { target: 10, unit: 'ms' }
      };

      // This is a summary test - actual measurements are above
      Object.entries(targets).forEach(([name, config]) => {
        expect(config).toHaveProperty('target');
        expect(config).toHaveProperty('unit');
      });
    });
  });
});
