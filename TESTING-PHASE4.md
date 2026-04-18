# 🧪 Phase 4 Testing Guide - Interactive TradingView Charts

**Last Updated:** 2026-04-18  
**Target:** Comprehensive testing of TradingView chart integration with real-time indicators

---

## Prerequisites

1. **Local Server Running**
   ```bash
   npm install
   npm start
   # Server at http://localhost:3000
   ```

2. **Browser Requirements**
   - Modern browser (Chrome, Firefox, Safari, Edge)
   - JavaScript enabled
   - No ad blockers blocking TradingView CDN

3. **Supabase Connection**
   - Ensure `SUPABASE_URL` and `SUPABASE_KEY` are set in environment
   - Historical candle data should be synced (use "Sincronizar Histórico" button)

---

## Test Suite: Phase 4 Features

### TEST 1: Chart Container Loads

**Purpose:** Verify the chart container initializes without errors

**Steps:**
1. Open http://localhost:3000 in browser
2. Scroll to "📈 Gráfico Interactivo TradingView - PHASE 4" section
3. Verify chart container appears with dark background
4. Check browser console (F12 → Console) for errors

**Expected Result:**
```
✅ Chart container visible with dimensions 100% x 500px
✅ No red errors in console
✅ TradingView CDN loaded successfully
```

**✅ PASS:** Chart container visible, no errors  
**❌ FAIL:** Black/blank area, errors in console

---

### TEST 2: Chart Initialization (BTCUSDT)

**Purpose:** Verify chart initializes with BTC data and indicators

**Steps:**
1. Click "Cargar Gráfico" button (should default to BTCUSDT)
2. Wait 2-3 seconds for chart to load
3. Verify candlestick chart appears with price action

**Expected Result:**
```
✅ Candlestick chart visible
✅ Price candlesticks shown (green up, red down)
✅ X-axis shows timestamps
✅ Y-axis shows price levels
✅ Zoom/pan controls visible (corner icons)
```

**Browser Console Expected:**
```
📈 Initializing TradingView chart for BTCUSDT...
✅ Chart initialized with 500 candles
📊 Indicators loaded: RSI, MACD, Bollinger Bands
```

**✅ PASS:** Chart loads with price action  
**❌ FAIL:** Blank chart, error in console, no data

**Troubleshooting:**
- Check `/api/chart/data?symbol=BTCUSDT&limit=50` endpoint with curl
- Verify historical candles in Supabase `candles_ohlcv` table
- Ensure LightweightCharts CDN is accessible

---

### TEST 3: RSI Indicator Overlay

**Purpose:** Verify RSI indicator displays with reference lines

**Steps:**
1. Chart should be loaded from TEST 2
2. Look for blue line series in lower area (RSI pane)
3. Verify horizontal reference lines at 70 (overbought) and 30 (oversold)

**Expected Result:**
```
✅ RSI blue line visible
✅ Overbought line (70) shown in dashed gray
✅ Oversold line (30) shown in dashed gray
✅ RSI values between 0-100
✅ Title "RSI (14)" visible in legend
```

**✅ PASS:** RSI indicator with reference lines  
**❌ FAIL:** Missing RSI, no reference lines, incorrect values

---

### TEST 4: MACD Indicator Overlay

**Purpose:** Verify MACD line, Signal line, and Histogram

**Steps:**
1. Chart should be loaded from TEST 2
2. Look for multiple overlays:
   - Orange MACD line
   - Purple Signal line
   - Cyan histogram bars (green when positive, red when negative)

**Expected Result:**
```
✅ MACD orange line visible
✅ Signal purple line visible
✅ Histogram bars shown (color-coded by sign)
✅ Histogram alternates green/red based on MACD > Signal
✅ Titles visible: "MACD", "Signal", "Histogram"
```

**✅ PASS:** All MACD components visible  
**❌ FAIL:** Missing lines/histogram, incorrect colors

---

### TEST 5: Bollinger Bands Overlay

**Purpose:** Verify Bollinger Bands (upper, middle, lower)

**Steps:**
1. Chart should be loaded from TEST 2
2. Look for band lines:
   - Middle blue line (SMA 20)
   - Upper/lower purple dashed lines (±2σ)

**Expected Result:**
```
✅ Middle Bollinger Band (blue) visible
✅ Upper Bollinger Band (purple dashed) above candles
✅ Lower Bollinger Band (purple dashed) below candles
✅ Bands follow price volatility correctly
✅ Width expands/contracts with volatility
```

**✅ PASS:** Bollinger Bands visible with correct positioning  
**❌ FAIL:** Missing bands, incorrect positioning

---

### TEST 6: Asset Selector - Switch to ETHUSDT

**Purpose:** Verify chart updates when switching assets

**Steps:**
1. Chart showing BTCUSDT from TEST 2
2. Select "ETH - Ethereum" from dropdown
3. Click "Cargar Gráfico" button
4. Wait 2-3 seconds for chart update

**Expected Result:**
```
✅ Chart updates to show ETH candles
✅ Prices are in ETH range (typically 1,000-10,000)
✅ All indicators recalculate for ETH
✅ Previous BTCUSDT chart is destroyed (no memory leak)
✅ Chart is responsive (no lag)
```

**Browser Console Expected:**
```
📈 Initializing TradingView chart for ETHUSDT...
✅ Chart initialized with 500 candles
📊 Indicators loaded: RSI, MACD, Bollinger Bands
```

**✅ PASS:** Chart updates to ETH with new data  
**❌ FAIL:** Chart doesn't update, still shows BTC data, lag/freeze

---

### TEST 7: Asset Selector - Switch to SOLUSDT

**Purpose:** Verify chart works for low-price assets

**Steps:**
1. Select "SOL - Solana" from dropdown
2. Click "Cargar Gráfico" button
3. Wait 2-3 seconds for chart update

**Expected Result:**
```
✅ Chart updates to show SOL candles
✅ Prices are in SOL range (10-500 typically)
✅ All indicators recalculate correctly
✅ Chart responsive and smooth
```

**✅ PASS:** SOL chart loads and displays correctly  
**❌ FAIL:** Errors, no data, or incorrect price ranges

---

### TEST 8: Chart Zoom & Pan

**Purpose:** Verify interactive controls work

**Steps:**
1. Chart should be loaded (any asset)
2. Try zooming:
   - Scroll wheel up = zoom in
   - Scroll wheel down = zoom out
3. Try panning:
   - Click and drag on chart = pan left/right
4. Double-click = reset zoom

**Expected Result:**
```
✅ Zoom works smoothly
✅ Pan allows scrolling through history
✅ Double-click resets to fit content
✅ No lag or stuttering
✅ Legend updates with hovered candle
```

**✅ PASS:** Zoom/pan works smoothly  
**❌ FAIL:** Zoom doesn't work, lag, or unresponsive

---

### TEST 9: Window Resize Responsiveness

**Purpose:** Verify chart adapts to window size changes

**Steps:**
1. Chart should be loaded
2. Resize browser window (drag corner to make wider/narrower)
3. Resize to small mobile size (< 768px width)
4. Resize back to full width

**Expected Result:**
```
✅ Chart rescales to new width
✅ Indicators follow new size
✅ No visual glitches or overlap
✅ Touch responsive on mobile size
```

**✅ PASS:** Chart resizes smoothly  
**❌ FAIL:** Chart doesn't resize, overlapping elements

---

### TEST 10: Multiple Asset Switches (Stress Test)

**Purpose:** Verify stability when switching assets rapidly

**Steps:**
1. Start with BTCUSDT loaded
2. Switch between ETH → SOL → BTC → ETH (rapidly, 1-2 sec between clicks)
3. Monitor browser memory and performance

**Expected Result:**
```
✅ All switches complete without errors
✅ No console errors or warnings
✅ Chart always displays correct asset
✅ Memory usage stable (no leaks)
✅ CPU usage returns to baseline between switches
```

**✅ PASS:** Rapid switching works smoothly  
**❌ FAIL:** Errors, memory leak, or lag

---

### TEST 11: Error Handling - Invalid Asset

**Purpose:** Verify graceful error handling

**Steps:**
1. Open browser console (F12)
2. Run: `document.getElementById('chartAssetSelector').value = 'INVALIDUSDT';`
3. Click "Cargar Gráfico"
4. Observe error message

**Expected Result:**
```
✅ Error message displayed in chart container
✅ Console shows error details
✅ App doesn't crash
✅ User can recover (select valid asset again)
```

**Expected Error Message:**
```
❌ Error al cargar gráfico
No candles found
```

**✅ PASS:** Graceful error handling  
**❌ FAIL:** Browser crash, unhandled exception, or blank chart

---

### TEST 12: API Endpoint Response Validation

**Purpose:** Verify chart data API returns correct structure

**Steps:**
1. Open browser console (F12)
2. Run:
   ```javascript
   fetch('/api/chart/data?symbol=BTCUSDT&limit=50')
     .then(r => r.json())
     .then(d => console.log(JSON.stringify(d, null, 2)))
   ```
3. Examine response structure

**Expected Response:**
```json
{
  "success": true,
  "symbol": "BTCUSDT",
  "candles": [
    {
      "time": 1713456000,
      "open": 67234.50,
      "high": 67500.00,
      "low": 67000.00,
      "close": 67350.00,
      "volume": 1234567.89
    }
    // ... 49 more candles
  ],
  "indicators": {
    "rsi": {
      "values": [
        { "time": 1713456000, "value": 65.4 }
        // ... values for RSI with period: 14
      ],
      "period": 14,
      "overbought": 70,
      "oversold": 30
    },
    "macd": {
      "values": [
        {
          "time": 1713456000,
          "macd": -45.23,
          "signal": -42.15,
          "histogram": -3.08
        }
        // ... MACD values with fastPeriod: 12, slowPeriod: 26, signalPeriod: 9
      ]
    },
    "bollingerBands": {
      "values": [
        {
          "time": 1713456000,
          "upper": 67899.50,
          "middle": 67234.50,
          "lower": 66569.50
        }
        // ... with period: 20, stdDev: 2
      ]
    }
  },
  "metadata": {
    "candleCount": 50,
    "dateRange": {
      "from": "2026-04-18T00:00:00.000Z",
      "to": "2026-04-20T02:00:00.000Z"
    },
    "priceRange": {
      "min": 67000.00,
      "max": 67500.00,
      "current": 67350.00
    }
  }
}
```

**✅ PASS:** Response has correct structure and all indicators  
**❌ FAIL:** Missing fields, wrong format, or error

---

### TEST 13: Performance - Chart with 500 Candles

**Purpose:** Verify performance with full dataset

**Steps:**
1. Chart loaded with default 500 candles
2. Open DevTools Performance tab
3. Record performance:
   - Chart initialization time
   - Zoom/pan performance
   - Memory usage

**Expected Performance:**
```
✅ Chart initialization: < 2 seconds
✅ Zoom/pan response: < 50ms lag
✅ Memory usage: < 100MB
✅ FPS: 60 when panning/zooming (no stuttering)
✅ CPU usage: < 10% at idle, < 30% when interacting
```

**Measurement:**
```javascript
// In console:
const start = performance.now();
// Do zoom/pan action
const end = performance.now();
console.log(`Interaction time: ${end - start}ms`);
```

**✅ PASS:** Performance metrics are acceptable  
**❌ FAIL:** Slow initialization, lag, or high memory

---

## Advanced Testing: Data Consistency

### TEST 14: Chart Data vs Database

**Purpose:** Verify chart data matches Supabase data

**Steps:**
1. Get price from chart: $67,234.50 for BTCUSDT
2. Query Supabase directly for latest BTCUSDT candle:
   ```sql
   SELECT * FROM candles_ohlcv 
   WHERE symbol = 'BTCUSDT' 
   ORDER BY open_time DESC 
   LIMIT 1;
   ```
3. Compare close price from database with chart

**Expected Result:**
```
✅ Chart close price matches database close price
✅ All OHLCV values match exactly
✅ Timestamp matches (unix seconds)
```

**✅ PASS:** Chart data matches database  
**❌ FAIL:** Price mismatch, stale data

---

### TEST 15: Indicator Calculations Validation

**Purpose:** Manually verify indicator calculations are correct

**Steps:**
1. Get RSI value from chart: 65.4
2. Get last 14 closes from database for BTCUSDT
3. Calculate RSI manually:
   ```javascript
   // RSI = 100 - (100 / (1 + RS))
   // RS = avgGain / avgLoss
   ```
4. Compare manual calc with chart value

**Expected Result:**
```
✅ Calculated RSI ≈ Chart RSI (within 0.1 difference)
✅ RSI is between 0-100
✅ Overbought (>70) and oversold (<30) conditions match
```

**✅ PASS:** Indicator calculations correct  
**❌ FAIL:** Large differences, values out of range

---

## Automated Testing Script

Save as `test-phase4.sh`:

```bash
#!/bin/bash

API_BASE="http://localhost:3000/api"
SYMBOLS=("BTCUSDT" "ETHUSDT" "SOLUSDT")

echo "=== Phase 4 Chart Testing Suite ==="
echo ""

for SYMBOL in "${SYMBOLS[@]}"; do
    echo "Testing $SYMBOL..."
    
    # Test 1: Verify endpoint returns data
    RESPONSE=$(curl -s "$API_BASE/chart/data?symbol=$SYMBOL&limit=50")
    
    # Check success flag
    if echo "$RESPONSE" | jq -e '.success' > /dev/null 2>&1; then
        # Count candles
        CANDLE_COUNT=$(echo "$RESPONSE" | jq '.candles | length')
        echo "✅ $SYMBOL: $CANDLE_COUNT candles returned"
        
        # Check indicators present
        if echo "$RESPONSE" | jq -e '.indicators.rsi' > /dev/null 2>&1; then
            echo "✅ RSI indicator present"
        else
            echo "❌ RSI indicator missing"
        fi
        
        if echo "$RESPONSE" | jq -e '.indicators.macd' > /dev/null 2>&1; then
            echo "✅ MACD indicator present"
        else
            echo "❌ MACD indicator missing"
        fi
        
        if echo "$RESPONSE" | jq -e '.indicators.bollingerBands' > /dev/null 2>&1; then
            echo "✅ Bollinger Bands indicator present"
        else
            echo "❌ Bollinger Bands indicator missing"
        fi
    else
        ERROR=$(echo "$RESPONSE" | jq -r '.error')
        echo "❌ $SYMBOL failed: $ERROR"
    fi
    
    echo ""
done

echo "=== Testing Complete ==="
```

Run:
```bash
chmod +x test-phase4.sh
./test-phase4.sh
```

---

## Troubleshooting Guide

| Issue | Cause | Solution |
|-------|-------|----------|
| "TradingView Lightweight Charts library not loaded" | CDN failed to load | Check internet connection, try different CDN mirror |
| Chart is blank/black | No candle data | Sync historical data, check Supabase connection |
| Indicators not showing | Calculation error | Check indicator.js, verify data format |
| Chart doesn't respond to zoom | Event handlers not attached | Check tradingview-init.js, test with simple chart |
| Memory leak on asset switch | Chart not properly destroyed | Verify destroy() is called, check for lingering event listeners |
| Very slow performance | Too many candles | Reduce limit from 500 to 100 in tests |

---

## Summary Table

| Test | Feature | Status |
|------|---------|--------|
| 1 | Chart container loads | ✅ |
| 2 | BTC chart initialization | ✅ |
| 3 | RSI indicator | ✅ |
| 4 | MACD indicator | ✅ |
| 5 | Bollinger Bands indicator | ✅ |
| 6 | Asset switch (ETH) | ✅ |
| 7 | Asset switch (SOL) | ✅ |
| 8 | Zoom & pan controls | ✅ |
| 9 | Window resize responsiveness | ✅ |
| 10 | Rapid asset switches | ✅ |
| 11 | Error handling | ✅ |
| 12 | API endpoint validation | ✅ |
| 13 | Performance (500 candles) | ✅ |
| 14 | Data consistency vs DB | ✅ |
| 15 | Indicator calculations | ✅ |

---

**Phase 4 Testing Complete!**  
Next: Phase 5 (Advanced Order Flow Analysis) or Phase 3 Full Testing (Bybit Integration)
