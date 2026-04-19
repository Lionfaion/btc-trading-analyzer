# Deployment Guide

**Version:** 1.0  
**Last Updated:** 2026-04-18  
**Status:** Production Ready ✅

---

## Table of Contents

1. [Pre-Deployment Checklist](#pre-deployment-checklist)
2. [Vercel Deployment](#vercel-deployment)
3. [Environment Variables](#environment-variables)
4. [Production Configuration](#production-configuration)
5. [Security Hardening](#security-hardening)
6. [Monitoring & Logging](#monitoring--logging)
7. [Troubleshooting](#troubleshooting)

---

## Pre-Deployment Checklist

Before deploying to production, verify all items:

### Code Quality
- ✅ All tests passing (142 tests)
- ✅ Code coverage > 70%
- ✅ No console errors
- ✅ No security vulnerabilities
- ✅ Input validation enabled
- ✅ Rate limiting configured

### Performance
- ✅ Cache implemented and tested
- ✅ Candle pagination working
- ✅ Indicators cached
- ✅ Memory usage < 100MB baseline
- ✅ Response time targets met

### UX/Features
- ✅ Dark/light mode working
- ✅ Mobile responsive (< 768px)
- ✅ Spanish error messages
- ✅ Offline mode functional
- ✅ Fallback data available

### Documentation
- ✅ API documentation complete
- ✅ JSDoc comments added
- ✅ README updated
- ✅ Deployment guide ready

### Security
- ✅ Security headers configured
- ✅ Input validation enabled
- ✅ Rate limiting active
- ✅ CORS properly configured
- ✅ No API keys in code

---

## Vercel Deployment

### Step 1: Connect Repository

```bash
# Login to Vercel
vercel login

# Link project to Vercel
vercel link
```

### Step 2: Configure vercel.json

File: `vercel.json` (already created)

```json
{
  "version": 2,
  "builds": [
    {
      "src": "server.js",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/api/(.*)",
      "dest": "server.js"
    },
    {
      "src": "/(.*)",
      "dest": "index.html"
    }
  ],
  "env": {
    "NODE_ENV": "production"
  },
  "headers": [
    {
      "source": "/api/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=300"
        }
      ]
    }
  ]
}
```

### Step 3: Set Environment Variables

```bash
# In Vercel Dashboard:
# 1. Go to Project Settings → Environment Variables
# 2. Add variables (see next section)

# Or via CLI:
vercel env add NODE_ENV production
vercel env add RATE_LIMIT_PER_MINUTE 100
```

### Step 4: Deploy

```bash
# Deploy to production
vercel --prod

# Preview deployment before production
vercel

# View deployment logs
vercel logs <url>
```

---

## Environment Variables

### Development (.env.local)
```
NODE_ENV=development
DEBUG=true
RATE_LIMIT_PER_MINUTE=1000
API_TIMEOUT=30000
CACHE_TTL=300000
```

### Production (.env production in Vercel)
```
NODE_ENV=production
DEBUG=false
RATE_LIMIT_PER_MINUTE=100
API_TIMEOUT=10000
CACHE_TTL=300000
CORS_ORIGIN=https://btc-analyzer.vercel.app
```

### Using Environment Variables

```javascript
// api/server.js
const rateLimit = process.env.RATE_LIMIT_PER_MINUTE || 100;
const timeout = process.env.API_TIMEOUT || 10000;
const corsOrigin = process.env.CORS_ORIGIN || 'http://localhost:3000';

if (process.env.NODE_ENV === 'production') {
  // Production-only config
}
```

---

## Production Configuration

### Security Headers

Automatically enabled in production (see `api/middleware/security-headers.js`):

```
Content-Security-Policy: default-src 'self'; ...
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Strict-Transport-Security: max-age=31536000
```

### Rate Limiting

Enabled by default (100 req/min per IP):

```javascript
const rateLimiter = new RateLimiter({
  requestsPerMinute: process.env.RATE_LIMIT_PER_MINUTE || 100,
  windowMs: 60000
});
```

### CORS Configuration

```javascript
const cors = require('cors');

const corsOptions = {
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));
```

### Cache Configuration

```javascript
// API responses cached with TTL
const CACHE_TTL = process.env.CACHE_TTL || 300000; // 5 minutes
const cache = new CacheManager(CACHE_TTL);
```

---

## Security Hardening

### 1. Input Validation

All API endpoints validate parameters:

```javascript
const validator = new InputValidator();
const rules = {
  symbol: {
    required: true,
    validator: InputValidator.validateSymbol,
    errorMessage: 'Invalid symbol'
  }
};
```

### 2. Rate Limiting

Prevent abuse with per-IP limits:

```
Header: X-RateLimit-Limit: 100
Header: X-RateLimit-Remaining: 95
Header: X-RateLimit-Reset: 2026-04-18T10:31:00Z
```

### 3. Security Headers

Implemented via `securityHeadersMiddleware()`:
- CSP (Content Security Policy)
- X-Content-Type-Options: nosniff
- X-Frame-Options: DENY
- HSTS (HTTPS only in production)
- Permissions-Policy

### 4. Error Handling

Safe error responses without exposing internals:

```json
{
  "success": false,
  "error": "Parámetros inválidos",
  "details": ["symbol is required"]
}
```

Never expose:
- Stack traces
- File paths
- Internal error details
- API keys or secrets

---

## Monitoring & Logging

### View Deployment Logs

```bash
# Real-time logs
vercel logs <project-url> --follow

# Last 100 lines
vercel logs <project-url> --tail

# Filter by path
vercel logs <project-url> --path=/api/candles
```

### Application Logging

In production, monitor:

```javascript
// In error handler:
console.error(`❌ [${context}]`, {
  timestamp: new Date().toISOString(),
  context,
  status: error.status,
  message: error.message
});

// Rate limit violations:
console.warn(`⚠️ Rate limit exceeded: ${ip}`);

// Cache stats:
const stats = globalCache.getStats();
console.log(`📊 Cache: ${stats.entries} entries, ${stats.memory} bytes`);
```

### Performance Monitoring

Track key metrics:

```javascript
// Measure API response time
const start = performance.now();
const result = await apiCall();
const duration = performance.now() - start;

if (duration > 500) {
  console.warn(`⚠️ Slow API: ${duration}ms`);
}
```

### Uptime Monitoring

Configure external monitoring:

1. **Uptime Robot** (uptime.com)
   - Monitor `/health` endpoint
   - Alert if down > 5 minutes

2. **Status Page** (statuspage.io)
   - Public status dashboard
   - Incident reporting

---

## Rollback Procedure

If deployment fails:

```bash
# View deployment history
vercel list

# Rollback to previous version
vercel rollback <deployment-id>

# Or redeploy from git
git checkout <working-commit>
vercel --prod
```

---

## Performance Optimization

### 1. Enable Caching

```
Cache-Control: public, max-age=300
```

### 2. Compression

Vercel automatically enables gzip compression.

### 3. Edge Caching

```json
{
  "headers": [
    {
      "source": "/api/candles",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=300"
        }
      ]
    }
  ]
}
```

### 4. Connection Pooling

Already handled by Vercel's Node.js runtime.

---

## Testing in Production

### Smoke Test

```bash
curl https://btc-analyzer.vercel.app/api/health
# Should return: {"status":"ok"}
```

### API Test

```bash
curl https://btc-analyzer.vercel.app/api/candles?symbol=BTC&limit=10
# Should return candle data or fallback
```

### Rate Limit Test

```bash
# Make 101 requests (should fail on 101st)
for i in {1..101}; do
  curl https://btc-analyzer.vercel.app/api/candles?symbol=BTC
done
# Last request should return 429 Too Many Requests
```

---

## Troubleshooting

### Issue: 502 Bad Gateway

**Symptoms:** "Bad Gateway" errors in browser

**Diagnosis:**
```bash
# Check deployment status
vercel list
vercel status <project-url>
```

**Solution:**
1. Check function timeout (default 60s)
2. Verify environment variables
3. Rollback to previous version

### Issue: High Memory Usage

**Symptoms:** Function timeout, memory exceeded

**Diagnosis:**
```javascript
// Monitor memory in logs
const stats = globalCache.getStats();
console.log(`Memory: ${stats.memory / 1024 / 1024}MB`);
```

**Solution:**
1. Reduce cache TTL
2. Implement aggressive cleanup
3. Monitor for memory leaks

### Issue: Rate Limiting Too Aggressive

**Symptoms:** Users getting 429 errors frequently

**Solution:**
```javascript
// Increase limit in .env
RATE_LIMIT_PER_MINUTE=200
```

### Issue: CORS Errors

**Symptoms:** "Cross-Origin Request Blocked"

**Diagnosis:**
```javascript
// Check CORS config
console.log(`CORS Origin: ${process.env.CORS_ORIGIN}`);
```

**Solution:**
1. Verify CORS_ORIGIN environment variable
2. Check Vercel deployment URL matches

---

## Post-Deployment

### 1. Monitor Metrics

- ✅ Response times
- ✅ Error rates
- ✅ Cache hit ratio
- ✅ Memory usage
- ✅ Request volume

### 2. User Feedback

- Monitor error reports
- Track user sessions
- Check performance feedback

### 3. Regular Maintenance

- Weekly log review
- Monthly performance analysis
- Quarterly security audit

---

## Disaster Recovery

### Backup Strategy

```bash
# Backup database (if using Supabase)
pg_dump <connection-string> > backup.sql

# Store in S3 or GitHub
git add backup.sql
git commit -m "Backup: $(date)"
```

### Recovery Plan

1. **If deployment fails:**
   - Rollback to previous version
   - Check deployment logs
   - Fix issue and redeploy

2. **If data corrupted:**
   - Restore from backup
   - Verify data integrity
   - Notify users if needed

3. **If under attack:**
   - Increase rate limits temporarily
   - Enable stricter rate limiting
   - Block suspicious IPs

---

## Production Checklist (Final)

- [ ] All tests passing
- [ ] Environment variables set
- [ ] Security headers enabled
- [ ] Rate limiting active
- [ ] Caching working
- [ ] CORS configured
- [ ] Monitoring set up
- [ ] Health check endpoint working
- [ ] Error logging enabled
- [ ] Smoke tests passing
- [ ] Team notified of deployment
- [ ] Rollback plan documented

---

**Deployment Guide v1.0**  
**Status: Ready for Production** ✅  
**Last Updated:** 2026-04-18
