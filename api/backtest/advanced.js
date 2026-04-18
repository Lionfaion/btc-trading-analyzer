const indicators = require('../../lib/indicators');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.writeHead(405, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Method not allowed' }));
    return;
  }

  try {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      const params = JSON.parse(body);
      
      const config = {
        candleData: params.candleData || [],
        strategy: params.strategy || 'multi-indicator',
        initialBalance: params.initialBalance || 10000,
        riskPercentage: params.riskPercentage || 2,
        
        // Indicador parámetros
        rsiPeriod: params.rsiPeriod || 14,
        rsiBuyLevel: params.rsiBuyLevel || 30,
        rsiSellLevel: params.rsiSellLevel || 70,
        
        macdFast: params.macdFast || 12,
        macdSlow: params.macdSlow || 26,
        macdSignal: params.macdSignal || 9,
        
        bbPeriod: params.bbPeriod || 20,
        bbStdDev: params.bbStdDev || 2,
        
        atrPeriod: params.atrPeriod || 14,
        atrMultiplier: params.atrMultiplier || 2,
        
        stopLossPercent: params.stopLossPercent || 2,
        takeProfitPercent: params.takeProfitPercent || 5
      };

      if (!config.candleData.length) {
        throw new Error('No candle data provided');
      }

      const results = runAdvancedBacktest(config);

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: true,
        config: {
          strategy: config.strategy,
          initialBalance: config.initialBalance,
          riskPercentage: config.riskPercentage
        },
        results
      }));
    });
  } catch (error) {
    console.error('Advanced backtest error:', error);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: error.message }));
  }
};

function runAdvancedBacktest(config) {
  const trades = [];
  let balance = config.initialBalance;
  let position = null;
  
  const closes = config.candleData.map(c => c.close);
  const highs = config.candleData.map(c => c.high);
  const lows = config.candleData.map(c => c.low);

  for (let i = Math.max(26, config.bbPeriod); i < config.candleData.length; i++) {
    const candle = config.candleData[i];
    const currentPrice = candle.close;
    
    // Calcular indicadores
    const rsi = indicators.calculateRSI(closes.slice(0, i + 1), config.rsiPeriod);
    const macd = indicators.calculateMACD(closes.slice(0, i + 1), config.macdFast, config.macdSlow, config.macdSignal);
    const bb = indicators.calculateBollingerBands(closes.slice(0, i + 1), config.bbPeriod, config.bbStdDev);
    const atr = indicators.calculateATR(highs.slice(0, i + 1), lows.slice(0, i + 1), closes.slice(0, i + 1), config.atrPeriod);

    // Señales de compra
    const rsiOversold = rsi < config.rsiBuyLevel;
    const macdBullish = macd.histogram > 0 && i > 0 && indicators.calculateMACD(closes.slice(0, i), config.macdFast, config.macdSlow, config.macdSignal).histogram <= 0;
    const bbBullish = currentPrice < bb.lower;

    // Señales de venta
    const rsiOverbought = rsi > config.rsiSellLevel;
    const macdBearish = macd.histogram < 0 && i > 0 && indicators.calculateMACD(closes.slice(0, i), config.macdFast, config.macdSlow, config.macdSignal).histogram >= 0;
    const bbBearish = currentPrice > bb.upper;

    // Lógica de entrada
    if (!position && (rsiOversold || bbBullish) && balance > 0) {
      const riskAmount = balance * (config.riskPercentage / 100);
      const quantity = Math.floor(riskAmount / currentPrice);
      
      if (quantity > 0) {
        position = {
          entryPrice: currentPrice,
          quantity,
          entryCandle: i,
          stopLoss: currentPrice * (1 - config.stopLossPercent / 100),
          takeProfit: currentPrice * (1 + config.takeProfitPercent / 100),
          atrEntry: atr
        };
      }
    }

    // Lógica de salida
    if (position) {
      const hitTakeProfit = currentPrice >= position.takeProfit;
      const hitStopLoss = currentPrice <= position.stopLoss;
      const rsiSignal = rsiOverbought || macdBearish || bbBearish;

      if (hitTakeProfit || hitStopLoss || rsiSignal) {
        const exitPrice = currentPrice;
        const pnl = (exitPrice - position.entryPrice) * position.quantity;
        const pnlPercent = ((exitPrice - position.entryPrice) / position.entryPrice) * 100;
        
        trades.push({
          entryPrice: position.entryPrice,
          exitPrice: exitPrice,
          quantity: position.quantity,
          pnl: pnl,
          pnlPercent: pnlPercent,
          duration: i - position.entryCandle,
          isWin: pnl > 0,
          exitReason: hitTakeProfit ? 'TP' : hitStopLoss ? 'SL' : 'Signal',
          atr: position.atrEntry
        });

        balance += pnl;
        position = null;
      }
    }
  }

  // Cerrar posición abierta
  if (position) {
    const exitPrice = config.candleData[config.candleData.length - 1].close;
    const pnl = (exitPrice - position.entryPrice) * position.quantity;
    trades.push({
      entryPrice: position.entryPrice,
      exitPrice: exitPrice,
      quantity: position.quantity,
      pnl: pnl,
      pnlPercent: ((exitPrice - position.entryPrice) / position.entryPrice) * 100,
      isWin: pnl > 0,
      exitReason: 'Close'
    });
    balance += pnl;
  }

  // Calcular estadísticas
  const totalProfit = balance - config.initialBalance;
  const roi = (totalProfit / config.initialBalance) * 100;
  const winTrades = trades.filter(t => t.isWin).length;

  let maxDrawdown = 0;
  let peak = config.initialBalance;
  let runningBalance = config.initialBalance;
  trades.forEach(trade => {
    runningBalance += trade.pnl;
    if (runningBalance > peak) peak = runningBalance;
    const dd = ((peak - runningBalance) / peak) * 100;
    maxDrawdown = Math.max(maxDrawdown, dd);
  });

  const avgWin = winTrades > 0
    ? trades.filter(t => t.isWin).reduce((s, t) => s + t.pnlPercent, 0) / winTrades
    : 0;

  const loseTrades = trades.length - winTrades;
  const avgLoss = loseTrades > 0
    ? Math.abs(trades.filter(t => !t.isWin).reduce((s, t) => s + t.pnlPercent, 0) / loseTrades)
    : 0;

  const profitFactor = avgLoss > 0 ? avgWin / avgLoss : (avgWin > 0 ? 999 : 0);

  return {
    summary: {
      totalTrades: trades.length,
      winTrades,
      loseTrades,
      winRate: trades.length > 0 ? ((winTrades / trades.length) * 100).toFixed(1) : 0,
      totalProfit: totalProfit.toFixed(2),
      roi: roi.toFixed(2),
      finalBalance: balance.toFixed(2),
      maxDrawdown: maxDrawdown.toFixed(2),
      avgWin: avgWin.toFixed(2),
      avgLoss: avgLoss.toFixed(2)
    },
    quality: {
      profitFactor: profitFactor.toFixed(2),
      avgTradeSize: (totalProfit / Math.max(trades.length, 1)).toFixed(2),
      largestWin: trades.length > 0 ? Math.max(...trades.filter(t => t.isWin).map(t => t.pnl)).toFixed(2) : 0,
      largestLoss: trades.length > 0 ? Math.min(...trades.filter(t => !t.isWin).map(t => t.pnl)).toFixed(2) : 0
    },
    trades: trades.slice(-20)
  };
}
