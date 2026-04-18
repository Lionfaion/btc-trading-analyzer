/**
 * API Endpoint: MACD (Moving Average Convergence Divergence)
 * POST /api/indicators/macd
 *
 * Body:
 * {
 *   "closes": [number, number, ...],  // Array de precios de cierre
 *   "fastPeriod": 12,      // EMA corta (opcional, default: 12)
 *   "slowPeriod": 26,      // EMA larga (opcional, default: 26)
 *   "signalPeriod": 9      // Período de signal line (opcional, default: 9)
 * }
 */

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { closes, fastPeriod = 12, slowPeriod = 26, signalPeriod = 9 } = req.body;

  if (!closes || !Array.isArray(closes) || closes.length === 0) {
    return res.status(400).json({ error: 'closes array is required' });
  }

  if (slowPeriod > closes.length) {
    return res.status(400).json({
      error: `slowPeriod (${slowPeriod}) cannot be greater than data length (${closes.length})`
    });
  }

  try {
    const macdData = calculateMACD(closes, fastPeriod, slowPeriod, signalPeriod);

    const latest = macdData[macdData.length - 1];

    return res.status(200).json({
      indicator: 'MACD',
      parameters: { fastPeriod, slowPeriod, signalPeriod },
      values: macdData,
      latest: latest,
      signal: generateSignal(latest)
    });
  } catch (error) {
    console.error('MACD calculation error:', error);
    return res.status(500).json({ error: error.message });
  }
}

/**
 * Calcula MACD
 * MACD = EMA(12) - EMA(26)
 * Signal = EMA(9) de MACD
 * Histogram = MACD - Signal
 */
function calculateMACD(closes, fastPeriod, slowPeriod, signalPeriod) {
  // Calcular EMAs
  const fastEMA = calculateEMA(closes, fastPeriod);
  const slowEMA = calculateEMA(closes, slowPeriod);

  // Calcular línea MACD
  const macdLine = [];
  for (let i = 0; i < closes.length; i++) {
    if (fastEMA[i] === null || slowEMA[i] === null) {
      macdLine.push(null);
    } else {
      macdLine.push(fastEMA[i] - slowEMA[i]);
    }
  }

  // Calcular Signal Line (EMA de MACD)
  const signalLine = calculateEMA(macdLine.map((val) => (val === null ? 0 : val)), signalPeriod);

  // Calcular Histogram
  const histogram = [];
  const macdValues = [];

  for (let i = 0; i < closes.length; i++) {
    if (macdLine[i] === null || signalLine[i] === null) {
      histogram.push(null);
      macdValues.push({
        index: i,
        macd: null,
        signal: null,
        histogram: null
      });
    } else {
      const hist = macdLine[i] - signalLine[i];
      histogram.push(hist);
      macdValues.push({
        index: i,
        macd: parseFloat(macdLine[i].toFixed(6)),
        signal: parseFloat(signalLine[i].toFixed(6)),
        histogram: parseFloat(hist.toFixed(6))
      });
    }
  }

  return macdValues;
}

/**
 * Calcula EMA (Exponential Moving Average)
 */
function calculateEMA(data, period) {
  const ema = [];
  const k = 2 / (period + 1);

  // Primer EMA es SMA
  let sum = 0;
  for (let i = 0; i < period && i < data.length; i++) {
    sum += data[i];
    ema.push(null);
  }

  let sma = sum / period;
  ema[period - 1] = sma;

  // Calcular EMA para el resto
  for (let i = period; i < data.length; i++) {
    sma = data[i] * k + sma * (1 - k);
    ema.push(sma);
  }

  return ema;
}

/**
 * Genera señal basada en MACD
 */
function generateSignal(macdData) {
  if (!macdData || macdData.macd === null || macdData.signal === null) {
    return 'INSUFFICIENT_DATA';
  }

  const histogram = macdData.histogram;
  const macd = macdData.macd;
  const signal = macdData.signal;

  if (histogram > 0 && macd > signal) {
    return 'BULLISH_CROSSOVER';
  }
  if (histogram < 0 && macd < signal) {
    return 'BEARISH_CROSSOVER';
  }
  if (histogram > 0) {
    return 'BULLISH';
  }
  if (histogram < 0) {
    return 'BEARISH';
  }

  return 'NEUTRAL';
}
