# ✅ PHASE 3: Bybit Integration - Live Trading Connection

**Status:** ✅ COMPLETE (2026-04-18)  
**Framework:** Node.js HTTP server with HMAC-SHA256 authentication  
**Environment:** Supabase PostgreSQL + Bybit Exchange API  

---

## 📋 Overview

Phase 3 connects the BTC Trading Analyzer to **Bybit Exchange** for live (or testnet) trading execution. All backtest signals can now be automatically placed as real orders on Bybit.

### Capabilities

✅ **Authentication**
- HMAC-SHA256 signature generation for Bybit API security
- Credential validation without storing sensitive keys in code
- Testnet and live trading modes supported

✅ **Order Management**
- Place market orders with stop loss and take profit
- Cancel open orders
- Query open positions and balances

✅ **Account Management**
- Real-time wallet balance retrieval
- Position tracking with P&L
- Multi-asset support (BTC, ETH, SOL, etc)

✅ **Strategy Automation**
- Enable/disable automated trading per symbol
- Credential validation before automation
- Ready for scheduler integration

---

## 🔌 API Endpoints (Phase 3)

### 1. Validate Credentials
**Endpoint:** `POST /api/bybit/validate`

Validates Bybit API key + secret before storing or using them.

**Request:**
```json
{
  "apiKey": "your_api_key",
  "apiSecret": "your_api_secret",
  "isTestnet": true
}
```

**Response (Valid):**
```json
{
  "success": true,
  "message": "Credentials validated successfully",
  "balance": 1000.50,
  "testnet": true
}
```

**Response (Invalid):**
```json
{
  "success": false,
  "error": "Invalid credentials - invalid api key"
}
```

### 2. Get Account Balance
**Endpoint:** `POST /api/bybit/balance` (or `/api/bybit/get-balance`)

Retrieves wallet balance and coin holdings.

**Request:**
```json
{
  "apiKey": "your_api_key",
  "apiSecret": "your_api_secret",
  "isTestnet": true
}
```

**Response:**
```json
{
  "success": true,
  "totalWalletBalance": "1000.50",
  "totalAvailableBalance": "950.25",
  "totalMarginBalance": "1000.50",
  "totalUPL": "50.25",
  "coins": [
    {
      "coin": "USDT",
      "walletBalance": "1000.50",
      "availableBalance": "950.25",
      "unrealizedPnL": "50.25"
    }
  ]
}
```

### 3. Get Open Positions
**Endpoint:** `POST /api/bybit/positions` (or `/api/bybit/get-positions`)

Retrieves all open positions with P&L.

**Request:**
```json
{
  "apiKey": "your_api_key",
  "apiSecret": "your_api_secret",
  "isTestnet": true,
  "symbol": "BTCUSDT"  // optional, filter by symbol
}
```

**Response:**
```json
{
  "success": true,
  "positions": [
    {
      "symbol": "BTCUSDT",
      "side": "Buy",
      "size": "0.5",
      "entryPrice": "65000",
      "currentPrice": "65500",
      "unrealizedPnL": "250",
      "unrealizedPnLPercent": "0.38",
      "leverage": "10",
      "stopLoss": "63700",
      "takeProfit": "68250"
    }
  ],
  "count": 1
}
```

### 4. Place Market Order
**Endpoint:** `POST /api/bybit/place-order` (or `/api/bybit/create-order`)

Places a market order with automatic stop loss and take profit calculation.

**Request:**
```json
{
  "apiKey": "your_api_key",
  "apiSecret": "your_api_secret",
  "isTestnet": true,
  "symbol": "BTCUSDT",
  "side": "Buy",
  "qty": "0.5",
  "slPercent": 2.5,     // Stop loss: 2.5% below entry
  "tpPercent": 5        // Take profit: 5% above entry
}
```

**Response:**
```json
{
  "success": true,
  "orderId": "1234567890",
  "symbol": "BTCUSDT",
  "side": "Buy",
  "qty": "0.5",
  "entryPrice": "65000",
  "stopLoss": "63375",
  "takeProfit": "68250",
  "message": "Order placed successfully on testnet"
}
```

### 5. Cancel Order
**Endpoint:** `POST /api/bybit/cancel-order`

Cancels an open order by ID.

**Request:**
```json
{
  "apiKey": "your_api_key",
  "apiSecret": "your_api_secret",
  "isTestnet": true,
  "symbol": "BTCUSDT",
  "orderId": "1234567890"
}
```

**Response:**
```json
{
  "success": true,
  "orderId": "1234567890",
  "symbol": "BTCUSDT",
  "message": "Order cancelled successfully"
}
```

### 6. Enable Automation
**Endpoint:** `POST /api/automation/enable`

Enables automatic trading for a specific strategy and symbol.

**Request:**
```json
{
  "apiKey": "your_api_key",
  "apiSecret": "your_api_secret",
  "isTestnet": true,
  "symbol": "BTCUSDT",
  "strategyId": "strategy_123",
  "enabled": true
}
```

**Response:**
```json
{
  "success": true,
  "message": "Automation enabled",
  "symbol": "BTCUSDT",
  "strategyId": "strategy_123",
  "testnet": true,
  "accountBalance": 1000.50,
  "automated": true,
  "note": "In production, this would store automation config in DB and run scheduler"
}
```

---

## 🔐 Authentication Details

### HMAC-SHA256 Signature Generation

The Bybit API requires a cryptographic signature for all private requests:

```javascript
const crypto = require('crypto');

class BybitAuth {
  generateSignature(queryString, timestamp) {
    const message = `${queryString}${timestamp}`;
    return crypto
      .createHmac('sha256', this.apiSecret)
      .update(message)
      .digest('hex');
  }
}
```

**Implementation in auth.js:**
1. Collect all parameters (api_key, timestamp, and request params)
2. Sort alphabetically and convert to query string
3. Append timestamp
4. HMAC-SHA256 hash using API secret
5. Include signature in request headers

This ensures only valid API holders can execute orders.

---

## 📱 Usage Examples

### Example 1: Validate and Get Balance

```bash
# Step 1: Validate credentials
curl -X POST http://localhost:3000/api/bybit/validate \
  -H "Content-Type: application/json" \
  -d '{
    "apiKey": "YOUR_TESTNET_KEY",
    "apiSecret": "YOUR_TESTNET_SECRET",
    "isTestnet": true
  }'

# Step 2: Get account balance
curl -X POST http://localhost:3000/api/bybit/balance \
  -H "Content-Type: application/json" \
  -d '{
    "apiKey": "YOUR_TESTNET_KEY",
    "apiSecret": "YOUR_TESTNET_SECRET",
    "isTestnet": true
  }'
```

### Example 2: Place a Test Order on Testnet

```bash
# Place a 0.1 BTC Buy order with 2% SL, 5% TP
curl -X POST http://localhost:3000/api/bybit/place-order \
  -H "Content-Type: application/json" \
  -d '{
    "apiKey": "YOUR_TESTNET_KEY",
    "apiSecret": "YOUR_TESTNET_SECRET",
    "isTestnet": true,
    "symbol": "BTCUSDT",
    "side": "Buy",
    "qty": "0.1",
    "slPercent": 2,
    "tpPercent": 5
  }'
```

### Example 3: Check Open Positions

```bash
curl -X POST http://localhost:3000/api/bybit/positions \
  -H "Content-Type: application/json" \
  -d '{
    "apiKey": "YOUR_TESTNET_KEY",
    "apiSecret": "YOUR_TESTNET_SECRET",
    "isTestnet": true
  }'
```

### Example 4: Enable Automated Trading (Post-Backtest)

```bash
curl -X POST http://localhost:3000/api/automation/enable \
  -H "Content-Type: application/json" \
  -d '{
    "apiKey": "YOUR_TESTNET_KEY",
    "apiSecret": "YOUR_TESTNET_SECRET",
    "isTestnet": true,
    "symbol": "BTCUSDT",
    "strategyId": "rsi_macd_advanced",
    "enabled": true
  }'
```

---

## 🔧 Configuration

### Testnet vs Live Trading

All endpoints support both testnet and live trading:

```javascript
// Testnet (recommended for testing)
{
  "apiKey": "testnet_key",
  "apiSecret": "testnet_secret",
  "isTestnet": true
}

// Live (use only after thorough testing)
{
  "apiKey": "live_key",
  "apiSecret": "live_secret",
  "isTestnet": false
}
```

### Order Parameters

**Stop Loss & Take Profit Calculation:**
- Buy order: SL = Entry × (1 - slPercent/100), TP = Entry × (1 + tpPercent/100)
- Sell order: SL = Entry × (1 + slPercent/100), TP = Entry × (1 - tpPercent/100)

Example:
- Entry: 65,000 USDT
- SL: 2.5% → 63,375 USDT
- TP: 5% → 68,250 USDT

### Position Sizing

Currently fixed qty parameter. Future Phase versions should implement:
- Risk-based sizing (% of account)
- Kelly criterion
- Volatility-adjusted sizing

---

## 📊 Database Schema Extension (bybit_credentials table)

Table structure for storing encrypted credentials:

```sql
CREATE TABLE bybit_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  api_key_encrypted TEXT NOT NULL,
  api_secret_encrypted TEXT NOT NULL,
  is_testnet BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT now(),
  last_used TIMESTAMP,
  is_active BOOLEAN DEFAULT true,
  UNIQUE(user_id, is_testnet)
);

CREATE INDEX idx_bybit_user_testnet ON bybit_credentials(user_id, is_testnet);
```

**Implementation Note:** Credentials are passed via API requests (not stored locally) for security. Production version should:
1. Hash API secret with bcrypt
2. Store encrypted in Supabase
3. Never expose raw secrets in responses

---

## ⚠️ Security Considerations

### 1. Credential Handling
- **Never store** API credentials in code or config files
- **Pass via POST body** in HTTPS requests only
- **Validate** before each operation
- **Log only orderId and symbol**, never keys/secrets

### 2. Rate Limiting
- Bybit API: ~100 requests/second per UID
- Implement queue for orders (Phase 6)
- Batch position checks (current: per-request)

### 3. Order Protection
- Minimum order validation (symbol exists, qty > 0)
- Stop loss and take profit always set (no naked orders)
- Testnet mode by default (require explicit live mode)

### 4. Testnet First
- Always test new strategies on testnet first
- Validate order flow before live trading
- Monitor for 24+ hours on testnet

---

## 🚀 Next Steps (Phase 4+)

### Phase 4: Interactive Charting
- Integrate TradingView Lightweight Charts
- Overlay backtest results on price chart
- Show order entry/exit zones visually

### Phase 5: Advanced Order Flow
- Real-time liquidation heatmap from Bybit
- Order book imbalance detection
- Automatic signal quality scoring

### Phase 6: Production Hardening
- Credential encryption in Supabase
- Request queuing and rate limiting
- Trading statistics dashboard
- Performance optimization (caching, batch operations)

---

## 📝 Testing Checklist

- [ ] Validate credentials on testnet account
- [ ] Fetch account balance successfully
- [ ] Query open positions (empty list on fresh account)
- [ ] Place market order with SL/TP on testnet
- [ ] Verify order appears in Bybit dashboard
- [ ] Cancel test order successfully
- [ ] Monitor testnet P&L for 24 hours
- [ ] Switch to live and test with micro position (0.001 BTC)
- [ ] Verify live order placement and execution
- [ ] Enable automation on single strategy/symbol combo

---

## 🐛 Troubleshooting

| Error | Cause | Solution |
|-------|-------|----------|
| `invalid api key` | Wrong API key format | Check Bybit dashboard → API Management |
| `invalid sign` | Wrong signature calculation | Verify HMAC-SHA256 implementation |
| `Insufficient balance` | Account has less than order amount | Ensure testnet account has USDT |
| `symbol not found` | Typo in symbol name | Use `BTCUSDT` format, not `BTC/USDT` |
| `order qty too small` | Order size below minimum | Bybit minimum: ~5 USDT |
| `timeout` | API response delayed | Check internet connection, retry |

---

## 📚 References

- **Bybit API Docs:** https://bybit-exchange.github.io/docs/v5/intro
- **HMAC-SHA256:** https://en.wikipedia.org/wiki/HMAC
- **Node.js Crypto:** https://nodejs.org/api/crypto.html

---

**Status:** Phase 3 Complete  
**Next:** Phase 4 (Interactive TradingView Charts)  
**Last Updated:** 2026-04-18
