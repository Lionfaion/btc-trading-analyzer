/**
 * Ejemplo completo de integración: ChartRenderer + IndicatorsVisual + ChartDataHelper
 * PHASE 4: Gráficos & Indicadores
 */

// ============================================================================
// EJEMPLO 1: Cargar datos históricos y mostrar gráfico con indicadores
// ============================================================================

async function example1_BasicChartWithIndicators() {
  console.log('Ejemplo 1: Gráfico básico con indicadores');

  // 1. Inicializar renderizador de gráficos
  const chartRenderer = new ChartRenderer('chart');

  // 2. Obtener datos históricos
  const ohlcData = await ChartDataHelper.fetchHistoricalData('BTC', '1h', 100);

  if (!ohlcData) {
    console.error('No se pudieron cargar datos históricos');
    return;
  }

  // 3. Validar datos
  if (!ChartDataHelper.validateOHLCData(ohlcData)) {
    console.error('Datos OHLC inválidos');
    return;
  }

  // 4. Cargar datos en gráfico
  chartRenderer.loadPriceData(ohlcData);

  // 5. Calcular indicadores
  const indicators = IndicatorsVisual.calculateAllIndicators(ohlcData);

  // 6. Agregar indicadores al gráfico
  chartRenderer.addRSI(indicators.rsi, '#ff9900');
  chartRenderer.addMACD(indicators.macd);
  chartRenderer.addBollingerBands(indicators.bollingerBands);

  console.log('Gráfico cargado con éxito');
  return { chartRenderer, ohlcData, indicators };
}

// ============================================================================
// EJEMPLO 2: Mostrar señales de trading basadas en indicadores
// ============================================================================

function example2_TradingSignals(indicators, currentPrice) {
  console.log('Ejemplo 2: Señales de trading');

  const signals = IndicatorsVisual.getSignals(indicators, currentPrice);

  console.log('RSI Signal:', signals.rsiSignal);
  // Output: { type: 'OVERSOLD', value: 28.5, action: 'BUY' }

  console.log('MACD Signal:', signals.macdSignal);
  // Output: { type: 'BULLISH_CROSSOVER', action: 'BUY' }

  console.log('Bollinger Signal:', signals.bbSignal);
  // Output: { type: 'AT_LOWER_BAND', action: 'BUY' }

  console.log('Overall Signal:', signals.overall);
  // Output: 'STRONG_BUY' or 'STRONG_SELL' or 'NEUTRAL'

  // Usar señales para generar alertas
  if (signals.overall === 'STRONG_BUY') {
    console.warn('ALERTA: Señal de compra fuerte detectada');
    // Enviar notificación, activar alarma, etc.
  }

  return signals;
}

// ============================================================================
// EJEMPLO 3: Actualizar gráfico en tiempo real
// ============================================================================

async function example3_RealtimeUpdates(chartRenderer, ohlcData) {
  console.log('Ejemplo 3: Actualizaciones en tiempo real');

  // Simular actualización cada 5 segundos
  setInterval(async () => {
    try {
      // Obtener último precio
      const currentPrice = await ChartDataHelper.fetchCurrentPrice('BTC');

      // Obtener datos nuevos (últimas 24 horas)
      const newData = await ChartDataHelper.fetchHistoricalData('BTC', '1h', 24);

      if (newData && newData.length > 0) {
        // Fusionar con datos existentes
        const mergedData = ChartDataHelper.mergeData(ohlcData, newData);

        // Actualizar gráfico
        chartRenderer.loadPriceData(mergedData);

        // Recalcular indicadores
        const indicators = IndicatorsVisual.calculateAllIndicators(mergedData);

        // Actualizar indicadores en gráfico
        chartRenderer.clearIndicators();
        chartRenderer.addRSI(indicators.rsi);
        chartRenderer.addMACD(indicators.macd);

        console.log('Gráfico actualizado');
      }
    } catch (error) {
      console.error('Error en actualización:', error);
    }
  }, 5000);
}

// ============================================================================
// EJEMPLO 4: Integrar datos de liquidaciones
// ============================================================================

async function example4_LiquidationsOverlay(chartRenderer) {
  console.log('Ejemplo 4: Overlay de liquidaciones');

  const liquidationData = await ChartDataHelper.fetchLiquidationData();

  if (!liquidationData) {
    console.warn('No se pudieron cargar datos de liquidaciones');
    return;
  }

  // Crear datos históricos de liquidaciones (simulado)
  const liquidationHistory = [
    { time: 1676000000, long: liquidationData.long * 0.8, short: liquidationData.short * 1.2 },
    { time: 1676003600, long: liquidationData.long * 0.9, short: liquidationData.short * 1.1 },
    { time: 1676007200, long: liquidationData.long, short: liquidationData.short },
  ];

  chartRenderer.addLiquidationHeatmap(liquidationHistory);

  console.log('Overlay de liquidaciones agregado');
}

// ============================================================================
// EJEMPLO 5: Caching y persistencia de datos
// ============================================================================

async function example5_DataCaching() {
  console.log('Ejemplo 5: Caching de datos');

  const CACHE_KEY = 'btc_ohlc_cache';

  // 1. Intentar obtener datos del caché
  let ohlcData = ChartDataHelper.getCachedData(CACHE_KEY);

  if (!ohlcData) {
    console.log('Caché vacío, descargando datos...');

    // 2. Descargar datos del servidor
    ohlcData = await ChartDataHelper.fetchHistoricalData('BTC', '1h', 100);

    if (ohlcData) {
      // 3. Guardar en caché (60 minutos de expiración)
      ChartDataHelper.cacheData(ohlcData, CACHE_KEY, 60);
      console.log('Datos cacheados');
    }
  } else {
    console.log('Datos obtenidos del caché');
  }

  return ohlcData;
}

// ============================================================================
// EJEMPLO 6: Exportar datos a CSV
// ============================================================================

function example6_ExportData(ohlcData) {
  console.log('Ejemplo 6: Exportar datos');

  // Exportar datos OHLC a CSV
  ChartDataHelper.exportToCSV(ohlcData, 'btc_ohlc_2026-04.csv');

  console.log('Datos exportados a CSV');
}

// ============================================================================
// EJEMPLO 7: Análisis con Claude AI
// ============================================================================

async function example7_ClaudeAnalysis(indicators, currentPrice, liquidationData) {
  console.log('Ejemplo 7: Análisis con Claude AI');

  const signals = IndicatorsVisual.getSignals(indicators, currentPrice);

  const analysisPayload = {
    btcPrice: currentPrice,
    rsiValue: indicators.rsi[indicators.rsi.length - 1]?.value,
    rsiSignal: signals.rsiSignal.action,
    macdSignal: signals.macdSignal.action,
    bbSignal: signals.bbSignal.action,
    liquidationData: liquidationData,
    overallSignal: signals.overall,
  };

  try {
    const response = await fetch('/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(analysisPayload),
    });

    const result = await response.json();
    console.log('Análisis Claude:', result.analysis);

    return result.analysis;
  } catch (error) {
    console.error('Error en análisis:', error);
    return null;
  }
}

// ============================================================================
// EJEMPLO 8: Integración completa (Todo junto)
// ============================================================================

async function example8_CompleteIntegration() {
  console.log('Ejemplo 8: Integración completa');

  try {
    // 1. Inicializar gráfico
    const chartRenderer = new ChartRenderer('chart');

    // 2. Cargar datos (con caché)
    let ohlcData = ChartDataHelper.getCachedData('btc_cache');
    if (!ohlcData) {
      ohlcData = await ChartDataHelper.fetchHistoricalData('BTC', '1h', 100);
      ChartDataHelper.cacheData(ohlcData, 'btc_cache', 60);
    }

    // 3. Mostrar gráfico
    chartRenderer.loadPriceData(ohlcData);

    // 4. Calcular indicadores
    const indicators = IndicatorsVisual.calculateAllIndicators(ohlcData);

    // 5. Mostrar indicadores
    chartRenderer.addRSI(indicators.rsi, '#ff9900');
    chartRenderer.addMACD(indicators.macd);
    chartRenderer.addBollingerBands(indicators.bollingerBands);

    // 6. Obtener liquidaciones
    const liquidationData = await ChartDataHelper.fetchLiquidationData();
    const liquidationHistory = [
      { time: 1676032400, long: liquidationData.long, short: liquidationData.short },
    ];
    chartRenderer.addLiquidationHeatmap(liquidationHistory);

    // 7. Generar señales
    const currentPrice = ohlcData[ohlcData.length - 1].close;
    const signals = IndicatorsVisual.getSignals(indicators, currentPrice);
    console.log('Señales generadas:', signals.overall);

    // 8. Análisis con Claude
    const analysis = await example7_ClaudeAnalysis(
      indicators,
      currentPrice,
      liquidationData
    );

    console.log('INTEGRACIÓN COMPLETA EXITOSA');
    console.log('Precio actual:', currentPrice);
    console.log('Señal general:', signals.overall);
    console.log('Análisis Claude:', analysis);

    return {
      chartRenderer,
      ohlcData,
      indicators,
      signals,
      analysis,
      liquidationData,
    };
  } catch (error) {
    console.error('Error en integración completa:', error);
  }
}

// ============================================================================
// Uso desde HTML
// ============================================================================

/*
<button onclick="runExample()">Ejecutar Ejemplo</button>

<script>
  async function runExample() {
    const result = await example8_CompleteIntegration();
    console.log('Resultado:', result);
  }
</script>
*/

// ============================================================================
// Notas de uso
// ============================================================================

/*
1. REQUISITOS:
   - ChartRenderer (lib/chart-renderer.js)
   - IndicatorsVisual (lib/indicators-visual.js)
   - ChartDataHelper (lib/chart-data-helper.js)
   - TradingView Lightweight Charts CDN

2. FLUJO TÍPICO:
   a) Cargar datos históricos
   b) Calcular indicadores
   c) Renderizar gráfico
   d) Mostrar indicadores superpuestos
   e) Integrar liquidaciones
   f) Generar señales
   g) Enviar análisis a Claude

3. MANEJO DE ERRORES:
   - Verificar que los datos OHLC sean válidos
   - Usar caché como fallback
   - Manejar timeouts en APIs

4. PERFORMANCE:
   - Limitar número de candles mostrados (max 200)
   - Usar caché para datos históricos
   - Usar web workers para cálculos pesados
   - Debounce en actualizaciones frecuentes
*/
