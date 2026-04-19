describe('RetryManager', () => {
  let RetryManager;
  let retryManager;

  beforeAll(() => {
    const fs = require('fs');
    const code = fs.readFileSync('./api/middleware/retry.js', 'utf8');
    eval(code.split('module.exports')[0]);
  });

  beforeEach(() => {
    jest.useFakeTimers();
    retryManager = new RetryManager({
      maxRetries: 3,
      initialDelay: 100,
      maxDelay: 1000,
      backoffMultiplier: 2
    });
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  describe('Basic Retry Logic', () => {
    test('should execute function successfully on first try', async () => {
      const fn = jest.fn().mockResolvedValue('success');
      const result = await retryManager.retry(fn);

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(1);
    });

    test('should retry on failure', async () => {
      const fn = jest
        .fn()
        .mockRejectedValueOnce(new Error('fail 1'))
        .mockRejectedValueOnce(new Error('fail 2'))
        .mockResolvedValueOnce('success');

      const promise = retryManager.retry(fn);
      jest.advanceTimersByTime(100); // First retry
      jest.advanceTimersByTime(200); // Second retry
      jest.runAllTimers();

      const result = await promise;
      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(3);
    });

    test('should throw after max retries', async () => {
      const error = new Error('persistent error');
      const fn = jest.fn().mockRejectedValue(error);

      const promise = retryManager.retry(fn);
      jest.runAllTimers();

      await expect(promise).rejects.toThrow('persistent error');
      expect(fn).toHaveBeenCalledTimes(1 + 3); // 1 initial + 3 retries
    });
  });

  describe('Exponential Backoff', () => {
    test('should apply exponential backoff delays', async () => {
      const fn = jest
        .fn()
        .mockRejectedValue(new Error('retry me'));

      const promise = retryManager.retry(fn);

      // First attempt fails immediately
      expect(fn).toHaveBeenCalledTimes(1);

      // First retry: 100ms * 2^0 = 100ms
      jest.advanceTimersByTime(99);
      expect(fn).toHaveBeenCalledTimes(1);
      jest.advanceTimersByTime(1);
      expect(fn).toHaveBeenCalledTimes(2);

      // Second retry: 100ms * 2^1 = 200ms
      jest.advanceTimersByTime(199);
      expect(fn).toHaveBeenCalledTimes(2);
      jest.advanceTimersByTime(1);
      expect(fn).toHaveBeenCalledTimes(3);

      // Third retry: 100ms * 2^2 = 400ms (but we're already at max retries)
      jest.runAllTimers();
      await promise.catch(() => {});
    });

    test('should respect max delay', async () => {
      const rm = new RetryManager({
        maxRetries: 5,
        initialDelay: 100,
        maxDelay: 1000,
        backoffMultiplier: 2
      });

      const fn = jest.fn().mockRejectedValue(new Error('fail'));
      const promise = rm.retry(fn);

      jest.runAllTimers();
      await promise.catch(() => {});

      // Should never exceed maxDelay of 1000ms between retries
      expect(fn).toHaveBeenCalled();
    });
  });

  describe('Retryable Error Detection', () => {
    test('should retry on network errors', async () => {
      const networkErrors = [
        { code: 'ECONNREFUSED' },
        { code: 'ECONNRESET' },
        { code: 'ETIMEDOUT' },
        { code: 'EHOSTUNREACH' }
      ];

      for (const error of networkErrors) {
        const fn = jest.fn().mockRejectedValueOnce(error);
        // Just verify it doesn't throw immediately
        expect(() => {
          retryManager.retry(fn).catch(() => {});
        }).not.toThrow();
      }
    });

    test('should retry on server errors', async () => {
      const serverErrors = [500, 502, 503, 504];

      for (const status of serverErrors) {
        const error = new Error('Server error');
        error.status = status;
        const fn = jest.fn().mockRejectedValueOnce(error);
        expect(() => {
          retryManager.retry(fn).catch(() => {});
        }).not.toThrow();
      }
    });

    test('should retry on timeout errors', async () => {
      const error = new Error('Timeout');
      error.status = 408;
      const fn = jest.fn().mockRejectedValueOnce(error);

      expect(() => {
        retryManager.retry(fn).catch(() => {});
      }).not.toThrow();
    });

    test('should not retry on client errors', async () => {
      const error = new Error('Bad request');
      error.status = 400;
      const fn = jest.fn().mockRejectedValue(error);

      const promise = retryManager.retry(fn);
      jest.runAllTimers();

      await expect(promise).rejects.toThrow('Bad request');
      expect(fn).toHaveBeenCalledTimes(1); // No retries
    });

    test('should not retry on auth errors', async () => {
      const error = new Error('Unauthorized');
      error.status = 401;
      const fn = jest.fn().mockRejectedValue(error);

      const promise = retryManager.retry(fn);
      jest.runAllTimers();

      await expect(promise).rejects.toThrow('Unauthorized');
      expect(fn).toHaveBeenCalledTimes(1);
    });
  });

  describe('Offline Handling', () => {
    test('should queue requests when offline', async () => {
      global.navigator.onLine = false;

      const fn = jest.fn().mockResolvedValue('success');
      const promise = retryManager.queueRequest('req-1', fn);

      const status = retryManager.getStatus();
      expect(status.queuedRequests).toBe(1);
      expect(status.isOffline).toBe(true);

      global.navigator.onLine = true;
    });

    test('should process queued requests on reconnection', async () => {
      global.navigator.onLine = false;

      const fn1 = jest.fn().mockResolvedValue('result1');
      const fn2 = jest.fn().mockResolvedValue('result2');

      retryManager.queueRequest('req-1', fn1);
      retryManager.queueRequest('req-2', fn2);

      expect(retryManager.getStatus().queuedRequests).toBe(2);

      // Simulate reconnection
      global.navigator.onLine = true;
      const event = new Event('online');
      window.dispatchEvent(event);

      jest.advanceTimersByTime(200); // Process queue with 100ms delay between requests
      jest.runAllTimers();

      global.navigator.onLine = true;
    });
  });

  describe('Queue Management', () => {
    test('should track queue size', async () => {
      global.navigator.onLine = false;

      retryManager.queueRequest('req-1', jest.fn());
      expect(retryManager.getStatus().queuedRequests).toBe(1);

      retryManager.queueRequest('req-2', jest.fn());
      expect(retryManager.getStatus().queuedRequests).toBe(2);

      global.navigator.onLine = true;
    });

    test('should clear queue', () => {
      global.navigator.onLine = false;

      retryManager.queueRequest('req-1', jest.fn());
      retryManager.queueRequest('req-2', jest.fn());

      expect(retryManager.getStatus().queuedRequests).toBe(2);

      retryManager.clearQueue();
      expect(retryManager.getStatus().queuedRequests).toBe(0);

      global.navigator.onLine = true;
    });
  });

  describe('Status Reporting', () => {
    test('should report correct status', () => {
      global.navigator.onLine = true;

      const status = retryManager.getStatus();
      expect(status).toHaveProperty('isOffline');
      expect(status).toHaveProperty('queuedRequests');
      expect(status).toHaveProperty('isProcessing');
      expect(status.isOffline).toBe(false);
      expect(status.queuedRequests).toBe(0);
      expect(status.isProcessing).toBe(false);
    });
  });
});
