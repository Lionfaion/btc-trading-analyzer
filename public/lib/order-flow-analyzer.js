// Order Flow Analysis Engine - PHASE 5
// Analyzes liquidations, order book imbalance, and trapped positions

class OrderFlowAnalyzer {
  constructor() {
    this.liquidationLevels = [];
    this.trappedPositions = { longs: [], shorts: [] };
    this.orderFlowMetrics = {};
  }

  /**
   * Analyze liquidation data and detect trapped positions
   * @param {number} currentPrice - Current BTC/Asset price
   * @param {Array} liquidationData - [{side: 'long'|'short', volume: number, price?: number}]
   * @param {Array} candles - Historical candles for volatility analysis
   * @returns {Object} Analysis result with alerts and metrics
   */
  analyzeLiquidations(currentPrice, liquidationData, candles = []) {
    const alerts = [];
    const hotZones = [];
    const metrics = {
      totalLongLiquidations: 0,
      totalShortLiquidations: 0,
      longShortRatio: 0,
      dominantSide: 'balanced',
      liquidationDensity: 'normal',
      riskLevel: 'low'
    };

    // Calculate totals
    const longLiqs = liquidationData
      .filter(l => l.side === 'long')
      .reduce((sum, l) => sum + (l.volume || 0), 0);

    const shortLiqs = liquidationData
      .filter(l => l.side === 'short')
      .reduce((sum, l) => sum + (l.volume || 0), 0);

    metrics.totalLongLiquidations = longLiqs;
    metrics.totalShortLiquidations = shortLiqs;
    metrics.longShortRatio = shortLiqs > 0 ? (longLiqs / shortLiqs).toFixed(2) : 'N/A';

    // Determine dominant side
    if (longLiqs > shortLiqs * 1.5) {
      metrics.dominantSide = 'longs';
      alerts.push({
        type: 'LONG_LIQUIDATION_PRESSURE',
        severity: 'high',
        message: `Heavy long liquidations: ${this._formatNumber(longLiqs)} vs ${this._formatNumber(shortLiqs)} shorts`
      });
    } else if (shortLiqs > longLiqs * 1.5) {
      metrics.dominantSide = 'shorts';
      alerts.push({
        type: 'SHORT_LIQUIDATION_PRESSURE',
        severity: 'high',
        message: `Heavy short liquidations: ${this._formatNumber(shortLiqs)} vs ${this._formatNumber(longLiqs)} longs`
      });
    } else {
      metrics.dominantSide = 'balanced';
    }

    // Detect liquidation density (concentration of liquidations)
    const totalLiqs = longLiqs + shortLiqs;
    const volatility = this._calculateVolatility(candles);

    if (totalLiqs > volatility * 10) {
      metrics.liquidationDensity = 'extreme';
      metrics.riskLevel = 'critical';
      alerts.push({
        type: 'EXTREME_LIQUIDATION_DENSITY',
        severity: 'critical',
        message: `Extreme liquidation concentration. Total: ${this._formatNumber(totalLiqs)}`
      });
    } else if (totalLiqs > volatility * 5) {
      metrics.liquidationDensity = 'high';
      metrics.riskLevel = 'high';
    } else if (totalLiqs < volatility * 0.5) {
      metrics.liquidationDensity = 'low';
      metrics.riskLevel = 'low';
    }

    // Identify hot zones (price levels with high liquidation concentration)
    hotZones.push({
      level: currentPrice,
      liquidationVolume: longLiqs,
      dominantSide: 'long',
      distanceFromCurrent: 0,
      riskScore: this._calculateRiskScore(longLiqs, totalLiqs)
    });

    hotZones.push({
      level: currentPrice,
      liquidationVolume: shortLiqs,
      dominantSide: 'short',
      distanceFromCurrent: 0,
      riskScore: this._calculateRiskScore(shortLiqs, totalLiqs)
    });

    // Sort by risk score
    hotZones.sort((a, b) => b.riskScore - a.riskScore);

    return {
      success: true,
      alerts,
      metrics,
      orderFlowMetrics: {
        hotZones: hotZones.slice(0, 5),
        imbalanceRatio: this._calculateImbalance(longLiqs, shortLiqs),
        pressureIndex: this._calculatePressure(longLiqs, shortLiqs),
        trappedPositions: this._detectTrappedPositions(currentPrice, liquidationData, candles),
        liquidationVelocity: this._calculateVelocity(liquidationData)
      }
    };
  }

  /**
   * Detect trapped long/short positions
   * A trapped position is one that would be liquidated if price moves against it
   */
  _detectTrappedPositions(currentPrice, liquidationData, candles = []) {
    const trapped = { longs: [], shorts: [] };

    // Analyze candle patterns to identify support/resistance
    if (candles.length < 5) return trapped;

    const closes = candles.map(c => c.close);
    const recent = closes.slice(-20);

    const avg = recent.reduce((a, b) => a + b, 0) / recent.length;
    const high = Math.max(...recent);
    const low = Math.min(...recent);

    // Trapped longs: if price is near recent high but many liquidations exist above
    if (currentPrice >= high * 0.98) {
      trapped.longs.push({
        type: 'trapped_at_resistance',
        level: high,
        strength: 'high',
        message: 'Longs trapped near resistance, vulnerable to sudden drop'
      });
    }

    // Trapped shorts: if price is near recent low but many liquidations exist below
    if (currentPrice <= low * 1.02) {
      trapped.shorts.push({
        type: 'trapped_at_support',
        level: low,
        strength: 'high',
        message: 'Shorts trapped near support, vulnerable to sudden spike'
      });
    }

    return trapped;
  }

  /**
   * Calculate order book imbalance (buy vs sell pressure)
   */
  _calculateImbalance(longLiqs, shortLiqs) {
    const total = longLiqs + shortLiqs;
    if (total === 0) return 0;

    const imbalance = Math.abs(longLiqs - shortLiqs) / total;
    return parseFloat(imbalance.toFixed(4));
  }

  /**
   * Calculate pressure index (-100 to 100, negative = bearish, positive = bullish)
   */
  _calculatePressure(longLiqs, shortLiqs) {
    const total = longLiqs + shortLiqs;
    if (total === 0) return 0;

    const pressure = ((shortLiqs - longLiqs) / total) * 100;
    return parseFloat(pressure.toFixed(1));
  }

  /**
   * Calculate risk score for a liquidation zone (0-100)
   */
  _calculateRiskScore(volume, totalVolume) {
    if (totalVolume === 0) return 0;
    const score = (volume / totalVolume) * 100;
    return Math.min(100, score);
  }

  /**
   * Calculate volatility from candles
   */
  _calculateVolatility(candles) {
    if (candles.length < 2) return 0;

    const returns = [];
    for (let i = 1; i < candles.length; i++) {
      const prevClose = candles[i - 1].close;
      const currClose = candles[i].close;
      returns.push(Math.abs((currClose - prevClose) / prevClose));
    }

    const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
    return avgReturn * 100; // percentage
  }

  /**
   * Calculate liquidation velocity (how fast liquidations are happening)
   */
  _calculateVelocity(liquidationData) {
    if (!liquidationData || liquidationData.length === 0) return 0;

    const totalVolume = liquidationData.reduce((sum, l) => sum + (l.volume || 0), 0);
    // Velocity = volume / time (simplified: assume 1 hour = 1 unit)
    return parseFloat((totalVolume / 1000000).toFixed(4)); // In millions per hour
  }

  /**
   * Format large numbers with K/M/B suffix
   */
  _formatNumber(num) {
    if (num >= 1000000000) {
      return (num / 1000000000).toFixed(1) + 'B';
    } else if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toFixed(0);
  }

  /**
   * Generate trading recommendation based on order flow
   */
  generateRecommendation(analysis, currentPrice, recentCandles = []) {
    const metrics = analysis.orderFlowMetrics;
    const imbalance = metrics.imbalanceRatio;
    const pressure = metrics.pressureIndex;

    let recommendation = '🔍 ';
    let signal = 'NEUTRAL';
    let confidence = 50;

    // Analyze pressure
    if (pressure > 30) {
      recommendation += 'BEARISH: Strong short liquidations dominating. ';
      signal = 'BEARISH';
      confidence = 70;
    } else if (pressure < -30) {
      recommendation += 'BULLISH: Strong long liquidations dominating. ';
      signal = 'BULLISH';
      confidence = 70;
    } else if (Math.abs(pressure) < 10) {
      recommendation += 'BALANCED: Order flow evenly distributed. ';
      signal = 'NEUTRAL';
      confidence = 50;
    }

    // Check for trapped positions
    if (metrics.trappedPositions.longs.length > 0) {
      recommendation += 'Longs are trapped - watch for squeeze. ';
      confidence += 10;
    }
    if (metrics.trappedPositions.shorts.length > 0) {
      recommendation += 'Shorts are trapped - watch for reversal. ';
      confidence += 10;
    }

    // Risk assessment
    if (analysis.metrics.riskLevel === 'critical') {
      recommendation += '⚠️ CRITICAL RISK: Extreme liquidation density, high volatility expected. ';
    } else if (analysis.metrics.riskLevel === 'high') {
      recommendation += '⚠️ HIGH RISK: Elevated liquidation levels. ';
    }

    return {
      signal,
      recommendation: recommendation.trim(),
      confidence: Math.min(100, confidence),
      pressureIndex: pressure,
      imbalanceRatio: imbalance
    };
  }
}

module.exports = OrderFlowAnalyzer;
