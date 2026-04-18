/**
 * Ejemplos de uso del Backtest Engine
 * PHASE 2: Motor de Backtest para BTC Trading Analyzer
 */

// =====================================================
// EJEMPLO 1: Ejecutar backtest básico con datos demo
// =====================================================

async function exampleBasicBacktest() {
  console.log('=== EJEMPLO 1: Backtest Básico ===');

  // Generar datos históricos demo (120 velas de 1 hora)
  const candleData = generateDemoCandles(120);

  try {
    const response = await fetch('/api/backtest/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        candleData,
        indicators: ['RSI', 'MACD', 'BB'],
        timeframe: '1h',
        initialBalance: 10000,
        riskPercentage: 2
      })
    });

    const result = await response.json();

    if (result.success) {
      console.log('✅ Backtest ejecutado exitosamente');
      console.log('ROI:', result.summary.roi);
      console.log('Trades:', result.summary.totalTrades);
      console.log('Win Rate:', result.summary.winRate);
    } else {
      console.error('❌ Error:', result.error);
    }
  } catch (error) {
    console.error('❌ Error de conexión:', error);
  }
}

// =====================================================
// EJEMPLO 2: Usar datos reales de Binance
// =====================================================

async function exampleWithRealData() {
  console.log('=== EJEMPLO 2: Backtest con datos reales ===');

  try {
    // Obtener histórico de Binance
    const historicalResponse = await fetch('/api/binance-historical?timeframe=1h&limit=120');
    const historicalData = await historicalResponse.json();

    if (!historicalData.success) {
      throw new Error('No se pudieron obtener datos históricos');
    }

    const candleData = historicalData.data;

    console.log(`Datos cargados: ${candleData.length} velas`);

    // Ejecutar backtest
    const backtestResponse = await fetch('/api/backtest/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        candleData,
        indicators: ['RSI', 'MACD', 'BB'],
        timeframe: '1h',
        initialBalance: 10000,
        riskPercentage: 2
      })
    });

    const result = await backtestResponse.json();

    if (result.success) {
      console.log('✅ Backtest completado');
      console.log(`Ganancia: $${result.summary.totalProfit}`);
      console.log(`ROI: ${result.summary.roi}`);
      console.log(`Profit Factor: ${result.stats.quality.profitFactor}`);
    }
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// =====================================================
// EJEMPLO 3: Calcular indicadores individuales
// =====================================================

async function exampleIndicators() {
  console.log('=== EJEMPLO 3: Cálculo de indicadores ===');

  const closes = generateDemoCandles(120).map((c) => c.close);

  // Calcular RSI
  console.log('\n--- RSI ---');
  try {
    const rsiResponse = await fetch('/api/indicators/rsi', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        closes,
        period: 14
      })
    });

    const rsiData = await rsiResponse.json();
    console.log('RSI actual:', rsiData.latest.rsi);
    console.log('Señal:', rsiData.signal);
  } catch (error) {
    console.error('Error RSI:', error);
  }

  // Calcular MACD
  console.log('\n--- MACD ---');
  try {
    const macdResponse = await fetch('/api/indicators/macd', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        closes,
        fastPeriod: 12,
        slowPeriod: 26,
        signalPeriod: 9
      })
    });

    const macdData = await macdResponse.json();
    const latest = macdData.latest;
    console.log('MACD:', latest.macd);
    console.log('Signal:', latest.signal);
    console.log('Histogram:', latest.histogram);
    console.log('Señal:', macdData.signal);
  } catch (error) {
    console.error('Error MACD:', error);
  }

  // Calcular Bollinger Bands
  console.log('\n--- Bollinger Bands ---');
  try {
    const bbResponse = await fetch('/api/indicators/bollinger', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        closes,
        period: 20,
        stdDevs: 2
      })
    });

    const bbData = await bbResponse.json();
    const latest = bbData.latest;
    console.log('Banda Superior:', latest.upper);
    console.log('Banda Media:', latest.middle);
    console.log('Banda Inferior:', latest.lower);
    console.log('Ancho bandas:', latest.width + '%');
    console.log('Señal:', bbData.signal);
  } catch (error) {
    console.error('Error BB:', error);
  }
}

// =====================================================
// EJEMPLO 4: Comparar múltiples estrategias
// =====================================================

async function exampleCompareStrategies() {
  console.log('=== EJEMPLO 4: Comparar estrategias ===');

  const candleData = generateDemoCandles(120);

  const strategies = [
    { name: 'Solo RSI', indicators: ['RSI'] },
    { name: 'RSI + MACD', indicators: ['RSI', 'MACD'] },
    { name: 'Todos', indicators: ['RSI', 'MACD', 'BB'] },
    { name: 'Solo Bollinger', indicators: ['BB'] }
  ];

  const results = [];

  for (const strategy of strategies) {
    try {
      const response = await fetch('/api/backtest/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          candleData,
          indicators: strategy.indicators,
          timeframe: '1h',
          initialBalance: 10000,
          riskPercentage: 2
        })
      });

      const result = await response.json();

      if (result.success) {
        results.push({
          strategy: strategy.name,
          roi: parseFloat(result.summary.roi),
          winRate: parseFloat(result.summary.winRate),
          profitFactor: result.stats.quality.profitFactor,
          sharpeRatio: result.stats.quality.sharpeRatio
        });
      }
    } catch (error) {
      console.error(`Error en ${strategy.name}:`, error);
    }
  }

  // Mostrar comparativa
  console.log('\nResultados:');
  results.sort((a, b) => b.roi - a.roi);

  results.forEach((r, i) => {
    console.log(
      `${i + 1}. ${r.strategy}: ROI=${r.roi}% | WR=${r.winRate}% | PF=${r.profitFactor} | SR=${r.sharpeRatio}`
    );
  });

  if (results.length > 0) {
    console.log(`\n✅ Mejor estrategia: ${results[0].strategy} (${results[0].roi}% ROI)`);
  }
}

// =====================================================
// EJEMPLO 5: Optimización de parámetros
// =====================================================

async function exampleParameterOptimization() {
  console.log('=== EJEMPLO 5: Optimización de parámetros ===');

  const candleData = generateDemoCandles(120);
  const riskPercentages = [0.5, 1, 1.5, 2, 3, 5];
  const results = [];

  console.log('Probando diferentes % de riesgo...\n');

  for (const risk of riskPercentages) {
    try {
      const response = await fetch('/api/backtest/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          candleData,
          indicators: ['RSI', 'MACD', 'BB'],
          timeframe: '1h',
          initialBalance: 10000,
          riskPercentage: risk
        })
      });

      const result = await response.json();

      if (result.success) {
        results.push({
          risk,
          roi: parseFloat(result.summary.roi),
          maxDrawdown: parseFloat(result.summary.maxDrawdown),
          profitFactor: result.stats.quality.profitFactor
        });
      }
    } catch (error) {
      console.error(`Error con risk ${risk}:`, error);
    }
  }

  // Mostrar optimización
  console.log('Resultados por % de riesgo:');
  results.forEach((r) => {
    console.log(
      `Risk=${r.risk}% → ROI=${r.roi}% | MaxDD=${r.maxDrawdown}% | PF=${r.profitFactor}`
    );
  });

  const bestROI = results.reduce((max, r) => (r.roi > max.roi ? r : max));
  console.log(`\n✅ Mejor ROI con ${bestROI.risk}% riesgo: ${bestROI.roi}%`);
}

// =====================================================
// HELPER: Generar datos demo
// =====================================================

function generateDemoCandles(count) {
  const candles = [];
  let currentPrice = 67234.50;
  const now = Math.floor(Date.now() / 1000);

  for (let i = count; i > 0; i--) {
    const openPrice = currentPrice;
    const change = (Math.random() - 0.5) * currentPrice * 0.04;
    const closePrice = currentPrice + change;
    const high = Math.max(openPrice, closePrice) + Math.random() * (currentPrice * 0.005);
    const low = Math.min(openPrice, closePrice) - Math.random() * (currentPrice * 0.005);
    const volume = Math.floor(Math.random() * 500000000) + 50000000;

    candles.push({
      timestamp: now - i * 3600,
      open: parseFloat(openPrice.toFixed(2)),
      high: parseFloat(high.toFixed(2)),
      low: parseFloat(low.toFixed(2)),
      close: parseFloat(closePrice.toFixed(2)),
      volume
    });

    currentPrice = closePrice;
  }

  return candles;
}

// =====================================================
// EJECUTAR EJEMPLOS
// =====================================================

// Descomentar el ejemplo que quieras ejecutar:

// exampleBasicBacktest();
// exampleWithRealData();
// exampleIndicators();
// exampleCompareStrategies();
// exampleParameterOptimization();

console.log('Ejemplos disponibles (descomentar en el código):');
console.log('1. exampleBasicBacktest() - Backtest con datos demo');
console.log('2. exampleWithRealData() - Backtest con datos reales de Binance');
console.log('3. exampleIndicators() - Cálculo individual de indicadores');
console.log('4. exampleCompareStrategies() - Comparar múltiples estrategias');
console.log('5. exampleParameterOptimization() - Optimizar % de riesgo');
