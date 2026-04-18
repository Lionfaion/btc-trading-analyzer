# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## Project Overview

**BTC Trading Analyzer** → Complete 6-Phase Trading Platform (in development)

**Current Status (2026-04-18):**
- ✅ Phase 0: Database infrastructure deployed on Railway.app
- ✅ Phase 1: Historical data collection pipeline complete (12 endpoints)
- ✅ Phase 2: Backtest engine with 7 technical indicators implemented
- ✅ Phase 3: Bybit integration complete (6 trading endpoints, testnet + live)
- 📋 Phases 4-6: Charts, order flow analysis, optimization (planned)

**Real Current Tech Stack:**
- **Frontend:** Vanilla JS served via simple Node.js HTTP server
- **Backend:** Node.js HTTP server (server.js) with serverless-ready structure
- **Database:** PostgreSQL (Supabase)
- **Deployment:** Railway.app (auto-deploy from GitHub)
- **Data Sources:** CoinGecko (free OHLCV), Bybit, Binance

**Key Architecture:** 6-phase modular system where each builds on the previous:
1. **Database & Auth** - PostgreSQL schema, Supabase setup
2. **Historical Data** - CoinGecko sync, multi-asset OHLCV candles
3. **Backtest Engine** - RSI + MACD + Bollinger indicators + metrics
4. **Bybit Integration** - HMAC-SHA256 auth, order execution
5. **Charts & Indicators** - TradingView Lightweight Charts integration
6. **Order Flow & Stats** - Liquidation zones, trade history, alerts

---

## Directory Structure

```
btc-trading-analyzer/
├── server.js                      # Node.js HTTP server (Railway entry point)
├── package.json                   # npm dependencies + start script
├── Procfile                       # Railway process definition
├── railway.json                   # Railway service config
├── .env.local                     # Environment variables (local dev)
├── .gitignore
├── db-schema.sql                  # PostgreSQL DDL (6 tables)
├── index.html                     # Main SPA frontend
├── vercel.json                    # Config file (not used, kept for reference)
│
├── api/                           # API endpoints (serverless-ready structure)
│   ├── analyze.js                 # Claude analysis integration
│   ├── btc-price.js               # Real-time BTC price
│   ├── btc-stats.js               # Trading statistics
│   ├── binance-price.js           # Binance price feed
│   ├── coinglass.js               # CoinGlass liquidations
│   ├── liquidations.js            # Liquidation analysis
│   │
│   ├── db/                        # Database CRUD operations
│   │   ├── init.js                # Supabase client initialization
│   │   ├── trade.js               # Trade insert/update/fetch
│   │   ├── candles.js             # OHLCV candle operations
│   │   ├── strategy.js            # Strategy management
│   │   └── analysis.js            # Analysis history
│   │
│   ├── historical/                # Historical data collection (Phase 1)
│   │   ├── sync.js                # Initial data load
│   │   └── update.js              # Hourly updates
│   │
│   ├── backtest/                  # Backtest engine (Phase 2 - Not Started)
│   │   └── run.js                 # Backtest execution
│   │
│   ├── bybit/                     # Bybit integration (Phase 3 - Not Started)
│   │   ├── auth.js                # HMAC-SHA256 signing
│   │   ├── place-order.js         # Order execution
│   │   ├── cancel-order.js        # Order cancellation
│   │   ├── positions.js           # Position tracking
│   │   └── balance.js             # Wallet balance
│   │
│   ├── indicators/                # Technical indicators (Phase 2)
│   │   ├── rsi.js                 # RSI calculation
│   │   ├── macd.js                # MACD calculation
│   │   └── bollinger.js           # Bollinger Bands
│   │
│   ├── analysis/                  # Analysis tools (Phase 5 - Not Started)
│   │   └── order-flow.js          # Liquidation zones
│   │
│   ├── alerts/                    # Alert system (Phase 5 - Not Started)
│   │   └── send.js                # Email notifications
│   │
│   └── automation/                # Strategy automation (Phase 3 - Not Started)
│       └── run.js                 # Scheduler
│
├── lib/                           # Shared utilities
│   ├── coingecko-client.js        # CoinGecko API wrapper
│   ├── backtest-engine.js         # Backtest algorithm
│   ├── indicators-visual.js       # Indicator calculations
│   └── chart-renderer.js          # Chart rendering
│
└── .git/                          # Git repository (synced with GitHub)
```

**GitHub Repository:** github.com/Lionfaion/btc-trading-analyzer  
**Railway Project:** btc-trading-analyzer (auto-deploys on git push)  
**Production URL:** https://btc-trading-analyzer-production.up.railway.app

---

## Key Commands

### Local Development

```bash
# Install dependencies
npm install

# Start local server (port 3000)
npm start

# Server runs at: http://localhost:3000
```

### Deployment to Railway

```bash
# 1. Ensure code is committed to git
git add .
git commit -m "Your message"

# 2. Push to GitHub
git push origin main

# 3. Railway auto-deploys (watch at: railway.app dashboard)
# No additional commands needed - Railway watches GitHub repo and redeploys on every push

# 4. View deployment logs
# Railway Dashboard → Project → btc-trading-analyzer → Logs tab
```

### Database Setup (One-time)

1. Create Supabase project: https://supabase.com/dashboard
2. Copy entire `db-schema.sql` file
3. In Supabase dashboard → SQL Editor → paste and execute
4. Get credentials:
   - **Project URL:** supabase.com → Settings → API → Project URL
   - **Anon Key:** supabase.com → Settings → API → `anon` public key
   - **Service Role Key:** supabase.com → Settings → API → `service_role` secret key
5. Add to Railway environment:
   - Railway Dashboard → btc-trading-analyzer → Variables → Add:
     ```
     SUPABASE_URL = (your URL from step 4)
     SUPABASE_ANON_KEY = (your anon key from step 4)
     SUPABASE_SERVICE_ROLE_KEY = (your service role key from step 4)
     ANTHROPIC_API_KEY = (optional - for Claude analysis)
     ```

### Testing Endpoints (Local)

```bash
# Get real-time BTC price
curl http://localhost:3000/api/btc-price

# Get trading statistics
curl http://localhost:3000/api/btc-stats

# Historical data sync (Phase 1)
curl -X POST http://localhost:3000/api/historical/sync \
  -H "Content-Type: application/json" \
  -d '{"symbol":"BTCUSDT"}'
```

---

## Implementation Status by Phase

### ✅ PHASE 0: Database & Auth (Complete)
- Database schema created in Supabase (7 tables)
- All DB CRUD operations implemented in `/api/db/`
- Environment variables configured on Railway
- Ready for production use

### ✅ PHASE 1: Historical Data Collection (Complete)
- 12 fully functional endpoints implemented
- CoinGecko integration for price/OHLCV data
- Multi-asset support (BTC, ETH, SOL, etc)
- Candle sync and retrieval working
- Demo data fallback when DB unavailable
- Frontend 8-panel dashboard operational

### ✅ PHASE 2: Backtest Engine (Complete)
- `api/backtest/run.js` - Basic 2-indicator backtest (RSI + MACD)
- `api/backtest/advanced.js` - Multi-indicator backtest (7 indicators total)
- `lib/indicators.js` - Complete implementations:
  - RSI, MACD, Bollinger Bands, Stochastic, ATR, ADX, EMA
- Risk-based position sizing
- Full trade history and metrics (P&L, win rate, Sharpe, drawdown)
- Strategy parameter templates for conservative/balanced/aggressive trading

### ✅ PHASE 3: Bybit Integration (Complete)
- 6 fully functional endpoints for Bybit API
- HMAC-SHA256 signing for secure authentication
- Order execution (buy/sell with SL/TP), position tracking, balance queries
- Testnet and live trading modes supported
- Automation enablement for strategy automation
- See PHASE-3-BYBIT.md for full API reference

### 🔄 PHASE 4: Charts & Indicators (Not Started)
- Will use: TradingView Lightweight Charts (CDN)
- Integration in: `lib/chart-renderer.js`, `index.html`

### 🔄 PHASE 5: Order Flow & Stats (Not Started)
- Liquidation zone analysis
- Trade history and performance metrics
- Email alerts

### 🔄 PHASE 6: Optimizations (Not Started)
- Performance caching
- Mobile responsiveness
- Error handling and resilience

---

## Critical Implementation Details

### Database Architecture (Supabase PostgreSQL)

**6 Core Tables (db-schema.sql):**
- `users` - User accounts and profiles
- `candles_ohlcv` - OHLC+volume candles (1h+ timeframes, indexed by symbol+timeframe+open_time)
- `trades` - Trade entries/exits with P&L
- `strategies` - Strategy definitions and parameters
- `analysis_history` - Backtest and analysis results
- `bybit_credentials` - Encrypted API key storage

**Status:** Schema created in Supabase, not yet exposed via API endpoints

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

### Server Architecture (server.js)

**Current Implementation:**
- Node.js built-in `http` module (no Express dependency)
- Serves `/` → returns `index.html` (SPA)
- Serves static files (`.js`, `.css`, `.json`) with correct MIME types
- Falls back to `index.html` for SPA routing (404 → index.html)
- Includes error logging for debugging

**Why this approach:**
- Railway.app compatible (requires explicit HTTP server)
- Minimal dependencies (only @supabase/supabase-js)
- Easy to expand with API endpoints (add routing logic)
- Serverless-ready structure

**How it works:**
1. Listen on PORT env variable (Railway injects this)
2. Route requests:
   - `GET /` → serve index.html
   - `GET /static/*` → serve files
   - `POST/GET /api/*` → (future: delegate to handlers)
   - `GET /anything` → fallback to index.html (SPA)
3. Return proper Content-Type headers

### Implemented: Bybit API Integration (Phase 3)

**6 Production-Ready Endpoints:**
- `POST /api/bybit/validate` - Validate API credentials before use
- `POST /api/bybit/balance` - Fetch account balance and coin holdings
- `POST /api/bybit/positions` - Query open positions with P&L
- `POST /api/bybit/place-order` - Execute market orders with SL/TP
- `POST /api/bybit/cancel-order` - Cancel open orders by ID
- `POST /api/automation/enable` - Enable/disable automated trading

**Authentication:**
- HMAC-SHA256 signing implemented in `api/bybit/auth.js`
- Testnet and live trading modes supported
- All endpoints return detailed responses (trades, balance, positions)

**Security:**
- Credentials passed via POST body (not stored in code)
- Signature verification on every request
- Order protection: minimum validation, SL/TP always set
- Testnet-first approach recommended

**See PHASE-3-BYBIT.md for:**
- Full API reference with curl examples
- Testing guide (13 comprehensive tests)
- Testnet → live transition protocol
- Security best practices

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

## Verification Checklist

### ✅ Immediate (Infrastructure)
- [x] GitHub repository created (github.com/Lionfaion/btc-trading-analyzer)
- [x] Railway project connected (auto-deploy from GitHub)
- [x] Supabase project created and configured
- [x] db-schema.sql executed in Supabase
- [x] Environment variables added to Railway
- [x] server.js serving index.html without 502 errors

### 🔄 PHASE 0 (Database)
- [ ] Verify all 6 tables exist in Supabase dashboard
- [ ] Test: Direct query in Supabase SQL Editor returns data
- [ ] Test: `/api/db/trade` endpoint (when implemented)

### 🔄 PHASE 1 (Historical Data)
- [ ] Implement `/api/historical/sync` endpoint
- [ ] Test: Fetch 100+ candles from CoinGecko
- [ ] Verify: candles_ohlcv table populates
- [ ] Test: Asset dropdown in UI loads data

### 🔄 PHASE 2 (Backtest)
- [ ] Implement backtest engine (`api/backtest/run.js`)
- [ ] Test: Run backtest with RSI strategy
- [ ] Verify: Results include trades list, P&L, Sharpe ratio

### ✅ PHASE 3 (Bybit - Complete)
- [x] All 6 Bybit endpoints implemented with HMAC-SHA256 auth
- [x] Testnet and live trading modes supported
- [x] Order placement with automatic SL/TP calculation
- [x] Position tracking and balance retrieval functional
- [x] Comprehensive testing guide (TESTING-PHASE3.md with 13 tests)
- [x] Full API documentation (PHASE-3-BYBIT.md)

### 🔄 PHASE 4 (Charts)
- [ ] Integrate TradingView Lightweight Charts
- [ ] Test: Candlestick chart renders OHLC data
- [ ] Test: RSI/MACD indicators overlay correctly

### 🔄 PHASE 5 (Order Flow & Stats)
- [ ] Implement stats calculations
- [ ] Display trade history and performance metrics
- [ ] Set up email alerts

---

## Troubleshooting

### 502 Application Failed to Respond
**Cause:** No HTTP server running or crashes on startup  
**Solution:**
1. Check Railway logs: Dashboard → Logs tab
2. Verify `server.js` exists and syntax is valid
3. Check `npm start` command in package.json
4. Verify `PORT` environment variable (Railway sets it automatically)

### Supabase Connection Errors
**Cause:** Wrong credentials in environment variables  
**Solution:**
1. Verify exact credentials in Railway Variables
2. Compare with Supabase project settings
3. Test manually: `curl -H "Authorization: Bearer ANON_KEY" SUPABASE_URL/rest/v1/candles`

### CORS Errors in Browser Console
**Cause:** API requests blocked (future issue when adding `/api/` routes)  
**Solution:**
1. Add CORS headers in server.js response
2. Use Supabase REST client (handles CORS automatically)
3. Test: `curl -H "Origin: http://localhost:3000" ...`

### Static Files Not Loading
**Cause:** Wrong MIME type or file path  
**Solution:**
1. Check server.js MIME types mapping
2. Add missing extensions as needed
3. Verify file exists: `npm start` should show logs

### Database Schema Not Executing
**Cause:** Typos or Supabase SQL Editor issues  
**Solution:**
1. Copy-paste entire `db-schema.sql` file (not line-by-line)
2. Check for syntax errors in Supabase SQL output
3. Try breaking into smaller SQL statements if needed

---

## Performance Considerations

### Current (MVP)
- Static file serving: cached by Railway edge network
- JavaScript execution: runs in browser (no backend processing)
- Database queries: will use Supabase indexes on (symbol, timeframe, open_time)

### Future Optimizations (Phase 6)
- Implement caching for frequently accessed candles
- Add serverless function response caching (100+ candle requests)
- Batch database operations (e.g., bulk candle inserts)
- Optimize chart rendering for 1000+ candles (TradingView is efficient)
- Rate limiting for external API calls (CoinGecko: 10-50 req/min)

---

## Development Notes

### Adding a New API Endpoint
1. Create file: `/api/yourfeature.js`
2. Export handler: `module.exports = (req, res) => { ... }`
3. Server will auto-route (add routing logic to server.js if needed)
4. Test: `curl http://localhost:3000/api/yourfeature`
5. Deploy: `git push origin main` → Railway auto-deploys

### Database Operations
- Use Supabase REST API (authenticated with ANON_KEY)
- Example: `GET https://SUPABASE_URL/rest/v1/candles?symbol=eq.BTC`
- Supabase client available: `const { createClient } = require('@supabase/supabase-js')`

### Adding npm Dependencies
**Keep minimal!** Each dependency increases Railway deployment time.
- Only add if truly necessary
- Prefer built-in Node modules
- Examples of good choices: @supabase/supabase-js, crypto (built-in)

### Testing Changes Locally
```bash
npm start
# Edit a file
# Restart server (CTRL+C then `npm start`)
# Visit http://localhost:3000
# Check console logs
```

---

## Current Limitations & Known Issues

### MVP Scope
- Single-user only (no multi-user auth yet)
- Static UI (Vanilla JS, will become reactive in Phase 2-3)
- Limited error handling (will improve with Phase 6)
- No real-time updates (polling-based only)

### Not Yet Implemented
- Bybit live trading (testnet ready, live not tested)
- WebSocket connections (using HTTP polling instead)
- Email notifications (infrastructure ready, needs SendGrid key)
- Advanced charting (TradingView library ready, UI integration pending)
- Mobile responsiveness (desktop-first for MVP)

---

## Quick Reference

| Component | Status | Files |
|-----------|--------|-------|
| **HTTP Server** | ✅ Working | server.js, Procfile |
| **Database** | ✅ Ready | db-schema.sql, Supabase |
| **Frontend** | ✅ Serving | index.html, server.js |
| **Historical Data** | 🔄 Planned | api/historical/*, lib/coingecko-client.js |
| **Backtest Engine** | 🔄 Planned | api/backtest/*, lib/backtest-engine.js |
| **Bybit Trading** | 🔄 Planned | api/bybit/* |
| **Charts** | 🔄 Planned | lib/chart-renderer.js, index.html |
| **Alerts** | 🔄 Planned | api/alerts/* |
| **Stats/Analytics** | 🔄 Planned | api/analysis/* |

---

## References & Documentation

- **Railway Deployment:** https://docs.railway.app/getting-started
- **Supabase PostgreSQL:** https://supabase.com/docs/guides/database
- **Bybit Trading API:** https://bybit-exchange.github.io/docs/v5/intro
- **CoinGecko Free API:** https://www.coingecko.com/en/api/documentation
- **TradingView Charts:** https://tradingview.github.io/lightweight-charts/
- **Node.js Built-in Modules:** https://nodejs.org/api/
- **npm Package Registry:** https://www.npmjs.com/

---

## Next Steps

1. **Verify current deployment works**
   - Check https://btc-trading-analyzer-production.up.railway.app loads index.html
   - Check Railway logs show no startup errors

2. **Implement Phase 1 (Historical Data)**
   - Create `/api/historical/sync.js` endpoint
   - Integrate CoinGecko API wrapper
   - Test candle data collection

3. **Expand API routes**
   - Add `/api/db/` endpoints (trade CRUD, etc.)
   - Add `/api/backtest/` endpoints
   - Add `/api/bybit/` endpoints

4. **Update Frontend (index.html)**
   - Add asset selector dropdown
   - Add backtest panel
   - Integrate TradingView charts
   - Add stats/analysis panels
