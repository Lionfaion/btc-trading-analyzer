// Database Routes Dispatcher - Route to correct handler based on path

module.exports = async (req, res) => {
  const path = req.url.split('?')[0];

  // Route to /api/db/trades
  if (path === '/api/db/trades' || path.startsWith('/api/db/trades/')) {
    const tradesHandler = require('./trades.js');
    if (path.includes('/')) {
      const parts = path.split('/');
      const tradeId = parts[4]; // /api/db/trades/:id
      if (tradeId && req.method === 'PATCH') {
        req.params = { id: tradeId };
        return tradesHandler.updateTrade(req, res);
      }
    }
    if (req.method === 'GET') return tradesHandler.getTrades(req, res);
    if (req.method === 'POST') return tradesHandler.createTrade(req, res);
  }

  // Route to /api/db/strategies
  if (path === '/api/db/strategies') {
    const strategiesHandler = require('./strategies.js');
    if (req.method === 'GET') return strategiesHandler.getStrategies(req, res);
    if (req.method === 'POST') return strategiesHandler.createStrategy(req, res);
  }

  // Route to /api/db/candles
  if (path === '/api/db/candles') {
    const candlesHandler = require('./candles.js');
    if (req.method === 'GET') return candlesHandler.getCandles(req, res);
    if (req.method === 'POST') return candlesHandler.insertCandles(req, res);
  }

  // Route to /api/db/analysis
  if (path === '/api/db/analysis') {
    const analysisHandler = require('./analysis.js');
    if (req.method === 'GET') return analysisHandler.getAnalysis(req, res);
    if (req.method === 'POST') return analysisHandler.saveAnalysis(req, res);
  }

  // Route to /api/db/assets
  if (path === '/api/db/assets' || path.startsWith('/api/db/assets/')) {
    const assetsHandler = require('./assets.js');
    if (path === '/api/db/assets') {
      return assetsHandler.getAssets(req, res);
    }
    // Handle /api/db/assets/:symbol/stats
    const parts = path.split('/');
    const symbol = parts[4];
    if (symbol && parts[5] === 'stats') {
      req.params = { symbol };
      return assetsHandler.getAssetStats(req, res);
    }
  }

  // Route to /api/db/backtests
  if (path === '/api/db/backtests' || path.startsWith('/api/db/backtests/')) {
    const backtestsHandler = require('./backtests.js');
    if (path === '/api/db/backtests') {
      if (req.method === 'GET') return backtestsHandler.getBacktests(req, res);
      if (req.method === 'POST') return backtestsHandler.saveBacktest(req, res);
    }
    // Handle /api/db/backtests/:id
    const parts = path.split('/');
    const backtestId = parts[4];
    if (backtestId) {
      req.params = { id: backtestId };
      if (req.method === 'GET') return backtestsHandler.getBacktestById(req, res);
      if (req.method === 'DELETE') return backtestsHandler.deleteBacktest(req, res);
    }
  }

  // Not found
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({
    success: false,
    error: 'Endpoint not found'
  }));
};
