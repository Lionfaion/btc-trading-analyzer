const path = require('path');
const fs = require('fs');

describe('PHASE 7.0: Database & Auth Foundation Integration Tests', () => {
  describe('Backend Files Exist', () => {
    test('lib/supabase-client.js exists', () => {
      const filePath = path.join(__dirname, '../lib/supabase-client.js');
      expect(fs.existsSync(filePath)).toBe(true);
    });

    test('api/auth/signup.js exists', () => {
      const filePath = path.join(__dirname, '../api/auth/signup.js');
      expect(fs.existsSync(filePath)).toBe(true);
    });

    test('api/auth/login.js exists', () => {
      const filePath = path.join(__dirname, '../api/auth/login.js');
      expect(fs.existsSync(filePath)).toBe(true);
    });

    test('api/middleware/auth.js exists', () => {
      const filePath = path.join(__dirname, '../api/middleware/auth.js');
      expect(fs.existsSync(filePath)).toBe(true);
    });

    test('api/db/trades.js exists', () => {
      const filePath = path.join(__dirname, '../api/db/trades.js');
      expect(fs.existsSync(filePath)).toBe(true);
    });

    test('api/db/strategies.js exists', () => {
      const filePath = path.join(__dirname, '../api/db/strategies.js');
      expect(fs.existsSync(filePath)).toBe(true);
    });

    test('api/db/candles.js exists', () => {
      const filePath = path.join(__dirname, '../api/db/candles.js');
      expect(fs.existsSync(filePath)).toBe(true);
    });

    test('api/db/analysis.js exists', () => {
      const filePath = path.join(__dirname, '../api/db/analysis.js');
      expect(fs.existsSync(filePath)).toBe(true);
    });

    test('db-schema.sql exists', () => {
      const filePath = path.join(__dirname, '../db-schema.sql');
      expect(fs.existsSync(filePath)).toBe(true);
    });
  });

  describe('Supabase Client Module', () => {
    let SupabaseClient;

    beforeAll(() => {
      SupabaseClient = require('../lib/supabase-client.js');
    });

    test('SupabaseClient class exists', () => {
      expect(SupabaseClient).toBeDefined();
    });

    test('SupabaseClient has static signUp method', () => {
      expect(SupabaseClient.signUp).toBeDefined();
      expect(typeof SupabaseClient.signUp).toBe('function');
    });

    test('SupabaseClient has static signIn method', () => {
      expect(SupabaseClient.signIn).toBeDefined();
      expect(typeof SupabaseClient.signIn).toBe('function');
    });

    test('SupabaseClient instance has query method', () => {
      const client = new SupabaseClient('http://test', 'key');
      expect(client.query).toBeDefined();
      expect(typeof client.query).toBe('function');
    });

    test('SupabaseClient instance has getTrades method', () => {
      const client = new SupabaseClient('http://test', 'key');
      expect(client.getTrades).toBeDefined();
      expect(typeof client.getTrades).toBe('function');
    });

    test('SupabaseClient instance has getStrategies method', () => {
      const client = new SupabaseClient('http://test', 'key');
      expect(client.getStrategies).toBeDefined();
      expect(typeof client.getStrategies).toBe('function');
    });

    test('SupabaseClient instance has getCandles method', () => {
      const client = new SupabaseClient('http://test', 'key');
      expect(client.getCandles).toBeDefined();
      expect(typeof client.getCandles).toBe('function');
    });

    test('SupabaseClient instance has getAnalysis method', () => {
      const client = new SupabaseClient('http://test', 'key');
      expect(client.getAnalysis).toBeDefined();
      expect(typeof client.getAnalysis).toBe('function');
    });
  });

  describe('Auth Endpoints', () => {
    let signupHandler;
    let loginHandler;

    beforeAll(() => {
      signupHandler = require('../api/auth/signup.js');
      loginHandler = require('../api/auth/login.js');
    });

    test('signup handler is a function', () => {
      expect(typeof signupHandler).toBe('function');
    });

    test('login handler is a function', () => {
      expect(typeof loginHandler).toBe('function');
    });
  });

  describe('Auth Middleware', () => {
    let authMiddleware;

    beforeAll(() => {
      const middlewareModule = require('../api/middleware/auth.js');
      authMiddleware = middlewareModule;
    });

    test('auth middleware module exports functions', () => {
      expect(authMiddleware).toBeDefined();
    });
  });

  describe('Database Endpoints', () => {
    let tradesModule;
    let strategiesModule;
    let candlesModule;
    let analysisModule;

    beforeAll(() => {
      tradesModule = require('../api/db/trades.js');
      strategiesModule = require('../api/db/strategies.js');
      candlesModule = require('../api/db/candles.js');
      analysisModule = require('../api/db/analysis.js');
    });

    test('trades module exports handlers object', () => {
      expect(tradesModule).toBeDefined();
      expect(typeof tradesModule).toBe('object');
      expect(tradesModule.getTrades).toBeDefined();
      expect(tradesModule.createTrade).toBeDefined();
      expect(tradesModule.updateTrade).toBeDefined();
    });

    test('strategies module exports handlers object', () => {
      expect(strategiesModule).toBeDefined();
      expect(typeof strategiesModule).toBe('object');
      expect(strategiesModule.getStrategies).toBeDefined();
      expect(strategiesModule.createStrategy).toBeDefined();
    });

    test('candles module exports handlers object', () => {
      expect(candlesModule).toBeDefined();
      expect(typeof candlesModule).toBe('object');
      expect(candlesModule.getCandles).toBeDefined();
      expect(candlesModule.insertCandles).toBeDefined();
    });

    test('analysis module exports handlers object', () => {
      expect(analysisModule).toBeDefined();
      expect(typeof analysisModule).toBe('object');
      expect(analysisModule.getAnalysis).toBeDefined();
      expect(analysisModule.saveAnalysis).toBeDefined();
    });
  });

  describe('Database Schema SQL', () => {
    let schemaContent;

    beforeAll(() => {
      const schemaPath = path.join(__dirname, '../db-schema.sql');
      schemaContent = fs.readFileSync(schemaPath, 'utf8');
    });

    test('schema contains strategies table', () => {
      expect(schemaContent).toContain('CREATE TABLE strategies');
    });

    test('schema contains trades table', () => {
      expect(schemaContent).toContain('CREATE TABLE trades');
    });

    test('schema contains candles_ohlcv table', () => {
      expect(schemaContent).toContain('CREATE TABLE candles_ohlcv');
    });

    test('schema contains analysis_history table', () => {
      expect(schemaContent).toContain('CREATE TABLE analysis_history');
    });

    test('schema contains bybit_credentials table', () => {
      expect(schemaContent).toContain('CREATE TABLE bybit_credentials');
    });

    test('schema has RLS policies enabled', () => {
      expect(schemaContent).toContain('ENABLE ROW LEVEL SECURITY');
    });

    test('schema has indexes for performance', () => {
      expect(schemaContent).toContain('CREATE INDEX');
    });
  });

  describe('Documentation', () => {
    test('PHASE-7-DATABASE-FOUNDATION.md exists', () => {
      const filePath = path.join(__dirname, '../PHASE-7-DATABASE-FOUNDATION.md');
      expect(fs.existsSync(filePath)).toBe(true);
    });

    test('SUPABASE-SETUP.md exists', () => {
      const filePath = path.join(__dirname, '../SUPABASE-SETUP.md');
      expect(fs.existsSync(filePath)).toBe(true);
    });

    test('SUPABASE-SETUP.md contains setup instructions', () => {
      const filePath = path.join(__dirname, '../SUPABASE-SETUP.md');
      const content = fs.readFileSync(filePath, 'utf8');
      expect(content).toContain('Supabase');
    });
  });
});
