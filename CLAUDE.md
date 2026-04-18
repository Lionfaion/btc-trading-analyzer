# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## Project Overview

**BTC Trading Analyzer** is a complete 6-phase trading platform for analyzing, backtesting, and executing cryptocurrency trading strategies on Bybit. It integrates real-time price data, historical candles, technical indicators, and automated order execution.

**Tech Stack:**
- **Frontend:** Vanilla JS + TradingView Lightweight Charts
- **Backend:** Vercel Serverless Functions (Node.js)
- **Database:** PostgreSQL (Supabase) with Row-Level Security
- **Trading Exchange:** Bybit API (testnet default)
- **Data Sources:** CoinGecko (free OHLCV), Bybit (live prices)

**Key Architecture:** 6-layer modular system where each phase builds on the previous:
1. **Database & Auth** - PostgreSQL schema, Supabase client, JWT middleware
2. **Historical Data** - CoinGecko sync, 2-year candles for BTC/ETH/SOL
3. **Backtest Engine** - RSI(14) + MACD(12/26/9) + Bollinger(20,2) + metrics
4. **Bybit Integration** - HMAC-SHA256 auth, market orders, position tracking
5. **Charts & Indicators** - TradingView candlesticks with overlay indicators
6. **Order Flow & Stats** - Liquidation analysis, trade history, performance metrics

**Total Deliverables:** 47 files across 6 phases, ~10k+ lines of code.

---

## Directory Structure

```
btc-trading-analyzer/
├── api/                           # Vercel serverless functions
│   ├── db/                        # Database CRUD (Supabase)
│   │   ├── init.js                # Supabase client + JWT auth
│   │   ├── trade.js               # Trade CRUD + auto P&L
│   │   ├── candles.js             # OHLCV batch upsert
│   │   ├── strategy.js            # Strategy CRUD
│   │   ├── analysis.js            # Backtest results
│   │   └── bybit.js               # Encrypted credentials
│   ├── bybit/                     # Bybit API integration
│   │   ├── auth.js                # BybitAuth class (HMAC signing)
│   │   ├── place-order.js         # Market order execution
│   │   ├── cancel-order.js        # Order cancellation
│   │   ├── positions.js           # Open positions + PnL
│   │   └── balance.js             # Wallet balance
│   ├── backtest/
│   │   └── run.js                 # Backtest execution endpoint
│   ├── indicators/                # Technical indicators (pure functions)
│   │   ├── rsi.js                 # RSI(14) + oversold/overbought
│   │   ├── macd.js                # MACD(12,26,9) + crossover
│   │   └── bollinger.js           # Bollinger Bands(20,2)
│   ├── historical/                # Data collection
│   │   ├── sync.js                # Initial 2-year data load
│   │   └── update.js              # Hourly candle updates
│   ├── analysis/
│   │   └── order-flow.js          # Liquidation zones + trapped positions
│   ├── stats/
│   │   └── calculate.js           # Win rate, profit factor, Sharpe, etc.
│   ├── alerts/
│   │   └── send.js                # Email alerts (5 types)
│   ├── automation/
│   │   └── run.js                 # Strategy scheduler
│   └── market-price.js            # Current price endpoint
├── lib/                           # Shared utilities
│   ├── coingecko-client.js        # CoinGecko API wrapper
│   ├── backtest-engine.js         # Core backtest logic
│   ├── chart-renderer.js          # TradingView Lightweight Charts
│   ├── indicators-visual.js       # Visual indicator calculations
│   └── chart-data-helper.js       # Data fetch, cache, utilities
├── scripts/
│   └── update-hourly.js           # Cron job for hourly updates
├── examples/
│   ├── backtest-example.js        # 5 backtest usage examples
│   └── chart-integration-example.js # 8 chart integration examples
├── db-schema.sql                  # PostgreSQL DDL (6 tables, indexes, RLS)
├── setup.js                       # Deployment validation script
├── index.html                     # Main UI (all phases integrated)
├── vercel.json                    # Vercel config
├── .env.local.example             # Environment template
├── CLAUDE.md                      # This file
└── PHASE_*_README.md / GUIDES     # Phase-specific documentation
```

---

## Key Commands

### Setup & Deployment

```bash
# Validate all 47 files exist and phases are complete
node setup.js

# Deploy to Vercel
vercel deploy --prod

# Run local development server
vercel dev
```

### Database Initialization

1. Create Supabase project: https://supabase.com/dashboard
2. In Supabase SQL Editor, paste contents of `db-schema.sql`
3. Get credentials: Project Settings → API → URL + anon key
4. Create `.env.local`:
   ```
   SUPABASE_URL=https://xxxxx.supabase.co
   SUPABASE_ANON_KEY=eyJxxx...
   ANTHROPIC_API_KEY=sk-ant-xxx...
   ```

### Historical Data Sync

```bash
# Download 2-year BTC/ETH/SOL candles (1h)
curl -X POST http://localhost:3000/api/historical/sync \
  -H "Content-Type: application/json" \
  -d '{"symbol":"BTCUSDT"}'

# Update latest candle (run hourly via cron)
curl -X POST http://localhost:3000/api/historical/update \
  -H "Content-Type: application/json" \
  -d '{"symbol":"BTCUSDT"}'
```

### Backtest a Strategy

```bash
curl -X POST http://localhost:3000/api/backtest/run \
  -H "Content-Type: application/json" \
  -d '{
    "symbol": "BTCUSDT",
    "strategyType": "rsi_macd",
    "startDate": "2024-01-01",
    "endDate": "2025-01-01",
    "rsiPeriod": 14,
    "rsiOversold": 30,
    "macdFast": 12,
    "stopLoss": 2.5,
    "takeProfit": 5
  }'
```

### Test Bybit Connection

```bash
curl -X POST http://localhost:3000/api/bybit/balance \
  -H "Content-Type: application/json" \
  -d '{
    "apiKey": "your_key",
    "apiSecret": "your_secret",
    "isTestnet": true
  }'
```

---

## Critical Implementation Details

### Database Architecture (Supabase PostgreSQL)

**6 Core Tables:**
- `users` - Optional multi-user support (currently single-user mode)
- `candles_ohlcv` - OHLC+volume with 1h+ timeframes, unique constraint on (symbol, timeframe, open_time)
- `trades` - Entry/exit prices, P&L calculated on insert/update
- `strategies` - Strategy definitions (name, parameters as JSONB, rules text)
- `analysis_history` - Backtest results + Claude analysis
- `bybit_credentials` - API keys encrypted with bcrypt

**Row-Level Security (RLS):** All tables restricted to authenticated users (enable in Supabase UI).

### Backtest Engine Logic (`lib/backtest-engine.js`)

Core algorithm:
1. Fetch candles for date range from DB
2. Calculate indicators (RSI, MACD, Bollinger) for each candle
3. Generate signals:
   - **RSI:** BUY if RSI < 30 + MACD above signal line
   - **MACD:** BUY if MACD crosses above signal, SELL on cross below
   - **Bollinger:** BUY if price touches lower band + momentum
4. Simulate trade execution:
   - Enter at signal candle's close
   - Exit at TP (take profit: +5%), SL (stop loss: -2%), or next signal
5. Calculate metrics:
   - P&L per trade, cumulative P&L
   - Win rate, avg win, avg loss, profit factor
   - Sharpe ratio (daily returns), max drawdown
   - ROI, expectancy

**Note:** Backtest is deterministic - same inputs always produce same results (useful for validation).

### Bybit API Integration (`api/bybit/auth.js`)

**Authentication:**
- HMAC-SHA256 signature on timestamp + params
- All requests include `X-BAPI-TIMESTAMP` and `X-BAPI-SIGN` headers
- BybitAuth class auto-signs all requests

**Order Flow:**
1. Fetch current price from `/v5/market/tickers`
2. Calculate SL (price × 0.98) and TP (price × 1.05)
3. Place MARKET order via `/v5/order/create`
4. Default: USDT linear perpetuals, 1x leverage, IOC (immediate-or-cancel)

**Critical:** All code defaults to `isTestnet: true` - **must verify before live trading**.

### Chart Rendering (`lib/chart-renderer.js`)

Uses TradingView Lightweight Charts library:
- Candlestick series (OHLC)
- Overlay series for indicators (RSI, MACD, Bollinger)
- Zoom/pan support with auto-scaling
- localStorage caching (60-min TTL) to reduce API calls

**Data Flow:**
1. Frontend calls `/api/market-price` for current price
2. Fetches OHLCV from `/api/db/candles` (with timeframe param)
3. Calculates indicators in `lib/indicators-visual.js`
4. Renders chart with `chart-renderer.js`

### Alert System (`api/alerts/send.js`)

5 alert types:
1. `STRATEGY_SIGNAL` - BUY/SELL recommendation
2. `LIQUIDATION_ALERT` - Trapped longs/shorts detected
3. `TRADE_EXECUTED` - Order filled on Bybit
4. `POSITION_CLOSED` - TP/SL hit
5. `DAILY_SUMMARY` - End-of-day stats

**Note:** SendGrid integration is a placeholder (requires API key in `.env.local`). Email logic is ready; just need credentials.

---

## Development Workflow

### Adding a New Indicator

1. Create `/api/indicators/newname.js`:
   ```javascript
   module.exports = function calculateNewIndicator(candles, period = 14) {
     // Return array of values, same length as input candles
     return candles.map((c, i) => {
       // calculation
     });
   };
   ```

2. Test in `/api/backtest/run.js` - add to signal generation logic

3. Add visual rendering in `/lib/indicators-visual.js` and chart overlay

### Extending the Backtest Engine

1. Edit `/lib/backtest-engine.js` → `generateSignals()` method
2. Add new condition to BUY/SELL logic
3. Test via:
   ```bash
   curl -X POST http://localhost:3000/api/backtest/run -d '...'
   ```

### Adding a New Bybit Endpoint

1. Create `/api/bybit/newfeature.js` (use existing as template)
2. Use `BybitAuth` class for signature generation
3. Call endpoint via `auth.request('GET'|'POST', path, params)`
4. Return JSON response with error handling

### Deploying New Functions

Vercel auto-detects new files in `/api/` and deploys them. After pushing:
```bash
vercel deploy --prod
```

---

## Testing Checklist

**PHASE 0 - Database:**
- [ ] Supabase project created
- [ ] db-schema.sql executed (no SQL errors)
- [ ] Tables visible in Supabase UI (6 tables created)
- [ ] RLS enabled on all tables

**PHASE 1 - Historical Data:**
- [ ] `/api/historical/sync` downloads 100+ candles
- [ ] Candles table populated with correct OHLCV data
- [ ] Asset selector dropdown shows BTC/ETH/SOL

**PHASE 2 - Backtest:**
- [ ] Create strategy with default params
- [ ] Run backtest on 3-month date range
- [ ] Results show trades list, P&L, metrics
- [ ] Backtest with different indicators produces different results

**PHASE 3 - Bybit:**
- [ ] Connect testnet credentials (test key/secret from Bybit)
- [ ] `/api/bybit/balance` returns account balance
- [ ] `/api/bybit/positions` returns open positions (usually empty on testnet)
- [ ] Place 1 test order, verify in Bybit UI, cancel it

**PHASE 4 - Charts:**
- [ ] Charts panel loads without errors
- [ ] Candlesticks render with correct OHLC data
- [ ] Indicators (RSI, MACD) overlay on chart
- [ ] Zoom/pan works smoothly

**PHASE 5 - Order Flow & Stats:**
- [ ] Stats dashboard calculates win rate, profit factor
- [ ] Order flow detects liquidation zones
- [ ] Trade history table shows all past trades with filtering

---

## Common Issues & Solutions

| Issue | Cause | Solution |
|-------|-------|----------|
| `SUPABASE_URL not found` | .env.local missing | Copy `.env.local.example` to `.env.local` + fill credentials |
| `Invalid API credentials` | Wrong Bybit key/secret | Verify testnet API key from Bybit account settings |
| `No candles in backtest` | historical/sync not run | Execute `node setup.js` → follow Phase 1 instructions |
| Chart doesn't load | localStorage quota exceeded | Clear browser cache + retry |
| Backtest runs slow | Too many candles fetched | Reduce date range or increase batch processing |
| Email alerts not sent | SendGrid key missing | Add `SENDGRID_API_KEY` to .env.local (or implement custom mailer) |

---

## Performance Considerations

- **Candles table:** Index on (symbol, timeframe, open_time) for fast queries
- **Chart rendering:** Cache candles in localStorage (60-min TTL) to avoid re-fetching
- **Backtest:** Pre-calculate indicators in batches, not per-candle
- **Bybit API:** 10 req/sec rate limit - queue requests if automating multiple orders

---

## Disabled Features (Production Readiness)

Currently disabled for MVP (enable in `api/alerts/send.js`):
- Email notifications (requires SendGrid)
- Two-factor authentication (can add via Supabase Auth)
- Position liquidation notifications (requires WebSocket stream from Bybit)

Enable these after MVP validation.

---

## Phase Completion Status

✅ **PHASE 0:** Database, Supabase client, JWT auth, credential encryption  
✅ **PHASE 1:** CoinGecko sync, 2-year historical data, multi-asset support  
✅ **PHASE 2:** Backtest engine, RSI+MACD+Bollinger, metrics (Sharpe, drawdown, etc.)  
✅ **PHASE 3:** Bybit auth, market orders, position tracking, testnet default  
✅ **PHASE 4:** TradingView charts, indicator overlays, zoom/pan  
✅ **PHASE 5:** Order flow analysis, stats dashboard, trade history, alerts  

**Next (optional):** Multi-user auth, WebSocket live orders, advanced strategy optimizer

---

## References

- **Bybit API:** https://bybit-exchange.github.io/docs/v5/intro
- **Supabase Docs:** https://supabase.com/docs
- **CoinGecko API:** https://www.coingecko.com/en/api
- **TradingView Lightweight Charts:** https://tradingview.github.io/lightweight-charts/
- **Vercel Functions:** https://vercel.com/docs/serverless-functions/overview
