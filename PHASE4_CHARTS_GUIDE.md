# PHASE 4: Gráficos & Indicadores Técnicos

## Resumen

Se han implementado **3 componentes** para Phase 4 del BTC Trading Analyzer:

1. **chart-renderer.js** - Renderiza gráficos OHLC con TradingView Lightweight Charts
2. **indicators-visual.js** - Calcula RSI, MACD, Bollinger Bands
3. **index_with_charts.html** - Interfaz completa con indicadores superpuestos

## Archivos Creados

```
/lib/
  ├── chart-renderer.js (380 líneas)
  ├── indicators-visual.js (370 líneas)
index_with_charts.html (700+ líneas)
```

## Características Implementadas

### 1. Chart Renderer (`lib/chart-renderer.js`)

Clase `ChartRenderer` que maneja:

- **Gráficos OHLC**: Velas (bullish/bearish) con colores personalizados
- **Múltiples indicadores superpuestos**:
  - RSI con líneas de niveles (30/70)
  - MACD con línea signal e histograma
  - Bollinger Bands (banda superior/media/inferior)
  - Heatmap de liquidaciones como histograma

**Métodos principales:**

```javascript
// Cargar datos OHLC
loadPriceData(ohlcData)

// Agregar indicadores
addRSI(rsiValues, color)
addMACD(macdData)
addBollingerBands(bbData)
addLiquidationHeatmap(liquidationData)

// Control
clearIndicators()
setTimeRange(candleCount)
getLatestPrice()
```

### 2. Indicadores Visual (`lib/indicators-visual.js`)

Clase `IndicatorsVisual` que calcula:

**RSI (Relative Strength Index)**
- Período: 14 (customizable)
- Fórmula: 100 - (100 / (1 + RS))
- Salida: Array de valores RSI con índice

**MACD (Moving Average Convergence Divergence)**
- EMA Rápido: 12 períodos
- EMA Lento: 26 períodos
- Signal: EMA de 9 períodos del MACD
- Histograma: diferencia MACD - Signal

**Bollinger Bands**
- Período: 20 (customizable)
- Desviaciones estándar: 2 (customizable)
- Salida: bandas superior/media/inferior

**Métodos:**

```javascript
// Cálculo individual
IndicatorsVisual.calculateRSI(prices, period)
IndicatorsVisual.calculateMACD(prices, fast, slow, signal)
IndicatorsVisual.calculateBollingerBands(prices, period, stdDev)

// Cálculo simultáneo
IndicatorsVisual.calculateAllIndicators(ohlcData, options)

// Señales de trading
IndicatorsVisual.getSignals(indicators, currentPrice)
```

### 3. Interfaz HTML Completa (`index_with_charts.html`)

**Secciones:**

1. **Gráfico interactivo** (500px altura)
   - TradingView Lightweight Charts
   - Controles: Cargar demo, mostrar/ocultar indicadores
   - Toggles para cada indicador

2. **Panel de indicadores**
   - Checkboxes para RSI, MACD, Bollinger, Liquidaciones
   - Actualización en tiempo real

3. **Datos de precio y liquidaciones**
   - Precio actual (BTC)
   - Liquidaciones long/short
   - Heatmap de dominancia

4. **Análisis Claude**
   - Integración con API `/api/analyze`
   - Señales de trading

## Integración paso a paso

### Opción 1: Usar `index_with_charts.html` directamente

```bash
# Reemplazar index.html actual con versión mejorada
cp index_with_charts.html index.html
```

### Opción 2: Integrar en `index.html` existente

1. **Agregar scripts en `<head>`:**
```html
<script src="https://unpkg.com/lightweight-charts@4.1.0/dist/lightweight-charts.standalone.production.js"></script>
<script src="lib/chart-renderer.js"></script>
<script src="lib/indicators-visual.js"></script>
```

2. **Agregar contenedor de gráfico:**
```html
<div class="chart-container">
    <h2>📊 Gráfico OHLC con Indicadores</h2>
    <div class="chart-controls">
        <button onclick="loadSampleData()">Cargar Demo</button>
        <button onclick="toggleIndicator('all')">Todos</button>
    </div>
    <div id="chart"></div>
</div>
```

3. **Inicializar en JavaScript:**
```javascript
let chartRenderer = null;

function initChart() {
    const chartContainer = document.getElementById('chart');
    chartRenderer = new ChartRenderer(chartContainer);
}

function loadSampleData() {
    if (!chartRenderer) initChart();
    
    const ohlcData = [
        { time: 1676000000, open: 67000, high: 67500, low: 66800, close: 67200 },
        // ... más datos
    ];
    
    chartRenderer.loadPriceData(ohlcData);
    const indicators = IndicatorsVisual.calculateAllIndicators(ohlcData);
    chartRenderer.addRSI(indicators.rsi, '#ff9900');
    chartRenderer.addMACD(indicators.macd);
    chartRenderer.addBollingerBands(indicators.bollingerBands);
}

document.addEventListener('DOMContentLoaded', initChart);
```

## Uso de API

### Cargar datos desde servidor

```javascript
async function loadHistoricalData() {
    const response = await fetch('/api/historical?symbol=BTC&interval=1h&limit=100');
    const ohlcData = await response.json();
    
    chartRenderer.loadPriceData(ohlcData);
    const indicators = IndicatorsVisual.calculateAllIndicators(ohlcData);
    
    chartRenderer.addRSI(indicators.rsi);
    chartRenderer.addMACD(indicators.macd);
}
```

### Integrar liquidaciones

```javascript
async function addLiquidationsToChart() {
    const response = await fetch('/api/liquidations');
    const { data } = await response.json();
    
    // Convertir a formato [{ time, long, short }, ...]
    const liqData = convertLiquidationData(data);
    chartRenderer.addLiquidationHeatmap(liqData);
}
```

## Colores y Estilos

**Tema oscuro profesional:**
- Fondo: `#0a0e27` (azul profundo)
- Color primario: `#1aff1a` (verde neón)
- Velas UP: `#1aff1a` (verde)
- Velas DOWN: `#ff4444` (rojo)
- Grid: `rgba(26, 255, 26, 0.1)` (verde semi-transparente)

**Indicadores:**
- RSI: `#ff9900` (naranja)
- MACD: `#00ccff` (cyan)
- Signal: `#ff00ff` (magenta)
- Bollinger: `rgba(26, 255, 26, 0.3)` (verde claro)
- Liquidaciones: histograma verde/rojo según dominancia

## Estructura de datos

### OHLC Format
```javascript
{
    time: 1676000000, // Unix timestamp
    open: 67000,
    high: 67500,
    low: 66800,
    close: 67200,
    volume: 1000000
}
```

### RSI Output
```javascript
{
    index: 14,
    value: 65.4 // valor RSI entre 0-100
}
```

### MACD Output
```javascript
{
    index: 35,
    macd: -0.0245,
    signal: -0.0198,
    histogram: -0.0047
}
```

### Bollinger Bands Output
```javascript
{
    index: 19,
    upper: 67850.2,
    middle: 67500,
    lower: 67149.8
}
```

## Configuración personalizada

### Cambiar períodos de indicadores

```javascript
const options = {
    rsiPeriod: 14,      // RSI período
    macdFast: 12,       // MACD rápido
    macdSlow: 26,       // MACD lento
    macdSignal: 9,      // MACD signal
    bbPeriod: 20,       // Bollinger período
    bbStdDev: 2         // Bollinger desviaciones
};

const indicators = IndicatorsVisual.calculateAllIndicators(ohlcData, options);
```

### Personalizar colores de indicadores

```javascript
chartRenderer.addRSI(indicators.rsi, '#00ff00'); // Verde personalizado
chartRenderer.addMACD(indicators.macd, '#ffff00'); // Amarillo
```

## Signals de Trading

```javascript
const signals = IndicatorsVisual.getSignals(indicators, currentPrice);

console.log(signals.rsiSignal);      // { type, value, action }
console.log(signals.macdSignal);     // { type, action }
console.log(signals.bbSignal);       // { type, action }
console.log(signals.overall);        // 'STRONG_BUY', 'STRONG_SELL', 'NEUTRAL'
```

**Tipos de señal:**
- RSI: `OVERSOLD` (<30) → BUY, `OVERBOUGHT` (>70) → SELL
- MACD: `BULLISH_CROSSOVER` → BUY, `BEARISH_CROSSOVER` → SELL
- BB: `AT_LOWER_BAND` → BUY, `AT_UPPER_BAND` → SELL

## Próximos pasos (PHASE 5+)

1. **Historial persistente** - Guardar análisis y trades en DB
2. **Alertas automáticas** - Notificaciones cuando RSI cruza niveles
3. **Backtesting** - Simular estrategias con datos históricos
4. **Mejoras visuales** - Análisis avanzados, más indicadores
5. **Optimizaciones** - Caché de datos, worker threads

## Troubleshooting

**Gráfico no aparece:**
- Verificar que `lightweight-charts.js` se carga correctamente
- Revisar console para errores de JavaScript
- Asegurar que div #chart existe en el DOM

**Indicadores no se muestran:**
- Verificar que `calculateAllIndicators()` retorna datos válidos
- Revisar que los datos OHLC tienen suficientes candles (RSI necesita 15+ para 14-período)
- Usar `console.log()` para debug

**Datos de liquidaciones no aparecen:**
- Verificar API `/api/liquidations` retorna formato correcto
- Asegurar que datos están en formato `{ time, long, short }`

## Referencias

- [TradingView Lightweight Charts Docs](https://tradingingview.github.io/lightweight-charts/)
- [RSI Fórmula](https://en.wikipedia.org/wiki/Relative_strength_index)
- [MACD Explicado](https://en.wikipedia.org/wiki/MACD)
- [Bollinger Bands](https://en.wikipedia.org/wiki/Bollinger_Bands)
