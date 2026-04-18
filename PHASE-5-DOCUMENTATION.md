# PHASE 5: Advanced Order Flow & Historial
**Estado:** IMPLEMENTADO (MVP sin alertas email)

---

## Resumen

PHASE 5 agrega tres funcionalidades principales al BTC Trading Analyzer:

1. **Análisis Avanzado de Order Flow** - Detecta liquidaciones en zonas críticas, posiciones "trapped", presión de mercado
2. **Estadísticas de Trading** - Win Rate, Avg Win/Loss, Profit Factor, Sharpe Ratio, ROI, Max Drawdown
3. **Historial de Trades** - Tabla interactiva con todos los trades (demo data en MVP)

---

## Archivos Creados

### 1. `/api/analysis/order-flow.js` (12 KB)
Análisis avanzado de order flow y liquidaciones.

**Endpoint:** `POST /api/analysis/order-flow`

**Entrada:**
```json
{
  "btcPrice": 43500.50,
  "liquidationData": [
    { "side": "long", "volume": 425000000, "price": 43400, "time": "2026-04-18T12:00:00Z" },
    { "side": "short", "volume": 380000000, "price": 43550, "time": "2026-04-18T12:05:00Z" }
  ],
  "historyPeriod": 24
}
```

**Salida:**
```json
{
  "success": true,
  "analysis": {
    "timestamp": "2026-04-18T12:30:00Z",
    "currentPrice": 43500.50,
    "analysisWindow": "24h",
    "alerts": [
      {
        "type": "AGGRESSIVE_ZONE",
        "severity": "HIGH",
        "message": "Major liquidation zone...",
        "recommendation": "Be cautious..."
      }
    ],
    "signals": {
      "biasBullish": {
        "strength": "MODERATE",
        "reason": "More shorts liquidated than longs..."
      }
    },
    "orderFlowMetrics": {
      "hotZones": [ { "rangeKey": "above", "priceLevel": 43500, "volume": 125000, ... } ],
      "trappedLongs": { "count": 45, "totalVolume": 125000000, ... },
      "trappedShorts": { "count": 38, "totalVolume": 112000000, ... },
      "marketPressure": { "totalLiquidations": 83, "shortPercentage": 52.3, ... }
    },
    "risks": [ { "type": "LIQUIDATION_CLUSTER", "level": "HIGH", ... } ]
  }
}
```

**Funcionalidades:**
- Agrupa liquidaciones por rango de precio
- Identifica "hot zones" (áreas con alta concentración)
- Detecta posiciones "trapped" (liquidadas en contrarios)
- Calcula presión de mercado (short vs long dominance)
- Genera alertas automáticas
- Guardar análisis en DB si está disponible

---

### 2. `/api/stats/calculate.js` (10 KB)
Calcula estadísticas de trading.

**Endpoint:** `GET /api/stats/calculate` (recupera desde DB) o `POST` (calcula desde trades proporcionados)

**Entrada (POST):**
```json
{
  "trades": [
    {
      "id": "1",
      "symbol": "BTC",
      "strategy": "RSI-MACD",
      "entryTime": "2026-04-10T10:00:00Z",
      "exitTime": "2026-04-11T15:30:00Z",
      "entryPrice": 43000,
      "exitPrice": 43500,
      "quantity": 0.1,
      "pnl": 50,
      "pnlPercent": 0.12
    }
  ],
  "initialCapital": 10000
}
```

**Salida:**
```json
{
  "success": true,
  "stats": {
    "totalTrades": 5,
    "winningTrades": 3,
    "losingTrades": 2,
    "breakEvenTrades": 0,
    "winRate": 60.0,
    "totalWins": 210.0,
    "totalLosses": 65.0,
    "avgWin": 70.0,
    "avgLoss": 32.5,
    "profitFactor": 3.23,
    "totalPnL": 145.0,
    "roi": 1.45,
    "sharpeRatio": 1.42,
    "maxDrawdown": 5.67,
    "consecutiveWins": 2,
    "consecutiveLosses": 1,
    "averageWinLossRatio": 2.15,
    "expectancy": 29.0,
    "avgTradeDuration": { "hours": 18.5, "days": 0.77 },
    "tradeDetails": { "BTC": { "totalTrades": 5, "wins": 3, ... } }
  },
  "timestamp": "2026-04-18T12:30:00Z"
}
```

**Métricas Calculadas:**
- **Win Rate**: % de trades ganadores (60% = bueno)
- **Profit Factor**: ganancias totales / pérdidas totales (> 1.5 = bueno)
- **Sharpe Ratio**: retorno ajustado por volatilidad (> 1.0 = bueno)
- **Max Drawdown**: pérdida máxima desde peak (< 20% = bueno)
- **ROI**: retorno sobre inversión inicial
- **Expectancy**: ganancia esperada promedio por trade

---

### 3. `/api/alerts/send.js` (6 KB)
Sistema de alertas (placeholder para futuras integraciones con SendGrid, etc.)

**Endpoint:** `POST /api/alerts/send`

**Entrada:**
```json
{
  "alertType": "STRATEGY_SIGNAL",
  "data": {
    "symbol": "BTC",
    "signal": "BUY",
    "confidence": 85,
    "price": 43500.50,
    "recommendation": "Enter long position with 2% risk"
  },
  "userEmail": "user@example.com",
  "preferences": {
    "emailAlerts": false
  }
}
```

**Tipos de Alertas Disponibles:**
- `STRATEGY_SIGNAL` - Señal de estrategia (BUY/SELL)
- `LIQUIDATION_ALERT` - Alerta por liquidación agresiva
- `TRADE_EXECUTED` - Trade ejecutado
- `POSITION_CLOSED` - Posición cerrada
- `DAILY_SUMMARY` - Resumen diario

**Nota:** Por defecto, las alertas están deshabilitadas (`emailAlerts: false`). Para habilitarlas, necesitas:
1. Configurar `SENDGRID_API_KEY` en variables de entorno
2. Descomenta el código de SendGrid en `send.js`
3. Cambiar `preferences.emailAlerts` a `true`

---

## Interfaz de Usuario (index.html)

### Nuevo: Dashboard de Estadísticas
Panel con 4 métricas principales:
- **Win Rate**: Tasa de ganancias (%)
- **Avg Win/Loss**: Ratio promedio de ganancias/pérdidas
- **Profit Factor**: Ganancias/Pérdidas totales
- **Sharpe Ratio**: Retorno ajustado por riesgo

Botón: "Cargar Estadísticas" → llama a `/api/stats/calculate`

---

### Nuevo: Análisis Avanzado de Order Flow
Panel que detecta:
- Zonas de liquidación agresiva
- Posiciones "trapped" (longs/shorts liquidados)
- Presión del mercado
- Alertas automáticas

Botón: "Analizar Order Flow" → requiere datos de liquidaciones previos

---

### Nuevo: Historial de Trades
Tabla interactiva con:
- Fecha del trade
- Símbolo (BTC, ETH, etc)
- Precio de entrada/salida
- P&L ($)
- P&L (%)

Entrada: número de trades a mostrar (default: 10, max: 100)
Botón: "Cargar Historial"

---

## Cómo Usar

### 1. Cargar Estadísticas
```
1. Clic en "Cargar Estadísticas"
2. Se llamará a /api/stats/calculate (GET) para traer trades desde DB
3. Si no hay DB, mostrará demo data con 5 trades de ejemplo
4. Se actualizarán las 4 tarjetas con métricas clave
5. Se mostrará tabla adicional con stats detallados
```

### 2. Analizar Order Flow
```
1. Primero: obtén precio (clic "Refresh Price")
2. Luego: obtén liquidaciones (clic "Fetch Liquidations")
3. Clic en "Analizar Order Flow"
4. Se detectarán:
   - Hot zones (áreas con mucha liquidación)
   - Posiciones trapped (longs vs shorts liquidados)
   - Señales de presión de mercado
   - Alertas automáticas
```

### 3. Ver Historial de Trades
```
1. Ingresa número de trades (1-100)
2. Clic "Cargar Historial"
3. Se mostrarán en tabla:
   - Fecha, símbolo, precio entrada/salida
   - P&L en $ y %
4. En MVP, muestra demo data (2 trades)
5. Cuando DB esté integrada, traerá datos reales
```

---

## Integración con Otros Componentes

### Depende de:
- **PHASE 0**: Database (Supabase) para guardar análisis y trades
- **PHASE 1**: Datos históricos de precios
- **PHASE 2**: Backtest engine (para generar trades)
- **PHASE 3**: Bybit API (para ejecutar trades automáticos)

### Usado por:
- **PHASE 6**: Optimizaciones (usa stats para ajustar parámetros)

---

## Testing

### Test Local (sin DB)
```bash
# 1. Abre index.html en navegador
# 2. Clic "Refresh Price" → obtiene precio de BTC
# 3. Clic "Fetch Liquidations" → obtiene datos Bybit/Coinglass
# 4. Clic "Cargar Estadísticas" → muestra demo data con 5 trades
# 5. Clic "Analizar Order Flow" → analiza liquidaciones
# 6. Clic "Cargar Historial" → muestra demo trades
```

### Test con API (Vercel)
```bash
# Después de deploy en Vercel

# Test Order Flow Analysis
curl -X POST https://btc-trading-analyzer.vercel.app/api/analysis/order-flow \
  -H "Content-Type: application/json" \
  -d '{"btcPrice": 43500, "liquidationData": [{"side": "long", "volume": 425000000}]}'

# Test Stats Calculation
curl -X GET https://btc-trading-analyzer.vercel.app/api/stats/calculate

# Test Alerts (sin enviar emails)
curl -X POST https://btc-trading-analyzer.vercel.app/api/alerts/send \
  -H "Content-Type: application/json" \
  -d '{"alertType": "STRATEGY_SIGNAL", "data": {"signal": "BUY", "price": 43500}}'
```

---

## Limitaciones del MVP

1. **Historial de Trades**: Solo muestra demo data (2 trades). Para datos reales, necesita DB integrada (PHASE 0).
2. **Alertas Email**: Deshabilitadas por defecto. Requiere SENDGRID_API_KEY para activar.
3. **Comparación de Estrategias**: No soportado (user eligió "una estrategia").
4. **Filtros Avanzados**: Historial no permite filtrar por fecha/símbolo/estrategia (MVP simple).
5. **Persistencia**: Análisis de order flow se guarda en DB si está disponible, sino solo en memoria.

---

## Próximos Pasos (PHASE 6)

1. **Integración con Supabase**: Guardar/cargar trades reales desde DB
2. **Email Alerts**: Integrar SendGrid para notificaciones
3. **Optimización de UI**: Dashboard más interactivo con gráficos
4. **Comparación de Estrategias**: Múltiples estrategias lado a lado
5. **Filtros Avanzados**: Filtrar por fecha, símbolo, estrategia, resultado
6. **Export de Reportes**: Descargar historial en CSV/PDF

---

## Rutas de API

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/api/analysis/order-flow` | Analiza order flow y liquidaciones |
| GET | `/api/stats/calculate` | Obtiene stats desde DB |
| POST | `/api/stats/calculate` | Calcula stats desde trades proporcionados |
| POST | `/api/alerts/send` | Envía alertas (si está configurado) |

---

## Ficheros Modificados/Creados

### Creados:
- `/api/analysis/order-flow.js` - Análisis de order flow
- `/api/stats/calculate.js` - Cálculo de estadísticas
- `/api/alerts/send.js` - Sistema de alertas
- `/PHASE-5-DOCUMENTATION.md` - Este archivo

### Modificados:
- `/index.html` - Agregados 3 nuevos paneles + funciones JS

---

## Soporte

Para integrar PHASE 5 completamente:
1. Completar PHASE 0 (Database en Supabase)
2. Configurar variables de entorno en Vercel
3. Descomentar código de SendGrid en `/api/alerts/send.js`
4. Deploy a Vercel

Para MVP local:
- Todo funciona con demo data
- No requiere DB ni API keys adicionales
- Perfecto para testing y demostración
