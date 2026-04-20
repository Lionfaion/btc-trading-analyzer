const http = require('http');
const fs = require('fs');
const path = require('path');
const BacktestEngine = require('./lib/backtest-engine-server.js');
const CoinGeckoClient = require('./public/lib/coingecko-client.js');

const PORT = process.env.PORT || 8080;
const publicPath = path.join(__dirname, 'public');

const server = http.createServer((req, res) => {
  try {
    // Root path - serve index.html
    if (req.url === '/') {
      const indexPath = path.join(publicPath, 'index.html');
      const content = fs.readFileSync(indexPath);
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(content);
      return;
    }

    // API health check
    if (req.url === '/api/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'ok' }));
      return;
    }

    // Bybit endpoints
    if (req.url === '/api/bybit/status') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ connected: false, balance: 0 }));
      return;
    }

    if (req.url === '/api/bybit/balance') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ totalBalance: 0, coins: [] }));
      return;
    }

    if (req.url === '/api/bybit/positions') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ positions: [], count: 0 }));
      return;
    }

    // Database endpoints
    if (req.url === '/api/db/strategies') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ strategies: [] }));
      return;
    }

    if (req.url === '/api/db/backtests') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ backtests: [] }));
      return;
    }

    if (req.url === '/api/db/trades') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ trades: [] }));
      return;
    }

    if (req.url === '/api/db/automation-jobs') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, automations: [] }));
      return;
    }

    // Automation endpoints (local dev stubs)
    if (req.url.startsWith('/api/automation/') && req.method === 'POST') {
      const action = req.url.split('/')[3];
      res.setHeader('Access-Control-Allow-Origin', '*');
      let rawBody = '';
      req.on('data', c => rawBody += c);
      req.on('end', async () => {
        const body = rawBody ? JSON.parse(rawBody) : {};
        if (action === 'enable') {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true, message: `Automatización activada para ${body.symbol}` }));
        } else if (action === 'disable') {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true, message: 'Desactivada' }));
        } else if (action === 'execute') {
          try {
            const gecko = new CoinGeckoClient();
            const symbol = body.symbol || 'BTC';
            const candles = await gecko.getHistoricalCandles(symbol, 60);
            const signal = BacktestEngine.detectCurrentSignal(candles, body.strategyType || 'MULTI_INDICATOR');
            const price = candles[candles.length - 1]?.close || 0;
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true, results: [{ jobId: 'demo', signal, symbol, price, demoMode: true }], executedAt: new Date().toISOString() }));
          } catch (e) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: e.message }));
          }
        }
      });
      return;
    }

    if (req.url === '/api/bybit/connect' && req.method === 'POST') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, connected: true, balance: 0 }));
      return;
    }

    // Automation endpoints
    if (req.url.startsWith('/api/automation/')) {
      const parts = req.url.split('/');
      const action = parts[3];
      if (action === 'execute' || action === 'enable' || action === 'disable') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true }));
        return;
      }
    }

    // Strategy create endpoint
    if (req.url === '/api/db/strategies' && req.method === 'POST') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, strategyId: 'demo-1' }));
      return;
    }

    // Chart data endpoint (local dev)
    if (req.url.startsWith('/api/chart/data')) {
      res.setHeader('Access-Control-Allow-Origin', '*');
      const urlObj = new URL(req.url, 'http://localhost');
      const symbol = (urlObj.searchParams.get('symbol') || 'BTC').toUpperCase();
      const limit = Math.min(parseInt(urlObj.searchParams.get('limit') || '365'), 500);
      try {
        const gecko = new CoinGeckoClient();
        const rawCandles = await gecko.getHistoricalCandles(symbol, limit);
        const candles = rawCandles.map(c => {
          const ts = c.open_time || c.timestamp;
          const t = ts ? Math.floor(new Date(ts).getTime() / 1000) : null;
          return { time: t, open: parseFloat(c.open), high: parseFloat(c.high), low: parseFloat(c.low), close: parseFloat(c.close) };
        }).filter(c => c.time && !isNaN(c.close));
        const eng = new BacktestEngine({ indicators: ['RSI', 'MACD', 'BB'] });
        eng.loadCandles(rawCandles);
        const rsiValues = [], macdValues = [], bbValues = [];
        for (let i = 0; i < eng.candles.length; i++) {
          const t = candles[i]?.time;
          if (!t) continue;
          const rsi = eng._rsi(i, 14);
          if (rsi != null) rsiValues.push({ time: t, value: parseFloat(rsi.toFixed(2)) });
          const macd = eng._macd(i);
          if (macd != null) macdValues.push({ time: t, macd: parseFloat(macd.macd.toFixed(4)), signal: parseFloat(macd.signal.toFixed(4)), histogram: parseFloat(macd.histogram.toFixed(4)) });
          const bb = eng._bb(i, 20);
          if (bb != null) bbValues.push({ time: t, upper: parseFloat(bb.upper.toFixed(2)), middle: parseFloat(bb.middle.toFixed(2)), lower: parseFloat(bb.lower.toFixed(2)) });
        }
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, symbol, candleCount: candles.length, candles, indicators: { rsi: { values: rsiValues }, macd: { values: macdValues }, bollingerBands: { values: bbValues } } }));
      } catch (e) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: e.message }));
      }
      return;
    }

    // Backtest execution
    if (req.url === '/api/backtest/run' && req.method === 'POST') {
      res.setHeader('Access-Control-Allow-Origin', '*');
      let rawBody = '';
      req.on('data', chunk => rawBody += chunk);
      req.on('end', async () => {
        try {
          const body = rawBody ? JSON.parse(rawBody) : {};
          const { symbol = 'BTC', strategyType = 'MULTI_INDICATOR', initialBalance = 10000, riskPercentage = 2, days = 365 } = body;
          const indicatorMap = { RSI_CROSSOVER: ['RSI'], MACD_CROSSOVER: ['MACD'], SMA_CROSSOVER: ['SMA'], MULTI_INDICATOR: ['RSI', 'MACD', 'BB'] };
          const gecko = new CoinGeckoClient();
          const candles = await gecko.getHistoricalCandles(symbol, days);
          const engine = new BacktestEngine({ initialBalance, riskPercentage, indicators: indicatorMap[strategyType] || ['RSI', 'MACD', 'BB'] });
          engine.loadCandles(candles);
          const result = await engine.run();
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true, ...result, symbol, strategyType }));
        } catch (e) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: e.message }));
        }
      });
      return;
    }

    // Backtest CRUD (in-memory demo)
    if (req.url.startsWith('/api/db/backtests')) {
      res.setHeader('Content-Type', 'application/json');
      if (req.method === 'GET') { res.writeHead(200); res.end(JSON.stringify({ success: true, backtests: [] })); return; }
      if (req.method === 'POST') { res.writeHead(201); res.end(JSON.stringify({ success: true })); return; }
      if (req.method === 'DELETE') { res.writeHead(200); res.end(JSON.stringify({ success: true })); return; }
    }

    // Serve static files
    const filePath = path.join(publicPath, req.url === '/' ? 'index.html' : req.url);

    if (!filePath.startsWith(publicPath)) {
      res.writeHead(404);
      res.end('Not found');
      return;
    }

    try {
      const content = fs.readFileSync(filePath);
      let contentType = 'application/octet-stream';

      if (filePath.endsWith('.html')) contentType = 'text/html; charset=utf-8';
      else if (filePath.endsWith('.css')) contentType = 'text/css';
      else if (filePath.endsWith('.js')) contentType = 'application/javascript';
      else if (filePath.endsWith('.json')) contentType = 'application/json';
      else if (filePath.endsWith('.svg')) contentType = 'image/svg+xml';

      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content);
    } catch (e) {
      // Fallback to index.html for SPA routing
      const indexContent = fs.readFileSync(path.join(publicPath, 'index.html'));
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(indexContent);
    }
  } catch (e) {
    res.writeHead(500);
    res.end('Error');
  }
});

server.listen(PORT, '0.0.0.0');
