-- PHASE 0: BTC Trading Analyzer - Database Schema
-- Single-user mode with Supabase

-- Table 1: Users (single user for this phase)
CREATE TABLE public.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Table 2: Strategies (backtesting strategies)
CREATE TABLE public.strategies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  entry_condition JSONB,
  exit_condition JSONB,
  risk_per_trade DECIMAL(5,2),
  max_open_trades INT DEFAULT 1,
  status VARCHAR(50) DEFAULT 'draft',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Table 3: OHLCV Candles (1h timeframe from Bybit)
CREATE TABLE public.candles_ohlcv (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  symbol VARCHAR(20) NOT NULL DEFAULT 'BTCUSDT',
  timeframe VARCHAR(10) NOT NULL DEFAULT '1h',
  open_time TIMESTAMP NOT NULL,
  open DECIMAL(20,8) NOT NULL,
  high DECIMAL(20,8) NOT NULL,
  low DECIMAL(20,8) NOT NULL,
  close DECIMAL(20,8) NOT NULL,
  volume DECIMAL(20,8) NOT NULL,
  turnover DECIMAL(20,8),
  created_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT unique_candle UNIQUE (user_id, symbol, timeframe, open_time)
);

-- Table 4: Trades (executed trades from backtest)
CREATE TABLE public.trades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  strategy_id UUID NOT NULL REFERENCES public.strategies(id) ON DELETE CASCADE,
  entry_time TIMESTAMP NOT NULL,
  entry_price DECIMAL(20,8) NOT NULL,
  exit_time TIMESTAMP,
  exit_price DECIMAL(20,8),
  quantity DECIMAL(20,8) NOT NULL,
  pnl DECIMAL(20,8),
  pnl_percent DECIMAL(10,2),
  status VARCHAR(50) DEFAULT 'open',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Table 5: Analysis History (backtest results)
CREATE TABLE public.analysis_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  strategy_id UUID NOT NULL REFERENCES public.strategies(id) ON DELETE CASCADE,
  backtest_date TIMESTAMP DEFAULT NOW(),
  total_trades INT,
  win_rate DECIMAL(5,2),
  profit_factor DECIMAL(10,2),
  max_drawdown DECIMAL(5,2),
  avg_win DECIMAL(20,8),
  avg_loss DECIMAL(20,8),
  total_pnl DECIMAL(20,8),
  sharpe_ratio DECIMAL(10,2),
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Table 6: Bybit Credentials (encrypted API keys)
CREATE TABLE public.bybit_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  api_key_encrypted VARCHAR(500) NOT NULL,
  api_secret_encrypted VARCHAR(500) NOT NULL,
  sandbox_mode BOOLEAN DEFAULT TRUE,
  is_active BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_strategies_user_id ON public.strategies(user_id);
CREATE INDEX idx_candles_user_symbol_time ON public.candles_ohlcv(user_id, symbol, open_time DESC);
CREATE INDEX idx_trades_strategy_id ON public.trades(strategy_id);
CREATE INDEX idx_trades_user_id ON public.trades(user_id);
CREATE INDEX idx_analysis_strategy_id ON public.analysis_history(strategy_id);
CREATE INDEX idx_analysis_date ON public.analysis_history(backtest_date DESC);
CREATE INDEX idx_bybit_user_id ON public.bybit_credentials(user_id);

-- Row-level security (single-user mode)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.strategies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.candles_ohlcv ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analysis_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bybit_credentials ENABLE ROW LEVEL SECURITY;

-- RLS Policies for single-user (authenticated user only)
CREATE POLICY users_own_profile ON public.users FOR ALL USING (auth.uid() = id);
CREATE POLICY users_select_own ON public.users FOR SELECT USING (auth.uid() = id);

CREATE POLICY strategies_own ON public.strategies FOR ALL USING (auth.uid() = user_id);
CREATE POLICY candles_own ON public.candles_ohlcv FOR ALL USING (auth.uid() = user_id);
CREATE POLICY trades_own ON public.trades FOR ALL USING (auth.uid() = user_id);
CREATE POLICY analysis_own ON public.analysis_history FOR ALL USING (auth.uid() = user_id);
CREATE POLICY bybit_own ON public.bybit_credentials FOR ALL USING (auth.uid() = user_id);
