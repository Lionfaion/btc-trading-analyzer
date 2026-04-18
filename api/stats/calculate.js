module.exports = async (req, res) => {
  if (req.method !== 'GET' && req.method !== 'POST') {
    res.writeHead(405, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Method not allowed' }));
    return;
  }

  try {
    // Demo trading statistics (en Phase 3 vendrá de Bybit/DB)
    const demoStats = {
      totalTrades: 24,
      winTrades: 15,
      loseTrades: 9,
      totalPnL: 2450.50,
      roi: 24.5,
      winRate: 62.5,
      avgWin: 325.40,
      avgLoss: -272.30,
      profitFactor: 2.35,
      sharpeRatio: 1.87,
      maxDrawdown: 8.5,
      consecutiveWins: 5,
      expectancy: 102.10
    };

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      success: true,
      stats: demoStats,
      timestamp: new Date().toISOString(),
      note: 'Demo data - Bybit integration coming in Phase 3'
    }));
  } catch (error) {
    console.error('Stats error:', error);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: error.message }));
  }
};
