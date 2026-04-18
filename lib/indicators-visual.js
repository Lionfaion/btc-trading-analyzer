/**
 * Indicators Visual Calculator
 * Calcula RSI, MACD, Bollinger Bands desde datos OHLC
 * PHASE 4: Gráficos & Indicadores
 */

class IndicatorsVisual {
  /**
   * Calculate RSI (Relative Strength Index)
   * @param {Array} prices - Array of closing prices
   * @param {number} period - RSI period (default: 14)
   * @returns {Array} RSI values
   */
  static calculateRSI(prices, period = 14) {
    if (!Array.isArray(prices) || prices.length < period + 1) {
      console.warn('Insufficient data for RSI calculation');
      return [];
    }

    const rsiValues = [];
    const cleanPrices = prices.map(p => parseFloat(p)).filter(p => !isNaN(p));

    // Calculate gains and losses
    const gains = [];
    const losses = [];

    for (let i = 1; i < cleanPrices.length; i++) {
      const change = cleanPrices[i] - cleanPrices[i - 1];
      gains.push(change > 0 ? change : 0);
      losses.push(change < 0 ? Math.abs(change) : 0);
    }

    // Calculate average gain and loss
    let avgGain = gains.slice(0, period).reduce((a, b) => a + b) / period;
    let avgLoss = losses.slice(0, period).reduce((a, b) => a + b) / period;

    // Calculate RSI for each period
    for (let i = period; i < cleanPrices.length; i++) {
      if (i >= gains.length) break;

      avgGain = (avgGain * (period - 1) + gains[i]) / period;
      avgLoss = (avgLoss * (period - 1) + losses[i]) / period;

      const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
      const rsi = 100 - (100 / (1 + rs));

      rsiValues.push({
        index: i,
        value: isNaN(rsi) ? 50 : rsi,
      });
    }

    return rsiValues;
  }

  /**
   * Calculate MACD (Moving Average Convergence Divergence)
   * @param {Array} prices - Array of closing prices
   * @param {number} fast - Fast EMA period (default: 12)
   * @param {number} slow - Slow EMA period (default: 26)
   * @param {number} signal - Signal line period (default: 9)
   * @returns {Array} MACD values [{ index, macd, signal, histogram }, ...]
   */
  static calculateMACD(prices, fast = 12, slow = 26, signal = 9) {
    if (!Array.isArray(prices) || prices.length < slow + signal) {
      console.warn('Insufficient data for MACD calculation');
      return [];
    }

    const cleanPrices = prices.map(p => parseFloat(p)).filter(p => !isNaN(p));

    // Calculate EMA
    const emaFast = this.calculateEMA(cleanPrices, fast);
    const emaSlow = this.calculateEMA(cleanPrices, slow);

    // Calculate MACD line
    const macdLine = [];
    for (let i = 0; i < Math.min(emaFast.length, emaSlow.length); i++) {
      macdLine.push(emaFast[i] - emaSlow[i]);
    }

    // Calculate Signal line (EMA of MACD)
    const signalLine = this.calculateEMA(macdLine, signal);

    // Calculate Histogram
    const macdValues = [];
    for (let i = 0; i < Math.min(macdLine.length, signalLine.length); i++) {
      const histogram = macdLine[i] - signalLine[i];
      macdValues.push({
        index: slow + i,
        macd: macdLine[i],
        signal: signalLine[i],
        histogram: histogram,
      });
    }

    return macdValues;
  }

  /**
   * Calculate Bollinger Bands
   * @param {Array} prices - Array of closing prices
   * @param {number} period - Period (default: 20)
   * @param {number} stdDev - Standard deviations (default: 2)
   * @returns {Array} BB values [{ index, upper, middle, lower }, ...]
   */
  static calculateBollingerBands(prices, period = 20, stdDev = 2) {
    if (!Array.isArray(prices) || prices.length < period) {
      console.warn('Insufficient data for Bollinger Bands calculation');
      return [];
    }

    const cleanPrices = prices.map(p => parseFloat(p)).filter(p => !isNaN(p));
    const bbValues = [];

    for (let i = period - 1; i < cleanPrices.length; i++) {
      const slice = cleanPrices.slice(i - period + 1, i + 1);

      // Calculate SMA (middle band)
      const sma = slice.reduce((a, b) => a + b) / period;

      // Calculate standard deviation
      const variance = slice.reduce((sq, n) => sq + Math.pow(n - sma, 2), 0) / period;
      const standardDeviation = Math.sqrt(variance);

      // Calculate bands
      const upper = sma + standardDeviation * stdDev;
      const lower = sma - standardDeviation * stdDev;

      bbValues.push({
        index: i,
        upper: upper,
        middle: sma,
        lower: lower,
      });
    }

    return bbValues;
  }

  /**
   * Calculate Exponential Moving Average
   * @param {Array} prices - Array of prices
   * @param {number} period - EMA period
   * @returns {Array} EMA values
   */
  static calculateEMA(prices, period) {
    if (!Array.isArray(prices) || prices.length < period) {
      return [];
    }

    const cleanPrices = prices.map(p => parseFloat(p)).filter(p => !isNaN(p));
    const k = 2 / (period + 1);
    const emaValues = [];

    // Initialize with SMA
    let sma = 0;
    for (let i = 0; i < period && i < cleanPrices.length; i++) {
      sma += cleanPrices[i];
    }
    sma /= period;
    emaValues.push(sma);

    // Calculate EMA
    for (let i = period; i < cleanPrices.length; i++) {
      const ema = cleanPrices[i] * k + emaValues[emaValues.length - 1] * (1 - k);
      emaValues.push(ema);
    }

    return emaValues;
  }

  /**
   * Calculate all indicators at once
   * @param {Array} ohlcData - OHLC data [{ open, high, low, close }, ...]
   * @param {object} options - Configuration options
   * @returns {object} All indicators
   */
  static calculateAllIndicators(ohlcData, options = {}) {
    if (!Array.isArray(ohlcData) || ohlcData.length === 0) {
      console.error('Invalid OHLC data');
      return null;
    }

    const closePrices = ohlcData.map(d => parseFloat(d.close));

    const result = {
      rsi: null,
      macd: null,
      bollingerBands: null,
      error: null,
    };

    try {
      // RSI (14-period is default)
      const rsiPeriod = options.rsiPeriod || 14;
      const rsiRaw = this.calculateRSI(closePrices, rsiPeriod);
      result.rsi = rsiRaw.map((val, idx) => ({
        time: ohlcData[val.index]?.time || idx,
        value: val.value,
      }));

      // MACD
      const macdRaw = this.calculateMACD(
        closePrices,
        options.macdFast || 12,
        options.macdSlow || 26,
        options.macdSignal || 9
      );
      result.macd = macdRaw.map(val => ({
        time: ohlcData[val.index]?.time || val.index,
        macd: val.macd,
        signal: val.signal,
        histogram: val.histogram,
      }));

      // Bollinger Bands
      const bbRaw = this.calculateBollingerBands(
        closePrices,
        options.bbPeriod || 20,
        options.bbStdDev || 2
      );
      result.bollingerBands = bbRaw.map(val => ({
        time: ohlcData[val.index]?.time || val.index,
        upper: val.upper,
        middle: val.middle,
        lower: val.lower,
      }));

    } catch (error) {
      result.error = error.message;
      console.error('Error calculating indicators:', error);
    }

    return result;
  }

  /**
   * Format indicator signal for trading
   * @param {object} indicators - Calculated indicators
   * @param {number} currentPrice - Current price
   * @returns {object} Trading signals
   */
  static getSignals(indicators, currentPrice) {
    if (!indicators) {
      return { error: 'No indicators provided' };
    }

    const signals = {
      rsiSignal: null,
      macdSignal: null,
      bbSignal: null,
      overall: null,
    };

    try {
      // RSI signals
      if (indicators.rsi && indicators.rsi.length > 0) {
        const lastRSI = indicators.rsi[indicators.rsi.length - 1].value;
        if (lastRSI < 30) {
          signals.rsiSignal = { type: 'OVERSOLD', value: lastRSI, action: 'BUY' };
        } else if (lastRSI > 70) {
          signals.rsiSignal = { type: 'OVERBOUGHT', value: lastRSI, action: 'SELL' };
        } else {
          signals.rsiSignal = { type: 'NEUTRAL', value: lastRSI, action: 'HOLD' };
        }
      }

      // MACD signals
      if (indicators.macd && indicators.macd.length > 0) {
        const lastMACD = indicators.macd[indicators.macd.length - 1];
        const macdAboveSignal = lastMACD.macd > lastMACD.signal;
        const histPositive = lastMACD.histogram > 0;

        if (macdAboveSignal && histPositive) {
          signals.macdSignal = { type: 'BULLISH_CROSSOVER', action: 'BUY' };
        } else if (!macdAboveSignal && !histPositive) {
          signals.macdSignal = { type: 'BEARISH_CROSSOVER', action: 'SELL' };
        } else {
          signals.macdSignal = { type: 'NEUTRAL', action: 'HOLD' };
        }
      }

      // Bollinger Bands signals
      if (indicators.bollingerBands && indicators.bollingerBands.length > 0) {
        const lastBB = indicators.bollingerBands[indicators.bollingerBands.length - 1];
        if (currentPrice <= lastBB.lower) {
          signals.bbSignal = { type: 'AT_LOWER_BAND', action: 'BUY' };
        } else if (currentPrice >= lastBB.upper) {
          signals.bbSignal = { type: 'AT_UPPER_BAND', action: 'SELL' };
        } else if (currentPrice < lastBB.middle) {
          signals.bbSignal = { type: 'BELOW_MIDDLE', action: 'BUY' };
        } else {
          signals.bbSignal = { type: 'ABOVE_MIDDLE', action: 'SELL' };
        }
      }

      // Overall signal (majority vote)
      const actions = [signals.rsiSignal, signals.macdSignal, signals.bbSignal]
        .filter(s => s && s.action)
        .map(s => s.action);

      const buyCount = actions.filter(a => a === 'BUY').length;
      const sellCount = actions.filter(a => a === 'SELL').length;

      if (buyCount > sellCount) {
        signals.overall = 'STRONG_BUY';
      } else if (sellCount > buyCount) {
        signals.overall = 'STRONG_SELL';
      } else {
        signals.overall = 'NEUTRAL';
      }

    } catch (error) {
      console.error('Error calculating signals:', error);
      signals.error = error.message;
    }

    return signals;
  }
}

// Export for use
if (typeof window !== 'undefined') {
  window.IndicatorsVisual = IndicatorsVisual;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = IndicatorsVisual;
}
