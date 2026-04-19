# Phase 3B - Quick Reference Card

## 🔑 Environment Variables
```
SUPABASE_URL=https://[project].supabase.co
SUPABASE_SERVICE_ROLE_KEY=[service-role-key]
CRON_SECRET=[optional]
```

## 🚀 Deployment
```bash
vercel deploy          # Deploy to Vercel
vercel dev            # Test locally
```

## 📊 Database Setup
```
1. Open Supabase SQL Editor
2. Copy db-schema.sql
3. Execute all statements
4. Verify automation_jobs table created
```

## 🔑 Get Bearer Token
```javascript
// In browser console after login:
localStorage.getItem('sb-token')
```

## 🌐 10 Critical Endpoints

### Connection
```
POST /api/bybit/connect
  Body: {apiKey, apiSecret, isTestnet}
  Returns: {success, balance, testnet}
```

### Status & Balance
```
GET /api/bybit/status      → {connected, balance}
GET /api/bybit/balance     → {totalBalance, coins}
GET /api/bybit/positions   → {positions, count}
```

### Orders
```
POST /api/bybit/place-order
  Body: {symbol, side, qty, slPercent?, tpPercent?}
  Returns: {orderId, entryPrice, stopLoss, takeProfit}

POST /api/bybit/cancel-order
  Body: {symbol, orderId}

POST /api/bybit/close-position
  Body: {symbol, side}
  Returns: {orderId, exitPrice, pnl}
```

### Automation
```
POST /api/automation/enable
  Body: {strategyId, symbol}

POST /api/automation/disable
  Body: {strategyId, symbol}

GET /api/db/automation-jobs
  Returns: {automations: [{strategy_id, symbol, is_active, last_run}]}
```

## 📱 Frontend Components

| Component | File | Purpose |
|-----------|------|---------|
| Header | `ui/header.js` | Balance + status badge |
| Bybit Panel | `ui/bybit-panel.js` | Connect form |
| Dashboard | `ui/trading-dashboard.js` | Positions list |
| Automations | `ui/automation-manager.js` | Enable/disable jobs |

## 🔒 All Endpoints Require Bearer Token
```
-H "Authorization: Bearer $TOKEN"
```

## ⏰ Scheduler Details
- **Trigger:** Vercel Cron `0 * * * *`
- **File:** `/api/automation/scheduler.js`
- **Function:** Executes all active automation jobs hourly
- **Check:** Vercel logs → `vercel logs --follow`

## 📋 Testing Sequence

1. **Database:** Run db-schema.sql in Supabase
2. **Deploy:** `vercel deploy`
3. **Connect:** Test `POST /api/bybit/connect`
4. **Status:** Verify `GET /api/bybit/status` returns connected
5. **Balance:** Check `GET /api/bybit/balance`
6. **Position:** Test `POST /api/bybit/place-order`
7. **Automation:** Enable via `POST /api/automation/enable`
8. **Schedule:** Wait for hourly run or manually trigger scheduler
9. **Verify:** Check `trades` table in Supabase for new records

## 🐛 Common Issues

| Issue | Fix |
|-------|-----|
| "No autenticado" | Check localStorage has `sb-token` |
| "Credenciales no configuradas" | POST `/api/bybit/connect` first |
| Scheduler not running | Deploy to Vercel, check logs |
| Orders not executing | Check balance, verify API permissions |

## 📂 Documentation Files

- **INTEGRATION-GUIDE.md** - Complete API reference with examples
- **TESTING-GUIDE.md** - Full testing guide with cURL commands
- **PHASE-3B-COMPLETE.md** - Detailed completion summary
- **PHASE-3B-SUMMARY.md** - Changelog and architecture

## 🔍 Critical Files

### Backend
- `api/automation/scheduler.js` - Hourly executor
- `api/bybit/connect.js` - Credential validation
- `lib/api-client.js` - API utility functions

### Frontend
- `ui/automation-manager.js` - Automation control UI
- `ui/header.js` - Balance display
- `lib/api-client.js` - Centralized API calls

### Config
- `db-schema.sql` - Database schema
- `vercel.json` - Cron configuration
- `TESTING-GUIDE.md` - Complete testing instructions

## 🧪 Quick Test (cURL)

```bash
export TOKEN="your-bearer-token-here"

# Connect Bybit
curl -X POST https://your-domain.com/api/bybit/connect \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"apiKey":"key","apiSecret":"secret","isTestnet":true}'

# Check status
curl -H "Authorization: Bearer $TOKEN" \
  https://your-domain.com/api/bybit/status

# Get balance
curl -H "Authorization: Bearer $TOKEN" \
  https://your-domain.com/api/bybit/balance

# Place order
curl -X POST https://your-domain.com/api/bybit/place-order \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"symbol":"BTCUSDT","side":"Buy","qty":0.01}'
```

## 💡 Key Concepts

- **Bearer Token:** From Supabase auth, passed in Authorization header
- **Encryption:** API keys encrypted before DB storage, decrypted server-side
- **Isolation:** RLS policies ensure users only see their own data
- **Scheduler:** Vercel Cron triggers `/api/automation/scheduler` hourly
- **RSI Signal:** BUY when RSI<30, SELL when RSI>70
- **Trade Tracking:** All orders saved to `trades` table with entry/exit prices

## 📈 Next Steps

1. Deploy to Vercel: `vercel deploy`
2. Test with Bybit testnet account
3. Enable automation for a strategy
4. Wait for scheduler (next hour mark)
5. Verify trades in database
6. Move to Phase 4 (Charts & Indicators)

---

**Phase 3B Status:** ✅ COMPLETE  
**Ready for:** Production testing  
**Date:** 2026-04-18
