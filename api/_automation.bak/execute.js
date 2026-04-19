// Execute automated trading based on strategy signals
const { createClient } = require('@supabase/supabase-js');
const BybitAuth = require('../bybit/auth');

const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

function decryptKey(encrypted) {
  try {
    return Buffer.from(encrypted, 'base64').toString('utf-8');
  } catch {
    return encrypted;
  }
}

// Simple RSI calculation for demo strategy
function calculateRSI(prices, period = 14) {
  if (prices.length < period) return 50;

  let gains = 0, losses = 0;
  for (let i = 1; i < period; i++) {
    const change = prices[i] - prices[i - 1];
    if (change > 0) gains += change;
    else losses -= change;
  }

  const avgGain = gains / period;
  const avgLoss = losses / period;
  const rs = avgGain / avgLoss;
  return 100 - (100 / (1 + rs));
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    const { userId, strategyId, symbol = 'BTCUSDT', demoMode = false } = req.body || {};

    if (!userId || !strategyId) {
      return res.status(400).json({ error: 'userId y strategyId requeridos' });
    }

    // Get strategy
    const { data: strategy, error: stratError } = await supabase
      .from('strategies')
      .select('*')
      .eq('id', strategyId)
      .eq('user_id', userId)
      .single();

    if (stratError || !strategy) {
      return res.status(404).json({ error: 'Estrategia no encontrada' });
    }

    // Get credentials
    const { data: credentials, error: credError } = await supabase
      .from('bybit_credentials')
      .select('api_key_encrypted, api_secret_encrypted, is_testnet')
      .eq('user_id', userId)
      .single();

    if (credError || !credentials) {
      return res.status(404).json({ error: 'Credenciales no configuradas' });
    }

    // Get recent candles for analysis
    const { data: candles, error: candleError } = await supabase
      .from('candles_ohlcv')
      .select('close')
      .eq('symbol', symbol)
      .eq('timeframe', '1h')
      .order('open_time', { ascending: false })
      .limit(20);

    if (candleError || !candles || candles.length < 14) {
      return res.status(400).json({ error: 'No hay suficientes candles para análisis' });
    }

    // Calculate RSI
    const prices = candles.reverse().map(c => parseFloat(c.close));
    const rsi = calculateRSI(prices);

    // Determine signal based on RSI (simple demo strategy)
    let signal = 'HOLD';
    if (rsi < 30) signal = 'BUY';
    if (rsi > 70) signal = 'SELL';

    let result = {
      success: true,
      signal,
      rsi: rsi.toFixed(2),
      symbol,
      demoMode
    };

    // If demo mode, just return signal
    if (demoMode) {
      return res.status(200).json({
        ...result,
        message: 'Modo demo - orden no ejecutada'
      });
    }

    // Execute actual order if signal is valid
    if (signal === 'HOLD') {
      return res.status(200).json({
        ...result,
        message: 'RSI neutral - sin operación'
      });
    }

    // Decrypt credentials
    const apiKey = decryptKey(credentials.api_key_encrypted);
    const apiSecret = decryptKey(credentials.api_secret_encrypted);
    const auth = new BybitAuth(apiKey, apiSecret, credentials.is_testnet);

    // Get current price
    const tickerRes = await fetch(
      `${auth.baseURL}/v5/market/tickers?category=linear&symbol=${symbol}`
    );
    const tickerData = await tickerRes.json();
    const currentPrice = parseFloat(tickerData.result?.list?.[0]?.lastPrice || 0);

    if (!currentPrice) {
      return res.status(400).json({ error: 'No se pudo obtener precio actual' });
    }

    // Place order
    const qty = '0.01';
    const stopLossPercent = strategy.parameters?.stopLoss || 2;
    const takeProfitPercent = strategy.parameters?.takeProfit || 5;

    let stopLoss, takeProfit;
    if (signal === 'BUY') {
      stopLoss = (currentPrice * (100 - stopLossPercent) / 100).toFixed(4);
      takeProfit = (currentPrice * (100 + takeProfitPercent) / 100).toFixed(4);
    } else {
      stopLoss = (currentPrice * (100 + stopLossPercent) / 100).toFixed(4);
      takeProfit = (currentPrice * (100 - takeProfitPercent) / 100).toFixed(4);
    }

    const orderParams = {
      category: 'linear',
      symbol,
      side: signal === 'BUY' ? 'Buy' : 'Sell',
      orderType: 'Market',
      qty,
      stopLoss,
      takeProfit,
      timeInForce: 'IOC'
    };

    const orderResult = await auth.request('POST', '/v5/order/create', orderParams);

    // Save trade to DB
    await supabase.from('trades').insert({
      user_id: userId,
      strategy_id: strategyId,
      symbol,
      entry_price: currentPrice,
      quantity: qty,
      entry_time: new Date().toISOString(),
      source: 'automated'
    });

    return res.status(200).json({
      ...result,
      orderId: orderResult.orderId,
      entryPrice: currentPrice,
      stopLoss,
      takeProfit,
      message: 'Orden ejecutada'
    });
  } catch (error) {
    console.error('Automation execute error:', error.message);
    return res.status(500).json({
      error: 'Error ejecutando automación',
      details: error.message
    });
  }
};
