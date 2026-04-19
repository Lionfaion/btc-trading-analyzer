# Supabase Setup Guide

**FASE 7.0 Database Foundation - Quick Start**

---

## Step 1: Create Supabase Account & Project

1. Go to [supabase.com](https://supabase.com)
2. Sign up or log in
3. Create a new project:
   - **Name:** btc-trading-analyzer
   - **Database Password:** (save securely)
   - **Region:** Choose closest to your location

4. Wait for database to initialize (2-3 minutes)

---

## Step 2: Create Database Schema

1. In Supabase dashboard, go to **SQL Editor**
2. Open new query tab
3. Copy entire content from `db-schema.sql` in project root
4. Paste into SQL Editor
5. Click **Run**

✅ Tables created: strategies, trades, candles_ohlcv, analysis_history, bybit_credentials

---

## Step 3: Get Connection String

1. Go to **Settings → Database**
2. Find **Connection String** section
3. Copy the "Nodejs" connection string:
   ```
   postgresql://postgres.[project-id]:[password]@aws-0-[region].db.supabase.co:5432/postgres
   ```

4. Add to `.env.local`:
   ```
   SUPABASE_URL=https://[project-id].supabase.co
   SUPABASE_ANON_KEY=[copy from Settings → API Keys → anon]
   SUPABASE_SERVICE_KEY=[copy from Settings → API Keys → service_role]
   DATABASE_URL=postgresql://...
   ```

---

## Step 4: Get API Keys

1. In Supabase, go to **Settings → API**
2. Copy **Project URL** (e.g., `https://abc123.supabase.co`)
3. Copy **anon public** key
4. Copy **service_role** key

Add to `.env.local`:
```
SUPABASE_URL=https://abc123.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOi...
SUPABASE_SERVICE_KEY=eyJhbGciOi...
```

---

## Step 5: Enable Auth (Optional for multi-user)

1. In Supabase, go to **Authentication → Providers**
2. Enable **Email** (already enabled by default)
3. Go to **Settings → Auth**
4. Configure:
   - **Site URL:** `http://localhost:3000` (dev) or your production URL
   - **Redirect URLs:** `http://localhost:3000/auth/callback`

---

## Step 6: Test Connection

Run in terminal:
```bash
npm test -- __tests__/supabase-connection.test.js
```

Or test manually via API:
```bash
curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
```

Expected response:
```json
{
  "success": true,
  "user": { "id": "...", "email": "test@example.com" },
  "session": { "accessToken": "...", "refreshToken": "..." }
}
```

---

## Step 7: Update Vercel Environment Variables

1. Go to Vercel project settings
2. Add environment variables:
   ```
   SUPABASE_URL=https://...
   SUPABASE_ANON_KEY=eyJ...
   SUPABASE_SERVICE_KEY=eyJ...
   ```

3. Redeploy: `vercel --prod`

---

## Troubleshooting

### Error: "CORS policy"
- Add your domain to Supabase **Settings → API → CORS**
- Example: `http://localhost:3000`

### Error: "Authentication failed"
- Verify SUPABASE_ANON_KEY is correct
- Check Supabase is accessible: `curl https://[project-id].supabase.co`

### Error: "Table not found"
- Verify db-schema.sql ran successfully
- Check Supabase SQL Editor → Run again

### Error: "Row Level Security (RLS) policy"
- If getting 403 on queries, RLS policies need adjustment
- For demo mode, disable RLS: `ALTER TABLE [table] DISABLE ROW LEVEL SECURITY;`

---

## Next Steps

1. ✅ Frontend integration (save analysis to DB)
2. ✅ Trade history UI
3. ✅ Strategy management UI
4. ✅ Tests for DB endpoints
5. ✅ User dashboard

See `PHASE-7-DATABASE-FOUNDATION.md` for full plan.

---

**Supabase Documentation:** https://supabase.com/docs
