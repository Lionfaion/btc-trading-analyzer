const { getCandles } = require('../api/db/init');
const indicators = require('./indicators');

async function formatCandlesForChart(symbol, limit = 500) {
  try {
    const candles = await getCandles(symbol, limit);

    if (!candles || candles.length === 0) {
      return {
        success: false,
        error: 'No candles found',
        candles: [],
        indicators: {}
      };
    }

    const sorted = candles.sort((a, b) =>
      new Date(a.open_time) - new Date(b.open_time)
    );

    const chartCandles = sorted.map(c => ({
      time: Math.floor(new Date(c.open_time).getTime() / 1000),
      open: parseFloat(c.open),
      high: parseFloat(c.high),
      low: parseFloat(c.low),
      close: parseFloat(c.close),
      volume: parseFloat(c.volume)
    }));

    const closes = sorted.map(c => parseFloat(c.close));
    const highs = sorted.map(c => parseFloat(c.high));
    const lows = sorted.map(c => parseFloat(c.low));

    // Calculate indicators
    const rsi = indicators.calculateRSI(closes, 14);
    const macd = indicators.calculateMACD(closes);
    const bb = indicators.calculateBollingerBands(closes, 20, 2);
    const stoch = indicators.calculateStochastic(closes, highs, lows, 14);

    // Format indicator data for chart overlay
    const rsiData = chartCandles.map((c, i) => ({
      time: c.time,
      value: rsi[i] || null
    })).filter(d => d.value !== null);

    const macdData = chartCandles.map((c, i) => ({
      time: c.time,
      macd: macd.macd[i] || null,
      signal: macd.signal[i] || null,
      histogram: (macd.macd[i] || 0) - (macd.signal[i] || 0)
    })).filter(d => d.macd !== null);

    const bbData = chartCandles.map((c, i) => ({
      time: c.time,
      upper: bb.upper[i] || null,
      middle: bb.middle[i] || null,
      lower: bb.lower[i] || null
    })).filter(d => d.upper !== null);

    const stochData = chartCandles.map((c, i) => ({
      time: c.time,
      k: stoch.k[i] || null,
      d: stoch.d[i] || null
    })).filter(d => d.k !== null);

    return {
      success: true,
      symbol: symbol,
      candles: chartCandles,
      indicators: {
        rsi: {
          values: rsiData,
          period: 14,
          overbought: 70,
          oversold: 30
        },
        macd: {
          values: macdData,
          fastPeriod: 12,
          slowPeriod: 26,
          signalPeriod: 9
        },
        bollingerBands: {
          values: bbData,
          period: 20,
          stdDev: 2
        },
        stochastic: {
          values: stochData,
          period: 14,
          overbought: 80,
          oversold: 20
        }
      },
      metadata: {
        candleCount: chartCandles.length,
        dateRange: {
          from: new Date(sorted[0].open_time),
          to: new Date(sorted[sorted.length - 1].open_time)
        },
        priceRange: {
          min: Math.min(...closes),
          max: Math.max(...closes),
          current: closes[closes.length - 1]
        }
      }
    };
  } catch (error) {
    console.error('Chart data error:', error.message);
    return {
      success: false,
      error: error.message,
      candles: [],
      indicators: {}
    };
  }
}

module.exports = {
  formatCandlesForChart
};
