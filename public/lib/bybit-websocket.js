// Bybit Public WebSocket — real-time kline + ticker (no auth needed)
// Docs: https://bybit-exchange.github.io/docs/v5/websocket/public/kline

const BybitWS = (() => {
  let _ws        = null;
  let _symbol    = 'BTCUSDT';
  let _interval  = '1';
  let _onCandle  = null;
  let _onTicker  = null;
  let _pingTimer = null;
  let _reconnectTimer = null;
  let _active    = false;
  let _statusEl  = null;

  const WS_URL  = 'wss://stream.bybit.com/v5/public/spot';

  function _setStatus(connected) {
    if (!_statusEl) _statusEl = document.getElementById('ws-status');
    if (!_statusEl) return;
    _statusEl.style.background = connected ? '#22c55e' : '#ef4444';
    _statusEl.title = connected ? 'WebSocket conectado' : 'WebSocket desconectado';
  }

  function _subscribe() {
    if (_ws?.readyState !== WebSocket.OPEN) return;
    _ws.send(JSON.stringify({
      op: 'subscribe',
      args: [`kline.${_interval}.${_symbol}`, `tickers.${_symbol}`]
    }));
  }

  function _open() {
    if (!_active) return;
    _ws = new WebSocket(WS_URL);

    _ws.onopen = () => {
      _setStatus(true);
      _subscribe();
      _pingTimer = setInterval(() => {
        if (_ws?.readyState === WebSocket.OPEN) _ws.send(JSON.stringify({ op: 'ping' }));
      }, 20000);
    };

    _ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data);
        if (msg.op === 'pong' || msg.op === 'subscribe') return;

        if (msg.topic?.startsWith('kline.') && _onCandle) {
          const d = msg.data?.[0];
          if (d) _onCandle({
            time:      Math.floor(parseInt(d.start) / 1000),
            open:      parseFloat(d.open),
            high:      parseFloat(d.high),
            low:       parseFloat(d.low),
            close:     parseFloat(d.close),
            volume:    parseFloat(d.volume),
            confirmed: !!d.confirm
          });
        }

        if (msg.topic?.startsWith('tickers.') && _onTicker) {
          const d = msg.data;
          if (d) _onTicker({
            price:     parseFloat(d.lastPrice),
            change24h: parseFloat(d.price24hPcnt) * 100,
            high24h:   parseFloat(d.highPrice24h),
            low24h:    parseFloat(d.lowPrice24h),
            volume24h: parseFloat(d.volume24h)
          });
        }
      } catch (_) {}
    };

    _ws.onerror = () => _ws.close();

    _ws.onclose = () => {
      clearInterval(_pingTimer);
      _setStatus(false);
      if (_active) _reconnectTimer = setTimeout(_open, 5000);
    };
  }

  function connect(symbol, opts = {}) {
    _active   = true;
    _symbol   = symbol.includes('USDT') ? symbol : symbol + 'USDT';
    _interval = opts.interval || '1';
    _onCandle = opts.onCandle || null;
    _onTicker = opts.onTicker || null;
    disconnect();
    _open();
  }

  function disconnect() {
    _active = false;
    clearInterval(_pingTimer);
    clearTimeout(_reconnectTimer);
    if (_ws) { _ws.onclose = null; _ws.close(); _ws = null; }
    _setStatus(false);
  }

  function isConnected() {
    return _ws?.readyState === WebSocket.OPEN;
  }

  return { connect, disconnect, isConnected };
})();

window.BybitWS = BybitWS;
