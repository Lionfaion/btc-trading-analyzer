// Technical indicators for backtest engine

function calculateRSI(closes, period = 14) {
  if (closes.length < period + 1) return 50;
  
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

function calculateMACD(closes, fastPeriod = 12, slowPeriod = 26, signalPeriod = 9) {
  if (closes.length < slowPeriod) return { macd: 0, signal: 0, histogram: 0 };
  
  const ema12 = calculateEMA(closes, fastPeriod);
  const ema26 = calculateEMA(closes, slowPeriod);
  const macd = ema12 - ema26;
  
  const lastNCandles = closes.slice(-signalPeriod);
  const signal = calculateEMA([...lastNCandles.slice(0, -1), macd], signalPeriod);
  const histogram = macd - signal;
  
  return { macd, signal, histogram };
}

function calculateEMA(data, period) {
  const k = 2 / (period + 1);
  let ema = data[0];
  
  for (let i = 1; i < data.length; i++) {
    ema = data[i] * k + ema * (1 - k);
  }
  
  return ema;
}

function calculateBollingerBands(closes, period = 20, stdDev = 2) {
  if (closes.length < period) {
    return { upper: 0, middle: 0, lower: 0 };
  }
  
  const lastPeriod = closes.slice(-period);
  const sma = lastPeriod.reduce((a, b) => a + b) / period;
  
  const variance = lastPeriod.reduce((sum, price) => sum + Math.pow(price - sma, 2), 0) / period;
  const std = Math.sqrt(variance);
  
  return {
    upper: sma + (std * stdDev),
    middle: sma,
    lower: sma - (std * stdDev)
  };
}

function calculateStochastic(closes, highs, lows, period = 14) {
  if (closes.length < period) return { k: 50, d: 50 };
  
  const lastPeriodHigh = Math.max(...highs.slice(-period));
  const lastPeriodLow = Math.min(...lows.slice(-period));
  const closePrice = closes[closes.length - 1];
  
  const k = lastPeriodHigh !== lastPeriodLow
    ? ((closePrice - lastPeriodLow) / (lastPeriodHigh - lastPeriodLow)) * 100
    : 50;
  
  return {
    k: Math.max(0, Math.min(100, k)),
    d: k * 0.33 + 50 * 0.67 // Simple moving average
  };
}

function calculateATR(highs, lows, closes, period = 14) {
  if (closes.length < period + 1) return closes[closes.length - 1] * 0.02;
  
  let tr_sum = 0;
  for (let i = 1; i <= period; i++) {
    const high = highs[highs.length - i];
    const low = lows[lows.length - i];
    const prevClose = closes[closes.length - i - 1];
    
    const tr = Math.max(
      high - low,
      Math.abs(high - prevClose),
      Math.abs(low - prevClose)
    );
    tr_sum += tr;
  }
  
  return tr_sum / period;
}

function calculateADX(highs, lows, period = 14) {
  if (highs.length < period + 1) return 25;
  
  let plusDM = 0, minusDM = 0, tr = 0;
  
  for (let i = 1; i <= period; i++) {
    const upMove = highs[highs.length - i] - highs[highs.length - i - 1];
    const downMove = lows[lows.length - i - 1] - lows[lows.length - i];
    
    if (upMove > downMove && upMove > 0) plusDM += upMove;
    if (downMove > upMove && downMove > 0) minusDM += downMove;
    
    const h = highs[highs.length - i];
    const l = lows[lows.length - i];
    const c = highs[highs.length - i - 1];
    
    tr += Math.max(h - l, Math.abs(h - c), Math.abs(l - c));
  }
  
  const atr = tr / period;
  const plusDI = (plusDM / atr) * 100;
  const minusDI = (minusDM / atr) * 100;
  const di_diff = Math.abs(plusDI - minusDI);
  const di_sum = plusDI + minusDI;
  
  return di_sum > 0 ? (di_diff / di_sum) * 100 : 25;
}

module.exports = {
  calculateRSI,
  calculateMACD,
  calculateEMA,
  calculateBollingerBands,
  calculateStochastic,
  calculateATR,
  calculateADX
};
