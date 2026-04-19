// PHASE 7.0 Database Tests - Structure and Setup

describe('PHASE 7.0 - Database Foundation', () => {
  describe('Files Created', () => {
    const fs = require('fs');
    
    test('db-schema.sql exists', () => {
      expect(fs.existsSync(__dirname + '/../db-schema.sql')).toBe(true);
    });

    test('lib/supabase-client.js exists', () => {
      expect(fs.existsSync(__dirname + '/../lib/supabase-client.js')).toBe(true);
    });

    test('api/db/trades.js exists', () => {
      expect(fs.existsSync(__dirname + '/../api/db/trades.js')).toBe(true);
    });

    test('api/db/strategies.js exists', () => {
      expect(fs.existsSync(__dirname + '/../api/db/strategies.js')).toBe(true);
    });

    test('api/db/candles.js exists', () => {
      expect(fs.existsSync(__dirname + '/../api/db/candles.js')).toBe(true);
    });

    test('api/db/analysis.js exists', () => {
      expect(fs.existsSync(__dirname + '/../api/db/analysis.js')).toBe(true);
    });

    test('api/auth/signup.js exists', () => {
      expect(fs.existsSync(__dirname + '/../api/auth/signup.js')).toBe(true);
    });

    test('api/auth/login.js exists', () => {
      expect(fs.existsSync(__dirname + '/../api/auth/login.js')).toBe(true);
    });

    test('api/middleware/auth.js exists', () => {
      expect(fs.existsSync(__dirname + '/../api/middleware/auth.js')).toBe(true);
    });

    test('SUPABASE-SETUP.md exists', () => {
      expect(fs.existsSync(__dirname + '/../SUPABASE-SETUP.md')).toBe(true);
    });

    test('PHASE-7-DATABASE-FOUNDATION.md exists', () => {
      expect(fs.existsSync(__dirname + '/../PHASE-7-DATABASE-FOUNDATION.md')).toBe(true);
    });
  });

  describe('Schema Validation', () => {
    const fs = require('fs');
    const schema = fs.readFileSync(__dirname + '/../db-schema.sql', 'utf8');

    test('Schema includes all required tables', () => {
      expect(schema).toContain('CREATE TABLE strategies');
      expect(schema).toContain('CREATE TABLE candles_ohlcv');
      expect(schema).toContain('CREATE TABLE trades');
      expect(schema).toContain('CREATE TABLE analysis_history');
      expect(schema).toContain('CREATE TABLE bybit_credentials');
    });

    test('Schema includes indexes for performance', () => {
      expect(schema).toContain('CREATE INDEX');
      expect(schema).toContain('idx_strategies_user_id');
      expect(schema).toContain('idx_trades_user_id');
      expect(schema).toContain('idx_candles_symbol_time');
    });

    test('Schema includes RLS policies', () => {
      expect(schema).toContain('ROW LEVEL SECURITY');
      expect(schema).toContain('CREATE POLICY');
    });
  });

  describe('API Endpoints Exported', () => {
    test('trades endpoint exports required methods', () => {
      const trades = require('../api/db/trades.js');
      expect(typeof trades.getTrades).toBe('function');
      expect(typeof trades.createTrade).toBe('function');
      expect(typeof trades.updateTrade).toBe('function');
    });

    test('strategies endpoint exports required methods', () => {
      const strategies = require('../api/db/strategies.js');
      expect(typeof strategies.getStrategies).toBe('function');
      expect(typeof strategies.createStrategy).toBe('function');
      expect(typeof strategies.updateStrategy).toBe('function');
    });

    test('candles endpoint exports required methods', () => {
      const candles = require('../api/db/candles.js');
      expect(typeof candles.getCandles).toBe('function');
      expect(typeof candles.insertCandles).toBe('function');
    });

    test('analysis endpoint exports required methods', () => {
      const analysis = require('../api/db/analysis.js');
      expect(typeof analysis.getAnalysis).toBe('function');
      expect(typeof analysis.saveAnalysis).toBe('function');
    });
  });

  describe('Auth System', () => {
    test('signup endpoint is a function', () => {
      const signup = require('../api/auth/signup.js');
      expect(typeof signup).toBe('function');
    });

    test('login endpoint is a function', () => {
      const login = require('../api/auth/login.js');
      expect(typeof login).toBe('function');
    });

    test('auth middleware exported', () => {
      const auth = require('../api/middleware/auth.js');
      expect(typeof auth.authMiddleware).toBe('function');
      expect(typeof auth.optionalAuthMiddleware).toBe('function');
    });
  });

  describe('Supabase Client', () => {
    test('SupabaseClient class exists and initializes', () => {
      const SupabaseClient = require('../lib/supabase-client.js');
      const client = new SupabaseClient({
        projectUrl: 'https://test.supabase.co',
        anonKey: 'test-key'
      });
      
      expect(client.projectUrl).toBe('https://test.supabase.co');
      expect(client.anonKey).toBe('test-key');
    });

    test('SupabaseClient has all CRUD methods', () => {
      const SupabaseClient = require('../lib/supabase-client.js');
      const client = new SupabaseClient();
      
      expect(typeof client.getTrades).toBe('function');
      expect(typeof client.createTrade).toBe('function');
      expect(typeof client.getStrategies).toBe('function');
      expect(typeof client.createStrategy).toBe('function');
      expect(typeof client.getCandles).toBe('function');
      expect(typeof client.insertCandles).toBe('function');
      expect(typeof client.getAnalysis).toBe('function');
      expect(typeof client.saveAnalysis).toBe('function');
    });

    test('SupabaseClient has auth methods', () => {
      const SupabaseClient = require('../lib/supabase-client.js');
      
      expect(typeof SupabaseClient.signUp).toBe('function');
      expect(typeof SupabaseClient.signIn).toBe('function');
      expect(typeof SupabaseClient.getCurrentUser).toBe('function');
    });
  });

  describe('Success Criteria', () => {
    test('Phase 7.0 tasks complete', () => {
      const fs = require('fs');
      
      // Database
      expect(fs.existsSync(__dirname + '/../db-schema.sql')).toBe(true);
      expect(fs.existsSync(__dirname + '/../lib/supabase-client.js')).toBe(true);
      
      // Auth
      expect(fs.existsSync(__dirname + '/../api/auth/signup.js')).toBe(true);
      expect(fs.existsSync(__dirname + '/../api/auth/login.js')).toBe(true);
      
      // DB Endpoints (4 files)
      expect(fs.existsSync(__dirname + '/../api/db/trades.js')).toBe(true);
      expect(fs.existsSync(__dirname + '/../api/db/strategies.js')).toBe(true);
      expect(fs.existsSync(__dirname + '/../api/db/candles.js')).toBe(true);
      expect(fs.existsSync(__dirname + '/../api/db/analysis.js')).toBe(true);
      
      // Middleware
      expect(fs.existsSync(__dirname + '/../api/middleware/auth.js')).toBe(true);
      
      // Documentation
      expect(fs.existsSync(__dirname + '/../SUPABASE-SETUP.md')).toBe(true);
      expect(fs.existsSync(__dirname + '/../PHASE-7-DATABASE-FOUNDATION.md')).toBe(true);
      expect(fs.existsSync(__dirname + '/../PHASE-7-PROGRESS.md')).toBe(true);
    });
  });
});
