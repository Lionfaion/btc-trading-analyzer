// tradingview-init.js — Complete chart system with 3 synchronized panes

const ChartSystem = (() => {
  let _main = null, _rsi = null, _macd = null;
  let _candleSeries = null, _bbUpper = null, _bbMid = null, _bbLower = null;
  let _rsiSeries = null, _rsiOB = null, _rsiOS = null;
  let _macdLine = null, _signalLine = null, _macdHist = null;
  let _currentSymbol = 'BTC';

  const CHART_OPTS = {
    layout: { textColor: '#9ca3af', background: { type: 'solid', color: 'transparent' } },
    grid: { vertLines: { color: 'rgba(255,255,255,0.04)' }, horzLines: { color: 'rgba(255,255,255,0.04)' } },
    crosshair: { mode: 1 },
    timeScale: { timeVisible: true, secondsVisible: false, borderColor: 'rgba(255,255,255,0.1)' },
    rightPriceScale: { borderColor: 'rgba(255,255,255,0.1)' },
    handleScroll: true,
    handleScale: true
  };

  function _destroy() {
    if (_main) { _main.remove(); _main = null; }
    if (_rsi)  { _rsi.remove();  _rsi  = null; }
    if (_macd) { _macd.remove(); _macd = null; }
  }

  function _sync(charts) {
    // Sync timeScale across all charts
    charts.forEach((src, i) => {
      src.timeScale().subscribeVisibleLogicalRangeChange(range => {
        if (!range) return;
        charts.forEach((dst, j) => {
          if (i !== j) dst.timeScale().setVisibleLogicalRange(range);
        });
      });
    });
  }

  async function init(symbol = 'BTC') {
    _currentSymbol = symbol;

    const mainEl = document.getElementById('chart-main');
    const rsiEl  = document.getElementById('chart-rsi');
    const macdEl = document.getElementById('chart-macd');
    if (!mainEl || !rsiEl || !macdEl) {
      console.error('Chart containers not found');
      return false;
    }

    // Show loading
    mainEl.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#00d9ff;font-size:14px;">⏳ Cargando datos...</div>';

    try {
      const base = (typeof CONFIG !== 'undefined' && CONFIG.API_BASE_URL) ? CONFIG.API_BASE_URL : '';
      const res = await fetch(`${base}/api/chart/data?symbol=${symbol}&limit=365`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Error en API');

      mainEl.innerHTML = '';
      rsiEl.innerHTML  = '';
      macdEl.innerHTML = '';

      _destroy();

      const LC = window.LightweightCharts;
      if (!LC) throw new Error('LightweightCharts no cargado');

      // ── Main chart ──
      _main = LC.createChart(mainEl, { ...CHART_OPTS, height: mainEl.offsetHeight || 380 });
      _candleSeries = _main.addCandlestickSeries({
        upColor: '#22c55e', downColor: '#ef4444',
        borderUpColor: '#22c55e', borderDownColor: '#ef4444',
        wickUpColor: '#22c55e', wickDownColor: '#ef4444'
      });
      _candleSeries.setData(data.candles);

      // Bollinger Bands (same pane as candles)
      _bbUpper = _main.addLineSeries({ color: 'rgba(139,92,246,0.6)', lineWidth: 1, lineStyle: 2, title: 'BB Upper', priceScaleId: 'right' });
      _bbMid   = _main.addLineSeries({ color: 'rgba(96,165,250,0.5)', lineWidth: 1, title: 'BB Mid', priceScaleId: 'right' });
      _bbLower = _main.addLineSeries({ color: 'rgba(139,92,246,0.6)', lineWidth: 1, lineStyle: 2, title: 'BB Lower', priceScaleId: 'right' });
      const bb = data.indicators.bollingerBands.values;
      _bbUpper.setData(bb.map(v => ({ time: v.time, value: v.upper })));
      _bbMid.setData(bb.map(v => ({ time: v.time, value: v.middle })));
      _bbLower.setData(bb.map(v => ({ time: v.time, value: v.lower })));

      // ── RSI chart ──
      _rsi = LC.createChart(rsiEl, {
        ...CHART_OPTS,
        height: rsiEl.offsetHeight || 110,
        rightPriceScale: { ...CHART_OPTS.rightPriceScale, autoScale: false, minimum: 0, maximum: 100 }
      });
      _rsiSeries = _rsi.addLineSeries({ color: '#3b82f6', lineWidth: 2, title: 'RSI' });
      _rsiSeries.setData(data.indicators.rsi.values);

      // Overbought / oversold reference lines
      const rsiTimes = data.indicators.rsi.values.map(v => v.time);
      _rsiOB = _rsi.addLineSeries({ color: 'rgba(239,68,68,0.4)', lineWidth: 1, lineStyle: 3 });
      _rsiOS = _rsi.addLineSeries({ color: 'rgba(34,197,94,0.4)', lineWidth: 1, lineStyle: 3 });
      _rsiOB.setData(rsiTimes.map(t => ({ time: t, value: 70 })));
      _rsiOS.setData(rsiTimes.map(t => ({ time: t, value: 30 })));
      _rsi.priceScale('right').applyOptions({ autoScale: false, minimum: 0, maximum: 100 });

      // ── MACD chart ──
      _macd = LC.createChart(macdEl, { ...CHART_OPTS, height: macdEl.offsetHeight || 110 });
      _macdLine   = _macd.addLineSeries({ color: '#f59e0b', lineWidth: 2, title: 'MACD' });
      _signalLine = _macd.addLineSeries({ color: '#8b5cf6', lineWidth: 2, title: 'Signal' });
      _macdHist   = _macd.addHistogramSeries({ title: 'Hist' });

      const md = data.indicators.macd.values;
      _macdLine.setData(md.map(v => ({ time: v.time, value: v.macd })));
      _signalLine.setData(md.map(v => ({ time: v.time, value: v.signal })));
      _macdHist.setData(md.map(v => ({ time: v.time, value: v.histogram, color: v.histogram >= 0 ? 'rgba(34,197,94,0.7)' : 'rgba(239,68,68,0.7)' })));

      // ── Sync timescales ──
      _sync([_main, _rsi, _macd]);
      [_main, _rsi, _macd].forEach(c => c.timeScale().fitContent());

      // ── Resize handler ──
      const ro = new ResizeObserver(() => {
        if (_main && mainEl.offsetWidth > 0) _main.applyOptions({ width: mainEl.offsetWidth });
        if (_rsi  && rsiEl.offsetWidth > 0)  _rsi.applyOptions({ width: rsiEl.offsetWidth });
        if (_macd && macdEl.offsetWidth > 0) _macd.applyOptions({ width: macdEl.offsetWidth });
      });
      ro.observe(mainEl);

      document.getElementById('chart-symbol-label').textContent = `${symbol} / USDT`;
      document.getElementById('chart-last-price').textContent = '$' + data.candles[data.candles.length - 1]?.close?.toLocaleString('en-US', { minimumFractionDigits: 2 });
      return true;
    } catch (err) {
      mainEl.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#ef4444;font-size:13px;">❌ ${err.message}</div>`;
      console.error('Chart error:', err);
      return false;
    }
  }

  // Called by BybitWS on every kline message
  function updateCandle(candle) {
    if (!_candleSeries) return;
    _candleSeries.update({
      time:  candle.time,
      open:  candle.open,
      high:  candle.high,
      low:   candle.low,
      close: candle.close
    });
    // Update price display with live close
    const el = document.getElementById('chart-last-price');
    if (el) el.textContent = '$' + candle.close.toLocaleString('en-US', { minimumFractionDigits: 2 });
  }

  // Called by BybitWS on every ticker message
  function updateTicker(ticker) {
    const priceEl  = document.getElementById('chart-last-price');
    const changeEl = document.getElementById('chart-change-24h');
    if (priceEl) priceEl.textContent = '$' + ticker.price.toLocaleString('en-US', { minimumFractionDigits: 2 });
    if (changeEl) {
      const sign = ticker.change24h >= 0 ? '+' : '';
      changeEl.textContent = `${sign}${ticker.change24h.toFixed(2)}%`;
      changeEl.style.color = ticker.change24h >= 0 ? '#22c55e' : '#ef4444';
    }
  }

  return { init, updateCandle, updateTicker, get currentSymbol() { return _currentSymbol; } };
})();

window.ChartSystem = ChartSystem;
