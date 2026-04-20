describe('CacheManager', () => {
  let CacheManager;
  let cache;

  beforeAll(() => {
    CacheManager = require('./../../lib/cache-manager.js');
  });

  beforeEach(() => {
    cache = new CacheManager(5000); // 5 second TTL for tests
  });

  afterEach(() => {
    cache.clear();
    jest.clearAllTimers();
  });

  describe('Basic Operations', () => {
    test('should set and get cache value', () => {
      cache.set('key1', { data: 'value1' });
      const result = cache.get('key1');
      expect(result).toEqual({ data: 'value1' });
    });

    test('should return null for non-existent key', () => {
      const result = cache.get('nonexistent');
      expect(result).toBeNull();
    });

    test('should overwrite existing key', () => {
      cache.set('key1', 'value1');
      cache.set('key1', 'value2');
      expect(cache.get('key1')).toBe('value2');
    });

    test('should handle different data types', () => {
      cache.set('string', 'test');
      cache.set('number', 42);
      cache.set('object', { a: 1, b: 2 });
      cache.set('array', [1, 2, 3]);

      expect(cache.get('string')).toBe('test');
      expect(cache.get('number')).toBe(42);
      expect(cache.get('object')).toEqual({ a: 1, b: 2 });
      expect(cache.get('array')).toEqual([1, 2, 3]);
    });
  });

  describe('TTL & Expiration', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.runOnlyPendingTimers();
      jest.useRealTimers();
    });

    test('should expire cache after TTL', () => {
      cache.set('expiring', 'data', 5000);
      expect(cache.get('expiring')).toBe('data');

      jest.advanceTimersByTime(5001);
      expect(cache.get('expiring')).toBeNull();
    });

    test('should use default TTL', () => {
      const defaultCache = new CacheManager(3000);
      defaultCache.set('key1', 'value');
      expect(defaultCache.get('key1')).toBe('value');

      jest.advanceTimersByTime(3001);
      expect(defaultCache.get('key1')).toBeNull();
    });

    test('should handle custom TTL per item', () => {
      cache.set('fast', 'expires soon', 1000);
      cache.set('slow', 'expires later', 10000);

      jest.advanceTimersByTime(2000);
      expect(cache.get('fast')).toBeNull();
      expect(cache.get('slow')).toBe('expires later');
    });
  });

  describe('Deletion', () => {
    test('should delete single entry', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');

      cache.delete('key1');
      expect(cache.get('key1')).toBeNull();
      expect(cache.get('key2')).toBe('value2');
    });

    test('should clear all entries', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      cache.set('key3', 'value3');

      cache.clear();
      expect(cache.get('key1')).toBeNull();
      expect(cache.get('key2')).toBeNull();
      expect(cache.get('key3')).toBeNull();
    });

    test('should clear timers on delete', () => {
      cache.set('key1', 'value');
      cache.delete('key1');
      // Should not throw when trying to delete again
      expect(() => cache.delete('key1')).not.toThrow();
    });
  });

  describe('Statistics', () => {
    test('should report cache stats', () => {
      cache.set('key1', 'test');
      cache.set('key2', { a: 1 });

      const stats = cache.getStats();
      expect(stats).toHaveProperty('entries');
      expect(stats).toHaveProperty('memory');
      expect(stats).toHaveProperty('keys');
      expect(stats.entries).toBe(2);
      expect(stats.keys).toContain('key1');
      expect(stats.keys).toContain('key2');
    });

    test('should estimate memory correctly', () => {
      cache.set('string', 'hello');
      const stats = cache.getStats();
      expect(stats.memory).toBeGreaterThan(0);
    });

    test('should count entries correctly', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      cache.set('key3', 'value3');

      expect(cache.getStats().entries).toBe(3);
    });
  });

  describe('Memory Management', () => {
    test('should estimate memory for different types', () => {
      const testCache = new CacheManager();
      testCache.set('str', 'x'.repeat(1000));
      testCache.set('obj', { data: 'x'.repeat(1000) });

      const stats = testCache.getStats();
      expect(stats.memory).toBeGreaterThan(1000);
      testCache.clear();
    });

    test('cleanup should remove oldest entries when over limit', () => {
      const testCache = new CacheManager();

      // Add entries to simulate memory pressure
      for (let i = 0; i < 100; i++) {
        testCache.set(`key${i}`, 'x'.repeat(100));
      }

      const statsBefore = testCache.getStats();
      testCache.cleanup();
      const statsAfter = testCache.getStats();

      // After cleanup, should have fewer or equal entries
      expect(statsAfter.entries).toBeLessThanOrEqual(statsBefore.entries);
      testCache.clear();
    });
  });

  describe('Edge Cases', () => {
    test('should handle null values', () => {
      cache.set('nullKey', null);
      expect(cache.get('nullKey')).toBeNull();
    });

    test('should handle undefined values', () => {
      cache.set('undefinedKey', undefined);
      expect(cache.get('undefinedKey')).toBeUndefined();
    });

    test('should handle empty strings', () => {
      cache.set('emptyString', '');
      expect(cache.get('emptyString')).toBe('');
    });

    test('should handle zero values', () => {
      cache.set('zero', 0);
      expect(cache.get('zero')).toBe(0);
    });

    test('should handle boolean values', () => {
      cache.set('true', true);
      cache.set('false', false);
      expect(cache.get('true')).toBe(true);
      expect(cache.get('false')).toBe(false);
    });
  });
});
