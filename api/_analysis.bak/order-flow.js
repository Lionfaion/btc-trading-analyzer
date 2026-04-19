// PHASE 6: Performance optimization with caching
const OrderFlowAnalyzer = require('../../lib/order-flow-analyzer');
const crypto = require('crypto');

const analysisCache = new Map();
const CACHE_TTL = 300000; // 5 minutes for analysis cache

// Create hash key from analysis input
const createCacheKey = (price, liquidationData) => {
  const data = JSON.stringify({ price, liquidationData });
  return crypto.createHash('sha256').update(data).digest('hex');
};

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.writeHead(405, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Method not allowed. Use POST.' }));
    return;
  }

  try {
    let { currentPrice, btcPrice, liquidationData, candles = [] } = JSON.parse(req.body || '{}');

    // Support both currentPrice and btcPrice parameter names
    const price = currentPrice || btcPrice;

    if (!price || !liquidationData || !Array.isArray(liquidationData)) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        error: 'Missing required fields: currentPrice (or btcPrice), liquidationData (array)'
      }));
      return;
    }

    // Check cache
    const cacheKey = createCacheKey(price, liquidationData);
    if (analysisCache.has(cacheKey)) {
      const cached = analysisCache.get(cacheKey);
      if (Date.now() - cached.timestamp < CACHE_TTL) {
        console.log(`📊 Cache HIT for order flow analysis`);
        res.writeHead(200, { 'Content-Type': 'application/json', 'X-Cache': 'HIT' });
        res.end(JSON.stringify({
          success: true,
          analysis: cached.analysis,
          recommendation: cached.recommendation,
          timestamp: cached.timestamp.toISOString(),
          cached: true
        }));
        return;
      }
    }

    console.log(`📊 Analyzing order flow: ${price} (${liquidationData.length} liquidations)`);

    const analyzer = new OrderFlowAnalyzer();
    const analysis = analyzer.analyzeLiquidations(price, liquidationData, candles);
    const recommendation = analyzer.generateRecommendation(analysis, price, candles);
    const timestamp = new Date();

    // Cache the result
    analysisCache.set(cacheKey, {
      analysis,
      recommendation,
      timestamp
    });

    // Cleanup old cache entries (keep max 100)
    if (analysisCache.size > 100) {
      const firstKey = analysisCache.keys().next().value;
      analysisCache.delete(firstKey);
    }

    res.writeHead(200, { 'Content-Type': 'application/json', 'X-Cache': 'MISS' });
    res.end(JSON.stringify({
      success: true,
      analysis,
      recommendation,
      timestamp: timestamp.toISOString(),
      cached: false
    }));
  } catch (e) {
    console.error('Order flow analysis error:', e.message);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: e.message }));
  }
};
