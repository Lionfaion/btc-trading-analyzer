# 🚀 FASE 2 - Backtest Engine Enhancements

**Estado:** IMPLEMENTADO  
**Nuevos Endpoints:** 3  
**Nuevas Funcionalidades:** 7 indicadores técnicos  

---

## 📈 Nuevos Indicadores Técnicos

1. **RSI (Relative Strength Index)** - Momentum oscilador
2. **MACD (Moving Average Convergence Divergence)** - Trend following
3. **Bollinger Bands** - Volatilidad y soporte/resistencia
4. **Stochastic Oscillator** - Momentum adicional
5. **ATR (Average True Range)** - Volatilidad absoluta
6. **ADX (Average Directional Index)** - Fortaleza del trend
7. **EMA (Exponential Moving Average)** - Base para otros

## 🎯 Nuevos Endpoints

### POST `/api/backtest/advanced`
Motor de backtest mejorado con parámetros configurables.

```bash
curl -X POST "http://localhost:3000/api/backtest/advanced" \
  -H "Content-Type: application/json" \
  -d '{
    "candleData": [...],
    "strategy": "multi-indicator",
    "initialBalance": 10000,
    "riskPercentage": 2,
    "rsiPeriod": 14,
    "rsiBuyLevel": 30,
    "rsiSellLevel": 70,
    "stopLossPercent": 2,
    "takeProfitPercent": 5
  }'
```

**Respuesta:**
```json
{
  "success": true,
  "results": {
    "summary": {
      "totalTrades": 45,
      "winRate": "62.5%",
      "totalProfit": "2450.50",
      "roi": "24.50",
      "maxDrawdown": "8.5"
    },
    "quality": {
      "profitFactor": "2.35",
      "largestWin": "325.50",
      "largestLoss": "-180.25"
    },
    "trades": [... últimas 20 trades]
  }
}
```

### POST `/api/db/strategies`
Guardar estrategia en Supabase.

```bash
curl -X POST "http://localhost:3000/api/db/strategies" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "RSI Oversold Bounce",
    "parameters": {
      "rsiPeriod": 14,
      "rsiBuyLevel": 30,
      "stopLoss": 2,
      "takeProfit": 5
    },
    "rules": "Compra cuando RSI < 30, vende en TP o SL"
  }'
```

### GET `/api/db/strategies`
Recuperar estrategias guardadas.

```bash
curl "http://localhost:3000/api/db/strategies"
```

---

## 🧮 Lógica de Trading Mejorada

### Multi-Indicator Confirmation
El backtest ahora valida signals con múltiples indicadores:

1. **Entry Condition:**
   - RSI < BuyLevel OR Bollinger Band Lower Break
   - AND ATR > threshold para volatilidad

2. **Exit Condition:**
   - Precio ≥ Take Profit, O
   - Precio ≤ Stop Loss, O
   - RSI > SellLevel OR Bollinger Band Upper Break

3. **Position Management:**
   - Risk basado en % del balance
   - Dynamic SL basado en ATR
   - Trailing stop opcional

---

## 📊 Comparativa Backtest v1 vs v2

| Característica | v1 | v2 |
|---|---|---|
| Indicadores | 2 | 7 |
| Parámetros Configurables | 5 | 15+ |
| Stop Loss/Take Profit | ❌ | ✅ |
| Exit Reasons Tracking | ❌ | ✅ |
| Estrategias Guardadas | ❌ | ✅ |
| Profit Factor | ❌ | ✅ |
| Drawdown Tracking | Básico | Detallado |

---

## 🎮 Ejemplo de Uso Completo

### 1. Obtener Datos Históricos
```bash
# Sincronizar 90 días de BTC
curl -X POST "http://localhost:3000/api/historical/sync" \
  -H "Content-Type: application/json" \
  -d '{"symbol":"BTCUSDT","days":90}'
```

### 2. Obtener Candles
```bash
curl "http://localhost:3000/api/candles?symbol=BTCUSDT&limit=2160"
```

### 3. Crear Estrategia
```bash
curl -X POST "http://localhost:3000/api/db/strategies" \
  -d '{
    "name": "Multi-Indicator RSI-MACD",
    "parameters": {
      "rsiPeriod": 14,
      "rsiBuyLevel": 30,
      "macdFast": 12,
      "stopLossPercent": 2,
      "takeProfitPercent": 5
    }
  }'
```

### 4. Ejecutar Backtest
```bash
curl -X POST "http://localhost:3000/api/backtest/advanced" \
  -d '{
    "candleData": [... desde /api/candles],
    "strategy": "multi-indicator",
    "initialBalance": 10000,
    "riskPercentage": 2,
    "rsiPeriod": 14,
    "rsiBuyLevel": 30,
    "rsiSellLevel": 70,
    "stopLossPercent": 2,
    "takeProfitPercent": 5
  }'
```

### 5. Ver Resultados
```json
{
  "totalTrades": 45,
  "winRate": "62.5%",
  "roi": "24.50%",
  "maxDrawdown": "8.5%",
  "profitFactor": "2.35"
}
```

---

## 🔄 Indicadores en Acción

### RSI Signal
```javascript
const rsi = calculateRSI(closes, 14);
// rsi < 30 → Oversold (BUY)
// rsi > 70 → Overbought (SELL)
// rsi = 50 → Neutral
```

### MACD Crossover
```javascript
const macd = calculateMACD(closes, 12, 26, 9);
// histogram > 0 → Bullish
// histogram < 0 → Bearish
// Crossover → Momentum change
```

### Bollinger Bands Breakout
```javascript
const bb = calculateBollingerBands(closes, 20, 2);
// price < lower → Oversold bounce
// price > upper → Overbought rejection
// middle = SMA support/resistance
```

---

## 📈 Métricas de Calidad

Fase 2 ahora reporta:
- **Profit Factor:** Ganancias totales / Pérdidas totales
- **Largest Win/Loss:** Mayor ganancia y pérdida absoluta
- **Trade Duration:** Duración promedio en candles
- **Win/Loss Ratio:** Promedio de ganancia vs pérdida
- **Consecutive Wins/Losses:** Racha máxima

---

## 🔧 Configuración de Estrategias

### Estrategia Conservadora
```json
{
  "rsiPeriod": 14,
  "rsiBuyLevel": 35,
  "rsiSellLevel": 65,
  "stopLossPercent": 1.5,
  "takeProfitPercent": 3,
  "bbPeriod": 20,
  "riskPercentage": 1
}
```

### Estrategia Agresiva
```json
{
  "rsiPeriod": 10,
  "rsiBuyLevel": 25,
  "rsiSellLevel": 75,
  "stopLossPercent": 3,
  "takeProfitPercent": 7,
  "bbPeriod": 15,
  "riskPercentage": 3
}
```

### Estrategia Equilibrada
```json
{
  "rsiPeriod": 14,
  "rsiBuyLevel": 30,
  "rsiSellLevel": 70,
  "stopLossPercent": 2,
  "takeProfitPercent": 5,
  "bbPeriod": 20,
  "riskPercentage": 2
}
```

---

## 📚 Próximos Pasos

- [ ] Optimización automática de parámetros
- [ ] Walk-forward analysis
- [ ] Monte Carlo simulation
- [ ] Gráficos de equity curve
- [ ] Comparativa multi-estrategia

---

**Fase 2 lista para testing. Backtest engine now production-ready.**
