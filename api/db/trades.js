const { insertTrade, getTrades } = require('./init');

module.exports = async (req, res) => {
  try {
    if (req.method === 'POST') {
      let body = '';
      req.on('data', chunk => body += chunk);
      req.on('end', async () => {
        try {
          const trade = JSON.parse(body);
          
          if (!trade.symbol || !trade.entry_price || !trade.exit_price) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Missing required fields' }));
            return;
          }

          trade.pnl = (trade.exit_price - trade.entry_price) * (trade.quantity || 1);
          trade.pnl_percent = ((trade.exit_price - trade.entry_price) / trade.entry_price) * 100;
          trade.is_win = trade.pnl > 0;
          trade.entry_time = trade.entry_time || new Date().toISOString();
          trade.exit_time = trade.exit_time || new Date().toISOString();

          await insertTrade(trade);

          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            success: true,
            trade,
            message: 'Trade saved successfully'
          }));
        } catch (error) {
          console.error('POST error:', error);
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: error.message }));
        }
      });
    } else if (req.method === 'GET') {
      const symbol = new URL(`http://localhost${req.url}`).searchParams.get('symbol') || 'BTC';
      const limit = parseInt(new URL(`http://localhost${req.url}`).searchParams.get('limit')) || 100;

      const trades = await getTrades(symbol, limit);

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: true,
        symbol,
        count: trades.length,
        trades
      }));
    } else {
      res.writeHead(405, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Method not allowed' }));
    }
  } catch (error) {
    console.error('Error:', error);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: error.message }));
  }
};
