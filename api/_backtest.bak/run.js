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
      const { candleData, indicators, timeframe, initialBalance, riskPercentage } = JSON.parse(body);

      if (!candleData || candleData.length === 0) {
        throw new Error('No candle data provided');
      }

      // Calcular indicadores y ejecutar backtest
      const trades = simulateTrades(candleData, indicators, initialBalance, riskPercentage);
      const summary = calculateSummary(trades, initialBalance, candleData);
      const stats = calculateStats(trades, summary);

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: true,
        summary,
        stats,
        trades: trades.slice(-10) // Últimos 10 trades
      }));
    });
  } catch (error) {
    console.error('Backtest error:', error);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: error.message }));
  }
};

function calculateRSI(closes, period = 14) {
  if (closes.length < period) return 50;
  
  let gains = 0, losses = 0;
  for (let i = 1; i <= period; i++) {
    const change = closes[closes.length - i] - closes[closes.length - i - 1];
    if (change > 0) gains += change;
    else losses += Math.abs(change);
  }
  
  const avgGain = gains / period;
  const avgLoss = losses / period;
  const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
  return 100 - (100 / (1 + rs));
}

function calculateMACD(closes) {
  if (closes.length < 26) return { macd: 0, signal: 0, histogram: 0 };
  
  const ema12 = calculateEMA(closes, 12);
  const ema26 = calculateEMA(closes, 26);
  const macd = ema12 - ema26;
  
  return { macd, signal: macd * 0.9, histogram: macd - (macd * 0.9) };
}

function calculateEMA(data, period) {
  const k = 2 / (period + 1);
  let ema = data[0];
  
  for (let i = 1; i < data.length; i++) {
    ema = data[i] * k + ema * (1 - k);
  }
  
  return ema;
}

function simulateTrades(candleData, indicatorsToUse, initialBalance, riskPercentage) {
  const trades = [];
  let balance = initialBalance;
  let position = null;
  const closes = candleData.map(c => c.close);

  for (let i = 26; i < candleData.length; i++) {
    const rsi = indicatorsToUse.includes('RSI') ? calculateRSI(closes.slice(0, i + 1)) : 50;
    const macd = indicatorsToUse.includes('MACD') ? calculateMACD(closes.slice(0, i + 1)) : { histogram: 0 };
    
    const currentPrice = candleData[i].close;
    const buyCond = (rsi < 30 && macd.histogram > 0) || (rsi < 25);
    const sellCond = (rsi > 70 && macd.histogram < 0) || (rsi > 75);

    if (!position && buyCond && balance > 0) {
      const riskAmount = balance * (riskPercentage / 100);
      const quantity = Math.floor(riskAmount / currentPrice);
      
      if (quantity > 0) {
        position = {
          entryPrice: currentPrice,
          quantity,
          entryCandle: i,
          entryTime: candleData[i].timestamp
        };
      }
    } else if (position && sellCond) {
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
        entryTime: position.entryTime,
        exitTime: candleData[i].timestamp
      });

      balance += pnl;
      position = null;
    }
  }

  return trades;
}

function calculateSummary(trades, initialBalance, candleData) {
  const finalBalance = initialBalance + trades.reduce((sum, t) => sum + t.pnl, 0);
  const totalProfit = finalBalance - initialBalance;
  const roi = ((finalBalance - initialBalance) / initialBalance * 100).toFixed(2);
  const winTrades = trades.filter(t => t.isWin).length;
  const loseTrades = trades.length - winTrades;

  let maxDrawdown = 0;
  let peak = initialBalance;
  let runningBalance = initialBalance;

  trades.forEach(trade => {
    runningBalance += trade.pnl;
    if (runningBalance > peak) peak = runningBalance;
    const drawdown = ((peak - runningBalance) / peak) * 100;
    if (drawdown > maxDrawdown) maxDrawdown = drawdown;
  });

  const avgWin = trades.filter(t => t.isWin).length > 0
    ? trades.filter(t => t.isWin).reduce((sum, t) => sum + t.pnlPercent, 0) / trades.filter(t => t.isWin).length
    : 0;
  
  const avgLoss = trades.filter(t => !t.isWin).length > 0
    ? Math.abs(trades.filter(t => !t.isWin).reduce((sum, t) => sum + t.pnlPercent, 0) / trades.filter(t => !t.isWin).length)
    : 0;

  return {
    initialBalance: initialBalance.toFixed(2),
    finalBalance: finalBalance.toFixed(2),
    totalProfit: totalProfit.toFixed(2),
    roi: roi + '%',
    totalTrades: trades.length,
    winRate: trades.length > 0 ? ((winTrades / trades.length) * 100).toFixed(1) + '%' : '0%',
    winTrades,
    loseTrades,
    avgWin: avgWin.toFixed(2),
    avgLoss: avgLoss.toFixed(2),
    maxDrawdown: maxDrawdown.toFixed(2) + '%',
    candlesAnalyzed: candleData.length
  };
}

function calculateStats(trades, summary) {
  const winTrades = trades.filter(t => t.isWin);
  const loseTrades = trades.filter(t => !t.isWin);
  
  const totalWinAmount = winTrades.reduce((sum, t) => sum + t.pnl, 0);
  const totalLossAmount = Math.abs(loseTrades.reduce((sum, t) => sum + t.pnl, 0));
  
  const profitFactor = totalLossAmount > 0 ? (totalWinAmount / totalLossAmount).toFixed(2) : Infinity;
  const sharpeRatio = trades.length > 0 ? (trades.reduce((sum, t) => sum + t.pnlPercent, 0) / trades.length / 2).toFixed(2) : 0;
  const expectedValue = trades.length > 0 ? (trades.reduce((sum, t) => sum + t.pnl, 0) / trades.length).toFixed(2) : 0;

  // Buy & Hold comparison
  const firstPrice = trades.length > 0 ? trades[0].entryPrice : 100;
  const lastPrice = trades.length > 0 ? trades[trades.length - 1].exitPrice : 100;
  const buyHoldReturn = ((lastPrice - firstPrice) / firstPrice) * 100;

  return {
    quality: {
      profitFactor,
      sharpeRatio,
      expectedValue: expectedValue + '%',
      maxConsecutiveWins: getMaxConsecutive(trades, true),
      maxConsecutiveLosses: getMaxConsecutive(trades, false)
    },
    buyAndHold: {
      roi: buyHoldReturn.toFixed(2) + '%',
      profit: (lastPrice - firstPrice).toFixed(2)
    }
  };
}

function getMaxConsecutive(trades, isWins) {
  let max = 0;
  let current = 0;
  
  trades.forEach(trade => {
    if (trade.isWin === isWins) {
      current++;
      max = Math.max(max, current);
    } else {
      current = 0;
    }
  });
  
  return max;
}
