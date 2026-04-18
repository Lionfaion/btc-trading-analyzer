# PHASE 0: Database & Auth Foundation - COMPLETE

## Archivos Creados

### 1. Database Schema
- **`db-schema.sql`** - 6 tablas + indexes + RLS policies
  - users, strategies, candles_ohlcv, trades, analysis_history, bybit_credentials

### 2. API Handlers (Vercel Serverless Functions)
- **`api/db/init.js`** - Supabase client + auth middleware
- **`api/db/strategy.js`** - CRUD para strategies
- **`api/db/trade.js`** - CRUD para trades
- **`api/db/candles.js`** - CRUD para OHLCV data
- **`api/db/analysis.js`** - CRUD para backtest results
- **`api/db/bybit.js`** - Manage Bybit API credentials (encrypted)

### 3. Configuration
- **`vercel.json`** - Updated con env vars schema
- **`.env.local.example`** - Template para desarrollo local

### 4. Documentation
- **`SUPABASE_SETUP.md`** - Step-by-step Supabase setup
- **`api/db/test.http`** - 20 API test cases (REST Client)

---

## Quick Start (5 min)

### 1. Crear Supabase Project
```bash
1. Ir a https://supabase.com/dashboard
2. "New Project" → name: btc-trading-analyzer
3. Copiar URL y API keys
```

### 2. Setup Database
```bash
1. En Supabase → SQL Editor → New Query
2. Copiar contenido de db-schema.sql
3. Click "Run"
```

### 3. Setup Vercel Env Vars
```bash
1. En Vercel dashboard → Settings → Environment Variables
2. Agregar:
   - SUPABASE_URL
   - SUPABASE_ANON_KEY
   - SUPABASE_SERVICE_ROLE_KEY
```

### 4. Test Local
```bash
# Copy template
cp .env.local.example .env.local

# Edit with your Supabase credentials
nano .env.local

# Run
npm install
npm run dev

# Test API (need JWT token from Supabase Auth)
curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:3000/api/db/strategy
```

---

## API Endpoints

Todos requieren header: `Authorization: Bearer <JWT_TOKEN>`

### Strategies
```
GET    /api/db/strategy              # List all
GET    /api/db/strategy?id=UUID      # Get one
POST   /api/db/strategy              # Create
PUT    /api/db/strategy?id=UUID      # Update
DELETE /api/db/strategy?id=UUID      # Delete
```

### Trades
```
GET    /api/db/trade                 # List all
GET    /api/db/trade?strategy_id=UUID # Filter
POST   /api/db/trade                 # Create (calc P&L auto)
PUT    /api/db/trade?id=UUID         # Update
DELETE /api/db/trade?id=UUID         # Delete
```

### Candles (OHLCV)
```
GET    /api/db/candles               # List (symbol, timeframe filters)
POST   /api/db/candles               # Batch insert/upsert
DELETE /api/db/candles               # Delete by symbol/timeframe
```

### Analysis (Backtest Results)
```
GET    /api/db/analysis              # List
GET    /api/db/analysis?strategy_id=UUID # Filter
POST   /api/db/analysis              # Create
DELETE /api/db/analysis?id=UUID      # Delete
```

### Bybit Credentials
```
GET    /api/db/bybit                 # Status only (no secrets)
POST   /api/db/bybit                 # Create
PUT    /api/db/bybit                 # Update/activate
DELETE /api/db/bybit                 # Delete
```

---

## Database Schema Overview

### users
| Field | Type | Notes |
|-------|------|-------|
| id | UUID PK | Generated |
| email | VARCHAR | Unique |
| password_hash | VARCHAR | Via Supabase Auth |
| created_at | TIMESTAMP | Default NOW() |
| updated_at | TIMESTAMP | Default NOW() |

### strategies
| Field | Type | Notes |
|-------|------|-------|
| id | UUID PK | - |
| user_id | UUID FK | users.id |
| name | VARCHAR | Strategy name |
| description | TEXT | Optional |
| entry_condition | JSONB | Entry logic |
| exit_condition | JSONB | Exit logic |
| risk_per_trade | DECIMAL | % or fixed |
| max_open_trades | INT | Default 1 |
| status | VARCHAR | draft/testing/live |

### candles_ohlcv
| Field | Type | Notes |
|-------|------|-------|
| id | UUID PK | - |
| user_id | UUID FK | users.id |
| symbol | VARCHAR | BTCUSDT, ETHUSDT, etc |
| timeframe | VARCHAR | 1h, 4h, 1d |
| open_time | TIMESTAMP | Open timestamp |
| open,high,low,close | DECIMAL | Price data |
| volume | DECIMAL | BTC volume |
| turnover | DECIMAL | USD turnover |

**Unique constraint**: (user_id, symbol, timeframe, open_time)

### trades
| Field | Type | Notes |
|-------|------|-------|
| id | UUID PK | - |
| user_id | UUID FK | - |
| strategy_id | UUID FK | strategies.id |
| entry_time | TIMESTAMP | When opened |
| entry_price | DECIMAL | Entry price |
| exit_time | TIMESTAMP | When closed (null if open) |
| exit_price | DECIMAL | Exit price (null if open) |
| quantity | DECIMAL | BTC quantity |
| pnl | DECIMAL | Auto-calculated |
| pnl_percent | DECIMAL | Auto-calculated |
| status | VARCHAR | open/closed |

### analysis_history
| Field | Type | Notes |
|-------|------|-------|
| id | UUID PK | - |
| user_id | UUID FK | - |
| strategy_id | UUID FK | - |
| backtest_date | TIMESTAMP | When ran |
| total_trades | INT | # trades |
| win_rate | DECIMAL | % |
| profit_factor | DECIMAL | Gross profit / gross loss |
| max_drawdown | DECIMAL | % |
| avg_win, avg_loss | DECIMAL | USD |
| total_pnl | DECIMAL | Net P&L |
| sharpe_ratio | DECIMAL | Risk-adjusted return |
| metadata | JSONB | Custom data |

### bybit_credentials
| Field | Type | Notes |
|-------|------|-------|
| id | UUID PK | - |
| user_id | UUID FK | - |
| api_key_encrypted | VARCHAR | Base64 (upgrade to AES) |
| api_secret_encrypted | VARCHAR | Base64 (upgrade to AES) |
| sandbox_mode | BOOLEAN | Test vs live |
| is_active | BOOLEAN | Whether to use |
| created_at | TIMESTAMP | - |
| updated_at | TIMESTAMP | - |

---

## Security Features

✅ Row-level security (RLS) on all tables
✅ Single-user authentication (one user per Supabase project)
✅ JWT validation on all endpoints
✅ API key encryption (base64 for now, upgrade to AES)
✅ Cascading deletes (deleting strategy deletes trades/analysis)
✅ Input validation on all endpoints
✅ P&L auto-calculation on trades
✅ Unique candle constraint (no duplicates)

---

## Next Steps (PHASE 1)

- Authentication UI (sign up / login)
- Dashboard layout + charts
- Strategy editor / backtest runner
- Real Bybit integration

---

## Troubleshooting

**"SUPABASE_URL is not defined"**
- Verify `SUPABASE_URL` is in `.env.local` or Vercel env vars

**"Unauthorized: Invalid token"**
- Ensure JWT token from Supabase Auth is in request header
- Token expires (check Supabase auth settings for duration)

**"RLS policy denied"**
- Your user_id doesn't match the record's user_id
- Single-user mode: ensure only one authenticated user

**Duplicate candles error**
- Database has unique constraint on (user_id, symbol, timeframe, open_time)
- Use `upsert` (POST) to update existing candles

---

## Testing

Use `api/db/test.http` with:
- VS Code REST Client extension, or
- Postman, or
- curl (command line)

Example:
```bash
curl -X GET http://localhost:3000/api/db/strategy \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiI..."
```

---

**Status**: Phase 0 COMPLETE ✅
All database tables, API endpoints, and auth infrastructure ready for Phase 1.
