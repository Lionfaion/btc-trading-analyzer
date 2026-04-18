/**
 * API Endpoint: Backtest Engine
 * POST /api/backtest/run
 *
 * Body:
 * {
 *   "candleData": [
 *     {
 *       "timestamp": 1234567890,
 *       "open": 67000,
 *       "high": 67500,
 *       "low": 66800,
 *       "close": 67200,
 *       "volume": 1234567
 *     },
 *     ...
 *   ],
 *   "indicators": ["RSI", "MACD", "BB"],  // Indicadores a usar
 *   "timeframe": "1h",                    // Timeframe de velas
 *   "initialBalance": 10000,              // Saldo inicial
 *   "riskPercentage": 2                   // % de riesgo por trade
 * }
 */

import BacktestEngine from '../../lib/backtest-engine.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const {
    candleData,
    indicators = ['RSI', 'MACD', 'BB'],
    timeframe = '1h',
    initialBalance = 10000,
    riskPercentage = 2
  } = req.body;

  // Validaciones
  if (!candleData || !Array.isArray(candleData) || candleData.length === 0) {
    return res.status(400).json({ error: 'candleData array is required' });
  }

  if (candleData.length < 100) {
    return res.status(400).json({
      error: `Necesitas al menos 100 velas para backtest (tienes ${candleData.length})`
    });
  }

  // Validar estructura de velas
  const firstCandle = candleData[0];
  if (!firstCandle.open || !firstCandle.high || !firstCandle.low || !firstCandle.close) {
    return res.status(400).json({
      error: 'Cada vela debe tener: open, high, low, close'
    });
  }

  try {
    // Crear instancia del motor
    const engine = new BacktestEngine({
      timeframe,
      initialBalance,
      riskPercentage,
      indicators: indicators.filter((ind) => ['RSI', 'MACD', 'BB'].includes(ind))
    });

    // Cargar velas
    const loadedCount = engine.loadCandles(candleData);

    // Ejecutar backtest
    const report = await engine.run();

    // Calcular estadísticas adicionales
    const stats = calculateAdditionalStats(report, candleData);

    return res.status(200).json({
      success: true,
      metadata: {
        candlesLoaded: loadedCount,
        timeframe,
        indicatorsUsed: engine.indicators,
        backtestDate: new Date().toISOString()
      },
      ...report,
      stats
    });
  } catch (error) {
    console.error('Backtest execution error:', error);
    return res.status(500).json({ error: error.message });
  }
}

/**
 * Calcula estadísticas adicionales del backtest
 */
function calculateAdditionalStats(report, candleData) {
  const firstPrice = candleData[0].close;
  const lastPrice = candleData[candleData.length - 1].close;
  const buyAndHoldProfit = lastPrice - firstPrice;
  const buyAndHoldROI = ((buyAndHoldProfit / firstPrice) * 100).toFixed(2);

  const trades = report.trades.filter((t) => t.type === 'SELL');

  let consecutiveWins = 0;
  let consecutiveLosses = 0;
  let maxConsecutiveWins = 0;
  let maxConsecutiveLosses = 0;

  for (const trade of trades) {
    const profit = parseFloat(trade.profitPercent || 0);
    if (profit > 0) {
      consecutiveWins++;
      consecutiveLosses = 0;
      if (consecutiveWins > maxConsecutiveWins) {
        maxConsecutiveWins = consecutiveWins;
      }
    } else {
      consecutiveLosses++;
      consecutiveWins = 0;
      if (consecutiveLosses > maxConsecutiveLosses) {
        maxConsecutiveLosses = consecutiveLosses;
      }
    }
  }

  // Calidad del sistema
  const quality = {
    maxConsecutiveWins,
    maxConsecutiveLosses,
    profitFactor: calculateProfitFactor(trades),
    sharpeRatio: calculateSharpeRatio(report, candleData),
    expectedValue: calculateExpectedValue(trades)
  };

  return {
    buyAndHold: {
      profit: parseFloat(buyAndHoldProfit.toFixed(2)),
      roi: buyAndHoldROI + '%'
    },
    quality
  };
}

/**
 * Calcula Profit Factor (ganancia total / pérdida total)
 */
function calculateProfitFactor(trades) {
  let totalWins = 0;
  let totalLosses = 0;

  for (const trade of trades) {
    const profit = parseFloat(trade.profitPercent || 0);
    if (profit > 0) {
      totalWins += profit;
    } else {
      totalLosses += Math.abs(profit);
    }
  }

  if (totalLosses === 0) return totalWins > 0 ? 999.99 : 0;
  return parseFloat((totalWins / totalLosses).toFixed(2));
}

/**
 * Calcula Sharpe Ratio (rendimiento ajustado por riesgo)
 */
function calculateSharpeRatio(report, candleData) {
  const returns = [];

  // Calcular retornos diarios
  for (let i = 1; i < candleData.length; i++) {
    const dayReturn = ((candleData[i].close - candleData[i - 1].close) / candleData[i - 1].close) * 100;
    returns.push(dayReturn);
  }

  if (returns.length === 0) return 0;

  // Media de retornos
  const meanReturn = returns.reduce((a, b) => a + b, 0) / returns.length;

  // Desviación estándar
  const variance = returns.reduce((sum, ret) => sum + Math.pow(ret - meanReturn, 2), 0) / returns.length;
  const stdDev = Math.sqrt(variance);

  if (stdDev === 0) return 0;

  // Sharpe Ratio (usando risk-free rate = 0)
  const sharpe = (meanReturn / stdDev) * Math.sqrt(252); // 252 días de trading al año

  return parseFloat(sharpe.toFixed(2));
}

/**
 * Calcula Expected Value (ganancia promedio por trade)
 */
function calculateExpectedValue(trades) {
  if (trades.length === 0) return 0;

  const totalProfit = trades.reduce((sum, t) => sum + parseFloat(t.profitPercent || 0), 0);
  return parseFloat((totalProfit / trades.length).toFixed(2));
}
