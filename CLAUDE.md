# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**BTC Trading Analyzer** — Complete 6-phase cryptocurrency trading platform with Bybit integration, backtesting engine, automated strategy execution, TradingView charts, and professional glassmorphism UI. Static frontend on Vercel CDN, Node.js API serverless functions, Supabase PostgreSQL with RLS.

**Current Status:** Phase 3C Complete - Production Ready ✅ (Beautiful UI deployed, all endpoints working, Supabase connected)

## Deployment URLs (Phase 3C)

- **Frontend:** https://btc-trading-analyzer.vercel.app (Beautiful responsive UI with glassmorphism)
- **Backend API:** https://api-jeqjmp909-automates-projects-a5315662.vercel.app (Serverless Node.js)
- **Database:** Supabase Project `fjusqtpwssycokwobtzj` (PostgreSQL with RLS)

## Architecture

### Deployment Stack (Vercel + Supabase)

```
┌──────────────────────────────────┐
│ Frontend (btc-trading-analyzer)  │
│ Static files served by Vercel    │
│ • index.html in public/          │
│ • CSS (glassmorphism + GSAP)     │
│ • Vanilla JS components          │
└────────────────┬─────────────────┘
                 │ fetch() + Bearer token
┌────────────────▼─────────────────┐
│ API (api-jeqjmp909)              │
│ Serverless Node.js functions     │
│ api/[...route].js (dynamic)      │
│ Supabase SDK integration         │
└────────────────┬─────────────────┘
                 │ Service role key
┌────────────────▼─────────────────┐
│ Supabase PostgreSQL              │
│ Tables: users, trades, strategies│
│ candles_ohlcv, bybit_credentials │
│ RLS enabled on sensitive data    │
└──────────────────────────────────┘
```

### Frontend Structure (public/ folder)

```
public/
├── index.html           # Main UI entry (Vercel serves this)
├── css/
│   ├── futuristic.css  # Glassmorphism theme, responsive grid
│   └── animations.css  # GSAP animations
├── lib/
│   ├── config.js       # API_BASE_URL (CRITICAL: absolute URLs)
│   ├── api-client.js   # Fetch wrapper with auth headers
│   ├── backtest-engine.js
│   ├── chart-renderer.js
│   └── chart-data-helper.js
└── ui/
    ├── header.js       # Balance + Bybit status
    ├── sidebar.js      # Navigation (6 sections)
    ├── trading-dashboard.js
    ├── bybit-panel.js
    ├── automation-manager.js
    ├── strategy-manager.js
    ├── backtest-panel.js
    └── ...
```

### Key UI Components (6 Sections)
1. **Dashboard** - Overview, balance, active trades
2. **Live Trading** - Place orders, view positions
3. **Backtesting** - Run historical simulations
4. **Strategies** - Create/edit strategies
5. **Analytics** - P&L, statistics, trade history
6. **Account** - Settings, credentials, info

### Backend API Endpoints (8+)

**Bybit Trading Integration**
- `POST /api/bybit/connect` - Save encrypted Bybit API credentials
- `GET /api/bybit/status` - Connection status + live balance
- `GET /api/bybit/balance` - Detailed wallet breakdown
- `GET /api/bybit/positions` - Open positions with P&L
- `POST /api/bybit/place-order` - Execute market/limit order
- `POST /api/bybit/cancel-order` - Cancel pending order
- `POST /api/bybit/close-position` - Close position

**Automation & Data**
- `POST /api/automation/enable` - Activate strategy automation
- `POST /api/automation/disable` - Deactivate strategy
- `GET /api/db/automation-jobs` - Active automations for user
- `GET /api/health` - API health check (no auth required)

**Routing:** All requests go through `api/[...route].js` which parses path and dispatches to handler

### Core Libraries (lib/)
- `lib/config.js` - CONFIG.API_BASE_URL (CRITICAL: points to Vercel API domain)
- `lib/api-client.js` - Fetch wrapper with Bearer auth + all endpoints
- `lib/backtest-engine.js` - Historical strategy simulation engine
- `lib/chart-renderer.js` - TradingView chart initialization
- `lib/indicators-visual.js` - RSI, MACD, Bollinger indicators
- `lib/coingecko-client.js` - Historical price data fetching

### Database Schema (Supabase)
**6 Main Tables:**
- `users` - User accounts (Supabase Auth)
- `strategies` - Saved trading strategies with parameters
- `trades` - All trades (manual + automated) with P&L
- `candles_ohlcv` - Historical OHLCV data (symbol, timeframe)
- `bybit_credentials` - Encrypted API keys (RLS: user-scoped)
- `automation_jobs` - Active scheduler jobs (RLS: user-scoped)

**RLS:** Enabled on bybit_credentials, automation_jobs, trades — users only see their own

## Critical Implementation Details

### ⚠️ API URL Configuration
**MUST use absolute URLs** — Frontend and API are on different Vercel domains
```javascript
// lib/config.js
const CONFIG = {
  API_BASE_URL: 'https://api-jeqjmp909-automates-projects-a5315662.vercel.app'
};
```
**All fetch calls must prepend this URL:**
```javascript
// ✅ CORRECT
fetch(CONFIG.API_BASE_URL + '/api/bybit/status')

// ❌ WRONG - fails due to domain mismatch
fetch('/api/bybit/status')
```

### Bearer Token Authentication
- Frontend stores token in `localStorage['sb-token']` after Supabase login
- All requests include: `Authorization: Bearer {token}`
- Backend extracts user: `const user = await getUser(req)`
- All queries filtered by `user.id` (RLS enforces user-scoped access)

### Encrypted Credential Storage
- Bybit API keys encrypted (base64) before DB storage in `/api/bybit/connect`
- **Never** exposed to frontend — encrypted credentials stay server-side
- Decryption happens in API handlers only

### UI Component Pattern (Vanilla JS)
- Each component is a function that returns HTML string
- Methods use async/await for API calls
- Fetch uses absolute URL: `const baseUrl = 'https://api-...'`
- Error handling with try/catch + user-friendly messages

### Glassmorphism Theme (CSS)
- Color scheme: Cian (#00d9ff), Magenta (#ff006e), Orange (#ffb703)
- `backdrop-filter: blur()` + semi-transparent `rgba()` for glass effect
- Smooth transitions: `.3s ease` on hover
- Responsive: sidebar 260px (desktop), mobile converts to horizontal nav

### Animations (GSAP)
- Loaded via CDN in HTML `<head>`
- Used for section transitions, hover effects, loading states
- Smooth scroll behavior, fadeIn/slideIn animations

### Data Isolation
- RLS policies prevent users from seeing others' data
- bybit_credentials table: only owner can read/decrypt
- automation_jobs: filtered by user_id
- trades: user can only see their own

## Common Development Tasks

### Modifying Frontend Components
1. Edit UI component file in `public/ui/` (e.g., `trading-dashboard.js`)
2. Update corresponding HTML container in `public/index.html` if needed
3. Update CSS in `css/futuristic.css` if styling changes needed
4. **Test locally first** — verify API calls use absolute URLs from `lib/config.js`
5. Deploy: `git push origin main` (auto-deploys to Vercel)

### Adding/Modifying API Endpoints
1. **Pattern:** All endpoints go through `api/[...route].js`
2. Add new `if (section === 'newsection')` block
3. Extract user from token: `const user = await getUser(req)`
4. Get request body: `const body = await parseBody(req)`
5. Query DB with `supabase` client (service role)
6. **Filter by user.id** for user-scoped queries
7. Return JSON: `res.status(200).json({ data, success: true })`
8. Test with cURL before deploying

### Connecting Bybit
1. User enters API key + secret in `bybit-panel.js`
2. Frontend calls `POST /api/bybit/connect` with credentials
3. Backend: validates with Bybit, encrypts, stores in DB
4. `/api/bybit/status` confirms connection + fetches balance

### Running Backtests
1. Select asset + strategy params in `backtest-panel.js`
2. Fetch candles from DB for date range
3. `lib/backtest-engine.js` simulates trades based on strategy
4. Calculate metrics: win rate, P&L, drawdown, Sharpe ratio
5. Render results: trades table + equity curve chart

### Debugging Issues
- **Frontend errors:** Check browser DevTools console (usually API URL or auth issues)
- **API errors:** Check Vercel logs: `vercel logs --follow`
- **DB issues:** Query directly in Supabase console
- **Bybit connection:** Verify credentials in DB, check Bybit API status

### Testing Endpoints with cURL
```bash
# Get token from browser localStorage (sb-token)
export TOKEN="your-token-here"

# Health check (no auth)
curl https://api-jeqjmp909.vercel.app/api/health

# Check Bybit status
curl -H "Authorization: Bearer $TOKEN" \
  https://api-jeqjmp909.vercel.app/api/bybit/status

# Place order
curl -X POST -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"symbol":"BTCUSDT","side":"BUY","qty":0.001}' \
  https://api-jeqjmp909.vercel.app/api/bybit/place-order
```

## Development Phases

- ✅ Phase 0: Database & Auth (Supabase RLS, Vercel functions)
- ✅ Phase 1: Data Collection (Historical OHLCV fetching)
- ✅ Phase 2: Backtesting Engine (RSI, MACD, Bollinger Bands)
- ✅ Phase 3A: Bybit Integration + Automation (API endpoints, scheduler)
- ✅ Phase 3C: UI Redesign & Full Deployment (Glassmorphism, GSAP, responsive) **← CURRENT**
- 📋 Phase 4: TradingView Charts (Interactive candles + indicators)
- 📋 Phase 5: Advanced Analytics (Order flow, liquidation detection)
- 📋 Phase 6: Production Hardening (AES-256 encryption, rate limiting)

## Vercel Deployment Checklist

✅ **Phase 3C Complete:**
- [x] Frontend static files in `public/`
- [x] API functions in `api/[...route].js`
- [x] `vercel.json` configured for routing + builds
- [x] Supabase PostgreSQL connected + RLS enabled
- [x] Environment variables set in Vercel dashboard
- [x] Frontend accessible at https://btc-trading-analyzer.vercel.app
- [x] API accessible at https://api-jeqjmp909.vercel.app
- [x] Glassmorphism UI with responsive design
- [x] GSAP animations working
- [x] Bybit integration tested with testnet
- [x] All 8+ endpoints functional

**For Future Updates:**
- Push changes to main branch → Vercel auto-deploys
- Monitor logs: `vercel logs --follow`
- Check API health: `curl https://api-jeqjmp909.vercel.app/api/health`

## Environment Variables (Set in Vercel Dashboard)

```
SUPABASE_URL=https://fjusqtpwssycokwobtzj.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-secret-key-here
```

**Never commit these to Git** — Vercel loads from dashboard

## Performance Characteristics

- Frontend: CDN cached, instant worldwide access
- API: Cold start ~1-2s, subsequent calls <200ms
- Backtesting: <2s for 365 candles
- Chart rendering: Smooth 60fps with GSAP animations
- DB queries: Indexed on user_id, symbol, created_at

## Critical Security Points

⚠️ **DO:**
- Use absolute URLs from `CONFIG.API_BASE_URL`
- Check Bearer token before sensitive operations
- Decrypt credentials server-side only
- Filter queries by user.id from token
- Enable RLS on user-scoped tables

⚠️ **DON'T:**
- Expose API keys in frontend code
- Hardcode environment variables
- Use relative API paths
- Skip auth checks
- Merge PRs without testing on Vercel first
