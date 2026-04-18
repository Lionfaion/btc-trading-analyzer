module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.writeHead(405, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Method not allowed' }));
    return;
  }

  try {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      const { asset, price, liquidationData, timeframe } = JSON.parse(body);

      // Análisis basado en datos de liquidaciones y precio
      const longLiq = liquidationData?.longLiquidations || 0;
      const shortLiq = liquidationData?.shortLiquidations || 0;
      const totalLiq = longLiq + shortLiq;

      let bias = 'NEUTRAL';
      let riskZones = '';
      let traps = '';
      let confidence = 50;
      let action = 'WAIT';

      if (totalLiq > 0) {
        const ratio = longLiq / shortLiq;
        if (ratio > 1.2) {
          bias = '⬆️ BULLISH - Más longs liquidados, compresión alcista probable';
          confidence = 65;
          action = '🟢 COMPRA en pullback a soporte';
        } else if (ratio < 0.8) {
          bias = '⬇️ BEARISH - Más shorts liquidados, presión bajista';
          confidence = 60;
          action = '🔴 VENTA en resistencia';
        }
      }

      // Análisis de zonas de riesgo (simulado)
      const priceLevel = Math.floor(price / 1000) * 1000;
      const supportZone = priceLevel - 2000;
      const resistanceZone = priceLevel + 2000;

      riskZones = `Soporte: $${supportZone.toLocaleString()} | Resistencia: $${resistanceZone.toLocaleString()}`;
      traps = `Zona de trampa institucional detectada entre $${supportZone}-${supportZone + 1000}`;

      const analysis = {
        bias,
        risk_zones: riskZones,
        institutional_traps: traps,
        confidence: `${confidence}`,
        action
      };

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: true,
        analysis: JSON.stringify(analysis),
        asset,
        price,
        timestamp: new Date().toISOString()
      }));
    });
  } catch (error) {
    console.error('Analyze error:', error);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: error.message }));
  }
};
