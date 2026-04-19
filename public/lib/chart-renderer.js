/**
 * Chart Renderer - TradingView Lightweight Charts Integration
 * Renders OHLC candlesticks and integrates with indicators
 * PHASE 4: Gráficos & Indicadores
 */

class ChartRenderer {
  constructor(container) {
    this.container = typeof container === 'string'
      ? document.getElementById(container)
      : container;

    this.chart = null;
    this.candlestickSeries = null;
    this.indicatorSeries = [];
    this.priceData = [];
    this.timeRange = 100; // Default: last 100 candles

    this.init();
  }

  init() {
    // Create chart instance
    const chartOptions = {
      layout: {
        background: { color: '#0a0e27' },
        textColor: '#e0e0e0',
        fontFamily: "'Monaco', 'Courier New', monospace",
      },
      width: this.container.clientWidth,
      height: 500,
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
        barSpacing: 8,
      },
      rightPriceScale: {
        autoScale: true,
        borderColor: '#1aff1a',
      },
      grid: {
        hStyle: 1,
        vLines: {
          color: 'rgba(26, 255, 26, 0.1)',
        },
        hLines: {
          color: 'rgba(26, 255, 26, 0.1)',
        },
      },
    };

    this.chart = LightweightCharts.createChart(this.container, chartOptions);

    // Create candlestick series
    this.candlestickSeries = this.chart.addCandlestickSeries({
      upColor: '#1aff1a',
      downColor: '#ff4444',
      borderUpColor: '#1aff1a',
      borderDownColor: '#ff4444',
      wickUpColor: '#1aff1a',
      wickDownColor: '#ff4444',
      title: 'BTC/USD',
    });

    // Auto-resize on window resize
    window.addEventListener('resize', () => this.handleResize());
  }

  /**
   * Load OHLC price data
   * Expected format: [{ time, open, high, low, close, volume }, ...]
   */
  loadPriceData(ohlcData) {
    if (!Array.isArray(ohlcData) || ohlcData.length === 0) {
      console.error('Invalid OHLC data format');
      return false;
    }

    // Validate and sanitize data
    const validData = ohlcData
      .filter(candle => {
        const o = parseFloat(candle.open);
        const h = parseFloat(candle.high);
        const l = parseFloat(candle.low);
        const c = parseFloat(candle.close);
        return !isNaN(o) && !isNaN(h) && !isNaN(l) && !isNaN(c) && h >= l;
      })
      .map(candle => ({
        time: typeof candle.time === 'number' ? candle.time : Math.floor(new Date(candle.time).getTime() / 1000),
        open: parseFloat(candle.open),
        high: parseFloat(candle.high),
        low: parseFloat(candle.low),
        close: parseFloat(candle.close),
        volume: candle.volume ? parseFloat(candle.volume) : 0,
      }))
      .sort((a, b) => a.time - b.time);

    if (validData.length === 0) {
      console.error('No valid OHLC data after filtering');
      return false;
    }

    this.priceData = validData;
    this.candlestickSeries.setData(validData);
    this.chart.timeScale().fitContent();

    return true;
  }

  /**
   * Add RSI indicator
   * @param {Array} rsiValues - Array of RSI values [{ time, value }, ...]
   * @param {string} color - Line color (default: orange)
   */
  addRSI(rsiValues, color = '#ff9900') {
    return this.addIndicator(rsiValues, 'RSI(14)', color, {
      min: 0,
      max: 100,
      levelLines: [
        { value: 30, color: '#ff6666', width: 1, style: 2 },
        { value: 70, color: '#1aff1a', width: 1, style: 2 },
      ],
    });
  }

  /**
   * Add MACD indicator
   * Renders MACD line, Signal line, and Histogram
   */
  addMACD(macdData) {
    const macdLine = this.addIndicator(
      macdData.map(d => ({ time: d.time, value: d.macd })),
      'MACD',
      '#00ccff',
      {}
    );

    const signalLine = this.addIndicator(
      macdData.map(d => ({ time: d.time, value: d.signal })),
      'Signal',
      '#ff00ff',
      {}
    );

    // For histogram, we'll use a separate area series
    const histogramSeries = this.chart.addHistogramSeries({
      color: '#1aff1a',
      title: 'MACD Histogram',
    });

    const histogramData = macdData
      .filter(d => !isNaN(d.histogram))
      .map(d => ({
        time: d.time,
        value: d.histogram,
        color: d.histogram > 0 ? '#1aff1a' : '#ff4444',
      }));

    histogramSeries.setData(histogramData);
    this.indicatorSeries.push(histogramSeries);

    return { macdLine, signalLine, histogram: histogramSeries };
  }

  /**
   * Add Bollinger Bands indicator
   * @param {Array} bbData - Array of BB values [{ time, upper, middle, lower }, ...]
   */
  addBollingerBands(bbData) {
    // Upper band
    const upperBand = this.addIndicator(
      bbData.map(d => ({ time: d.time, value: d.upper })),
      'BB Upper',
      'rgba(26, 255, 26, 0.3)',
      {}
    );

    // Middle band (SMA)
    const middleBand = this.addIndicator(
      bbData.map(d => ({ time: d.time, value: d.middle })),
      'BB Middle',
      '#1aff1a',
      { lineStyle: 2 } // dashed line
    );

    // Lower band
    const lowerBand = this.addIndicator(
      bbData.map(d => ({ time: d.time, value: d.lower })),
      'BB Lower',
      'rgba(26, 255, 26, 0.3)',
      {}
    );

    return { upperBand, middleBand, lowerBand };
  }

  /**
   * Generic indicator add method
   * @param {Array} values - [{ time, value }, ...]
   * @param {string} title - Indicator name
   * @param {string} color - Line color
   * @param {object} options - Additional options
   */
  addIndicator(values, title, color, options = {}) {
    if (!Array.isArray(values) || values.length === 0) {
      console.warn(`No data for indicator: ${title}`);
      return null;
    }

    const lineOptions = {
      color: color,
      lineWidth: 2,
      title: title,
      ...options,
    };

    const series = this.chart.addLineSeries(lineOptions);

    const cleanData = values
      .filter(d => !isNaN(d.value))
      .map(d => ({
        time: typeof d.time === 'number' ? d.time : Math.floor(new Date(d.time).getTime() / 1000),
        value: parseFloat(d.value),
      }))
      .sort((a, b) => a.time - b.time);

    if (cleanData.length > 0) {
      series.setData(cleanData);
      this.indicatorSeries.push(series);
    }

    return series;
  }

  /**
   * Add liquidation heatmap as overlay
   * @param {Array} liquidationData - [{ time, long, short }, ...]
   */
  addLiquidationHeatmap(liquidationData) {
    if (!Array.isArray(liquidationData) || liquidationData.length === 0) {
      console.warn('No liquidation data for heatmap');
      return null;
    }

    // Create histogram series for liquidations
    const histogramSeries = this.chart.addHistogramSeries({
      color: 'rgba(255, 68, 68, 0.4)',
      title: 'Liquidation Volume',
    });

    const heatmapData = liquidationData
      .filter(d => d.long !== undefined && d.short !== undefined)
      .map(d => {
        const time = typeof d.time === 'number'
          ? d.time
          : Math.floor(new Date(d.time).getTime() / 1000);

        const long = parseFloat(d.long) || 0;
        const short = parseFloat(d.short) || 0;
        const total = long + short;

        // Color based on dominance
        const color = long > short
          ? 'rgba(26, 255, 26, 0.4)' // Green for long liquidations
          : 'rgba(255, 68, 68, 0.4)'; // Red for short liquidations

        return {
          time,
          value: total,
          color,
        };
      });

    if (heatmapData.length > 0) {
      histogramSeries.setData(heatmapData);
      this.indicatorSeries.push(histogramSeries);
    }

    return histogramSeries;
  }

  /**
   * Clear all indicators
   */
  clearIndicators() {
    this.indicatorSeries.forEach(series => {
      this.chart.removeSeries(series);
    });
    this.indicatorSeries = [];
  }

  /**
   * Update chart time range
   * @param {number} candleCount - Number of candles to show
   */
  setTimeRange(candleCount) {
    this.timeRange = candleCount;
    if (this.priceData.length > candleCount) {
      const startIndex = this.priceData.length - candleCount;
      const visibleData = this.priceData.slice(startIndex);
      this.candlestickSeries.setData(visibleData);
    }
    this.chart.timeScale().fitContent();
  }

  /**
   * Get latest price
   */
  getLatestPrice() {
    if (this.priceData.length === 0) return null;
    return this.priceData[this.priceData.length - 1].close;
  }

  /**
   * Handle window resize
   */
  handleResize() {
    if (this.chart && this.container) {
      const width = this.container.clientWidth;
      const height = this.container.clientHeight || 500;
      this.chart.applyOptions({ width, height });
    }
  }

  /**
   * Export current chart as image
   */
  exportAsImage() {
    if (!this.chart) return null;
    return this.chart.takeScreenshot();
  }

  /**
   * Destroy chart instance
   */
  destroy() {
    if (this.chart) {
      this.chart.remove();
      this.chart = null;
      this.indicatorSeries = [];
      this.priceData = [];
    }
  }
}

// Export for use in HTML
if (typeof window !== 'undefined') {
  window.ChartRenderer = ChartRenderer;
}
