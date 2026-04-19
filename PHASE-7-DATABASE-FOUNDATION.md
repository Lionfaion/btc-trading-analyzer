# PHASE 7.0: Database & Auth Foundation

**Status:** IN PROGRESS  
**Objective:** Supabase setup + PostgreSQL schema + Basic auth + DB API endpoints  
**Duration:** Week 1-2 of expansion

---

## Tasks

### Task 1: Supabase Project Setup
- [ ] Create Supabase account (if not exists)
- [ ] Create new project
- [ ] Get connection string
- [ ] Link to Vercel environment variables
- [ ] Test connection

### Task 2: PostgreSQL Schema
- [ ] Create users table
- [ ] Create strategies table
- [ ] Create candles_ohlcv table
- [ ] Create trades table
- [ ] Create analysis_history table
- [ ] Create bybit_credentials table (encrypted)
- [ ] Add indexes for performance
- [ ] Add RLS policies (if multi-user)

### Task 3: Auth System (Simple)
- [ ] Supabase Auth integration
- [ ] Email/password signup
- [ ] Login endpoint
- [ ] Session management (JWT)
- [ ] Protected routes middleware

### Task 4: Database API Endpoints
- [ ] POST /api/db/trade - Save trade
- [ ] GET /api/db/trades - Get trade history
- [ ] GET /api/db/candles - Get stored candles
- [ ] POST /api/db/candles - Save candles
- [ ] POST /api/db/strategy - Save strategy
- [ ] GET /api/db/strategies - List strategies
- [ ] POST /api/db/analysis - Save analysis

### Task 5: Frontend Integration
- [ ] Create DB client (wrapper around API)
- [ ] Add login/signup UI
- [ ] Update main app to persist analysis
- [ ] Update to save trades
- [ ] Add dashboard for trade history

---

## Database Schema (PostgreSQL)

```sql
-- Users (via Supabase Auth)
-- Automatically managed by supabase

-- Strategies
CREATE TABLE strategies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  parameters JSONB,
  rules TEXT,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

-- Candles (OHLCV historical data)
CREATE TABLE candles_ohlcv (
  id BIGSERIAL PRIMARY KEY,
  symbol TEXT NOT NULL,
  timeframe TEXT NOT NULL, -- 1m, 5m, 15m, 1h, 4h, 1d, 1w, 1M
  open_time TIMESTAMP NOT NULL,
  open DECIMAL NOT NULL,
  high DECIMAL NOT NULL,
  low DECIMAL NOT NULL,
  close DECIMAL NOT NULL,
  volume DECIMAL NOT NULL,
  created_at TIMESTAMP DEFAULT now(),
  UNIQUE(symbol, timeframe, open_time)
);

-- Trades (manual or automated)
CREATE TABLE trades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  strategy_id UUID REFERENCES strategies(id),
  symbol TEXT NOT NULL,
  entry_price DECIMAL NOT NULL,
  exit_price DECIMAL,
  entry_time TIMESTAMP NOT NULL,
  exit_time TIMESTAMP,
  quantity DECIMAL NOT NULL,
  pnl DECIMAL,
  pnl_percent DECIMAL,
  is_win BOOLEAN,
  source TEXT, -- 'manual', 'backtest', 'automated'
  created_at TIMESTAMP DEFAULT now()
);

-- Analysis history
CREATE TABLE analysis_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  symbol TEXT NOT NULL,
  timestamp TIMESTAMP,
  price DECIMAL,
  analysis JSONB, -- Claude response
  created_at TIMESTAMP DEFAULT now()
);

-- Bybit credentials (encrypted)
CREATE TABLE bybit_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  api_key_encrypted TEXT NOT NULL,
  api_secret_encrypted TEXT NOT NULL,
  is_testnet BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT now()
);

-- Indexes
CREATE INDEX idx_strategies_user_id ON strategies(user_id);
CREATE INDEX idx_trades_user_id ON trades(user_id);
CREATE INDEX idx_trades_strategy_id ON trades(strategy_id);
CREATE INDEX idx_analysis_user_id ON analysis_history(user_id);
CREATE INDEX idx_candles_symbol_time ON candles_ohlcv(symbol, open_time DESC);
CREATE INDEX idx_bybit_user_id ON bybit_credentials(user_id);

-- RLS Policies (single-user demo mode)
ALTER TABLE strategies ENABLE ROW LEVEL SECURITY;
ALTER TABLE trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE analysis_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE bybit_credentials ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to access their own data
CREATE POLICY "Users can access their own strategies"
  ON strategies FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can access their own trades"
  ON trades FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can access their own analysis"
  ON analysis_history FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can access their own Bybit credentials"
  ON bybit_credentials FOR ALL USING (auth.uid() = user_id);

-- Candles are public (shared across users)
CREATE POLICY "Anyone can read candles"
  ON candles_ohlcv FOR SELECT USING (true);
```

---

## Implementation Order

1. **Supabase Setup** (30 min)
   - Create project
   - Run schema SQL
   - Get connection string

2. **DB Client Library** (1 hour)
   - Create `lib/supabase-client.js`
   - Wrapper for fetch + error handling

3. **API Endpoints** (2 hours)
   - `/api/db/trade`
   - `/api/db/trades`
   - `/api/db/candles`
   - `/api/db/strategies`
   - `/api/db/analysis`

4. **Auth Setup** (1.5 hours)
   - Login/signup endpoints
   - JWT middleware
   - Protected routes

5. **Frontend Integration** (2 hours)
   - Add auth UI
   - Update analysis panel to save
   - Update trade tracking to persist
   - Add history view

---

## Success Criteria

- ✅ Supabase project connected to Vercel
- ✅ All 6 tables created with indexes
- ✅ Auth endpoints working (signup/login/logout)
- ✅ API endpoints CRUD-ready
- ✅ Frontend saves analysis to DB
- ✅ Trade history persists
- ✅ Tests updated for new endpoints

---

**Last Updated:** 2026-04-18
