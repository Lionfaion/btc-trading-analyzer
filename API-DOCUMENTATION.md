# API Documentation

**Version:** 1.0  
**Base URL:** `http://localhost:3000/api` (development) | `https://btc-analyzer.vercel.app/api` (production)  
**Authentication:** None required (demo mode)

---

## Overview

Complete REST API documentation for BTC Trading Analyzer with all endpoints, parameters, responses, and error codes in Spanish and English.

---

## Base Endpoints

### Health Check
```
GET /health
```

Returns API health status.

**Response (200):**
```json
{
  "status": "ok",
  "version": "1.0",
  "timestamp": "2026-04-18T10:30:00Z"
}
```

---

## Candles (OHLCV Data)

### Get Candlestick Data
```
GET /candles
```

Fetch candlestick data with pagination and caching.

**Query Parameters:**
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `symbol` | string | Yes | - | Asset symbol (BTC, ETH, SOL, XRP, ADA, DOGE, MATIC, AVAX) |
| `timeframe` | string | No | 1h | Timeframe (1m, 5m, 15m, 1h, 4h, 1d, 1w, 1M) |
| `limit` | number | No | 100 | Number of candles (max 500) |
| `offset` | number | No | 0 | Pagination offset |

**Example Request:**
```
GET /candles?symbol=BTC&timeframe=1h&limit=100&offset=0
```

**Response (200):**
```json
{
  "success": true,
  "symbol": "BTC",
  "timeframe": "1h",
  "candles": [
    {
      "time": 1713429600,
      "open": 67000,
      "high": 67500,
      "low": 66800,
      "close": 67200,
      "volume": 1500000000
    }
  ],
  "cached": true,
  "cacheAge": 120,
  "pageInfo": {
    "offset": 0,
    "limit": 100,
    "total": 2500
  }
}
```

**Error Response (400):**
```json
{
  "success": false,
  "error": "Símbolo inválido",
  "details": ["symbol must be BTC, ETH, SOL, etc."]
}
```

**Error Response (429):**
```json
{
  "success": false,
  "error": "Demasiadas solicitudes",
  "retryAfter": 45,
  "message": "Rate limit exceeded. Reset at 2026-04-18T10:32:00Z"
}
```

---

## Prices

### Get Current Prices
```
GET /price
```

Fetch current asset prices.

**Query Parameters:**
| Parameter | Type | Required | Default |
|-----------|------|----------|---------|
| `symbol` | string | Yes | - |

**Example Request:**
```
GET /price?symbol=BTCUSDT
```

**Response (200):**
```json
{
  "success": true,
  "symbol": "BTC",
  "price": 67234.50,
  "timestamp": "2026-04-18T10:30:00Z",
  "source": "CoinGecko"
}
```

**Fallback Response (503 - API unavailable):**
```json
{
  "success": false,
  "error": "Error del servidor",
  "price": 67234.50,
  "demo": true,
  "message": "Using fallback demo data (API unavailable)"
}
```

---

## Liquidations

### Get Liquidation Data
```
GET /liquidations
```

Fetch liquidation data for technical analysis.

**Query Parameters:**
| Parameter | Type | Required | Default |
|-----------|------|----------|---------|
| `symbol` | string | Yes | - |
| `limit` | number | No | 50 |

**Example Request:**
```
GET /liquidations?symbol=BTC&limit=20
```

**Response (200):**
```json
{
  "success": true,
  "symbol": "BTC",
  "liquidations": [
    {
      "side": "long",
      "volume": 425000000,
      "price": 67200,
      "timestamp": "2026-04-18T10:25:00Z"
    },
    {
      "side": "short",
      "volume": 380000000,
      "price": 67300,
      "timestamp": "2026-04-18T10:20:00Z"
    }
  ],
  "totalVolume": 805000000,
  "cached": true
}
```

---

## Analysis

### Order Flow Analysis
```
POST /analysis/order-flow
```

Analyze order flow and identify trading signals.

**Request Body:**
```json
{
  "symbol": "BTC",
  "price": 67234,
  "liquidations": [
    {
      "side": "long",
      "volume": 425000000,
      "price": 67200
    }
  ]
}
```

**Response (200):**
```json
{
  "success": true,
  "analysis": {
    "trappedLongs": "Alta concentración de longs liquidados entre 67000-67200",
    "trappedShorts": "Shorts acumulados a 67300, vulnerable a squeeze",
    "liquidityVoids": "Falta de volumen entre 67500-67800",
    "signal": "BUY",
    "confidence": 0.78,
    "riskLevel": "media"
  },
  "cached": false,
  "timestamp": "2026-04-18T10:30:00Z"
}
```

**Error Response (400):**
```json
{
  "success": false,
  "error": "Parámetros inválidos",
  "details": ["price must be a number", "liquidations must be an array"]
}
```

---

## HTTP Status Codes

| Code | Meaning | Spanish | Retry? |
|------|---------|---------|--------|
| 200 | OK | Éxito | - |
| 400 | Bad Request | Solicitud inválida | No |
| 401 | Unauthorized | No autorizado | No |
| 404 | Not Found | No encontrado | No |
| 408 | Request Timeout | Tiempo agotado | Yes* |
| 429 | Too Many Requests | Demasiadas solicitudes | Yes* |
| 500 | Internal Server Error | Error interno | Yes |
| 502 | Bad Gateway | Puerta de enlace incorrecta | Yes |
| 503 | Service Unavailable | Servicio no disponible | Yes |
| 504 | Gateway Timeout | Tiempo de puerta agotado | Yes |

*\*Automatically retried with exponential backoff*

---

## Response Headers

| Header | Value | Description |
|--------|-------|-------------|
| `X-Cache` | HIT/MISS | Cache status |
| `X-RateLimit-Limit` | 100 | Requests allowed per minute |
| `X-RateLimit-Remaining` | 95 | Requests remaining |
| `X-RateLimit-Reset` | ISO 8601 | When limit resets |
| `Content-Type` | application/json | Response format |
| `Content-Security-Policy` | ... | Security policy |
| `X-Content-Type-Options` | nosniff | Prevent MIME sniffing |
| `X-Frame-Options` | DENY | Prevent clickjacking |

---

## Error Messages (Spanish)

All error responses include Spanish user messages:

```json
{
  "success": false,
  "error": "Mensaje de error en español",
  "code": "ERROR_CODE",
  "details": ["details if applicable"]
}
```

**Common Messages:**
- "Parámetros inválidos" - Invalid parameters
- "Demasiadas solicitudes" - Rate limit exceeded
- "Error de conexión" - Connection error
- "Tiempo agotado" - Timeout
- "Error del servidor" - Server error
- "Sin conexión a internet" - Offline
- "Datos inválidos recibidos" - Invalid data format

---

## Rate Limiting

**Limits:**
- **100 requests per minute** per IP address
- Resets every minute

**Headers Returned:**
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 2026-04-18T10:31:00Z
```

**When Limit Exceeded (429):**
```json
{
  "success": false,
  "error": "Demasiadas solicitudes",
  "retryAfter": 45
}
```

---

## Caching

**Cache TTL by Endpoint:**
| Endpoint | TTL | Duration |
|----------|-----|----------|
| `/candles` | 10 minutes | Fresh data refreshed every 10min |
| `/price` | 5 minutes | Real-time prices |
| `/liquidations` | 5 minutes | Near real-time liquidations |
| `/analysis/order-flow` | 5 minutes | Fresh analysis |

**Cache Headers:**
- `X-Cache: HIT` - Response from cache
- `X-Cache: MISS` - Fresh from source

---

## Authentication

**Current Status:** No authentication required (demo mode)

**Future:** JWT token-based auth for production
```
Authorization: Bearer <jwt-token>
```

---

## CORS

**Allowed Origins:**
- `http://localhost:3000` (development)
- `https://btc-analyzer.vercel.app` (production)

**Methods:** GET, POST, OPTIONS

**Headers:** Content-Type, Authorization

---

## Fallback Data

When API is unavailable, fallback demo data is automatically provided:

**Fallback Price Data:**
```json
{
  "BTC": 67234.50,
  "ETH": 3562.25,
  "SOL": 182.45
}
```

**Fallback Candles:** 100 generated demo candles with realistic OHLCV data

**Fallback Liquidations:** Sample liquidation array with long/short positions

---

## Code Examples

### JavaScript (Fetch with Retry)
```javascript
const retryManager = new RetryManager({
  maxRetries: 3,
  initialDelay: 1000
});

const candles = await retryManager.retry(async () => {
  const response = await fetch('/api/candles?symbol=BTC&limit=100');
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
});
```

### cURL
```bash
curl -X GET 'https://btc-analyzer.vercel.app/api/candles?symbol=BTC&timeframe=1h&limit=100' \
  -H 'Content-Type: application/json'
```

### Python
```python
import requests

response = requests.get(
  'https://btc-analyzer.vercel.app/api/candles',
  params={'symbol': 'BTC', 'timeframe': '1h', 'limit': 100}
)

data = response.json()
print(data['candles'])
```

---

## API Changelog

### Version 1.0 (2026-04-18)
- Initial API release
- Candles, prices, liquidations endpoints
- Order flow analysis
- Rate limiting (100 req/min)
- Input validation
- Security headers (CSP, HSTS, etc)
- Fallback demo data
- Spanish error messages
- Comprehensive error handling

---

## Support

**Issues:** Report via GitHub Issues  
**Documentation:** See PHASE-6-TESTING.md for comprehensive testing guide  
**Security:** See PHASE-6-HARDENING.md for security details

---

**API Documentation v1.0**  
**Last Updated:** 2026-04-18
