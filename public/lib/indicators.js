// Technical Indicators Library - RSI, MACD, Bollinger Bands, Stochastic

/**
 * Calculate Relative Strength Index (RSI)
 * @param {number[]} prices - Array of closing prices
 * @param {number} period - RSI period (default: 14)
 * @returns {number[]} RSI values
 */
function calculateRSI(prices, period = 14) {
  if (prices.length < period + 1) return [];

  const rsi = [];
  let gains = 0, losses = 0;

  // Calculate first average gain/loss
  for (let i = 1; i <= period; i++) {
    const change = prices[i] - prices[i - 1];
    if (change > 0) gains += change;
    else losses -= change;
  }

  let avgGain = gains / period;
  let avgLoss = losses / period;

  // First RSI value
  let rs = avgGain / (avgLoss || 1);
  rsi.push(100 - (100 / (1 + rs)));

  // Calculate RSI for remaining prices
  for (let i = period + 1; i < prices.length; i++) {
    const change = prices[i] - prices[i - 1];
    const gain = change > 0 ? change : 0;
    const loss = change < 0 ? -change : 0;

    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;

    rs = avgGain / (avgLoss || 1);
    rsi.push(100 - (100 / (1 + rs)));
  }

  return Array(period).fill(null).concat(rsi);
}

/**
 * Calculate MACD (Moving Average Convergence Divergence)
 */
function calculateMACD(prices, fast = 12, slow = 26, signal = 9) {
  const emaFast = calculateEMA(prices, fast);
  const emaSlow = calculateEMA(prices, slow);

  const macd = [];
  for (let i = 0; i < prices.length; i++) {
    if (emaFast[i] !== null && emaSlow[i] !== null) {
      macd.push(emaFast[i] - emaSlow[i]);
    } else {
      macd.push(null);
    }
  }

  const signalLine = calculateEMA(macd.filter(v => v !== null), signal);
  const signalFilled = Array(macd.length).fill(null);
  let signalIdx = 0;
  for (let i = 0; i < macd.length; i++) {
    if (macd[i] !== null) {
      signalFilled[i] = signalLine[signalIdx++] || null;
    }
  }

  const histogram = [];
  for (let i = 0; i < macd.length; i++) {
    if (macd[i] !== null && signalFilled[i] !== null) {
      histogram.push(macd[i] - signalFilled[i]);
    } else {
      histogram.push(null);
    }
  }

  return { macd, signal: signalFilled, histogram };
}

/**
 * Calculate Simple Moving Average
 */
function calculateSMA(prices, period) {
  const sma = [];

  for (let i = period - 1; i < prices.length; i++) {
    const slice = prices.slice(i - period + 1, i + 1);
    const avg = slice.reduce((a, b) => a + b) / period;
    sma.push(avg);
  }

  return Array(period - 1).fill(null).concat(sma);
}

/**
 * Calculate Exponential Moving Average
 */
function calculateEMA(prices, period) {
  const ema = [];
  const multiplier = 2 / (period + 1);

  let sum = 0;
  for (let i = 0; i < period; i++) {
    sum += prices[i];
  }
  ema.push(sum / period);

  for (let i = period; i < prices.length; i++) {
    const newEMA = (prices[i] - ema[ema.length - 1]) * multiplier + ema[ema.length - 1];
    ema.push(newEMA);
  }

  return Array(period - 1).fill(null).concat(ema);
}

module.exports = {
  calculateRSI,
  calculateMACD,
  calculateSMA,
  calculateEMA
};
