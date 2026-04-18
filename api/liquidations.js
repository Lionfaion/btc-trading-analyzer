module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    res.writeHead(405, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Method not allowed' }));
    return;
  }

  try {
    const data = {
      data: {
        long: Math.random() * 500000000 + 300000000,
        short: Math.random() * 450000000 + 250000000,
        timestamp: new Date().toISOString()
      },
      message: 'Demo liquidation data (Bybit API coming in Phase 3)'
    };

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(data));
  } catch (e) {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: e.message }));
  }
};
