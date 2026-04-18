// api/stats/calculate.js - Calcula estadísticas de trades
import { getSupabaseClient } from '../db/init.js';

/**
 * Calcula estadísticas de trading:
 * - Win Rate: % de trades ganadores
 * - Avg Win/Loss: promedio de ganancia/pérdida por trade
 * - Profit Factor: ganancias totales / pérdidas totales
 * - Sharpe Ratio: retorno ajustado por riesgo
 * - Drawdown: pérdida máxima desde peak
 * - ROI: retorno sobre inversión
 */
async function calculateTradingStats(trades, initialCapital = 10000) {
  try {
    if (!trades || trades.length === 0) {
      return {
        stats: {
          totalTrades: 0,
          winRate: 0,
          profitFactor: 0,
          avgWin: 0,
          avgLoss: 0,
          sharpeRatio: 0,
          maxDrawdown: 0,
          totalPnL: 0,
          roi: 0
        },
        message: 'No trades available'
      };
    }

    const stats = {};

    // 1. Trades ganadores/perdedores
    const wins = trades.filter(t => t.pnl > 0);
    const losses = trades.filter(t => t.pnl < 0);
    const breakEven = trades.filter(t => t.pnl === 0);

    stats.totalTrades = trades.length;
    stats.winningTrades = wins.length;
    stats.losingTrades = losses.length;
    stats.breakEvenTrades = breakEven.length;
    stats.winRate = (wins.length / trades.length) * 100;

    // 2. Promedio de ganancias y pérdidas
    const totalWins = wins.reduce((sum, t) => sum + (t.pnl || 0), 0);
    const totalLosses = Math.abs(losses.reduce((sum, t) => sum + (t.pnl || 0), 0));

    stats.totalWins = totalWins;
    stats.totalLosses = totalLosses;
    stats.avgWin = wins.length > 0 ? totalWins / wins.length : 0;
    stats.avgLoss = losses.length > 0 ? totalLosses / losses.length : 0;

    // 3. Profit Factor
    stats.profitFactor = totalLosses > 0 ? totalWins / totalLosses : (totalWins > 0 ? Infinity : 0);

    // 4. PnL total y ROI
    stats.totalPnL = totalWins - totalLosses;
    stats.roi = ((stats.totalPnL / initialCapital) * 100).toFixed(2);

    // 5. Sharpe Ratio
    stats.sharpeRatio = calculateSharpeRatio(trades);

    // 6. Máximo Drawdown
    stats.maxDrawdown = calculateMaxDrawdown(trades, initialCapital);

    // 7. Estadísticas adicionales
    stats.consecutiveWins = calculateConsecutiveWins(trades);
    stats.consecutiveLosses = calculateConsecutiveLosses(trades);
    stats.averageWinLossRatio = stats.avgLoss > 0 ? (stats.avgWin / stats.avgLoss).toFixed(2) : 0;
    stats.expectancy = (stats.winRate / 100) * stats.avgWin - ((100 - stats.winRate) / 100) * stats.avgLoss;

    // 8. Duración promedio de trades
    stats.avgTradeDuration = calculateAverageDuration(trades);

    // 9. Información por símbolo/estrategia
    stats.tradeDetails = generateTradesSummary(trades);

    return {
      success: true,
      stats,
      timestamp: new Date().toISOString()
    };

  } catch (error) {
    console.error('[Calculate Stats Error]', error);
    throw error;
  }
}

/**
 * Calcula Sharpe Ratio (retorno ajustado por volatilidad)
 * Formula: (media retorno - tasa libre riesgo) / desv estándar retornos
 */
function calculateSharpeRatio(trades, riskFreeRate = 0.02) {
  if (trades.length < 2) return 0;

  const returns = trades.map(t => t.pnl || 0);
  const meanReturn = returns.reduce((a, b) => a + b, 0) / returns.length;

  const variance = returns.reduce((sum, r) => sum + Math.pow(r - meanReturn, 2), 0) / returns.length;
  const stdDev = Math.sqrt(variance);

  if (stdDev === 0) return 0;

  // Annualized Sharpe (asumiendo 252 trading days)
  const sharpe = ((meanReturn - riskFreeRate) / stdDev) * Math.sqrt(252);

  return parseFloat(sharpe.toFixed(2));
}

/**
 * Calcula máximo drawdown (pérdida desde peak)
 */
function calculateMaxDrawdown(trades, initialCapital) {
  let equity = initialCapital;
  let peak = initialCapital;
  let maxDrawdown = 0;

  trades.forEach(trade => {
    equity += trade.pnl || 0;
    if (equity > peak) {
      peak = equity;
    }
    const drawdown = ((peak - equity) / peak) * 100;
    if (drawdown > maxDrawdown) {
      maxDrawdown = drawdown;
    }
  });

  return parseFloat(maxDrawdown.toFixed(2));
}

/**
 * Calcula rachas de victorias consecutivas
 */
function calculateConsecutiveWins(trades) {
  let currentStreak = 0;
  let maxStreak = 0;

  trades.forEach(trade => {
    if ((trade.pnl || 0) > 0) {
      currentStreak++;
      maxStreak = Math.max(maxStreak, currentStreak);
    } else {
      currentStreak = 0;
    }
  });

  return maxStreak;
}

/**
 * Calcula rachas de pérdidas consecutivas
 */
function calculateConsecutiveLosses(trades) {
  let currentStreak = 0;
  let maxStreak = 0;

  trades.forEach(trade => {
    if ((trade.pnl || 0) < 0) {
      currentStreak++;
      maxStreak = Math.max(maxStreak, currentStreak);
    } else {
      currentStreak = 0;
    }
  });

  return maxStreak;
}

/**
 * Calcula duración promedio de trades
 */
function calculateAverageDuration(trades) {
  const durations = trades
    .filter(t => t.entryTime && t.exitTime)
    .map(t => {
      const entry = new Date(t.entryTime);
      const exit = new Date(t.exitTime);
      return (exit - entry) / (1000 * 60 * 60); // en horas
    });

  if (durations.length === 0) return 0;

  const avgHours = durations.reduce((a, b) => a + b, 0) / durations.length;
  return {
    hours: parseFloat(avgHours.toFixed(2)),
    days: parseFloat((avgHours / 24).toFixed(2))
  };
}

/**
 * Genera resumen de trades
 */
function generateTradesSummary(trades) {
  const summary = {};

  trades.forEach(trade => {
    const symbol = trade.symbol || 'UNKNOWN';
    const strategy = trade.strategy || 'MANUAL';

    if (!summary[symbol]) {
      summary[symbol] = {
        totalTrades: 0,
        wins: 0,
        losses: 0,
        totalPnL: 0,
        strategies: {}
      };
    }

    summary[symbol].totalTrades++;
    summary[symbol].totalPnL += trade.pnl || 0;

    if ((trade.pnl || 0) > 0) summary[symbol].wins++;
    if ((trade.pnl || 0) < 0) summary[symbol].losses++;

    if (!summary[symbol].strategies[strategy]) {
      summary[symbol].strategies[strategy] = {
        trades: 0,
        pnl: 0,
        winRate: 0
      };
    }

    summary[symbol].strategies[strategy].trades++;
    summary[symbol].strategies[strategy].pnl += trade.pnl || 0;
  });

  // Calcular win rates por símbolo/estrategia
  Object.entries(summary).forEach(([symbol, data]) => {
    data.winRate = data.totalTrades > 0 ? (data.wins / data.totalTrades * 100).toFixed(2) : 0;

    Object.entries(data.strategies).forEach(([strategy, stData]) => {
      const strategyTrades = trades.filter(t => (t.symbol || 'UNKNOWN') === symbol && (t.strategy || 'MANUAL') === strategy);
      const wins = strategyTrades.filter(t => (t.pnl || 0) > 0).length;
      stData.winRate = strategyTrades.length > 0 ? (wins / strategyTrades.length * 100).toFixed(2) : 0;
    });
  });

  return summary;
}

/**
 * API Handler
 */
export default async function handler(req, res) {
  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    let trades = [];

    // Si es GET, obtener trades de la DB
    if (req.method === 'GET') {
      try {
        const supabase = getSupabaseClient();
        const { data, error } = await supabase
          .from('trades')
          .select('*')
          .order('entry_time', { ascending: false });

        if (error) throw error;
        trades = data || [];
      } catch (dbErr) {
        console.log('Database not available, using demo data');
        trades = generateDemoTrades();
      }
    } else {
      // Si es POST, usar trades proporcionados
      trades = req.body.trades || [];
    }

    const initialCapital = req.body.initialCapital || req.query.initialCapital || 10000;

    const result = await calculateTradingStats(trades, parseFloat(initialCapital));

    return res.status(200).json(result);

  } catch (error) {
    console.error('[Stats Handler Error]', error);
    return res.status(500).json({
      error: error.message,
      success: false
    });
  }
}

/**
 * Datos demo para testing sin DB
 */
function generateDemoTrades() {
  return [
    {
      id: '1',
      symbol: 'BTC',
      strategy: 'RSI-MACD',
      entryTime: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      exitTime: new Date(Date.now() - 6.5 * 24 * 60 * 60 * 1000).toISOString(),
      entryPrice: 43000,
      exitPrice: 43500,
      quantity: 0.1,
      pnl: 50,
      pnlPercent: 0.12
    },
    {
      id: '2',
      symbol: 'BTC',
      strategy: 'RSI-MACD',
      entryTime: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
      exitTime: new Date(Date.now() - 5.5 * 24 * 60 * 60 * 1000).toISOString(),
      entryPrice: 43500,
      exitPrice: 43200,
      quantity: 0.1,
      pnl: -30,
      pnlPercent: -0.07
    },
    {
      id: '3',
      symbol: 'BTC',
      strategy: 'RSI-MACD',
      entryTime: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      exitTime: new Date(Date.now() - 4.5 * 24 * 60 * 60 * 1000).toISOString(),
      entryPrice: 43200,
      exitPrice: 44100,
      quantity: 0.1,
      pnl: 90,
      pnlPercent: 0.21
    },
    {
      id: '4',
      symbol: 'BTC',
      strategy: 'RSI-MACD',
      entryTime: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
      exitTime: new Date(Date.now() - 3.5 * 24 * 60 * 60 * 1000).toISOString(),
      entryPrice: 44100,
      exitPrice: 44050,
      quantity: 0.1,
      pnl: -5,
      pnlPercent: -0.01
    },
    {
      id: '5',
      symbol: 'BTC',
      strategy: 'RSI-MACD',
      entryTime: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      exitTime: new Date(Date.now() - 2.5 * 24 * 60 * 60 * 1000).toISOString(),
      entryPrice: 44050,
      exitPrice: 44750,
      quantity: 0.1,
      pnl: 70,
      pnlPercent: 0.16
    }
  ];
}
