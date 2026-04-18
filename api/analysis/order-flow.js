const OrderFlowAnalyzer = require('../../lib/order-flow-analyzer');

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

    console.log(`📊 Analyzing order flow: ${price} (${liquidationData.length} liquidations)`);

    const analyzer = new OrderFlowAnalyzer();
    const analysis = analyzer.analyzeLiquidations(price, liquidationData, candles);
    const recommendation = analyzer.generateRecommendation(analysis, price, candles);

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      success: true,
      analysis,
      recommendation,
      timestamp: new Date().toISOString()
    }));
  } catch (e) {
    console.error('Order flow analysis error:', e.message);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: e.message }));
  }
};
