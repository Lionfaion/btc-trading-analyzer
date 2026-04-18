/**
 * API Endpoint: Obtener datos históricos de BTC desde Binance
 * GET /api/binance-historical
 *
 * Parámetros (opcionales):
 * ?timeframe=1h&limit=120  // Timeframe y número de velas
 */

export default async function handler(req, res) {
  const { timeframe = '1h', limit = 120 } = req.query;

  // Mapear timeframe a milisegundos
  const timeframeMap = {
    '1m': 1000 * 60,
    '5m': 1000 * 60 * 5,
    '15m': 1000 * 60 * 15,
    '1h': 1000 * 60 * 60,
    '4h': 1000 * 60 * 60 * 4,
    '1d': 1000 * 60 * 60 * 24
  };

  const interval = timeframeMap[timeframe] || timeframeMap['1h'];
  const apiTimeframeMap = {
    '1m': '1m',
    '5m': '5m',
    '15m': '15m',
    '1h': '1h',
    '4h': '4h',
    '1d': '1d'
  };

  const apiTimeframe = apiTimeframeMap[timeframe] || '1h';

  try {
    // Fetch desde Binance API publica (sin autenticación)
    const url = `https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval=${apiTimeframe}&limit=${Math.min(parseInt(limit), 1000)}`;

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Binance API error: ${response.status}`);
    }

    const data = await response.json();

    // Transformar datos de Binance a nuestro formato
    const candles = data.map((candle) => ({
      timestamp: Math.floor(candle[0] / 1000), // Convertir a segundos
      open: parseFloat(candle[1]),
      high: parseFloat(candle[2]),
      low: parseFloat(candle[3]),
      close: parseFloat(candle[4]),
      volume: parseInt(candle[7]) // Quote asset volume
    }));

    return res.status(200).json({
      success: true,
      symbol: 'BTCUSDT',
      timeframe,
      candleCount: candles.length,
      data: candles
    });
  } catch (error) {
    console.error('Binance historical data error:', error);

    // Generar datos demo si Binance no disponible
    const demoCandles = generateDemoCandles(parseInt(limit));

    return res.status(200).json({
      success: true,
      symbol: 'BTCUSDT',
      timeframe,
      candleCount: demoCandles.length,
      data: demoCandles,
      note: 'Demo data - Binance API not available'
    });
  }
}

/**
 * Genera datos candle demo realistas
 */
function generateDemoCandles(count) {
  const candles = [];
  let currentPrice = 67234.50;
  const now = Math.floor(Date.now() / 1000);

  for (let i = count; i > 0; i--) {
    // Generar OHLC realista
    const openPrice = currentPrice;

    // Movimiento random entre -2% y +2% por vela
    const change = (Math.random() - 0.5) * currentPrice * 0.04;
    const closePrice = currentPrice + change;

    // High y Low con dispersión
    const high = Math.max(openPrice, closePrice) + Math.random() * (currentPrice * 0.005);
    const low = Math.min(openPrice, closePrice) - Math.random() * (currentPrice * 0.005);

    // Volume aleatorio
    const volume = Math.floor(Math.random() * 500000000) + 50000000;

    candles.push({
      timestamp: now - i * 3600, // 1 hora por vela
      open: parseFloat(openPrice.toFixed(2)),
      high: parseFloat(high.toFixed(2)),
      low: parseFloat(low.toFixed(2)),
      close: parseFloat(closePrice.toFixed(2)),
      volume: volume
    });

    currentPrice = closePrice;
  }

  return candles;
}
