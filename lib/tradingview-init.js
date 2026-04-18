// TradingView Lightweight Charts Integration
// CDN: https://unpkg.com/lightweight-charts@4.0.0/dist/lightweight-charts.production.js

async function initializeChart(containerId, symbol = 'BTCUSDT') {
  if (typeof LightweightCharts === 'undefined') {
    console.error('❌ TradingView Lightweight Charts library not loaded');
    return null;
  }

  try {
    console.log(`📈 Initializing TradingView chart for ${symbol}...`);

    // Fetch chart data (candles + indicators)
    const response = await fetch(`/api/chart/data?symbol=${symbol}&limit=500`);
    const data = await response.json();

    if (!data.success) {
      console.error('❌ Failed to fetch chart data:', data.error);
      return null;
    }

    const container = document.getElementById(containerId);
    if (!container) {
      console.error(`❌ Container ${containerId} not found`);
      return null;
    }

    // Create chart
    const chart = LightweightCharts.createChart(container, {
      layout: {
        textColor: '#d1d5db',
        background: { type: 'solid', color: '#1f2937' }
      },
      timeScale: {
        timeVisible: true,
        secondsVisible: false
      },
      grid: {
        vertLines: { color: '#374151' },
        horzLines: { color: '#374151' }
      },
      width: container.offsetWidth,
      height: 500
    });

    // Add candlestick series
    const candleSeries = chart.addCandlestickSeries({
      upColor: '#22c55e',
      downColor: '#ef4444',
      borderVisible: false,
      wickUpColor: '#22c55e',
      wickDownColor: '#ef4444'
    });

    candleSeries.setData(data.candles);

    // Add RSI indicator (separate pane)
    const rsiSeries = chart.addLineSeries({
      color: '#3b82f6',
      lineWidth: 2,
      title: 'RSI (14)'
    });
    rsiSeries.setData(data.indicators.rsi.values);

    // Add overbought/oversold lines for RSI
    const rsiPane = chart.addLineSeries({
      color: '#6b7280',
      lineWidth: 1,
      lineStyle: 2
    });
    const rsiOverbought = data.candles.map(c => ({
      time: c.time,
      value: 70
    }));
    const rsiOversold = data.candles.map(c => ({
      time: c.time,
      value: 30
    }));
    rsiPane.setData(rsiOverbought);

    // Add MACD indicator
    const macdSeries = chart.addLineSeries({
      color: '#f59e0b',
      lineWidth: 2,
      title: 'MACD'
    });
    const signalSeries = chart.addLineSeries({
      color: '#8b5cf6',
      lineWidth: 2,
      title: 'Signal'
    });
    const macdHistogram = chart.addHistogramSeries({
      color: '#06b6d4',
      title: 'Histogram'
    });

    // Extract MACD data
    const macdOnly = data.indicators.macd.values.map(v => ({
      time: v.time,
      value: v.macd
    }));
    const signalOnly = data.indicators.macd.values.map(v => ({
      time: v.time,
      value: v.signal
    }));
    const histogramOnly = data.indicators.macd.values.map(v => ({
      time: v.time,
      value: v.histogram,
      color: v.histogram > 0 ? '#22c55e' : '#ef4444'
    }));

    macdSeries.setData(macdOnly);
    signalSeries.setData(signalOnly);
    macdHistogram.setData(histogramOnly);

    // Add Bollinger Bands
    const bbUpper = chart.addLineSeries({
      color: '#a78bfa',
      lineWidth: 1,
      lineStyle: 2
    });
    const bbMiddle = chart.addLineSeries({
      color: '#60a5fa',
      lineWidth: 2
    });
    const bbLower = chart.addLineSeries({
      color: '#a78bfa',
      lineWidth: 1,
      lineStyle: 2
    });

    const bbData = data.indicators.bollingerBands.values;
    bbUpper.setData(bbData.map(v => ({ time: v.time, value: v.upper })));
    bbMiddle.setData(bbData.map(v => ({ time: v.time, value: v.middle })));
    bbLower.setData(bbData.map(v => ({ time: v.time, value: v.lower })));

    // Fit content to chart
    chart.timeScale().fitContent();

    // Handle window resize
    function handleResize() {
      const newWidth = container.offsetWidth;
      if (newWidth > 0) {
        chart.applyOptions({ width: newWidth });
      }
    }
    window.addEventListener('resize', handleResize);

    console.log(`✅ Chart initialized with ${data.candles.length} candles`);
    console.log(`📊 Indicators loaded: RSI, MACD, Bollinger Bands`);

    return {
      chart,
      candleSeries,
      rsiSeries,
      macdSeries,
      signalSeries,
      data,
      destroy: () => {
        window.removeEventListener('resize', handleResize);
        chart.remove();
      }
    };
  } catch (error) {
    console.error('❌ Chart initialization error:', error.message);
    return null;
  }
}

async function updateChart(chartState, symbol) {
  if (!chartState) {
    console.error('❌ Invalid chart state');
    return false;
  }

  try {
    console.log(`🔄 Updating chart for ${symbol}...`);

    const response = await fetch(`/api/chart/data?symbol=${symbol}&limit=500`);
    const data = await response.json();

    if (!data.success) {
      console.error('❌ Failed to fetch updated chart data:', data.error);
      return false;
    }

    chartState.candleSeries.setData(data.candles);
    chartState.rsiSeries.setData(data.indicators.rsi.values);

    // Update MACD data
    const macdOnly = data.indicators.macd.values.map(v => ({
      time: v.time,
      value: v.macd
    }));
    const signalOnly = data.indicators.macd.values.map(v => ({
      time: v.time,
      value: v.signal
    }));

    chartState.macdSeries.setData(macdOnly);
    chartState.signalSeries.setData(signalOnly);

    chartState.chart.timeScale().fitContent();

    console.log(`✅ Chart updated with latest data`);
    return true;
  } catch (error) {
    console.error('❌ Chart update error:', error.message);
    return false;
  }
}

// Export for use in HTML
window.TradingViewInit = {
  initializeChart,
  updateChart
};
