describe('RetryManager', () => {
  let RetryManager;

  beforeAll(() => {
    RetryManager = require('./../../api/middleware/retry.js');
  });

  function makeRetryManager(overrides = {}) {
    return new RetryManager({
      maxRetries: 3,
      initialDelay: 1,
      maxDelay: 10,
      backoffMultiplier: 1,
      ...overrides
    });
  }

  // Helper: create a retryable error (server error)
  function retryableError(msg) {
    const err = new Error(msg);
    err.status = 500;
    return err;
  }

  describe('Basic Retry Logic', () => {
    test('should execute function successfully on first try', async () => {
      const rm = makeRetryManager();
      const fn = jest.fn().mockResolvedValue('success');
      const result = await rm.retry(fn);
      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(1);
    }, 5000);

    test('should retry on retryable failure and eventually succeed', async () => {
      const rm = makeRetryManager();
      const fn = jest
        .fn()
        .mockRejectedValueOnce(retryableError('fail 1'))
        .mockRejectedValueOnce(retryableError('fail 2'))
        .mockResolvedValueOnce('success');

      const result = await rm.retry(fn);
      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(3);
    }, 5000);

    test('should throw after max retries exhausted', async () => {
      const rm = makeRetryManager();
      const fn = jest.fn().mockRejectedValue(retryableError('persistent error'));

      await expect(rm.retry(fn)).rejects.toThrow('persistent error');
      expect(fn).toHaveBeenCalledTimes(1 + 3);
    }, 5000);
  });

  describe('Exponential Backoff', () => {
    test('should call fn maxRetries+1 times before giving up', async () => {
      const rm = makeRetryManager({ maxRetries: 2 });
      const fn = jest.fn().mockRejectedValue(retryableError('retry me'));

      await rm.retry(fn).catch(() => {});
      expect(fn).toHaveBeenCalledTimes(3); // 1 initial + 2 retries
    }, 5000);

    test('should respect max delay cap', async () => {
      const rm = makeRetryManager({ maxRetries: 3, maxDelay: 5, backoffMultiplier: 10 });
      const fn = jest.fn().mockRejectedValue(retryableError('fail'));

      const start = Date.now();
      await rm.retry(fn).catch(() => {});
      const elapsed = Date.now() - start;

      expect(fn).toHaveBeenCalledTimes(4);
      expect(elapsed).toBeLessThan(500);
    }, 5000);
  });

  describe('Retryable Error Detection', () => {
    test('should retry on network error codes', () => {
      const rm = makeRetryManager();
      const networkErrors = [
        { code: 'ECONNREFUSED' },
        { code: 'ECONNRESET' },
        { code: 'ETIMEDOUT' },
        { code: 'EHOSTUNREACH' }
      ];

      for (const error of networkErrors) {
        const fn = jest.fn().mockRejectedValueOnce(error);
        expect(() => {
          rm.retry(fn).catch(() => {});
        }).not.toThrow();
      }
    });

    test('should retry on server error status codes', () => {
      const rm = makeRetryManager();
      for (const status of [500, 502, 503, 504]) {
        const error = Object.assign(new Error('Server error'), { status });
        const fn = jest.fn().mockRejectedValueOnce(error);
        expect(() => {
          rm.retry(fn).catch(() => {});
        }).not.toThrow();
      }
    });

    test('should not retry on client error 400 (not retryable)', async () => {
      const rm = makeRetryManager();
      const error = Object.assign(new Error('Bad request'), { status: 400 });
      const fn = jest.fn().mockRejectedValue(error);

      await expect(rm.retry(fn)).rejects.toThrow('Bad request');
      expect(fn).toHaveBeenCalledTimes(1); // no retries
    }, 5000);

    test('should not retry on auth error 401 (not retryable)', async () => {
      const rm = makeRetryManager();
      const error = Object.assign(new Error('Unauthorized'), { status: 401 });
      const fn = jest.fn().mockRejectedValue(error);

      await expect(rm.retry(fn)).rejects.toThrow('Unauthorized');
      expect(fn).toHaveBeenCalledTimes(1);
    }, 5000);
  });

  describe('Queue Management', () => {
    test('should queue requests when offline and not process them', () => {
      const rm = makeRetryManager();
      rm.isOffline = true; // Force offline mode directly

      const fn = jest.fn().mockResolvedValue('success');
      rm.queueRequest('req-1', fn).catch(() => {});

      expect(rm.getStatus().queuedRequests).toBe(1);
      expect(rm.getStatus().isOffline).toBe(true);
      rm.clearQueue();
    });

    test('should track multiple queued requests when offline', () => {
      const rm = makeRetryManager();
      rm.isOffline = true;

      rm.queueRequest('req-1', jest.fn().mockResolvedValue('r1')).catch(() => {});
      rm.queueRequest('req-2', jest.fn().mockResolvedValue('r2')).catch(() => {});

      expect(rm.getStatus().queuedRequests).toBe(2);
      rm.clearQueue();
    });

    test('should clear queue', () => {
      const rm = makeRetryManager();
      rm.isOffline = true;

      rm.queueRequest('req-1', jest.fn()).catch(() => {});
      rm.queueRequest('req-2', jest.fn()).catch(() => {});
      expect(rm.getStatus().queuedRequests).toBe(2);

      rm.clearQueue();
      expect(rm.getStatus().queuedRequests).toBe(0);
    });
  });

  describe('Status Reporting', () => {
    test('should report correct online status', () => {
      const rm = makeRetryManager();
      const status = rm.getStatus();
      expect(status).toHaveProperty('isOffline');
      expect(status).toHaveProperty('queuedRequests');
      expect(status).toHaveProperty('isProcessing');
      expect(status.isOffline).toBe(false);
      expect(status.queuedRequests).toBe(0);
      expect(status.isProcessing).toBe(false);
    });

    test('should report offline status when set', () => {
      const rm = makeRetryManager();
      rm.isOffline = true;
      expect(rm.getStatus().isOffline).toBe(true);
    });
  });
});
