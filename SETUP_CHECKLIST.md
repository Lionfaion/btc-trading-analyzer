# PHASE 0 Setup Checklist

## 1. Supabase Project Creation [ ]

- [ ] Go to https://supabase.com/dashboard
- [ ] Click "New Project"
- [ ] Enter:
  - Name: `btc-trading-analyzer`
  - Database Password: (save somewhere safe)
  - Region: (pick closest)
- [ ] Wait for project creation (~2 minutes)
- [ ] Go to **Settings → API** and copy:
  - [ ] **Project URL** → save as `SUPABASE_URL`
  - [ ] **anon public key** → save as `SUPABASE_ANON_KEY`
  - [ ] **service_role secret** → save as `SUPABASE_SERVICE_ROLE_KEY`

## 2. Database Schema Setup [ ]

- [ ] In Supabase dashboard, go to **SQL Editor**
- [ ] Click "New Query"
- [ ] Open file: `/db-schema.sql`
- [ ] Copy entire content
- [ ] Paste into Supabase SQL editor
- [ ] Click "Run"
- [ ] Verify: Should see "Success" with no errors
- [ ] Verify tables exist:
  - [ ] users
  - [ ] strategies
  - [ ] candles_ohlcv
  - [ ] trades
  - [ ] analysis_history
  - [ ] bybit_credentials

## 3. Supabase Authentication Setup [ ]

- [ ] In Supabase, go to **Authentication → Providers**
- [ ] Verify "Email" is enabled (should be default)
- [ ] Go to **Authentication → URL Configuration**
- [ ] Set:
  - [ ] **Site URL**: `http://localhost:3000` (for dev)
  - [ ] Add **Redirect URLs**:
    - [ ] `http://localhost:3000`
    - [ ] `http://localhost:3000/auth/callback`
    - [ ] (Add Vercel production domain when you have it)

## 4. Vercel Environment Variables [ ]

- [ ] Go to https://vercel.com/dashboard
- [ ] Select project "btc-trading-analyzer"
- [ ] Go to **Settings → Environment Variables**
- [ ] Add three variables (one by one):
  - [ ] `SUPABASE_URL` = (your copied value from Step 1)
  - [ ] `SUPABASE_ANON_KEY` = (your copied value from Step 1)
  - [ ] `SUPABASE_SERVICE_ROLE_KEY` = (your copied value from Step 1)
- [ ] Click "Save" for each
- [ ] Click "Deploy" to redeploy with new env vars (if auto-deploy not enabled)

## 5. Local Development Setup [ ]

```bash
# In project root:
cp .env.local.example .env.local

# Edit .env.local and paste your Supabase credentials:
# SUPABASE_URL=...
# SUPABASE_ANON_KEY=...
# SUPABASE_SERVICE_ROLE_KEY=...

npm install
npm run dev

# Should start on http://localhost:3000
```

## 6. Test Database Connection [ ]

- [ ] Start dev server: `npm run dev`
- [ ] Sign up for a test account at http://localhost:3000/auth/signup
- [ ] Login at http://localhost:3000/auth/login
- [ ] Get JWT token from browser DevTools:
  - [ ] Open DevTools (F12)
  - [ ] Go to **Network** tab
  - [ ] Make a request to any /api/db endpoint
  - [ ] Look for `Authorization` header in request
  - [ ] Copy the token after "Bearer "

- [ ] Test API with curl:
```bash
curl -X GET http://localhost:3000/api/db/strategy \
  -H "Authorization: Bearer YOUR_JWT_TOKEN_HERE"
```

- [ ] Should return: `{"strategies": [], "count": 0}`

## 7. Test POST (Create Strategy) [ ]

```bash
curl -X POST http://localhost:3000/api/db/strategy \
  -H "Authorization: Bearer YOUR_JWT_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Strategy",
    "entry_condition": {"type": "RSI", "value": 30},
    "exit_condition": {"type": "RSI", "value": 70},
    "risk_per_trade": 1.5
  }'
```

- [ ] Should return: `{"strategy": {...}, "id": "uuid", ...}`
- [ ] Save the UUID returned (you'll need it for next tests)

## 8. Test Other Endpoints [ ]

- [ ] Create candles: `POST /api/db/candles`
- [ ] Create trade: `POST /api/db/trade`
- [ ] Create analysis: `POST /api/db/analysis`
- [ ] Create bybit creds: `POST /api/db/bybit`
- [ ] See `api/db/test.http` for all 20 test cases

## 9. Verify RLS Security [ ]

- [ ] In Supabase, go to **Authentication → Policies**
- [ ] Should see policies for:
  - [ ] users
  - [ ] strategies
  - [ ] candles_ohlcv
  - [ ] trades
  - [ ] analysis_history
  - [ ] bybit_credentials

- [ ] Each should enforce: `auth.uid() = user_id`

## 10. Ready for Phase 1 [ ]

- [ ] All endpoints tested ✓
- [ ] Database schema verified ✓
- [ ] Auth working (sign up/login) ✓
- [ ] Environment variables set ✓
- [ ] RLS policies enabled ✓

## Next: Phase 1 - Frontend & Dashboard

Once complete, move to:
- Authentication UI (sign up, login, logout)
- Dashboard layout
- Chart integration
- Strategy editor
- Backtest runner

---

## Troubleshooting

**Still getting errors?** Check:
1. All env vars in `.env.local` match exactly (copy-paste, no spaces)
2. Supabase project is active (not paused)
3. Database schema ran successfully (check SQL Editor history)
4. RLS policies are enabled
5. Check Supabase logs for errors: **Logs → Database**

**Need help?**
- Supabase docs: https://supabase.com/docs
- Check `SUPABASE_SETUP.md` for detailed steps
- Check `PHASE0_README.md` for API reference
