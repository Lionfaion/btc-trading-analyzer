-- Supabase PostgreSQL Schema for BTC Trading Analyzer

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

-- Candles table (OHLCV data)
CREATE TABLE IF NOT EXISTS candles_ohlcv (
  id BIGSERIAL PRIMARY KEY,
  symbol TEXT NOT NULL,
  timeframe TEXT DEFAULT '1h',
  open_time TIMESTAMP NOT NULL,
  open DECIMAL(18,2) NOT NULL,
  high DECIMAL(18,2) NOT NULL,
  low DECIMAL(18,2) NOT NULL,
  close DECIMAL(18,2) NOT NULL,
  volume DECIMAL(20,2),
  created_at TIMESTAMP DEFAULT now(),
  UNIQUE(symbol, timeframe, open_time)
);

CREATE INDEX idx_candles_symbol_time ON candles_ohlcv(symbol, open_time DESC);

-- Trades table
CREATE TABLE IF NOT EXISTS trades (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id),
  symbol TEXT NOT NULL,
  entry_price DECIMAL(18,2) NOT NULL,
  exit_price DECIMAL(18,2),
  entry_time TIMESTAMP NOT NULL,
  exit_time TIMESTAMP,
  quantity DECIMAL(15,4) DEFAULT 1,
  pnl DECIMAL(18,2),
  pnl_percent DECIMAL(8,2),
  is_win BOOLEAN,
  source TEXT DEFAULT 'manual',
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

CREATE INDEX idx_trades_symbol_time ON trades(symbol, entry_time DESC);

-- Analysis history table
CREATE TABLE IF NOT EXISTS analysis_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id),
  symbol TEXT NOT NULL,
  timestamp TIMESTAMP NOT NULL,
  price DECIMAL(18,2),
  analysis JSONB,
  confidence INT,
  created_at TIMESTAMP DEFAULT now()
);

CREATE INDEX idx_analysis_symbol ON analysis_history(symbol, timestamp DESC);

-- Strategies table
CREATE TABLE IF NOT EXISTS strategies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id),
  name TEXT NOT NULL,
  parameters JSONB,
  rules TEXT,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

-- Bybit credentials table (encrypted)
CREATE TABLE IF NOT EXISTS bybit_credentials (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id),
  api_key_encrypted TEXT,
  api_secret_encrypted TEXT,
  is_testnet BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT now()
);

-- Backtest results table
CREATE TABLE IF NOT EXISTS backtest_results (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id),
  strategy_id UUID REFERENCES strategies(id),
  symbol TEXT,
  start_date TIMESTAMP,
  end_date TIMESTAMP,
  initial_balance DECIMAL(15,2),
  final_balance DECIMAL(15,2),
  total_trades INT,
  win_rate DECIMAL(5,2),
  roi DECIMAL(8,2),
  max_drawdown DECIMAL(8,2),
  sharpe_ratio DECIMAL(8,2),
  created_at TIMESTAMP DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE candles_ohlcv ENABLE ROW LEVEL SECURITY;
ALTER TABLE trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE analysis_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE strategies ENABLE ROW LEVEL SECURITY;
ALTER TABLE bybit_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE backtest_results ENABLE ROW LEVEL SECURITY;
