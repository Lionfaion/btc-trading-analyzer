// api/analysis/order-flow.js - Análisis avanzado de order flow y liquidaciones
import { getSupabaseClient } from '../db/init.js';

/**
 * Analiza order flow basado en liquidaciones y actividad de mercado
 * Detecta:
 * - Acumulación de liquidaciones en rangos de precio
 * - "Trapped longs/shorts" (zonas donde se liquidan posiciones)
 * - Presión de venta/compra
 * - Niveles de soporte/resistencia identificados por orden flow
 */
async function analyzeOrderFlow(btcPrice, liquidationData, historyPeriod = 24) {
  try {
    if (!liquidationData || liquidationData.length === 0) {
      return {
        analysis: 'No liquidation data available',
        alerts: [],
        signals: {}
      };
    }

    const analysis = {
      timestamp: new Date().toISOString(),
      currentPrice: btcPrice,
      analysisWindow: `${historyPeriod}h`,
      alerts: [],
      signals: {},
      orderFlowMetrics: {},
      risks: []
    };

    // 1. Agrupar liquidaciones por rango de precio
    const priceRanges = calculatePriceRanges(btcPrice);
    const liquidationsByRange = groupLiquidationsByRange(liquidationData, priceRanges);

    // 2. Detectar concentración de liquidaciones
    const hotZones = identifyHotZones(liquidationsByRange, btcPrice);

    // 3. Identificar "trapped" positions
    const trappedAnalysis = analyzeTrappedPositions(liquidationData, btcPrice);

    // 4. Calcular presión de mercado
    const marketPressure = calculateMarketPressure(liquidationData, btcPrice);

    // 5. Generar señales y alertas
    generateSignals(analysis, hotZones, trappedAnalysis, marketPressure);

    analysis.orderFlowMetrics = {
      hotZones: hotZones,
      trappedLongs: trappedAnalysis.longs,
      trappedShorts: trappedAnalysis.shorts,
      marketPressure: marketPressure
    };

    // 6. Añadir recomendaciones de riesgo
    addRiskAssessment(analysis, hotZones, marketPressure);

    return analysis;

  } catch (error) {
    console.error('[Order Flow Analysis Error]', error);
    throw error;
  }
}

/**
 * Crea rangos de precio para análisis
 */
function calculatePriceRanges(currentPrice, rangePercent = 2) {
  const step = currentPrice * (rangePercent / 100);
  return {
    veryHigh: { min: currentPrice * 1.10, label: '+10%+' },
    high: { min: currentPrice * 1.05, max: currentPrice * 1.10, label: '+5% to +10%' },
    above: { min: currentPrice * 1.02, max: currentPrice * 1.05, label: '+2% to +5%' },
    current: { min: currentPrice * 0.98, max: currentPrice * 1.02, label: '±2%' },
    below: { min: currentPrice * 0.95, max: currentPrice * 0.98, label: '-5% to -2%' },
    low: { min: currentPrice * 0.90, max: currentPrice * 0.95, label: '-10% to -5%' },
    veryLow: { max: currentPrice * 0.90, label: '-10%-' }
  };
}

/**
 * Agrupa liquidaciones por rango de precio
 */
function groupLiquidationsByRange(liquidationData, priceRanges) {
  const ranges = {
    veryHigh: { count: 0, volume: 0, positions: [] },
    high: { count: 0, volume: 0, positions: [] },
    above: { count: 0, volume: 0, positions: [] },
    current: { count: 0, volume: 0, positions: [] },
    below: { count: 0, volume: 0, positions: [] },
    low: { count: 0, volume: 0, positions: [] },
    veryLow: { count: 0, volume: 0, positions: [] }
  };

  liquidationData.forEach(liq => {
    const price = parseFloat(liq.price) || 0;
    const volume = parseFloat(liq.volume) || 0;
    let rangeKey = 'current';

    if (price >= priceRanges.veryHigh.min) rangeKey = 'veryHigh';
    else if (price >= priceRanges.high.min) rangeKey = 'high';
    else if (price >= priceRanges.above.min) rangeKey = 'above';
    else if (price >= priceRanges.current.min) rangeKey = 'current';
    else if (price >= priceRanges.below.min) rangeKey = 'below';
    else if (price >= priceRanges.low.min) rangeKey = 'low';
    else rangeKey = 'veryLow';

    ranges[rangeKey].count++;
    ranges[rangeKey].volume += volume;
    ranges[rangeKey].positions.push({
      price,
      volume,
      side: liq.side || 'unknown',
      time: liq.time
    });
  });

  return ranges;
}

/**
 * Identifica "hot zones" - áreas con alta concentración de liquidaciones
 */
function identifyHotZones(liquidationsByRange, currentPrice) {
  const hotZones = [];
  const threshold = 100000; // volumen mínimo para considerarse "hot"

  Object.entries(liquidationsByRange).forEach(([rangeKey, data]) => {
    if (data.volume > threshold && data.count > 5) {
      const avgPrice = data.positions.length > 0
        ? data.positions.reduce((sum, p) => sum + p.price, 0) / data.positions.length
        : currentPrice;

      const shortLiqs = data.positions.filter(p => p.side === 'short').length;
      const longLiqs = data.positions.filter(p => p.side === 'long').length;

      hotZones.push({
        rangeKey,
        priceLevel: avgPrice,
        volume: data.volume,
        liquidationCount: data.count,
        dominantSide: shortLiqs > longLiqs ? 'SHORTS' : 'LONGS',
        pressure: calculateZonePressure(data),
        riskLevel: data.volume > 500000 ? 'HIGH' : 'MEDIUM'
      });
    }
  });

  return hotZones.sort((a, b) => b.volume - a.volume);
}

/**
 * Calcula presión en una zona (diferencia entre longs y shorts)
 */
function calculateZonePressure(zoneData) {
  const shorts = zoneData.positions.filter(p => p.side === 'short').reduce((sum, p) => sum + p.volume, 0);
  const longs = zoneData.positions.filter(p => p.side === 'long').reduce((sum, p) => sum + p.volume, 0);
  const total = shorts + longs || 1;

  return {
    shortPercentage: (shorts / total) * 100,
    longPercentage: (longs / total) * 100,
    netPressure: shorts - longs
  };
}

/**
 * Analiza posiciones "trapped" (liquidadas en contrarios)
 */
function analyzeTrappedPositions(liquidationData, currentPrice) {
  const longs = liquidationData.filter(l => l.side === 'long');
  const shorts = liquidationData.filter(l => l.side === 'short');

  return {
    longs: {
      count: longs.length,
      totalVolume: longs.reduce((sum, l) => sum + (parseFloat(l.volume) || 0), 0),
      avgLiquidationPrice: longs.length > 0
        ? longs.reduce((sum, l) => sum + (parseFloat(l.price) || 0), 0) / longs.length
        : currentPrice,
      interpretation: longs.length > shorts.length
        ? 'More longs trapped - bullish bias was liquidated'
        : 'Fewer longs - weaker liquidation pressure'
    },
    shorts: {
      count: shorts.length,
      totalVolume: shorts.reduce((sum, s) => sum + (parseFloat(s.volume) || 0), 0),
      avgLiquidationPrice: shorts.length > 0
        ? shorts.reduce((sum, s) => sum + (parseFloat(s.price) || 0), 0) / shorts.length
        : currentPrice,
      interpretation: shorts.length > longs.length
        ? 'More shorts trapped - bearish bias was liquidated'
        : 'Fewer shorts - weaker bearish pressure'
    }
  };
}

/**
 * Calcula presión general del mercado
 */
function calculateMarketPressure(liquidationData, currentPrice) {
  const totalLiquidations = liquidationData.length;
  const totalVolume = liquidationData.reduce((sum, l) => sum + (parseFloat(l.volume) || 0), 0);

  const shorts = liquidationData.filter(l => l.side === 'short');
  const longs = liquidationData.filter(l => l.side === 'long');

  const shortVolume = shorts.reduce((sum, s) => sum + (parseFloat(s.volume) || 0), 0);
  const longVolume = longs.reduce((sum, l) => sum + (parseFloat(l.volume) || 0), 0);

  return {
    totalLiquidations,
    totalVolume,
    shortPercentage: (shortVolume / totalVolume) * 100,
    longPercentage: (longVolume / totalVolume) * 100,
    dominantSide: shortVolume > longVolume ? 'SHORTS' : 'LONGS',
    pressureIntensity: totalVolume > 1000000 ? 'EXTREME' : totalVolume > 500000 ? 'HIGH' : 'NORMAL'
  };
}

/**
 * Genera señales y alertas basadas en análisis
 */
function generateSignals(analysis, hotZones, trappedAnalysis, marketPressure) {
  // Alerta 1: Hot zones agresivas
  hotZones.forEach(zone => {
    if (zone.riskLevel === 'HIGH') {
      analysis.alerts.push({
        type: 'AGGRESSIVE_ZONE',
        severity: 'HIGH',
        message: `Major liquidation zone at ${zone.rangeKey} (${(zone.priceLevel / 100).toFixed(0)}00) with ${(zone.volume / 1000).toFixed(0)}k volume`,
        recommendation: zone.dominantSide === 'SHORTS'
          ? 'Be cautious of bullish moves - shorts heavily liquidated'
          : 'Be cautious of bearish moves - longs heavily liquidated'
      });
    }
  });

  // Alerta 2: Imbalance extremo
  if (Math.abs(marketPressure.shortPercentage - marketPressure.longPercentage) > 30) {
    analysis.alerts.push({
      type: 'EXTREME_IMBALANCE',
      severity: 'HIGH',
      message: `Extreme imbalance detected: ${marketPressure.dominantSide} liquidations at ${(Math.abs(marketPressure.shortPercentage - marketPressure.longPercentage)).toFixed(1)}%`,
      recommendation: `Market tilted heavily to ${marketPressure.dominantSide} - expect volatility`
    });
  }

  // Señal 1: Momentum cambio
  if (trappedAnalysis.shorts.count > trappedAnalysis.longs.count * 1.5) {
    analysis.signals.biasBullish = {
      strength: 'MODERATE',
      reason: 'More shorts liquidated than longs - potential upside'
    };
  } else if (trappedAnalysis.longs.count > trappedAnalysis.shorts.count * 1.5) {
    analysis.signals.biasBearish = {
      strength: 'MODERATE',
      reason: 'More longs liquidated than shorts - potential downside'
    };
  }
}

/**
 * Evalúa riesgos para el trading
 */
function addRiskAssessment(analysis, hotZones, marketPressure) {
  // Risk 1: Próxima resistencia/soporte agresivo
  const topZones = hotZones.slice(0, 3);
  if (topZones.length > 0) {
    analysis.risks.push({
      type: 'LIQUIDATION_CLUSTER',
      level: topZones[0].riskLevel,
      description: `Significant liquidation cluster found - prices may bounce or cascade through ${topZones.length} zones`,
      mitigation: 'Tighten stops near cluster boundaries, reduce position size'
    });
  }

  // Risk 2: Extrema presión
  if (marketPressure.pressureIntensity === 'EXTREME') {
    analysis.risks.push({
      type: 'EXTREME_MARKET_PRESSURE',
      level: 'CRITICAL',
      description: `Massive liquidation activity (${(marketPressure.totalVolume / 1000000).toFixed(2)}M volume) - expect volatility spikes`,
      mitigation: 'Use tight stops, avoid large positions, consider sitting out'
    });
  }

  // Risk 3: Imbalance
  if (Math.abs(marketPressure.shortPercentage - marketPressure.longPercentage) > 40) {
    analysis.risks.push({
      type: 'SEVERE_IMBALANCE',
      level: 'HIGH',
      description: `Very skewed liquidations towards ${marketPressure.dominantSide} - risk of quick reversal`,
      mitigation: 'Prepare for sudden momentum change, have exit plan ready'
    });
  }
}

/**
 * API Handler
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { btcPrice, liquidationData, historyPeriod = 24 } = req.body;

    if (!btcPrice || !liquidationData) {
      return res.status(400).json({
        error: 'Missing required fields: btcPrice, liquidationData'
      });
    }

    const analysis = await analyzeOrderFlow(btcPrice, liquidationData, historyPeriod);

    // Guardar en DB si está disponible
    try {
      const supabase = getSupabaseClient();
      const { error: dbError } = await supabase
        .from('analysis_history')
        .insert({
          symbol: 'BTC',
          timestamp: new Date().toISOString(),
          price: btcPrice,
          analysis_data: analysis
        });

      if (dbError) console.error('DB save error:', dbError);
    } catch (dbErr) {
      console.log('Database not available, continuing without persistence');
    }

    return res.status(200).json({
      success: true,
      analysis
    });

  } catch (error) {
    console.error('[Order Flow Handler Error]', error);
    return res.status(500).json({
      error: error.message,
      success: false
    });
  }
}
