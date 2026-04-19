// PHASE 6: Performance optimization with caching and pagination
const { getCandles } = require('./db/init');

const candleCache = new Map();
const CACHE_TTL = 600000; // 10 minutes

// Helper to parse query params
const parseQuery = (url, param) => {
  const regex = new RegExp(`[&?]${param}=([^&]*)`);
  const match = url.match(regex);
  return match ? decodeURIComponent(match[1]) : null;
};

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    res.writeHead(405, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Method not allowed' }));
    return;
  }

  try {
    const symbol = parseQuery(req.url, 'symbol') || 'BTCUSDT';
    const timeframe = parseQuery(req.url, 'timeframe') || '1h';
    const offset = Math.max(parseInt(parseQuery(req.url, 'offset')) || 0, 0);
    const limit = Math.min(parseInt(parseQuery(req.url, 'limit')) || 500, 500);

    // Create cache key for pagination
    const cacheKey = `${symbol}:${timeframe}:${offset}:${limit}`;

    // Check cache first
    if (candleCache.has(cacheKey)) {
      const cached = candleCache.get(cacheKey);
      if (Date.now() - cached.timestamp < CACHE_TTL) {
        console.log(`📊 Cache HIT for ${symbol} offset=${offset}`);
        res.writeHead(200, { 'Content-Type': 'application/json', 'X-Cache': 'HIT' });
        res.end(JSON.stringify({
          success: true,
          symbol,
          timeframe,
          candles: cached.data,
          cached: true,
          cacheAge: Date.now() - cached.timestamp,
          pageInfo: {
            offset,
            limit,
            hasMore: cached.data.length >= limit
          }
        }));
        return;
      }
    }

    console.log(`📊 Fetching ${limit} candles for ${symbol} (offset: ${offset})...`);
    const candles = await getCandles(symbol, offset + limit);

    // Paginate results
    const paginatedCandles = candles.reverse().slice(offset, offset + limit);

    // Store in cache
    candleCache.set(cacheKey, {
      data: paginatedCandles,
      timestamp: Date.now()
    });

    // Cleanup old cache entries (keep max 30 cached pages)
    if (candleCache.size > 30) {
      const firstKey = candleCache.keys().next().value;
      candleCache.delete(firstKey);
    }

    res.writeHead(200, { 'Content-Type': 'application/json', 'X-Cache': 'MISS' });
    res.end(JSON.stringify({
      success: true,
      symbol,
      timeframe,
      count: paginatedCandles.length,
      candles: paginatedCandles,
      cached: false,
      pageInfo: {
        offset,
        limit,
        hasMore: paginatedCandles.length >= limit,
        totalLoaded: offset + paginatedCandles.length
      }
    }));
  } catch (e) {
    console.error('❌ Candles fetch error:', e.message);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      error: 'Failed to fetch candles',
      details: e.message
    }));
  }
};
