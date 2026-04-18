# PHASE 2: Backtest Engine - Documentación

## Descripción General

PHASE 2 implementa un **motor de backtest profesional** con soporte para indicadores técnicos estándar (RSI, MACD, Bollinger Bands) y análisis de estrategias de trading en datos históricos de BTC.

---

## Estructura de Archivos

```
/lib/
  └── backtest-engine.js          # Motor principal de backtest
  
/api/
  ├── binance-historical.js       # Obtiene histórico de BTC (Binance API)
  ├── indicators/
  │   ├── rsi.js                  # Endpoint calculador de RSI
  │   ├── macd.js                 # Endpoint calculador de MACD
  │   └── bollinger.js            # Endpoint calculador de Bollinger Bands
  └── backtest/
      └── run.js                  # Endpoint principal de backtest

/index.html                         # UI actualizada con panel de backtest
```

---

## Indicadores Técnicos Implementados

### 1. RSI (Relative Strength Index)
**Endpoint:** `POST /api/indicators/rsi`

Calcula el índice de fuerza relativa basado en cambios de precio.

**Body:**
```json
{
  "closes": [67000, 67100, 67200, ...],
  "period": 14
}
```

**Señales:**
- `< 30`: OVERSOLD (oportunidad de compra)
- `> 70`: OVERBOUGHT (oportunidad de venta)
- `30-70`: Zona neutra

---

### 2. MACD (Moving Average Convergence Divergence)
**Endpoint:** `POST /api/indicators/macd`

Seguimiento de tendencias mediante EMA convergencia/divergencia.

**Body:**
```json
{
  "closes": [67000, 67100, 67200, ...],
  "fastPeriod": 12,
  "slowPeriod": 26,
  "signalPeriod": 9
}
```

**Componentes:**
- MACD Line: EMA(12) - EMA(26)
- Signal Line: EMA(9) de MACD
- Histogram: MACD - Signal Line

**Señales:**
- `BULLISH_CROSSOVER`: MACD cruzó hacia arriba de Signal
- `BEARISH_CROSSOVER`: MACD cruzó hacia abajo de Signal

---

### 3. Bollinger Bands
**Endpoint:** `POST /api/indicators/bollinger`

Bandas de volatilidad alrededor del precio promedio.

**Body:**
```json
{
  "closes": [67000, 67100, 67200, ...],
  "period": 20,
  "stdDevs": 2
}
```

**Componentes:**
- Banda Superior: SMA + (2 * StdDev)
- Banda Media: SMA
- Banda Inferior: SMA - (2 * StdDev)

**Señales:**
- `TOUCH_UPPER_OVERBOUGHT`: Toque de banda superior
- `TOUCH_LOWER_OVERSOLD`: Toque de banda inferior
- `SQUEEZE`: Volatilidad muy baja (< 2%)

---

## Motor de Backtest

### Endpoint Principal
**POST `/api/backtest/run`**

**Body:**
```json
{
  "candleData": [
    {
      "timestamp": 1704067200,
      "open": 67000,
      "high": 67500,
      "low": 66800,
      "close": 67200,
      "volume": 1234567890
    },
    ...
  ],
  "indicators": ["RSI", "MACD", "BB"],
  "timeframe": "1h",
  "initialBalance": 10000,
  "riskPercentage": 2
}
```

### Lógica de Trading

**Generación de Señales:**
1. Calcula RSI, MACD y Bollinger Bands para cada vela
2. Asigna puntuación a cada indicador:
   - RSI oversold/overbought: +2 puntos
   - MACD crossover: +2 puntos
   - Bollinger Band touch: +1 punto

3. Genera señal según puntuación:
   - BUY si score > SELL y score >= 2
   - SELL si score > BUY y score >= 2
   - HOLD si no hay consenso

**Ejecución de Trades:**
- **BUY:** Usa % de saldo disponible según riesgo configurado
- **SELL:** Cierra posición actual, calcula P&L
- Actualiza equity y drawdown en tiempo real

### Response

```json
{
  "success": true,
  "metadata": {
    "candlesLoaded": 120,
    "timeframe": "1h",
    "indicatorsUsed": ["RSI", "MACD", "BB"],
    "backtestDate": "2025-04-18T12:34:56.789Z"
  },
  "summary": {
    "initialBalance": 10000,
    "finalBalance": 10523.45,
    "totalProfit": 523.45,
    "roi": "5.23%",
    "totalTrades": 5,
    "winTrades": 3,
    "loseTrades": 2,
    "winRate": "60%",
    "maxDrawdown": "3.45%",
    "avgWin": "2.15%",
    "avgLoss": "-1.20%"
  },
  "stats": {
    "buyAndHold": {
      "profit": 450.75,
      "roi": "4.51%"
    },
    "quality": {
      "profitFactor": 2.34,
      "sharpeRatio": 1.45,
      "expectedValue": 1.12,
      "maxConsecutiveWins": 2,
      "maxConsecutiveLosses": 1
    }
  },
  "trades": [
    {
      "type": "BUY",
      "price": 67000,
      "quantity": 0.1493,
      "timestamp": 1704067200,
      "candleIndex": 5
    },
    {
      "type": "SELL",
      "price": 67200,
      "quantity": 0.1493,
      "profit": 29.86,
      "profitPercent": "0.45",
      "timestamp": 1704070800,
      "candleIndex": 6,
      "holdingPeriod": 1
    },
    ...
  ],
  "signals": [
    {
      "index": 0,
      "timestamp": 1704067200,
      "close": 67000,
      "indicators": {
        "rsi": null,
        "macd": null,
        "bb": null
      },
      "action": "HOLD"
    },
    ...
  ]
}
```

---

## Métricas Calculadas

### Summary Metrics
- **ROI:** Retorno sobre inversión
- **Win Rate:** % de trades ganadores
- **Max Drawdown:** Pérdida máxima desde pico
- **Avg Win/Loss:** Ganancia/pérdida promedio por trade

### Quality Metrics
- **Profit Factor:** Total ganancia / Total pérdida (> 2.0 es excelente)
- **Sharpe Ratio:** Retorno ajustado por riesgo (> 1.0 es bueno)
- **Expected Value:** Ganancia esperada por trade
- **Consecutive Win/Loss Streaks:** Resiliencia del sistema

### Comparativa
- **Buy & Hold:** ROI si simplemente compra y mantiene

---

## Uso desde la UI

### Panel de Backtest

1. **Configuración:**
   - Saldo Inicial: cantidad a invertir (default: $10,000)
   - Riesgo por Trade: % de saldo por operación (default: 2%)
   - Indicadores: seleccionar RSI, MACD, Bollinger Bands

2. **Ejecución:**
   - Click en "Ejecutar Backtest"
   - Obtiene histórico de 120 velas (5 días de 1h)
   - Analiza y muestra resultados

3. **Resultados:**
   - Resumen: ganancia, ROI, numero de trades
   - Comparativa: vs Buy & Hold
   - Calidad: profit factor, sharpe ratio, expectativa
   - Recomendación: estado del sistema

---

## Datos Históricos

### Fuente: Binance Public API

**Endpoint:** `/api/binance-historical`

```
GET /api/binance-historical?timeframe=1h&limit=120
```

- Obtiene datos en tiempo real desde Binance
- Fallback a datos demo si API no disponible
- Soporta timeframes: 1m, 5m, 15m, 1h, 4h, 1d

---

## Próximas Mejoras (PHASE 3)

- [ ] Optimización de parámetros (grid search)
- [ ] Múltiples activos (ETH, SOL, etc)
- [ ] Almacenamiento de backtests en BD
- [ ] Análisis Monte Carlo
- [ ] Validación Out-of-Sample
- [ ] Integración TradingView charting
- [ ] Gestión de posiciones (SL/TP)

---

## Testing

### Ejemplo: Ejecutar backtest con cURL

```bash
curl -X POST http://localhost:3000/api/backtest/run \
  -H "Content-Type: application/json" \
  -d '{
    "candleData": [
      {"timestamp": 1704067200, "open": 67000, "high": 67500, "low": 66800, "close": 67200, "volume": 1000000},
      ...
    ],
    "indicators": ["RSI", "MACD", "BB"],
    "timeframe": "1h",
    "initialBalance": 10000,
    "riskPercentage": 2
  }'
```

### Ejemplo: Calcular RSI

```bash
curl -X POST http://localhost:3000/api/indicators/rsi \
  -H "Content-Type: application/json" \
  -d '{
    "closes": [67000, 67100, 67050, 67200, ...],
    "period": 14
  }'
```

---

## Notas Importantes

1. **Backtesting Limitations:**
   - No incluye slippage/comisiones
   - Entrada en close del candle
   - Sin análisis de gaps
   - Demo data menos realista que datos reales

2. **Optimización:**
   - Revisa profit factor > 2.0
   - Win rate > 50% ideal
   - Max drawdown < 15% recomendado
   - Sharpe ratio > 1.0 bueno

3. **Recomendación:**
   - Backtest pasado es indicador débil de futuro
   - Valida en múltiples timeframes
   - Prueba con datos reales (paper trading)
   - Implementa gestión de riesgo estricta

---

**Status:** PHASE 2 COMPLETADA ✅
**Fecha:** 2025-04-18
**Indicadores:** RSI, MACD, Bollinger Bands
**Timeframes:** 1h (extensible)
