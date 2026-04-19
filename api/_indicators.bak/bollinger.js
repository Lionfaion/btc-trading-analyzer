/**
 * API Endpoint: Bollinger Bands
 * POST /api/indicators/bollinger
 *
 * Body:
 * {
 *   "closes": [number, number, ...],  // Array de precios de cierre
 *   "period": 20,          // Período para SMA (opcional, default: 20)
 *   "stdDevs": 2           // Número de desviaciones estándar (opcional, default: 2)
 * }
 */

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { closes, period = 20, stdDevs = 2 } = req.body;

  if (!closes || !Array.isArray(closes) || closes.length === 0) {
    return res.status(400).json({ error: 'closes array is required' });
  }

  if (period < 2 || period > closes.length) {
    return res.status(400).json({ error: `Period must be between 2 and ${closes.length}` });
  }

  if (stdDevs <= 0) {
    return res.status(400).json({ error: 'Standard deviations must be positive' });
  }

  try {
    const bbData = calculateBollingerBands(closes, period, stdDevs);

    const latest = bbData[bbData.length - 1];

    return res.status(200).json({
      indicator: 'Bollinger Bands',
      parameters: { period, stdDevs },
      values: bbData,
      latest: latest,
      signal: generateSignal(latest, closes[closes.length - 1])
    });
  } catch (error) {
    console.error('Bollinger Bands calculation error:', error);
    return res.status(500).json({ error: error.message });
  }
}

/**
 * Calcula Bollinger Bands
 * Banda Superior = SMA + (2 * StdDev)
 * Banda Inferior = SMA - (2 * StdDev)
 * Banda Media = SMA
 */
function calculateBollingerBands(closes, period, stdDevs) {
  const bbValues = [];

  for (let i = 0; i < closes.length; i++) {
    if (i < period - 1) {
      bbValues.push({
        index: i,
        upper: null,
        middle: null,
        lower: null,
        width: null,
        percent: null
      });
    } else {
      // Calcular SMA
      let sum = 0;
      for (let j = i - period + 1; j <= i; j++) {
        sum += closes[j];
      }
      const sma = sum / period;

      // Calcular desviación estándar
      let variance = 0;
      for (let j = i - period + 1; j <= i; j++) {
        variance += Math.pow(closes[j] - sma, 2);
      }
      variance = variance / period;
      const stdDev = Math.sqrt(variance);

      const upper = sma + stdDevs * stdDev;
      const lower = sma - stdDevs * stdDev;
      const width = upper - lower;
      const bandWidth = (width / sma) * 100; // Bollinger Band Width %

      // Calcular posición relativa dentro de las bandas (0 = lower, 100 = upper)
      const percentB = width > 0 ? ((closes[i] - lower) / width) * 100 : 50;

      bbValues.push({
        index: i,
        upper: parseFloat(upper.toFixed(4)),
        middle: parseFloat(sma.toFixed(4)),
        lower: parseFloat(lower.toFixed(4)),
        width: parseFloat(bandWidth.toFixed(2)),
        percent: parseFloat(percentB.toFixed(2))
      });
    }
  }

  return bbValues;
}

/**
 * Genera señal basada en Bollinger Bands
 */
function generateSignal(bbData, currentPrice) {
  if (!bbData || bbData.upper === null) {
    return 'INSUFFICIENT_DATA';
  }

  const { upper, middle, lower, percent } = bbData;

  // Squeeze: bandas estrechas = poco movimiento
  if (bbData.width < 2) {
    return 'SQUEEZE_VOLATILITY_LOW';
  }

  // Touch superior
  if (currentPrice >= upper) {
    return 'TOUCH_UPPER_OVERBOUGHT';
  }

  // Touch inferior
  if (currentPrice <= lower) {
    return 'TOUCH_LOWER_OVERSOLD';
  }

  // Zona media superior
  if (percent > 60) {
    return 'UPPER_BAND_ZONE';
  }

  // Zona media inferior
  if (percent < 40) {
    return 'LOWER_BAND_ZONE';
  }

  // Centro
  return 'MIDDLE_BAND_NEUTRAL';
}
