# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**BTC Trading Analyzer** — Complete cryptocurrency trading platform with backtesting engine, Bybit API integration, automated strategy execution via hourly scheduler, and TradingView charts. Node.js backend (Vercel), vanilla JS frontend, Supabase PostgreSQL with RLS.

**Current Status:** Phase 3B Complete - Ready for Testing (11 API endpoints, scheduler configured)

## Architecture (Phase 3B: Bybit Integration + Automation)

### Backend API Endpoints (11 total)

**Bybit Trading (7 endpoints)**
- `/api/bybit/connect` (POST) - Validate and encrypt Bybit API keys, store in DB
- `/api/bybit/status` (GET) - Check connection + balance
- `/api/bybit/balance` (GET) - Detailed wallet breakdown
- `/api/bybit/positions` (GET) - List open positions with P&L
- `/api/bybit/place-order` (POST) - Execute market/limit order (uses DB-stored encrypted credentials)
- `/api/bybit/cancel-order` (POST) - Cancel pending order
- `/api/bybit/close-position` (POST) - Close existing position

**Automation Control (3 endpoints)**
- `/api/automation/enable` (POST) - Activate strategy automation
- `/api/automation/disable` (POST) - Deactivate strategy
- `/api/automation/scheduler` (POST) - Hourly executor (Vercel Cron trigger)

**Database Helpers (1 endpoint)**
- `/api/db/automation-jobs` (GET) - Retrieve active automations for user

### Frontend Components (10 total)
- `ui/header.js` - Balance display + Bybit connection status badge
- `ui/bybit-panel.js` - Connect Bybit credentials form
- `ui/trading-dashboard.js` - Open positions + place/close orders
- `ui/automation-manager.js` - Enable/disable automated strategies
- `ui/strategy-manager.js` - Create/edit trading strategies
- `ui/backtest-panel.js` - Run backtests on historical data
- `ui/sidebar.js` - Navigation between sections
- `ui/asset-selector.js` - Choose trading pair (BTC, ETH, SOL)
- `ui/trades-dashboard.js` - Trade history + P&L statistics
- `ui/auth-panel.js` - Login/signup via Supabase

### Libraries (lib/)
- `lib/api-client.js` - Centralized API client with all 11 endpoints
- `lib/backtest-engine.js` - Core backtesting logic with strategy types
- `lib/indicators.js` - RSI, MACD, Bollinger Bands calculations
- `lib/chart-renderer.js` - TradingView Lightweight Charts integration
- `lib/coingecko-client.js` - Historical price data fetching

### Database Schema (db-schema.sql)
**Key tables with RLS:** 
- `strategies` - Trading strategy definitions
- `automation_jobs` - Active automations (NEW in Phase 3B)
- `bybit_credentials` - Encrypted API keys (NEW in Phase 3B)
- `trades` - Manual + automated trade history
- `candles_ohlcv` - Historical price data
- `analysis_history` - Claude analysis records

**Indexes for performance:** idx_automation_jobs_active, idx_automation_jobs_user

## Key Patterns (Phase 3B)

**Bearer Token Authentication**
- All endpoints require `Authorization: Bearer <token>` header
- Token stored in `localStorage['sb-token']` after Supabase login
- Backend extracts user via `supabase.auth.getUser(token)` 
- All queries filtered by `user.id` from token (RLS enforces this)

**Encrypted Credential Storage**
- Bybit API keys encrypted (base64) before DB storage
- Decrypted server-side only, never exposed to frontend
- Pattern: encrypt on store via POST /api/bybit/connect, decrypt on retrieve

**Automation Scheduler**
- Vercel Cron triggers `POST /api/automation/scheduler` at `0 * * * *` (every hour)
- Fetches all `automation_jobs` with `is_active=true`
- For each job: calculate RSI on last 20 candles, execute order if signal, persist trade
- Check execution: `vercel logs --follow`

**Frontend Components** - Class-based, methods async, fetch to `/api/bybit/` and `/api/automation/`, error handling with Spanish toast notifications via AnimationEngine

**Backtesting** - Input candles + strategy params, output trades + metrics + equity curve, no external API calls during execution

**Data Isolation** - RLS policies on all sensitive tables, users can only access their own strategies, automations, credentials, trades

## Common Tasks (Phase 3B)

**Add a new API endpoint:**
1. Create file in `/api/[section]/[name].js`
2. Extract Bearer token from header + validate user
3. Retrieve encrypted credentials from DB if needed
4. Decrypt server-side only
5. Filter all queries by user.id
6. Return `{ success: true/false, data: {...}, error: "..." }`
7. Update `lib/api-client.js` with new method

**Enable automation for a strategy:**
1. User selects strategy in automation-manager.js
2. POST `/api/automation/enable` with {strategyId, symbol}
3. Creates record in `automation_jobs` with `is_active=true`
4. Scheduler picks it up next hour and executes

**Debug a failed automation:**
1. Check Vercel logs: `vercel logs --follow`
2. Query DB: `SELECT * FROM automation_jobs WHERE is_active=true`
3. Verify last_run timestamp (should be within last hour)
4. Check bybit_credentials are still valid
5. Review browser console for frontend errors

**New strategy:** Add to `lib/backtest-engine.js` executeStrategy(), create indicators if needed in `lib/indicators.js`, test with `/api/backtest/run`

**Test an endpoint with cURL:**
```bash
export TOKEN="your-bearer-token-from-localStorage"
curl -H "Authorization: Bearer $TOKEN" https://your-domain.com/api/bybit/status
```

## Performance

- Backtesting: < 2s for 365 candles
- DB indexes on: user_id, symbol, strategy_type, created_at
- Frontend: lazy-load charts, cache candles, use RAF for animations, debounce resize

## Development Phases

- ✅ Phase 0: Database & Auth (Supabase RLS, Vercel functions)
- ✅ Phase 1: Data Collection (Historical OHLCV from CoinGecko)
- ✅ Phase 2: Backtesting Engine (RSI, MACD, Bollinger Bands, full metrics)
- ✅ Phase 3B: Bybit Integration + Automation (11 endpoints, hourly scheduler, encrypted credentials) **← CURRENT**
- 📋 Phase 4: TradingView Charts (interactive candles + indicators)
- 📋 Phase 5: Order Flow Analysis (liquidation detection, trapped position alerts)
- 📋 Phase 6: Production Hardening (AES-256 encryption, rate limiting, monitoring)

## Phase 3B Testing Checklist

Before deploying to Vercel:
- [ ] Database schema deployed (`db-schema.sql` executed in Supabase)
- [ ] Environment variables configured (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
- [ ] POST `/api/bybit/connect` - connect Bybit testnet successfully
- [ ] GET `/api/bybit/status` - returns connected + balance
- [ ] GET `/api/bybit/balance` - shows wallet breakdown
- [ ] POST `/api/bybit/place-order` - execute test order (tiny qty)
- [ ] Trade appears in `trades` table after order
- [ ] POST `/api/automation/enable` - activate strategy automation
- [ ] Check last_run timestamp updates hourly
- [ ] Scheduler appears in Vercel logs: `vercel logs --follow`
- [ ] GET `/api/db/automation-jobs` - returns active automations
- [ ] UI components render without errors
- [ ] Bybit connection status badge shows in header

## Resources & Documentation

- **ARCHITECTURE.md** - System design, flow diagrams, performance characteristics
- **QUICK-REFERENCE.md** - Quick lookup for endpoints, environment variables
- **TESTING-GUIDE.md** - Step-by-step testing with cURL examples for all 11 endpoints
- **PHASE-3B-SUMMARY.md** - Changelog and completion summary
- **db-schema.sql** - Database schema with automation_jobs table
- **lib/api-client.js** - All API endpoint methods in one place
- **api/automation/scheduler.js** - Hourly automation executor logic
- **vercel.json** - Cron configuration (0 * * * *)

## Critical DO's & DON'Ts

✅ **Always:**
- Use Bearer token for user identification
- Decrypt credentials server-side only
- Filter queries by user.id from token
- Check `/api/bybit/status` before placing orders
- Save trades to DB after every execution
- Monitor `vercel logs --follow` for scheduler

❌ **Never:**
- Pass credentials in request body (use DB encryption)
- Expose encrypted keys to frontend
- Skip RLS policies on sensitive tables
- Hardcode API keys (use environment variables)
- Assume scheduler ran without checking logs/DB
- Place real orders without testnet validation
