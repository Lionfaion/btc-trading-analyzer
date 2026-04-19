/**
 * API Endpoint: RSI (Relative Strength Index) Indicator
 * POST /api/indicators/rsi
 *
 * Body:
 * {
 *   "closes": [number, number, ...],  // Array de precios de cierre
 *   "period": 14  // Período de RSI (opcional, default: 14)
 * }
 */

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { closes, period = 14 } = req.body;

  if (!closes || !Array.isArray(closes) || closes.length === 0) {
    return res.status(400).json({ error: 'closes array is required' });
  }

  if (period < 2 || period > closes.length) {
    return res.status(400).json({ error: `Period must be between 2 and ${closes.length}` });
  }

  try {
    const rsiValues = calculateRSI(closes, period);

    return res.status(200).json({
      indicator: 'RSI',
      period: period,
      values: rsiValues,
      latest: rsiValues[rsiValues.length - 1],
      signal: generateSignal(rsiValues[rsiValues.length - 1])
    });
  } catch (error) {
    console.error('RSI calculation error:', error);
    return res.status(500).json({ error: error.message });
  }
}

/**
 * Calcula RSI manualmente
 * RSI = 100 - (100 / (1 + RS))
 * RS = Promedio de ganancias / Promedio de pérdidas
 */
function calculateRSI(closes, period) {
  const rsiValues = [];
  let gains = [];
  let losses = [];

  // Calcular cambios
  for (let i = 1; i < closes.length; i++) {
    const change = closes[i] - closes[i - 1];
    gains.push(change > 0 ? change : 0);
    losses.push(change < 0 ? Math.abs(change) : 0);
  }

  // Calcular RSI para cada punto después del período
  for (let i = period; i < closes.length; i++) {
    let avgGain = 0;
    let avgLoss = 0;

    // Primer promedio (SMA)
    if (i === period) {
      avgGain = gains.slice(0, period).reduce((a, b) => a + b, 0) / period;
      avgLoss = losses.slice(0, period).reduce((a, b) => a + b, 0) / period;
    } else {
      // Promedios suavizados (EMA)
      const prevAvgGain = rsiValues[rsiValues.length - 1].avgGain;
      const prevAvgLoss = rsiValues[rsiValues.length - 1].avgLoss;

      avgGain = (prevAvgGain * (period - 1) + gains[i - 1]) / period;
      avgLoss = (prevAvgLoss * (period - 1) + losses[i - 1]) / period;
    }

    const rs = avgLoss === 0 ? (avgGain > 0 ? 100 : 0) : avgGain / avgLoss;
    const rsi = 100 - (100 / (1 + rs));

    rsiValues.push({
      index: i,
      rsi: parseFloat(rsi.toFixed(2)),
      avgGain: avgGain,
      avgLoss: avgLoss
    });
  }

  // Rellenar nulos para los primeros período-1 valores
  const fullValues = [];
  for (let i = 0; i < closes.length; i++) {
    if (i < period) {
      fullValues.push(null);
    } else {
      fullValues.push(rsiValues[i - period].rsi);
    }
  }

  return fullValues;
}

/**
 * Genera señal basada en RSI
 */
function generateSignal(rsi) {
  if (rsi === null) return 'INSUFFICIENT_DATA';
  if (rsi < 30) return 'OVERSOLD_BUY';
  if (rsi > 70) return 'OVERBOUGHT_SELL';
  if (rsi < 50) return 'BULLISH_WEAK';
  if (rsi > 50) return 'BEARISH_WEAK';
  return 'NEUTRAL';
}
