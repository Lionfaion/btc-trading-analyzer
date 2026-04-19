// Automation Scheduler - Ejecuta estrategias cada hora
// Integrable con Vercel Cron o scheduler externo
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

async function getActiveStrategies() {
  // Fetch all strategies marked as active
  const { data, error } = await supabase
    .from('automation_jobs')
    .select('id, user_id, strategy_id, symbol, is_active, last_run')
    .eq('is_active', true)
    .lt('last_run', new Date(Date.now() - 55 * 60 * 1000).toISOString()); // Run if last_run > 55 min ago

  if (error) {
    console.error('Error fetching active strategies:', error.message);
    return [];
  }

  return data || [];
}

async function executeStrategy(userId, strategyId, symbol) {
  try {
    // Get strategy
    const { data: strategy, error: stratError } = await supabase
      .from('strategies')
      .select('*')
      .eq('id', strategyId)
      .eq('user_id', userId)
      .single();

    if (stratError || !strategy) {
      console.error(`Strategy ${strategyId} not found`);
      return { success: false, error: 'Strategy not found' };
    }

    // Get credentials
    const { data: credentials, error: credError } = await supabase
      .from('bybit_credentials')
      .select('api_key_encrypted, api_secret_encrypted, is_testnet')
      .eq('user_id', userId)
      .single();

    if (credError || !credentials) {
      console.error(`Credentials for user ${userId} not found`);
      return { success: false, error: 'Credentials not found' };
    }

    // Get recent candles
    const { data: candles, error: candleError } = await supabase
      .from('candles_ohlcv')
      .select('close')
      .eq('symbol', symbol)
      .eq('timeframe', '1h')
      .order('open_time', { ascending: false })
      .limit(20);

    if (candleError || !candles || candles.length < 14) {
      console.error(`Not enough candles for ${symbol}`);
      return { success: false, error: 'Not enough candles' };
    }

    // Calculate RSI
    const prices = candles.reverse().map(c => parseFloat(c.close));
    const rsi = calculateRSI(prices);

    // Determine signal
    let signal = 'HOLD';
    if (rsi < 30) signal = 'BUY';
    if (rsi > 70) signal = 'SELL';

    if (signal === 'HOLD') {
      return { success: true, signal, rsi, message: 'No signal' };
    }

    // Execute order
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
      return { success: false, error: 'Cannot fetch price' };
    }

    // Place order
    const qty = strategy.parameters?.quantity || '0.01';
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
      qty: qty.toString(),
      stopLoss,
      takeProfit,
      timeInForce: 'IOC'
    };

    const orderResult = await auth.request('POST', '/v5/order/create', orderParams);

    // Save trade
    await supabase.from('trades').insert({
      user_id: userId,
      strategy_id: strategyId,
      symbol,
      entry_price: currentPrice,
      quantity: qty,
      entry_time: new Date().toISOString(),
      source: 'automated'
    });

    return {
      success: true,
      signal,
      rsi: rsi.toFixed(2),
      orderId: orderResult.orderId,
      entryPrice: currentPrice,
      stopLoss,
      takeProfit
    };
  } catch (error) {
    console.error(`Error executing strategy ${strategyId}:`, error.message);
    return { success: false, error: error.message };
  }
}

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

async function updateJobStatus(jobId, success) {
  await supabase
    .from('automation_jobs')
    .update({ last_run: new Date().toISOString() })
    .eq('id', jobId);
}

// Main scheduler handler
module.exports = async (req, res) => {
  // Verify cron secret if provided
  if (process.env.CRON_SECRET && req.headers['authorization'] !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const jobs = await getActiveStrategies();
    const results = [];

    for (const job of jobs) {
      const result = await executeStrategy(job.user_id, job.strategy_id, job.symbol);
      results.push({
        jobId: job.id,
        ...result
      });

      // Update last_run timestamp
      await updateJobStatus(job.id, result.success);
    }

    return res.status(200).json({
      success: true,
      executedJobs: results.length,
      results
    });
  } catch (error) {
    console.error('Scheduler error:', error.message);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};
