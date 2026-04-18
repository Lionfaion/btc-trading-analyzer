# PHASE 4 - Quick Start Guide

## Resumen en 2 minutos

Se han creado **4 archivos** para Phase 4 (Gráficos & Indicadores):

| Archivo | Líneas | Función |
|---------|--------|---------|
| `lib/chart-renderer.js` | 380 | Renderiza gráficos OHLC con TradingView |
| `lib/indicators-visual.js` | 370 | Calcula RSI, MACD, Bollinger Bands |
| `lib/chart-data-helper.js` | 350 | Utilidades para cargar/procesar datos |
| `index_with_charts.html` | 700+ | Interfaz completa lista para usar |
| `examples/chart-integration-example.js` | 400 | 8 ejemplos de integración |

**Total: 2,200+ líneas de código listo para producción**

---

## Inicio rápido (30 segundos)

### Opción A: Usar interfaz completa (SIN cambios necesarios)

```bash
# Copiar archivo HTML actualizado
cp index_with_charts.html index.html
```

**Listo.** Abre `index.html` y haz clic en "Cargar Datos Demo".

### Opción B: Integrar en tu HTML existente

```html
<!-- 1. Agregar scripts en <head> -->
<script src="https://unpkg.com/lightweight-charts@4.1.0/dist/lightweight-charts.standalone.production.js"></script>
<script src="lib/chart-renderer.js"></script>
<script src="lib/indicators-visual.js"></script>
<script src="lib/chart-data-helper.js"></script>

<!-- 2. Agregar contenedor -->
<div id="chart" style="height: 500px;"></div>

<!-- 3. Agregar JavaScript -->
<script>
  async function loadChart() {
    const chartRenderer = new ChartRenderer('chart');
    const ohlcData = await ChartDataHelper.fetchHistoricalData('BTC', '1h', 100);
    chartRenderer.loadPriceData(ohlcData);
    
    const indicators = IndicatorsVisual.calculateAllIndicators(ohlcData);
    chartRenderer.addRSI(indicators.rsi);
    chartRenderer.addMACD(indicators.macd);
  }
  
  loadChart();
</script>
```

---

## Características principales

### 1. Gráficos OHLC
- Velas verde/rojo con sombras (wicks)
- Auto-escalado de ejes
- Zoom interactivo
- Grid personalizado

### 2. Indicadores superpuestos
```
RSI        → Línea naranja (30/70 niveles)
MACD       → Línea cyan + signal magenta + histograma
Bollinger  → Bandas superior/inferior + SMA
Liquidaciones → Histograma verde/rojo según dominancia
```

### 3. Cálculos precisos
- **RSI(14)**: 0-100, oversold <30, overbought >70
- **MACD(12,26,9)**: Cruce de EMA con línea signal
- **BB(20,2)**: Bandas a 2 desviaciones estándar

---

## API rápida

### ChartRenderer
```javascript
const chart = new ChartRenderer('chart-div');

// Cargar datos OHLC
chart.loadPriceData(ohlcData);

// Agregar indicadores
chart.addRSI(indicators.rsi, '#ff9900');
chart.addMACD(indicators.macd);
chart.addBollingerBands(indicators.bollingerBands);
chart.addLiquidationHeatmap(liquidationData);

// Control
chart.clearIndicators();
chart.setTimeRange(50);
chart.getLatestPrice();
```

### IndicatorsVisual
```javascript
// Calcular todo de una vez
const indicators = IndicatorsVisual.calculateAllIndicators(ohlcData);

// O individual
const rsi = IndicatorsVisual.calculateRSI(prices, 14);
const macd = IndicatorsVisual.calculateMACD(prices, 12, 26, 9);
const bb = IndicatorsVisual.calculateBollingerBands(prices, 20, 2);

// Generar señales
const signals = IndicatorsVisual.getSignals(indicators, currentPrice);
// signals.overall → 'STRONG_BUY' | 'STRONG_SELL' | 'NEUTRAL'
```

### ChartDataHelper
```javascript
// Cargar datos
const ohlcData = await ChartDataHelper.fetchHistoricalData('BTC', '1h', 100);
const currentPrice = await ChartDataHelper.fetchCurrentPrice('BTC');
const liqData = await ChartDataHelper.fetchLiquidationData();

// Caché
ChartDataHelper.cacheData(ohlcData, 'btc_cache', 60); // 60 minutos
const cached = ChartDataHelper.getCachedData('btc_cache');

// Normalizar datos de diferentes fuentes
const normalized = ChartDataHelper.normalizeData(rawData, 'binance');
```

---

## Ejemplos prácticos

### Ejemplo 1: Mostrar gráfico con RSI
```javascript
const chart = new ChartRenderer('chart');
const ohlcData = await ChartDataHelper.fetchHistoricalData('BTC', '1h', 100);
chart.loadPriceData(ohlcData);

const indicators = IndicatorsVisual.calculateAllIndicators(ohlcData);
chart.addRSI(indicators.rsi);
```

### Ejemplo 2: Generar señales de trading
```javascript
const indicators = IndicatorsVisual.calculateAllIndicators(ohlcData);
const signals = IndicatorsVisual.getSignals(indicators, 67234.50);

if (signals.overall === 'STRONG_BUY') {
  console.log('BUY:', signals.rsiSignal, signals.macdSignal, signals.bbSignal);
}
```

### Ejemplo 3: Actualización en tiempo real
```javascript
setInterval(async () => {
  const newData = await ChartDataHelper.fetchHistoricalData('BTC', '1h', 24);
  const merged = ChartDataHelper.mergeData(ohlcData, newData);
  chart.loadPriceData(merged);
}, 60000); // Cada minuto
```

---

## Datos de entrada esperados

### OHLC Format
```javascript
[
  {
    time: 1676000000,  // Unix timestamp (segundos)
    open: 67000,
    high: 67500,
    low: 66800,
    close: 67200,
    volume: 1000000
  }
  // ... más candles
]
```

### Mínimo requerido
- **RSI**: 15+ candles (para período 14)
- **MACD**: 35+ candles (para períodos 12,26,9)
- **Bollinger**: 20+ candles
- **Gráfico**: 1+ candle

---

## Troubleshooting

### "Gráfico no aparece"
```javascript
// Verificar que el div existe
const container = document.getElementById('chart');
console.log(container); // debe no ser null
```

### "Indicadores vacíos"
```javascript
// Verificar datos suficientes
console.log(ohlcData.length); // debe ser >= 35 para MACD
```

### "Liquidaciones no se muestran"
```javascript
// Convertir a formato esperado
const liqData = [
  { time: timestamp, long: 100000000, short: 50000000 }
];
chart.addLiquidationHeatmap(liqData);
```

---

## Colores personalizados

```javascript
// RSI con color personalizado
chart.addRSI(indicators.rsi, '#00ff00'); // Verde

// Cambiar colores de velas
// (requiere reinicializar chart con opciones)
const chart = new ChartRenderer('chart', {
  upColor: '#00ff00',      // Verde para UP
  downColor: '#ff0000',    // Rojo para DOWN
});
```

---

## Performance

**Optimizaciones incluidas:**

- Auto-validación de datos OHLC
- Deduplicación en merge
- Caché localStorage (60 min default)
- Lazy loading de indicadores
- Debounce en resize

**Recomendaciones:**
- Mostrar máx 200 candles (limitado automáticamente)
- Usar caché para datos > 50 candles
- Calcular indicadores una sola vez
- Actualizar cada 60 segundos mínimo

---

## Próximas mejoras (PHASE 5+)

- [ ] Más indicadores (EMA, Stochastic, ATR)
- [ ] Alertas automáticas
- [ ] Backtesting integrado
- [ ] Export a más formatos (JSON, Excel)
- [ ] Mobile responsive mejorado
- [ ] WebSocket para datos en vivo
- [ ] Análisis avanzado con ML

---

## Referencias

- [Repositorio: `/lib/`](lib/)
- [Guía completa](PHASE4_CHARTS_GUIDE.md)
- [Ejemplos detallados](examples/chart-integration-example.js)
- [TradingView Docs](https://tradingview.github.io/lightweight-charts/)

---

## Soporte

Para reportar bugs o sugerir mejoras:
1. Revisar console para errores JavaScript
2. Validar datos OHLC con `ChartDataHelper.validateOHLCData()`
3. Verificar que APIs retornan datos válidos
4. Consultar ejemplos en `examples/`

---

**¡PHASE 4 lista para producción!**
