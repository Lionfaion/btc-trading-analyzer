const CoinGeckoClient = require('../../lib/coingecko-client');
const SupabaseClient = require('../../lib/supabase-client');

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
      const symbol = params.symbol || 'BTC';
      const days = params.days || 365;

      console.log(`🔄 Starting sync for ${symbol} (${days} days)...`);

      const client = new CoinGeckoClient();
      const candles = await client.getHistoricalCandles(symbol, days);

      if (candles.length === 0) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'No candles fetched' }));
        return;
      }

      // Insert into Supabase
      const supabase = new SupabaseClient();
      const { data, error } = await supabase.client
        .from('candles_ohlcv')
        .upsert(candles.map(c => ({
          symbol: symbol,
          timeframe: '1d',
          open_time: c.open_time,
          open: c.open,
          high: c.high,
          low: c.low,
          close: c.close,
          volume: c.volume
        })), { onConflict: 'symbol,timeframe,open_time' });

      if (error) throw new Error(`Supabase error: ${error.message}`);

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: true,
        symbol,
        candleCount: candles.length,
        dateRange: {
          from: candles[0]?.open_time,
          to: candles[candles.length - 1]?.open_time
        }
      }));
    } catch (e) {
      console.error('❌ Sync error:', e.message);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: e.message }));
    }
  });
};
