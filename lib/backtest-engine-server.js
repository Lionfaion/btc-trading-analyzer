// Server-side backtest engine (CommonJS port of public/lib/backtest-engine.js)
// Adds enhanced stats: Profit Factor, Sharpe Ratio, Buy & Hold comparison

class BacktestEngine {
  constructor(options = {}) {
    this.timeframe = options.timeframe || '1d';
    this.initialBalance = options.initialBalance || 10000;
    this.riskPercentage = options.riskPercentage || 2;
    this.indicators = options.indicators || ['RSI', 'MACD', 'BB'];
    this.candles = [];
    this.trades = [];
    this.portfolio = {
      balance: this.initialBalance,
      position: null,
      equity: this.initialBalance,
      maxDrawdown: 0,
      equityCurve: [this.initialBalance]
    };
    this.signals = [];
  }

  loadCandles(candleData) {
    if (!Array.isArray(candleData) || candleData.length === 0) {
      throw new Error('Invalid candle data');
    }
    this.candles = candleData.map(c => ({
      timestamp: c.open_time || c.timestamp || c.time,
      open: parseFloat(c.open),
      high: parseFloat(c.high),
      low: parseFloat(c.low),
      close: parseFloat(c.close),
      volume: parseFloat(c.volume)
    }));
    return this.candles.length;
  }

  async run() {
    if (this.candles.length < 30) {
      throw new Error('Se necesitan al menos 30 velas para backtest');
    }

    for (let i = 0; i < this.candles.length; i++) {
      const signal = {
        index: i,
        timestamp: this.candles[i].timestamp,
        close: this.candles[i].close,
        indicators: {}
      };

      if (this.indicators.includes('RSI')) signal.indicators.rsi = this._rsi(i, 14);
      if (this.indicators.includes('MACD')) signal.indicators.macd = this._macd(i);
      if (this.indicators.includes('BB')) signal.indicators.bb = this._bb(i, 20);
      if (this.indicators.includes('SMA')) signal.indicators.sma = this._sma(i, 20);

      signal.action = this._signal(signal);
      this.signals.push(signal);

      if (signal.action !== 'HOLD' && i > 0) {
        this._execute(signal, i);
      }
    }

    // Close any open position at end
    if (this.portfolio.position) {
      const last = this.candles[this.candles.length - 1];
      const closeSignal = { action: 'SELL', timestamp: last.timestamp, close: last.close };
      this._execute(closeSignal, this.candles.length - 1);
    }

    return this._report();
  }

  _rsi(index, period = 14) {
    if (index < period) return null;
    let gains = 0, losses = 0;
    for (let i = index - period; i < index; i++) {
      const d = this.candles[i + 1].close - this.candles[i].close;
      if (d > 0) gains += d; else losses += Math.abs(d);
    }
    const avgGain = gains / period;
    const avgLoss = losses / period;
    if (avgLoss === 0) return avgGain > 0 ? 100 : 0;
    return 100 - 100 / (1 + avgGain / avgLoss);
  }

  _ema(index, period) {
    if (index < period) return null;
    const mult = 2 / (period + 1);
    let ema = 0;
    for (let i = index - period + 1; i <= index; i++) ema += this.candles[i].close;
    ema /= period;
    for (let i = index - period + 1; i <= index; i++) {
      ema = this.candles[i].close * mult + ema * (1 - mult);
    }
    return ema;
  }

  _sma(index, period = 20) {
    if (index < period) return null;
    let sum = 0;
    for (let i = index - period + 1; i <= index; i++) sum += this.candles[i].close;
    return sum / period;
  }

  _macd(index) {
    if (index < 26) return null;
    const ema12 = this._ema(index, 12);
    const ema26 = this._ema(index, 26);
    if (ema12 === null || ema26 === null) return null;
    const macd = ema12 - ema26;
    const signal = this._ema(index, 9);
    return { macd, signal: signal || 0, histogram: macd - (signal || 0) };
  }

  _bb(index, period = 20) {
    if (index < period) return null;
    const closes = [];
    for (let i = index - period + 1; i <= index; i++) closes.push(this.candles[i].close);
    const sma = closes.reduce((a, b) => a + b, 0) / period;
    const variance = closes.reduce((s, v) => s + Math.pow(v - sma, 2), 0) / period;
    const std = Math.sqrt(variance);
    return { upper: sma + 2 * std, middle: sma, lower: sma - 2 * std };
  }

  _signal(signal) {
    let buy = 0, sell = 0;

    if (signal.indicators.rsi != null) {
      if (signal.indicators.rsi < 30) buy += 2;
      if (signal.indicators.rsi > 70) sell += 2;
    }
    if (signal.indicators.macd != null) {
      if (signal.indicators.macd.histogram > 0) buy += 2;
      if (signal.indicators.macd.histogram < 0) sell += 2;
    }
    if (signal.indicators.bb != null) {
      if (signal.close < signal.indicators.bb.lower) buy += 1;
      if (signal.close > signal.indicators.bb.upper) sell += 1;
    }
    if (signal.indicators.sma != null) {
      if (signal.close > signal.indicators.sma) buy += 1;
      if (signal.close < signal.indicators.sma) sell += 1;
    }

    if (buy > sell && buy >= 2) return 'BUY';
    if (sell > buy && sell >= 2) return 'SELL';
    return 'HOLD';
  }

  _execute(signal, candleIndex) {
    const price = this.candles[Math.min(candleIndex, this.candles.length - 1)].close;

    if (signal.action === 'BUY' && !this.portfolio.position) {
      const qty = (this.portfolio.balance * (this.riskPercentage / 100)) / price;
      this.portfolio.position = {
        entryPrice: price,
        quantity: qty,
        entryTime: signal.timestamp,
        entryIndex: candleIndex
      };
    } else if (signal.action === 'SELL' && this.portfolio.position) {
      const pos = this.portfolio.position;
      const pnl = (price - pos.entryPrice) * pos.quantity;
      const pnlPercent = ((price - pos.entryPrice) / pos.entryPrice) * 100;

      this.portfolio.balance += pnl;
      this.trades.push({
        entryTime: pos.entryTime,
        exitTime: signal.timestamp,
        entryPrice: pos.entryPrice,
        exitPrice: price,
        quantity: pos.quantity,
        pnl,
        pnlPercent,
        isWin: pnl > 0,
        holdingPeriod: candleIndex - pos.entryIndex
      });

      this.portfolio.position = null;
      this.portfolio.equityCurve.push(this.portfolio.balance);

      const drawdown = ((this.initialBalance - this.portfolio.balance) / this.initialBalance) * 100;
      if (drawdown > this.portfolio.maxDrawdown) this.portfolio.maxDrawdown = drawdown;
    }
  }

  _report() {
    const trades = this.trades;
    const wins = trades.filter(t => t.isWin);
    const losses = trades.filter(t => !t.isWin);

    const totalProfit = this.portfolio.balance - this.initialBalance;
    const roi = (totalProfit / this.initialBalance) * 100;
    const winRate = trades.length > 0 ? (wins.length / trades.length) * 100 : 0;
    const avgWin = wins.length > 0 ? wins.reduce((s, t) => s + t.pnlPercent, 0) / wins.length : 0;
    const avgLoss = losses.length > 0 ? losses.reduce((s, t) => s + t.pnlPercent, 0) / losses.length : 0;

    // Profit Factor
    const grossProfit = wins.reduce((s, t) => s + t.pnl, 0);
    const grossLoss = Math.abs(losses.reduce((s, t) => s + t.pnl, 0));
    const profitFactor = grossLoss === 0 ? (grossProfit > 0 ? 99 : 1) : grossProfit / grossLoss;

    // Sharpe Ratio (annualized, simplified)
    const returns = trades.map(t => t.pnlPercent / 100);
    const meanR = returns.length > 0 ? returns.reduce((s, r) => s + r, 0) / returns.length : 0;
    const variance = returns.length > 1 ? returns.reduce((s, r) => s + Math.pow(r - meanR, 2), 0) / returns.length : 0;
    const sharpe = variance === 0 ? 0 : (meanR / Math.sqrt(variance)) * Math.sqrt(252);

    // Buy & Hold comparison
    const firstPrice = this.candles[0].close;
    const lastPrice = this.candles[this.candles.length - 1].close;
    const buyHoldRoi = ((lastPrice - firstPrice) / firstPrice) * 100;
    const buyHoldFinal = this.initialBalance * (1 + buyHoldRoi / 100);

    // Max consecutive wins/losses
    let maxWinStreak = 0, maxLossStreak = 0, curWin = 0, curLoss = 0;
    for (const t of trades) {
      if (t.isWin) { curWin++; curLoss = 0; maxWinStreak = Math.max(maxWinStreak, curWin); }
      else { curLoss++; curWin = 0; maxLossStreak = Math.max(maxLossStreak, curLoss); }
    }

    return {
      summary: {
        initialBalance: this.initialBalance,
        finalBalance: parseFloat(this.portfolio.balance.toFixed(2)),
        totalProfit: parseFloat(totalProfit.toFixed(2)),
        roi: roi.toFixed(2) + '%',
        totalTrades: trades.length,
        winTrades: wins.length,
        loseTrades: losses.length,
        winRate: winRate.toFixed(1) + '%',
        maxDrawdown: this.portfolio.maxDrawdown.toFixed(2) + '%',
        avgWin: avgWin.toFixed(2) + '%',
        avgLoss: avgLoss.toFixed(2) + '%'
      },
      stats: {
        quality: {
          profitFactor: profitFactor.toFixed(2),
          sharpeRatio: sharpe.toFixed(2),
          maxWinStreak,
          maxLossStreak
        },
        buyAndHold: {
          roi: buyHoldRoi.toFixed(2) + '%',
          finalBalance: parseFloat(buyHoldFinal.toFixed(2))
        }
      },
      trades,
      equityCurve: this.portfolio.equityCurve,
      candleCount: this.candles.length
    };
  }
}

  // Detect current market signal from recent candles (no trade execution)
  static detectCurrentSignal(candles, strategyType = 'MULTI_INDICATOR') {
    const indicatorMap = {
      RSI_CROSSOVER: ['RSI'],
      MACD_CROSSOVER: ['MACD'],
      SMA_CROSSOVER: ['SMA'],
      MULTI_INDICATOR: ['RSI', 'MACD', 'BB']
    };
    const indicators = indicatorMap[strategyType] || ['RSI', 'MACD', 'BB'];
    const engine = new BacktestEngine({ indicators });
    engine.loadCandles(candles);
    const i = engine.candles.length - 1;
    const s = {
      index: i,
      timestamp: engine.candles[i].timestamp,
      close: engine.candles[i].close,
      indicators: {}
    };
    if (indicators.includes('RSI')) s.indicators.rsi = engine._rsi(i, 14);
    if (indicators.includes('MACD')) s.indicators.macd = engine._macd(i);
    if (indicators.includes('BB')) s.indicators.bb = engine._bb(i, 20);
    if (indicators.includes('SMA')) s.indicators.sma = engine._sma(i, 20);
    return engine._signal(s);
  }
}

module.exports = BacktestEngine;
