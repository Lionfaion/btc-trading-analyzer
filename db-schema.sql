-- BTC Trading Analyzer - PostgreSQL Schema
-- Run this in Supabase SQL Editor
-- Tables for trade persistence, strategy storage, and analysis history

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

-- Candlestick OHLCV data
CREATE TABLE candles_ohlcv (
  id BIGSERIAL PRIMARY KEY,
  symbol TEXT NOT NULL,
  timeframe TEXT NOT NULL,
  open_time TIMESTAMP NOT NULL,
  open DECIMAL NOT NULL,
  high DECIMAL NOT NULL,
  low DECIMAL NOT NULL,
  close DECIMAL NOT NULL,
  volume DECIMAL NOT NULL,
  created_at TIMESTAMP DEFAULT now(),
  UNIQUE(symbol, timeframe, open_time)
);

-- Trades (manual, backtest, or automated)
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
  source TEXT,
  created_at TIMESTAMP DEFAULT now()
);

-- Analysis history from Claude
CREATE TABLE analysis_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  symbol TEXT NOT NULL,
  timestamp TIMESTAMP,
  price DECIMAL,
  analysis JSONB,
  created_at TIMESTAMP DEFAULT now()
);

-- Bybit API credentials (encrypted)
CREATE TABLE bybit_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  api_key_encrypted TEXT NOT NULL,
  api_secret_encrypted TEXT NOT NULL,
  is_testnet BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT now()
);

-- Automation Jobs (Phase 3B - Scheduler)
CREATE TABLE automation_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  strategy_id UUID REFERENCES strategies(id),
  symbol TEXT NOT NULL,
  is_active BOOLEAN DEFAULT false,
  last_run TIMESTAMP,
  next_run TIMESTAMP,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

-- Backtest Results (Phase 2)
CREATE TABLE backtest_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  symbol TEXT NOT NULL,
  strategy_type TEXT NOT NULL,
  strategy_params JSONB,
  initial_balance DECIMAL DEFAULT 10000,
  final_balance DECIMAL,
  total_profit DECIMAL,
  roi DECIMAL,
  total_trades INTEGER,
  win_trades INTEGER,
  lose_trades INTEGER,
  win_rate DECIMAL,
  avg_win DECIMAL,
  avg_loss DECIMAL,
  profit_factor DECIMAL,
  max_drawdown DECIMAL,
  sharpe_ratio DECIMAL,
  trades JSONB,
  equity_curve JSONB,
  created_at TIMESTAMP DEFAULT now()
);

-- Indexes for performance
CREATE INDEX idx_strategies_user_id ON strategies(user_id);
CREATE INDEX idx_trades_user_id ON trades(user_id);
CREATE INDEX idx_trades_strategy_id ON trades(strategy_id);
CREATE INDEX idx_analysis_user_id ON analysis_history(user_id);
CREATE INDEX idx_candles_symbol_time ON candles_ohlcv(symbol, open_time DESC);
CREATE INDEX idx_bybit_user_id ON bybit_credentials(user_id);
CREATE INDEX idx_automation_jobs_active ON automation_jobs(is_active, last_run);
CREATE INDEX idx_automation_jobs_user ON automation_jobs(user_id);
CREATE INDEX idx_backtest_user_id ON backtest_results(user_id);
CREATE INDEX idx_backtest_symbol ON backtest_results(symbol);
CREATE INDEX idx_backtest_strategy ON backtest_results(strategy_type);

-- Row Level Security
ALTER TABLE strategies ENABLE ROW LEVEL SECURITY;
ALTER TABLE trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE analysis_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE bybit_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE automation_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE backtest_results ENABLE ROW LEVEL SECURITY;

-- Policies for single-user demo mode
CREATE POLICY user_strategies ON strategies FOR ALL USING (auth.uid() = user_id);
CREATE POLICY user_trades ON trades FOR ALL USING (auth.uid() = user_id);
CREATE POLICY user_analysis ON analysis_history FOR ALL USING (auth.uid() = user_id);
CREATE POLICY user_bybit ON bybit_credentials FOR ALL USING (auth.uid() = user_id);
CREATE POLICY user_automation ON automation_jobs FOR ALL USING (auth.uid() = user_id);
CREATE POLICY user_backtest ON backtest_results FOR ALL USING (auth.uid() = user_id);
CREATE POLICY candles_read ON candles_ohlcv FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY candles_insert ON candles_ohlcv FOR INSERT WITH CHECK (true);
