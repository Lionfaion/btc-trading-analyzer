# Testing Guide - BTC Trading Analyzer Fase 1

## Endpoints a Testear

### 1. Precio Actual `/api/price`
```bash
curl "http://localhost:3000/api/price?symbol=BTCUSDT"
```
**Esperado:** JSON con price, marketCap, volume, timestamp

### 2. Liquidaciones `/api/liquidations`
```bash
curl "http://localhost:3000/api/liquidations"
```
**Esperado:** JSON con long/short liquidations y timestamp

### 3. Candles Históricos `/api/candles`
```bash
curl "http://localhost:3000/api/candles?symbol=BTCUSDT&limit=10"
```
**Esperado:** Array de candles OHLCV

### 4. Sincronizar Histórico `/api/historical/sync` (POST)
```bash
curl -X POST "http://localhost:3000/api/historical/sync" \
  -H "Content-Type: application/json" \
  -d '{"symbol":"BTCUSDT","days":365}'
```
**Esperado:** success=true, candleCount, dateRange

### 5. Análisis Claude `/api/analyze` (POST)
```bash
curl -X POST "http://localhost:3000/api/analyze" \
  -H "Content-Type: application/json" \
  -d '{
    "asset":"BTC",
    "price":67000,
    "liquidationData":{"longLiquidations":500000000,"shortLiquidations":400000000},
    "timeframe":"1H"
  }'
```
**Esperado:** JSON con bias, risk_zones, institutional_traps, confidence, action

### 6. Backtest `/api/backtest/run` (POST)
```bash
curl -X POST "http://localhost:3000/api/backtest/run" \
  -H "Content-Type: application/json" \
  -d '{
    "candleData":[{"timestamp":1234567890,"open":65000,"high":66000,"low":64000,"close":65500,"volume":1000000}],
    "indicators":["RSI","MACD"],
    "timeframe":"1h",
    "initialBalance":10000,
    "riskPercentage":2
  }'
```
**Esperado:** summary (P&L, ROI, trades), stats (profitFactor, sharpeRatio)

### 7. Estadísticas `/api/stats/calculate`
```bash
curl "http://localhost:3000/api/stats/calculate"
```
**Esperado:** stats con totalTrades, winRate, roi, maxDrawdown, etc.

### 8. Order Flow Analysis `/api/analysis/order-flow` (POST)
```bash
curl -X POST "http://localhost:3000/api/analysis/order-flow" \
  -H "Content-Type: application/json" \
  -d '{
    "btcPrice":67000,
    "liquidationData":[{"side":"long","volume":500000000},{"side":"short","volume":400000000}],
    "historyPeriod":24
  }'
```
**Esperado:** analysis con alerts, orderFlowMetrics

### 9. Guardar Trade `/api/db/trades` (POST)
```bash
curl -X POST "http://localhost:3000/api/db/trades" \
  -H "Content-Type: application/json" \
  -d '{
    "symbol":"BTC",
    "entry_price":65000,
    "exit_price":66000,
    "quantity":0.5
  }'
```
**Esperado:** success=true, trade guardado

### 10. Obtener Trades `/api/db/trades`
```bash
curl "http://localhost:3000/api/db/trades?symbol=BTC&limit=10"
```
**Esperado:** Array de trades guardados

### 11. Guardar Análisis `/api/db/analysis` (POST)
```bash
curl -X POST "http://localhost:3000/api/db/analysis" \
  -H "Content-Type: application/json" \
  -d '{
    "symbol":"BTC",
    "price":67000,
    "analysis":{"bias":"BULLISH","confidence":75}
  }'
```
**Esperado:** success=true, análisis guardado

### 12. Historial de Análisis `/api/db/analysis`
```bash
curl "http://localhost:3000/api/db/analysis?symbol=BTC&limit=10"
```
**Esperado:** Array de análisis históricos

## Pasos para Testing Completo

1. **Verificar endpoints sin DB (funcionan con datos demo):**
   - `/api/price` ✓
   - `/api/liquidations` ✓
   - `/api/analyze` ✓
   - `/api/backtest/run` ✓
   - `/api/stats/calculate` ✓
   - `/api/analysis/order-flow` ✓

2. **Configurar Supabase:**
   - Crear proyecto en https://supabase.com
   - Copiar `SUPABASE_URL` y `SUPABASE_ANON_KEY`
   - Agregar variables de entorno en Railway/local .env

3. **Crear tablas en Supabase:**
   - Ir a SQL Editor en Supabase dashboard
   - Copiar y pegar contenido de `db-schema.sql`
   - Ejecutar

4. **Testear endpoints de DB:**
   - POST `/api/db/trades` → guardar trade
   - GET `/api/db/trades` → verificar que aparece

5. **Testear sincronización histórica:**
   - POST `/api/historical/sync` con BTCUSDT, 7 días
   - Esperar ~30 segundos
   - GET `/api/candles` → debe mostrar ~168 candles (7 días × 24h)

6. **Testear UI en navegador:**
   - Abrir http://localhost:3000
   - Click en "Refresh Price" → debe mostrar precio
   - Click en "Fetch Liquidations" → debe mostrar volumes
   - Click en "Ejecutar Análisis" → debe mostrar análisis
   - Click en "Ejecutar Backtest" → debe mostrar resultados

## Variables de Entorno Requeridas

```
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_ANON_KEY=eyJxxx...
PORT=3000
```

## Logs Esperados

Al iniciar servidor:
```
🚀 Starting server on port 3000
✅ Server running on http://0.0.0.0:3000
```

Al testear endpoints:
```
📍 POST /api/analyze
📍 GET /api/price?symbol=BTCUSDT
📍 POST /api/historical/sync
✅ Inserted 168 candles
```

## Testing en Railway

1. Desplegar a Railway
2. Configurar variables de entorno en Railway Dashboard
3. Ejecutar mismo testing contra URL de Railway:
```bash
curl "https://tu-app.railway.app/api/price?symbol=BTCUSDT"
```

¡Todos los endpoints deben responder correctamente!
