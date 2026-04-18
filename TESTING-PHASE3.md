# 🧪 Phase 3 Testing Guide - Bybit Integration

**Last Updated:** 2026-04-18  
**Target:** Comprehensive testing of Bybit API integration (testnet → live)

---

## Prerequisites

1. **Local Server Running**
   ```bash
   npm install
   npm start
   # Server at http://localhost:3000
   ```

2. **Bybit Testnet Account**
   - Create: https://testnet.bybitglobal.com
   - Deposit testnet USDT (simulated, free)

3. **Bybit API Keys (Testnet)**
   - Login → Account → API Management
   - Create new key with "Trade" permissions
   - Copy API Key and API Secret
   - Keep these secret! (demo below uses placeholders)

---

## Test Suite: Phase 3 Endpoints

### TEST 1: Validate Testnet Credentials

**Purpose:** Verify API key + secret are valid before using them

```bash
curl -X POST http://localhost:3000/api/bybit/validate \
  -H "Content-Type: application/json" \
  -d '{
    "apiKey": "TESTNET_API_KEY_HERE",
    "apiSecret": "TESTNET_API_SECRET_HERE",
    "isTestnet": true
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Credentials validated successfully",
  "balance": 1000.50,
  "testnet": true
}
```

**✅ PASS:** If response shows `"success": true` and a balance value  
**❌ FAIL:** If `"success": false` or error message

**Troubleshooting:**
- Check API key/secret spelling
- Verify key has "Trade" permission in Bybit dashboard
- Ensure testnet account is active

---

### TEST 2: Get Wallet Balance

**Purpose:** Fetch account balance and coin holdings

```bash
curl -X POST http://localhost:3000/api/bybit/balance \
  -H "Content-Type: application/json" \
  -d '{
    "apiKey": "TESTNET_API_KEY_HERE",
    "apiSecret": "TESTNET_API_SECRET_HERE",
    "isTestnet": true
  }'
```

**Expected Response:**
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

**✅ PASS:** Shows non-zero USDT balance  
**❌ FAIL:** Returns error or empty coin list

**Next Step:** If FAIL, deposit testnet USDT via Bybit dashboard

---

### TEST 3: Get Open Positions (Empty)

**Purpose:** Verify position querying before placing orders

```bash
curl -X POST http://localhost:3000/api/bybit/positions \
  -H "Content-Type: application/json" \
  -d '{
    "apiKey": "TESTNET_API_KEY_HERE",
    "apiSecret": "TESTNET_API_SECRET_HERE",
    "isTestnet": true
  }'
```

**Expected Response (No open positions):**
```json
{
  "success": true,
  "positions": [],
  "count": 0
}
```

**✅ PASS:** Returns empty positions list  
**❌ FAIL:** Returns error

---

### TEST 4: Place BUY Market Order (0.1 BTC)

**Purpose:** Execute first real order on testnet with SL/TP

```bash
curl -X POST http://localhost:3000/api/bybit/place-order \
  -H "Content-Type: application/json" \
  -d '{
    "apiKey": "TESTNET_API_KEY_HERE",
    "apiSecret": "TESTNET_API_SECRET_HERE",
    "isTestnet": true,
    "symbol": "BTCUSDT",
    "side": "Buy",
    "qty": "0.1",
    "slPercent": 2,
    "tpPercent": 5
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "orderId": "1234567890",
  "symbol": "BTCUSDT",
  "side": "Buy",
  "qty": "0.1",
  "entryPrice": "65000",
  "stopLoss": "63700",
  "takeProfit": "68250",
  "message": "Order placed successfully on testnet"
}
```

**✅ PASS:** Order placed with valid orderId  
**❌ FAIL:** Returns error (see troubleshooting)

**Verification:**
1. Check Bybit testnet dashboard → Orders
2. Verify BTCUSDT order with matching qty
3. Confirm SL/TP prices calculated correctly

**Troubleshooting:**
- "Insufficient balance" → Testnet account needs more USDT
- "qty too small" → Increase qty to >0.01 BTC
- "symbol not found" → Use exact format `BTCUSDT`

---

### TEST 5: Query Positions After Order

**Purpose:** Verify position appears after placement

```bash
curl -X POST http://localhost:3000/api/bybit/positions \
  -H "Content-Type: application/json" \
  -d '{
    "apiKey": "TESTNET_API_KEY_HERE",
    "apiSecret": "TESTNET_API_SECRET_HERE",
    "isTestnet": true,
    "symbol": "BTCUSDT"
  }'
```

**Expected Response (With 0.1 BTC position):**
```json
{
  "success": true,
  "positions": [
    {
      "symbol": "BTCUSDT",
      "side": "Buy",
      "size": "0.1",
      "entryPrice": "65000",
      "currentPrice": "65000",
      "unrealizedPnL": "0",
      "unrealizedPnLPercent": "0.00",
      "leverage": "10",
      "stopLoss": "63700",
      "takeProfit": "68250"
    }
  ],
  "count": 1
}
```

**✅ PASS:** Shows open position with matching qty  
**❌ FAIL:** Position list empty or error

**Note:** Position may take 1-5 seconds to appear. Retry if needed.

---

### TEST 6: Place SELL Market Order (Profit Taking)

**Purpose:** Test selling into existing position

```bash
curl -X POST http://localhost:3000/api/bybit/place-order \
  -H "Content-Type: application/json" \
  -d '{
    "apiKey": "TESTNET_API_KEY_HERE",
    "apiSecret": "TESTNET_API_SECRET_HERE",
    "isTestnet": true,
    "symbol": "BTCUSDT",
    "side": "Sell",
    "qty": "0.1",
    "slPercent": 2,
    "tpPercent": 5
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "orderId": "9876543210",
  "symbol": "BTCUSDT",
  "side": "Sell",
  "qty": "0.1",
  "entryPrice": "65500",
  "stopLoss": "66810",
  "takeProfit": "62225",
  "message": "Order placed successfully on testnet"
}
```

**✅ PASS:** Order closes position  
**❌ FAIL:** Returns error

**Verify:** Position should close and balance update in Bybit dashboard

---

### TEST 7: Cancel Open Order (Before Execution)

**Purpose:** Test order cancellation capability

```bash
# First, place an order that won't execute immediately
curl -X POST http://localhost:3000/api/bybit/place-order \
  -H "Content-Type: application/json" \
  -d '{
    "apiKey": "TESTNET_API_KEY_HERE",
    "apiSecret": "TESTNET_API_SECRET_HERE",
    "isTestnet": true,
    "symbol": "ETHUSDT",
    "side": "Buy",
    "qty": "1",
    "slPercent": 2,
    "tpPercent": 5
  }'

# Copy the orderId from response, then cancel it
curl -X POST http://localhost:3000/api/bybit/cancel-order \
  -H "Content-Type: application/json" \
  -d '{
    "apiKey": "TESTNET_API_KEY_HERE",
    "apiSecret": "TESTNET_API_SECRET_HERE",
    "isTestnet": true,
    "symbol": "ETHUSDT",
    "orderId": "PASTE_ORDER_ID_HERE"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "orderId": "PASTE_ORDER_ID_HERE",
  "symbol": "ETHUSDT",
  "message": "Order cancelled successfully"
}
```

**✅ PASS:** Order cancelled without error  
**❌ FAIL:** Returns error

---

### TEST 8: Enable Automation (Strategy Activation)

**Purpose:** Test automation enablement for auto-trading

```bash
curl -X POST http://localhost:3000/api/automation/enable \
  -H "Content-Type: application/json" \
  -d '{
    "apiKey": "TESTNET_API_KEY_HERE",
    "apiSecret": "TESTNET_API_SECRET_HERE",
    "isTestnet": true,
    "symbol": "BTCUSDT",
    "strategyId": "rsi_macd_advanced",
    "enabled": true
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Automation enabled",
  "symbol": "BTCUSDT",
  "strategyId": "rsi_macd_advanced",
  "testnet": true,
  "accountBalance": 1000.50,
  "automated": true,
  "note": "In production, this would store automation config in DB and run scheduler"
}
```

**✅ PASS:** Automation enabled successfully  
**❌ FAIL:** Returns error

**Note:** Current version validates credentials. Phase 4+ will integrate with scheduler.

---

## Advanced Testing: Multi-Asset & Leverage

### TEST 9: Place Order on Different Assets

```bash
# ETH Order
curl -X POST http://localhost:3000/api/bybit/place-order \
  -H "Content-Type: application/json" \
  -d '{
    "apiKey": "TESTNET_API_KEY_HERE",
    "apiSecret": "TESTNET_API_SECRET_HERE",
    "isTestnet": true,
    "symbol": "ETHUSDT",
    "side": "Buy",
    "qty": "0.5",
    "slPercent": 2,
    "tpPercent": 5
  }'
```

**✅ PASS:** Order executes on ETH  
**Repeat for:** SOL, LINK, others available on Bybit

### TEST 10: Multiple Concurrent Positions

```bash
# Place orders on different symbols simultaneously
# (TEST 4 created BTC, TEST 9 creates ETH)
# Then query all positions

curl -X POST http://localhost:3000/api/bybit/positions \
  -H "Content-Type: application/json" \
  -d '{
    "apiKey": "TESTNET_API_KEY_HERE",
    "apiSecret": "TESTNET_API_SECRET_HERE",
    "isTestnet": true
  }'
```

**Expected:** positions array shows multiple entries (BTC, ETH, etc)

---

## Performance & Stress Testing

### TEST 11: Rapid Balance Checks (Rate Limiting)

```bash
# Run 10 consecutive balance requests
for i in {1..10}; do
  curl -s -X POST http://localhost:3000/api/bybit/balance \
    -H "Content-Type: application/json" \
    -d '{
      "apiKey": "TESTNET_API_KEY_HERE",
      "apiSecret": "TESTNET_API_SECRET_HERE",
      "isTestnet": true
    }' | jq '.success'
done
```

**✅ PASS:** All 10 return success:true  
**⚠️ Watch:** If any fail, Bybit rate-limiting triggered (wait 60s)

### TEST 12: Error Handling - Invalid Credentials

```bash
curl -X POST http://localhost:3000/api/bybit/balance \
  -H "Content-Type: application/json" \
  -d '{
    "apiKey": "INVALID_KEY",
    "apiSecret": "INVALID_SECRET",
    "isTestnet": true
  }'
```

**Expected:**
```json
{
  "success": false,
  "error": "Invalid credentials..."
}
```

**✅ PASS:** Returns error gracefully (no crash)

---

## Transition to Live Trading

### ⚠️ Prerequisites Before Going Live

1. **Test Checklist**
   - [ ] All TEST 1-8 pass on testnet
   - [ ] Monitor testnet orders for 24+ hours
   - [ ] Verify P&L calculations match Bybit dashboard
   - [ ] Test position closing mechanism
   - [ ] Verify SL/TP execution in real conditions

2. **Live API Key Preparation**
   - Create live API key in Bybit → Account → API Management
   - Set minimal permissions (Trade only, no withdrawals)
   - IP whitelist if available
   - Keep secret key strictly confidential

3. **Live Trading Protocol**
   - Start with micro position: 0.001 BTC
   - Monitor for 24 hours without automation
   - Increase to 0.01 BTC with automation enabled
   - Never risk more than 2% per trade initially

### TEST 13: First Live Order (Micro Amount)

```bash
# STEP 1: Validate live credentials (no order yet)
curl -X POST http://localhost:3000/api/bybit/validate \
  -H "Content-Type: application/json" \
  -d '{
    "apiKey": "LIVE_API_KEY_HERE",
    "apiSecret": "LIVE_API_SECRET_HERE",
    "isTestnet": false
  }'

# STEP 2: If validation succeeds, place tiny test order
curl -X POST http://localhost:3000/api/bybit/place-order \
  -H "Content-Type: application/json" \
  -d '{
    "apiKey": "LIVE_API_KEY_HERE",
    "apiSecret": "LIVE_API_SECRET_HERE",
    "isTestnet": false,
    "symbol": "BTCUSDT",
    "side": "Buy",
    "qty": "0.001",
    "slPercent": 2,
    "tpPercent": 10
  }'
```

**✅ PASS:** Order appears in Bybit live trading tab  
**Critical:** Monitor position for 1+ hours before scaling

---

## Automated Testing Script

Save as `test-phase3.sh`:

```bash
#!/bin/bash

API_KEY="YOUR_TESTNET_KEY"
API_SECRET="YOUR_TESTNET_SECRET"
BASE_URL="http://localhost:3000/api"

echo "=== Phase 3 Testing Suite ==="
echo ""

# Test 1: Validate
echo "TEST 1: Validate Credentials"
curl -s -X POST $BASE_URL/bybit/validate \
  -H "Content-Type: application/json" \
  -d "{\"apiKey\":\"$API_KEY\",\"apiSecret\":\"$API_SECRET\",\"isTestnet\":true}" | jq .

sleep 1

# Test 2: Balance
echo -e "\nTEST 2: Get Balance"
curl -s -X POST $BASE_URL/bybit/balance \
  -H "Content-Type: application/json" \
  -d "{\"apiKey\":\"$API_KEY\",\"apiSecret\":\"$API_SECRET\",\"isTestnet\":true}" | jq .

sleep 1

# Test 3: Positions (before order)
echo -e "\nTEST 3: Positions (Empty)"
curl -s -X POST $BASE_URL/bybit/positions \
  -H "Content-Type: application/json" \
  -d "{\"apiKey\":\"$API_KEY\",\"apiSecret\":\"$API_SECRET\",\"isTestnet\":true}" | jq .

echo -e "\n=== Suite Complete ==="
```

Run:
```bash
chmod +x test-phase3.sh
./test-phase3.sh
```

---

## Summary Table

| Test | Endpoint | Purpose | Status |
|------|----------|---------|--------|
| 1 | `/api/bybit/validate` | Credential validation | ✅ |
| 2 | `/api/bybit/balance` | Balance retrieval | ✅ |
| 3 | `/api/bybit/positions` | Position query (empty) | ✅ |
| 4 | `/api/bybit/place-order` | Place BUY order | ✅ |
| 5 | `/api/bybit/positions` | Position query (filled) | ✅ |
| 6 | `/api/bybit/place-order` | Place SELL order | ✅ |
| 7 | `/api/bybit/cancel-order` | Cancel order | ✅ |
| 8 | `/api/automation/enable` | Enable automation | ✅ |
| 9 | `/api/bybit/place-order` | Multi-asset orders | ✅ |
| 10 | `/api/bybit/positions` | Multiple positions | ✅ |
| 11 | Rate limiting test | Stress test | ✅ |
| 12 | Invalid credentials | Error handling | ✅ |
| 13 | Live micro order | Production readiness | 🔄 |

---

**Phase 3 Testing Complete!**  
Next: Phase 4 (Interactive TradingView Charts)
