# Phase 3B - Testing & Setup Guide

Complete guide to test and deploy the Bybit trading automation system.

---

## 🚀 Prerequisites

1. **Supabase Account**
   - Project created and running
   - PostgreSQL database accessible

2. **Bybit Account**
   - Testnet account recommended first
   - API keys generated with appropriate permissions

3. **Environment Setup**
   - `.env.local` or Vercel env vars configured:
     ```
     SUPABASE_URL=https://[project].supabase.co
     SUPABASE_SERVICE_ROLE_KEY=[service-role-key]
     CRON_SECRET=[optional-secret-for-cron]
     ```

4. **Node.js & Dependencies**
   ```bash
   npm install
   # or
   yarn install
   ```

---

## 📋 Step-by-Step Setup

### Step 1: Deploy Database Schema

1. Open Supabase SQL Editor
2. Copy and paste contents of `db-schema.sql`
3. Execute all statements
4. Verify tables created:
   - `strategies` ✓
   - `candles_ohlcv` ✓
   - `trades` ✓
   - `bybit_credentials` ✓
   - `automation_jobs` ✓ (NEW)

### Step 2: Deploy to Vercel

```bash
vercel deploy
```

Verify:
- Environment variables are set
- `vercel.json` has cron configuration
- Cron endpoint accessible at `/api/automation/scheduler`

### Step 3: Test Local Connection (Optional)

```bash
npm run dev
# or
vercel dev
```

Then test endpoints locally (see cURL section below).

---

## 🔑 Get Bearer Token

Required for testing all endpoints.

### From Supabase Admin Panel

1. Go to **Authentication** → **Users**
2. Select a user
3. Copy their **Supabase ID** (UUID)
4. Generate token: Use Supabase JS client or export from browser console

### From Browser

After logging in via UI:
```javascript
// In browser console
const token = localStorage.getItem('sb-token');
console.log(token);  // Copy this value
```

Use this token in all cURL requests as `$TOKEN`.

---

## 🧪 API Testing with cURL

Replace `$TOKEN` with your actual Bearer token.

### 1. Connect Bybit Account

**Endpoint:** `POST /api/bybit/connect`

```bash
curl -X POST https://your-domain.com/api/bybit/connect \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "apiKey": "your_bybit_api_key",
    "apiSecret": "your_bybit_api_secret",
    "isTestnet": true
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Conectado a Bybit",
  "balance": 1000.50,
  "testnet": true
}
```

### 2. Check Connection Status

**Endpoint:** `GET /api/bybit/status`

```bash
curl -H "Authorization: Bearer $TOKEN" \
  https://your-domain.com/api/bybit/status
```

**Expected Response:**
```json
{
  "connected": true,
  "balance": 1000.50,
  "testnet": true,
  "message": "Conectado"
}
```

### 3. Get Account Balance

**Endpoint:** `GET /api/bybit/balance`

```bash
curl -H "Authorization: Bearer $TOKEN" \
  https://your-domain.com/api/bybit/balance
```

**Expected Response:**
```json
{
  "success": true,
  "totalWalletBalance": 1000.50,
  "totalAvailableBalance": 950.00,
  "coins": [
    {
      "coin": "USDT",
      "walletBalance": 1000.50,
      "availableBalance": 950.00,
      "unrealizedPnL": 0
    }
  ]
}
```

### 4. Get Open Positions

**Endpoint:** `GET /api/bybit/positions`

```bash
curl -H "Authorization: Bearer $TOKEN" \
  https://your-domain.com/api/bybit/positions
```

**Expected Response:**
```json
{
  "success": true,
  "positions": [
    {
      "symbol": "BTCUSDT",
      "side": "Buy",
      "size": "0.01",
      "entryPrice": "65000",
      "currentPrice": "65500",
      "unrealizedPnL": "5",
      "unrealizedPnLPercent": "0.77"
    }
  ],
  "count": 1,
  "testnet": true
}
```

### 5. Enable Automation

**Endpoint:** `POST /api/automation/enable`

```bash
curl -X POST https://your-domain.com/api/automation/enable \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "strategyId": "strategy-uuid-here",
    "symbol": "BTCUSDT"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Automatización activada para BTCUSDT"
}
```

### 6. Place Order Manually

**Endpoint:** `POST /api/bybit/place-order`

```bash
curl -X POST https://your-domain.com/api/bybit/place-order \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "symbol": "BTCUSDT",
    "side": "Buy",
    "qty": 0.01,
    "slPercent": 2,
    "tpPercent": 5
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "orderId": "order-id-123",
  "symbol": "BTCUSDT",
  "side": "Buy",
  "qty": 0.01,
  "entryPrice": "65000",
  "stopLoss": "63700",
  "takeProfit": "68250",
  "message": "Orden colocada en testnet"
}
```

### 7. Close Position

**Endpoint:** `POST /api/bybit/close-position`

```bash
curl -X POST https://your-domain.com/api/bybit/close-position \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "symbol": "BTCUSDT",
    "side": "Buy"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "orderId": "order-id-456",
  "symbol": "BTCUSDT",
  "side": "Sell",
  "qty": "0.01",
  "exitPrice": "65500",
  "pnl": "5.00",
  "pnlPercent": "0.77",
  "message": "Posición cerrada exitosamente"
}
```

### 8. Get Active Automations

**Endpoint:** `GET /api/db/automation-jobs`

```bash
curl -H "Authorization: Bearer $TOKEN" \
  https://your-domain.com/api/db/automation-jobs
```

**Expected Response:**
```json
{
  "success": true,
  "automations": [
    {
      "id": "uuid",
      "strategy_id": "strategy-uuid",
      "symbol": "BTCUSDT",
      "is_active": true,
      "last_run": "2026-04-18T14:00:00Z",
      "created_at": "2026-04-18T12:00:00Z"
    }
  ]
}
```

### 9. Disable Automation

**Endpoint:** `POST /api/automation/disable`

```bash
curl -X POST https://your-domain.com/api/automation/disable \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "strategyId": "strategy-uuid-here",
    "symbol": "BTCUSDT"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Automatización desactivada para BTCUSDT"
}
```

---

## 📱 Frontend Testing Checklist

### Header Component
- [ ] Balance displays correctly in header
- [ ] Balance updates every 5 minutes
- [ ] Connection badge shows "Conectado" or "Desconectado"
- [ ] Badge pulses when connected (GSAP animation)

### Bybit Panel
- [ ] Form accepts API key and secret
- [ ] Testnet checkbox toggles
- [ ] "Conectar Bybit" button submits form
- [ ] Success toast appears after connection
- [ ] Balance displays in toast
- [ ] Connection badge updates in header

### Trading Dashboard
- [ ] "Conectar Bybit" button visible
- [ ] Clicking button calls `/api/bybit/status`
- [ ] Positions load and display
- [ ] P&L shows green for profit, red for loss
- [ ] No errors in browser console

### Automation Manager
- [ ] "Activar Automatización" button visible
- [ ] Clicking shows modal form
- [ ] Strategy dropdown populated
- [ ] Symbol dropdown shows options
- [ ] Form submission enables automation
- [ ] Active automations list shows
- [ ] "Desactivar" button works

---

## ⏰ Scheduler Testing

### Local Testing (Vercel Dev)

1. Start local server: `vercel dev`
2. Manually trigger scheduler:
   ```bash
   curl -X POST http://localhost:3000/api/automation/scheduler \
     -H "Authorization: Bearer your-cron-secret"
   ```
3. Check response for executed jobs
4. Verify `last_run` updated in `automation_jobs` table

### Production Testing (After Deploy)

1. Enable automation job via UI or cURL
2. Wait for next hour mark (or check logs)
3. Check Vercel logs:
   ```
   vercel logs --follow
   ```
4. Verify in Supabase:
   - `automation_jobs` table has `last_run` timestamp updated
   - New trades created in `trades` table
   - No errors in logs

---

## 🔒 Security Checklist

- [ ] No API keys exposed in logs
- [ ] Bearer tokens required on all endpoints
- [ ] Credentials encrypted in database
- [ ] User data isolated via RLS
- [ ] `.env` file never committed
- [ ] Rate limiting implemented (optional)

---

## 🐛 Troubleshooting

### "No autenticado" Error

**Cause:** Missing or invalid Bearer token

**Fix:**
1. Ensure user is logged in
2. Check localStorage has `sb-token`
3. Verify token format: `Bearer eyJhbGc...`

### "Credenciales no configuradas" Error

**Cause:** User hasn't connected Bybit account

**Fix:**
1. Navigate to Bybit panel
2. Enter API key and secret
3. Click "Conectar Bybit"
4. Wait for success toast

### "Strategy not found" Error

**Cause:** Strategy doesn't exist or belongs to different user

**Fix:**
1. Create strategy first in Strategy Manager
2. Use correct strategy UUID
3. Ensure using same user token

### Scheduler Not Running

**Cause:** Not deployed to Vercel or cron not configured

**Fix:**
1. Check `vercel.json` has cron config
2. Deploy to Vercel: `vercel deploy`
3. Check Vercel logs for errors
4. Manually trigger endpoint to test

### Orders Not Executing

**Cause:** Insufficient balance, API permissions, or testnet not set

**Fix:**
1. Check balance in Bybit dashboard
2. Verify API key has trading permissions
3. Ensure `is_testnet` matches account type
4. Test with small quantity first (0.001)

---

## 📊 Verifying Data Persistence

### Check Trades Table

```sql
SELECT * FROM trades 
WHERE user_id = 'your-user-uuid'
ORDER BY created_at DESC
LIMIT 10;
```

Should show:
- entry_price, exit_price, quantity
- entry_time, exit_time
- source = 'manual' or 'automated'
- pnl and pnl_percent calculated

### Check Automation Jobs

```sql
SELECT * FROM automation_jobs 
WHERE user_id = 'your-user-uuid';
```

Should show:
- is_active = true for enabled jobs
- last_run updated after each execution
- strategy_id and symbol match

---

## 🎯 Full End-to-End Test Flow

### 1. Setup (10 min)
- [ ] Verify database schema deployed
- [ ] Environment variables set
- [ ] Deploy to Vercel

### 2. Connection Test (5 min)
- [ ] POST `/api/bybit/connect` with testnet keys
- [ ] Verify balance returned > 0
- [ ] Check credentials in DB (encrypted)

### 3. Manual Trading (10 min)
- [ ] POST `/api/bybit/place-order` to open position
- [ ] GET `/api/bybit/positions` to verify position
- [ ] POST `/api/bybit/close-position` to close

### 4. Automation Test (60+ min)
- [ ] Create strategy with RSI params
- [ ] POST `/api/automation/enable`
- [ ] Wait for next hour
- [ ] Verify `/api/automation/scheduler` executed
- [ ] Check new trades in database
- [ ] Verify order in Bybit dashboard

### 5. Frontend Verification (10 min)
- [ ] Balance displays in header
- [ ] Positions show in dashboard
- [ ] Automation list shows active jobs
- [ ] Toast notifications work

---

## 📞 Support

If tests fail:
1. Check error message for specific issue
2. Review relevant cURL example above
3. Check Vercel logs: `vercel logs`
4. Check Supabase logs in dashboard
5. Verify environment variables set correctly

---

**Last Updated:** 2026-04-18  
**Status:** Ready for Testing  
**Phase:** 3 Part B
