# Supabase Setup Guide - PHASE 0

## Step 1: Create Supabase Project

1. Go to [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Click "New Project"
3. Fill in:
   - **Name**: `btc-trading-analyzer`
   - **Database Password**: Save this (you'll need it)
   - **Region**: Choose closest to you
4. Click "Create new project" (takes ~2 min)

## Step 2: Get API Credentials

Once project is created:
1. Go to **Settings → API**
2. Copy these values:
   - **Project URL** → `SUPABASE_URL`
   - **anon public** → `SUPABASE_ANON_KEY`
   - **service_role secret** → `SUPABASE_SERVICE_ROLE_KEY` (optional)

## Step 3: Create Database Schema

1. Go to **SQL Editor** in Supabase
2. Click "New Query"
3. Copy the entire content of `/db-schema.sql` from this repo
4. Paste into the SQL editor
5. Click "Run"

Expected output: All tables created with indexes and RLS policies enabled.

## Step 4: Set Up Authentication (Supabase Auth)

1. Go to **Authentication → Providers**
2. Enable "Email" provider (default enabled)
3. Go to **Authentication → URL Configuration**
4. Set:
   - **Site URL**: `http://localhost:3000` (dev) or your Vercel domain
   - **Redirect URLs**: Add both http://localhost:3000 and your production domain

## Step 5: Add Environment Variables to Vercel

1. Go to [https://vercel.com/dashboard](https://vercel.com/dashboard)
2. Select your "btc-trading-analyzer" project
3. Go to **Settings → Environment Variables**
4. Add three variables:
   ```
   SUPABASE_URL = your_project_url
   SUPABASE_ANON_KEY = your_anon_key
   SUPABASE_SERVICE_ROLE_KEY = your_service_role_key
   ```
5. Click "Save"

## Step 6: Test Database Connection

From your project root:

```bash
npm install
npm run dev
```

Then test the API with:

```bash
curl -X GET http://localhost:3000/api/db/strategy \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Note**: You need a valid JWT token from Supabase Auth to test. Use the Supabase dashboard or sign up via your app.

## Step 7: Enable Row-Level Security (RLS)

RLS is enabled in `db-schema.sql`. Each table has policies that ensure:
- Users can only access their own data
- Single-user mode: Only authenticated user with matching user_id can access

Verify in Supabase:
1. Go to **Authentication → Policies**
2. You should see policies for each table

## Database Schema Overview

| Table | Purpose | Rows |
|-------|---------|------|
| `users` | User accounts (single-user) | 1 |
| `strategies` | Backtesting strategies | N |
| `candles_ohlcv` | 1H OHLCV data from Bybit | Thousands |
| `trades` | Executed trades from backtest | Hundreds |
| `analysis_history` | Backtest results summary | Hundreds |
| `bybit_credentials` | Encrypted API keys | 1 |

## API Endpoints

All endpoints require `Authorization: Bearer <JWT_TOKEN>` header.

### Strategies
- `GET /api/db/strategy` - List strategies
- `GET /api/db/strategy?id=UUID` - Get single strategy
- `POST /api/db/strategy` - Create strategy
- `PUT /api/db/strategy?id=UUID` - Update strategy
- `DELETE /api/db/strategy?id=UUID` - Delete strategy

### Trades
- `GET /api/db/trade` - List trades
- `GET /api/db/trade?strategy_id=UUID` - Filter by strategy
- `POST /api/db/trade` - Create trade
- `PUT /api/db/trade?id=UUID` - Update trade
- `DELETE /api/db/trade?id=UUID` - Delete trade

### Candles
- `GET /api/db/candles?symbol=BTCUSDT&timeframe=1h&limit=100` - Get candles
- `POST /api/db/candles` - Insert/upsert candles
- `DELETE /api/db/candles?symbol=BTCUSDT&timeframe=1h` - Delete candles

### Analysis
- `GET /api/db/analysis` - List backtest results
- `GET /api/db/analysis?strategy_id=UUID` - Filter by strategy
- `POST /api/db/analysis` - Create analysis record
- `DELETE /api/db/analysis?id=UUID` - Delete analysis

### Bybit Credentials
- `GET /api/db/bybit` - Get credentials status (no keys returned)
- `POST /api/db/bybit` - Store API keys (encrypted)
- `PUT /api/db/bybit` - Update credentials or activate
- `DELETE /api/db/bybit` - Delete credentials

## Troubleshooting

### "SUPABASE_URL is not defined"
- Check Vercel environment variables are set
- Run `npm run dev` locally with `.env.local` file containing the credentials

### "Unauthorized: Invalid token"
- Ensure you have a valid JWT from Supabase Auth
- Token should be in header: `Authorization: Bearer <token>`

### "RLS policy denied"
- Verify your user_id matches the record's user_id
- Check RLS policies are enabled on the table

## Security Notes

- Bybit API keys are base64-encoded (demo). Upgrade to proper encryption in production.
- All API endpoints check user ownership via RLS policies.
- Credentials are never returned in API responses (only metadata like created_at, is_active).
- Always use HTTPS in production.
