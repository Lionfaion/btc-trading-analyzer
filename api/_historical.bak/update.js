const CoinGeckoClient = require('../../lib/coingecko-client');
const SupabaseClient = require('../../lib/supabase-client');

const SUPPORTED_ASSETS = {
  BTC: 'bitcoin',
  ETH: 'ethereum',
  SOL: 'solana',
  XRP: 'ripple',
  ADA: 'cardano',
  DOGE: 'dogecoin',
  MATIC: 'polygon',
  AVAX: 'avalanche-2'
};

async function updateAssetCandle(symbol) {
  try {
    if (!SUPPORTED_ASSETS[symbol]) {
      throw new Error(`Asset ${symbol} not supported`);
    }

    const client = new CoinGeckoClient();
    const { price } = await client.getCurrentPrice(symbol);

    const now = new Date();
    now.setMinutes(0, 0, 0);
    const open_time = now.toISOString();

    const supabase = new SupabaseClient();

    // Get last candle for this symbol
    const { data: lastCandle } = await supabase.client
      .from('candles_ohlcv')
      .select('*')
      .eq('symbol', symbol)
      .eq('timeframe', '1h')
      .order('open_time', { ascending: false })
      .limit(1)
      .single();

    const newCandle = {
      symbol,
      timeframe: '1h',
      open_time,
      open: lastCandle?.close || price,
      high: Math.max((lastCandle?.high || price), price),
      low: Math.min((lastCandle?.low || price), price),
      close: price,
      volume: 0
    };

    // Update or insert
    const { error } = await supabase.client
      .from('candles_ohlcv')
      .upsert(newCandle, { onConflict: 'symbol,timeframe,open_time' });

    if (error) throw new Error(`Supabase error: ${error.message}`);

    return {
      success: true,
      symbol,
      currentPrice: price,
      candleTime: open_time
    };
  } catch (error) {
    console.error(`Update error for ${symbol}:`, error.message);
    return {
      success: false,
      symbol,
      error: error.message
    };
  }
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.writeHead(405, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Method not allowed' }));
    return;
  }

  let body = '';
  req.on('data', chunk => body += chunk);
  req.on('end', async () => {
    try {
      const params = JSON.parse(body || '{}');
      const { symbol } = params;

      if (symbol) {
        const result = await updateAssetCandle(symbol);
        const statusCode = result.success ? 200 : 500;
        res.writeHead(statusCode, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(result));
        return;
      }

      // Update all supported assets
      const results = {};
      for (const sym of Object.keys(SUPPORTED_ASSETS)) {
        results[sym] = await updateAssetCandle(sym);
      }

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: true,
        results,
        timestamp: new Date().toISOString()
      }));
    } catch (error) {
      console.error('Update error:', error.message);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: error.message }));
    }
  });
};
