/**
 * Backtest Engine - Lógica compartida para backtesting
 * PHASE 2: Motor de backtest con indicadores técnicos
 */

class BacktestEngine {
  constructor(options = {}) {
    this.timeframe = options.timeframe || '1h';
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
      currentDrawdown: 0
    };
    this.signals = [];
  }

  /**
   * Carga datos OHLCV (Open, High, Low, Close, Volume)
   */
  loadCandles(candleData) {
    if (!Array.isArray(candleData) || candleData.length === 0) {
      throw new Error('Invalid candle data provided');
    }

    this.candles = candleData.map((candle) => ({
      timestamp: candle.timestamp || candle.time,
      open: parseFloat(candle.open),
      high: parseFloat(candle.high),
      low: parseFloat(candle.low),
      close: parseFloat(candle.close),
      volume: parseFloat(candle.volume)
    }));

    return this.candles.length;
  }

  /**
   * Ejecuta backtest con indicadores especificados
   */
  async run() {
    if (this.candles.length < 100) {
      throw new Error('Necesitas al menos 100 velas para backtest');
    }

    // Calcular indicadores para cada vela
    for (let i = 0; i < this.candles.length; i++) {
      const signal = {
        index: i,
        timestamp: this.candles[i].timestamp,
        close: this.candles[i].close,
        indicators: {}
      };

      // Calcular indicadores si están habilitados
      if (this.indicators.includes('RSI')) {
        signal.indicators.rsi = this.calculateRSI(i, 14);
      }
      if (this.indicators.includes('MACD')) {
        signal.indicators.macd = this.calculateMACD(i);
      }
      if (this.indicators.includes('BB')) {
        signal.indicators.bb = this.calculateBollingerBands(i, 20);
      }

      // Generar señal de trading
      signal.action = this.generateSignal(signal);

      this.signals.push(signal);

      // Ejecutar trade si hay señal
      if (signal.action !== 'HOLD' && i > 0) {
        this.executeTrade(signal, i);
      }
    }

    return this.generateReport();
  }

  /**
   * Calcula RSI (Relative Strength Index)
   * RSI = 100 - (100 / (1 + RS))
   * RS = Promedio de ganancias / Promedio de pérdidas
   */
  calculateRSI(index, period = 14) {
    if (index < period) return null;

    let gains = 0;
    let losses = 0;

    for (let i = index - period; i < index; i++) {
      const change = this.candles[i + 1].close - this.candles[i].close;
      if (change > 0) gains += change;
      else losses += Math.abs(change);
    }

    const avgGain = gains / period;
    const avgLoss = losses / period;

    if (avgLoss === 0) return avgGain > 0 ? 100 : 0;

    const rs = avgGain / avgLoss;
    return 100 - (100 / (1 + rs));
  }

  /**
   * Calcula MACD (Moving Average Convergence Divergence)
   * MACD = EMA12 - EMA26
   */
  calculateMACD(index) {
    if (index < 26) return null;

    const ema12 = this.calculateEMA(index, 12);
    const ema26 = this.calculateEMA(index, 26);
    const macd = ema12 - ema26;
    const signal = this.calculateEMA(index, 9, true); // Signal line es EMA de MACD
    const histogram = macd - signal;

    return {
      macd: macd,
      signal: signal,
      histogram: histogram
    };
  }

  /**
   * Calcula Bandas de Bollinger
   * Banda Superior = SMA + (2 * StdDev)
   * Banda Inferior = SMA - (2 * StdDev)
   */
  calculateBollingerBands(index, period = 20) {
    if (index < period) return null;

    const closes = [];
    for (let i = index - period + 1; i <= index; i++) {
      closes.push(this.candles[i].close);
    }

    const sma = closes.reduce((a, b) => a + b, 0) / period;
    const variance =
      closes.reduce((sum, val) => sum + Math.pow(val - sma, 2), 0) / period;
    const stdDev = Math.sqrt(variance);

    return {
      upper: sma + 2 * stdDev,
      middle: sma,
      lower: sma - 2 * stdDev,
      width: (4 * stdDev) / sma // Bollinger Band Width %
    };
  }

  /**
   * Calcula EMA (Exponential Moving Average)
   */
  calculateEMA(index, period, isMacdSignal = false) {
    if (index < period) return null;

    const multiplier = 2 / (period + 1);
    let ema = 0;

    // Calcular SMA inicial
    for (let i = index - period + 1; i <= index; i++) {
      ema += this.candles[i].close;
    }
    ema = ema / period;

    // Aplicar EMA
    for (let i = index - period + 1; i <= index; i++) {
      const closePrice = isMacdSignal ? this.calculateMACD(i)?.macd : this.candles[i].close;
      if (closePrice !== null && i > index - period) {
        ema = closePrice * multiplier + ema * (1 - multiplier);
      }
    }

    return ema;
  }

  /**
   * Genera señal de trading basada en indicadores
   */
  generateSignal(signal) {
    let buyScore = 0;
    let sellScore = 0;

    // Señales RSI
    if (signal.indicators.rsi !== null) {
      if (signal.indicators.rsi < 30) buyScore += 2;
      if (signal.indicators.rsi > 70) sellScore += 2;
    }

    // Señales MACD
    if (signal.indicators.macd !== null) {
      if (signal.indicators.macd.histogram > 0 && signal.indicators.macd.macd > signal.indicators.macd.signal) {
        buyScore += 2;
      }
      if (signal.indicators.macd.histogram < 0 && signal.indicators.macd.macd < signal.indicators.macd.signal) {
        sellScore += 2;
      }
    }

    // Señales Bollinger Bands
    if (signal.indicators.bb !== null) {
      const bbClose = signal.close;
      if (bbClose < signal.indicators.bb.lower) buyScore += 1;
      if (bbClose > signal.indicators.bb.upper) sellScore += 1;
    }

    // Generar acción
    if (buyScore > sellScore && buyScore >= 2) return 'BUY';
    if (sellScore > buyScore && sellScore >= 2) return 'SELL';
    return 'HOLD';
  }

  /**
   * Ejecuta un trade
   */
  executeTrade(signal, candleIndex) {
    const currentPrice = this.candles[candleIndex].close;

    if (signal.action === 'BUY' && !this.portfolio.position) {
      const qty = (this.portfolio.balance * (this.riskPercentage / 100)) / currentPrice;

      this.portfolio.position = {
        entryPrice: currentPrice,
        quantity: qty,
        entryTime: signal.timestamp,
        entryIndex: candleIndex
      };

      this.trades.push({
        type: 'BUY',
        price: currentPrice,
        quantity: qty,
        timestamp: signal.timestamp,
        candleIndex: candleIndex
      });
    } else if (signal.action === 'SELL' && this.portfolio.position) {
      const profit = (currentPrice - this.portfolio.position.entryPrice) * this.portfolio.position.quantity;
      this.portfolio.balance += profit;

      this.trades.push({
        type: 'SELL',
        price: currentPrice,
        quantity: this.portfolio.position.quantity,
        profit: profit,
        profitPercent: ((profit / (this.portfolio.position.entryPrice * this.portfolio.position.quantity)) * 100).toFixed(2),
        timestamp: signal.timestamp,
        candleIndex: candleIndex,
        holdingPeriod: candleIndex - this.portfolio.position.entryIndex
      });

      this.portfolio.position = null;
    }

    // Actualizar equity
    if (this.portfolio.position) {
      const unrealizedProfit =
        (currentPrice - this.portfolio.position.entryPrice) * this.portfolio.position.quantity;
      this.portfolio.equity = this.portfolio.balance + unrealizedProfit;
    } else {
      this.portfolio.equity = this.portfolio.balance;
    }

    // Actualizar drawdown
    const currentDrawdown = ((this.initialBalance - this.portfolio.equity) / this.initialBalance) * 100;
    if (currentDrawdown > this.portfolio.maxDrawdown) {
      this.portfolio.maxDrawdown = currentDrawdown;
    }
  }

  /**
   * Genera reporte del backtest
   */
  generateReport() {
    const winTrades = this.trades.filter((t) => t.type === 'SELL' && parseFloat(t.profitPercent) > 0);
    const loseTrades = this.trades.filter((t) => t.type === 'SELL' && parseFloat(t.profitPercent) <= 0);

    const totalProfit = this.portfolio.balance - this.initialBalance;
    const roi = ((totalProfit / this.initialBalance) * 100).toFixed(2);
    const winRate = this.trades.filter((t) => t.type === 'SELL').length > 0
      ? ((winTrades.length / this.trades.filter((t) => t.type === 'SELL').length) * 100).toFixed(2)
      : 0;

    const avgWin = winTrades.length > 0
      ? (winTrades.reduce((sum, t) => sum + parseFloat(t.profitPercent), 0) / winTrades.length).toFixed(2)
      : 0;

    const avgLoss = loseTrades.length > 0
      ? (loseTrades.reduce((sum, t) => sum + parseFloat(t.profitPercent), 0) / loseTrades.length).toFixed(2)
      : 0;

    return {
      summary: {
        initialBalance: this.initialBalance,
        finalBalance: this.portfolio.balance.toFixed(2),
        totalProfit: totalProfit.toFixed(2),
        roi: roi + '%',
        totalTrades: this.trades.filter((t) => t.type === 'SELL').length,
        winTrades: winTrades.length,
        loseTrades: loseTrades.length,
        winRate: winRate + '%',
        maxDrawdown: this.portfolio.maxDrawdown.toFixed(2) + '%',
        avgWin: avgWin + '%',
        avgLoss: avgLoss + '%'
      },
      trades: this.trades,
      signals: this.signals,
      portfolio: this.portfolio,
      candleCount: this.candles.length
    };
  }
}

export default BacktestEngine;
