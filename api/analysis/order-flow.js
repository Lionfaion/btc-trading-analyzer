module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.writeHead(405, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Method not allowed' }));
    return;
  }

  try {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      const { btcPrice, liquidationData, historyPeriod } = JSON.parse(body);

      if (!liquidationData || liquidationData.length === 0) {
        throw new Error('No liquidation data provided');
      }

      // Analizar order flow basado en liquidaciones
      const analysis = analyzeOrderFlow(btcPrice, liquidationData);

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: true,
        analysis,
        timestamp: new Date().toISOString()
      }));
    });
  } catch (error) {
    console.error('Order flow error:', error);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: error.message }));
  }
};

function analyzeOrderFlow(btcPrice, liquidationData) {
  const alerts = [];
  const orderFlowMetrics = {
    hotZones: [],
    dominantSide: 'NEUTRAL',
    liquidationPressure: 'MODERATE'
  };

  // Calcular volúmenes
  let totalLongs = 0, totalShorts = 0;
  
  liquidationData.forEach(item => {
    if (item.side === 'long') totalLongs += item.volume;
    else if (item.side === 'short') totalShorts += item.volume;
  });

  const total = totalLongs + totalShorts;
  const longPercent = total > 0 ? (totalLongs / total) * 100 : 50;
  const shortPercent = total > 0 ? (totalShorts / total) * 100 : 50;

  // Detectar dominancia
  if (longPercent > 60) {
    orderFlowMetrics.dominantSide = 'LONGS';
    alerts.push({
      type: 'Presión Alcista',
      severity: 'HIGH',
      message: `${longPercent.toFixed(1)}% de liquidaciones son longs. Posible compresión alcista.`
    });
  } else if (shortPercent > 60) {
    orderFlowMetrics.dominantSide = 'SHORTS';
    alerts.push({
      type: 'Presión Bajista',
      severity: 'HIGH',
      message: `${shortPercent.toFixed(1)}% de liquidaciones son shorts. Presión bajista fuerte.`
    });
  }

  // Detectar zonas calientes (con alto volumen de liquidaciones)
  if (total > 500000000) {
    orderFlowMetrics.liquidationPressure = 'EXTREME';
    orderFlowMetrics.hotZones.push({
      priceLevel: btcPrice,
      volume: total,
      dominantSide: orderFlowMetrics.dominantSide,
      intensity: 'EXTREME'
    });
    
    alerts.push({
      type: 'Zona Caliente Detectada',
      severity: 'CRITICAL',
      message: `Volumen masivo de liquidaciones (${(total / 1e6).toFixed(0)}M) en zona de precio actual.`
    });
  } else if (total > 300000000) {
    orderFlowMetrics.liquidationPressure = 'HIGH';
    orderFlowMetrics.hotZones.push({
      priceLevel: btcPrice,
      volume: total,
      dominantSide: orderFlowMetrics.dominantSide,
      intensity: 'HIGH'
    });
  } else {
    orderFlowMetrics.liquidationPressure = 'MODERATE';
  }

  // Detectar trampas institucionales
  if (Math.abs(longPercent - shortPercent) > 25 && total > 200000000) {
    alerts.push({
      type: 'Trampa Institucional Posible',
      severity: 'MEDIUM',
      message: 'Desbalance extremo entre longs/shorts. Posible movimiento violento para liquidar el lado mayoritario.'
    });
  }

  return {
    alerts,
    orderFlowMetrics,
    summary: {
      totalLiquidations: total,
      longPercent: longPercent.toFixed(1),
      shortPercent: shortPercent.toFixed(1),
      priceLevel: btcPrice
    }
  };
}
