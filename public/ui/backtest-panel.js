// Backtest Panel - Strategy definition and backtest execution

class BacktestPanel {
  constructor() {
    this.strategies = [];
    this.backtests = [];
    this.currentResults = null;
    this._base = (typeof CONFIG !== 'undefined' && CONFIG.API_BASE_URL) ? CONFIG.API_BASE_URL : '';
  }

  _url(path) {
    return this._base + path;
  }

  _authHeaders() {
    const token = localStorage.getItem('authToken') || localStorage.getItem('sb-token') || '';
    return { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) };
  }

  async init() {
    await this.loadStrategies();
    await this.loadBacktests();
  }

  async loadStrategies() {
    try {
      const res = await fetch(this._url('/api/db/strategies'), { headers: this._authHeaders() });
      const data = await res.json();
      if (data.success) this.strategies = data.strategies || [];
    } catch (e) {
      console.error('Error loading strategies:', e);
    }
  }

  async loadBacktests() {
    try {
      const res = await fetch(this._url('/api/db/backtests'), { headers: this._authHeaders() });
      const data = await res.json();
      if (data.success) this.backtests = data.backtests || [];
    } catch (e) {
      console.error('Error loading backtests:', e);
    }
  }

  async saveStrategy(strategyData) {
    const res = await fetch(this._url('/api/db/strategies'), {
      method: 'POST',
      headers: this._authHeaders(),
      body: JSON.stringify(strategyData)
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Error guardando estrategia');
    await this.loadStrategies();
    return data.strategy;
  }

  async saveBacktestResult(backtestData) {
    const res = await fetch(this._url('/api/db/backtests'), {
      method: 'POST',
      headers: this._authHeaders(),
      body: JSON.stringify(backtestData)
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Error guardando backtest');
    await this.loadBacktests();
    return data.backtest;
  }

  async runBacktest(symbol, strategyType, params = {}) {
    const res = await fetch(this._url('/api/backtest/run'), {
      method: 'POST',
      headers: this._authHeaders(),
      body: JSON.stringify({
        symbol,
        strategyType,
        initialBalance: params.initialBalance || 10000,
        riskPercentage: params.riskPercentage || 2,
        days: params.days || 365
      })
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Error en backtest');
    }

    const result = await res.json();
    this.currentResults = result;
    return result;
  }

  getIndicatorsForStrategy(strategyType) {
    const indicatorMap = {
      'RSI_CROSSOVER': ['RSI'],
      'MACD_CROSSOVER': ['MACD'],
      'SMA_CROSSOVER': ['SMA'],
      'MULTI_INDICATOR': ['RSI', 'MACD', 'BB']
    };
    return indicatorMap[strategyType] || ['RSI', 'MACD'];
  }

  formatResults(results) {
    const { summary, stats, trades } = results;

    return {
      tableHTML: this.createResultsTable(summary, stats),
      tradesHTML: this.createTradesTable(trades),
      chartsData: {
        equityCurve: this.extractEquityCurve(trades),
        pnlDistribution: this.calculatePnLDistribution(trades),
        metrics: summary
      }
    };
  }

  createResultsTable(summary, stats) {
    return `
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 20px;">
        <div class="stat-box">
          <div class="stat-label">Capital Inicial</div>
          <div class="stat-value">$${parseFloat(summary.initialBalance).toFixed(2)}</div>
        </div>
        <div class="stat-box">
          <div class="stat-label">Capital Final</div>
          <div class="stat-value">$${parseFloat(summary.finalBalance).toFixed(2)}</div>
        </div>
        <div class="stat-box">
          <div class="stat-label">Ganancia Total</div>
          <div class="stat-value" style="color: ${parseFloat(summary.totalProfit) >= 0 ? '#4caf50' : '#ff6666'};">
            ${parseFloat(summary.totalProfit) >= 0 ? '+' : ''}${parseFloat(summary.totalProfit).toFixed(2)}
          </div>
        </div>
        <div class="stat-box">
          <div class="stat-label">ROI</div>
          <div class="stat-value" style="color: ${parseFloat(summary.roi) >= 0 ? '#4caf50' : '#ff6666'};">
            ${summary.roi}
          </div>
        </div>
        <div class="stat-box">
          <div class="stat-label">Total Trades</div>
          <div class="stat-value">${summary.totalTrades}</div>
        </div>
        <div class="stat-box">
          <div class="stat-label">Win Rate</div>
          <div class="stat-value">${summary.winRate}</div>
        </div>
        <div class="stat-box">
          <div class="stat-label">Promedio Ganancia</div>
          <div class="stat-value" style="color: #4caf50;">${summary.avgWin}%</div>
        </div>
        <div class="stat-box">
          <div class="stat-label">Promedio Pérdida</div>
          <div class="stat-value" style="color: #ff6666;">-${summary.avgLoss}%</div>
        </div>
        <div class="stat-box">
          <div class="stat-label">Max Drawdown</div>
          <div class="stat-value">${summary.maxDrawdown}</div>
        </div>
        <div class="stat-box">
          <div class="stat-label">Profit Factor</div>
          <div class="stat-value">${stats.quality.profitFactor}</div>
        </div>
        <div class="stat-box">
          <div class="stat-label">Sharpe Ratio</div>
          <div class="stat-value">${stats.quality.sharpeRatio}</div>
        </div>
        <div class="stat-box">
          <div class="stat-label">Buy & Hold ROI</div>
          <div class="stat-value">${stats.buyAndHold.roi}</div>
        </div>
      </div>
    `;
  }

  createTradesTable(trades) {
    if (!trades || trades.length === 0) {
      return '<p style="color: #aaa; text-align: center;">Sin trades ejecutados</p>';
    }

    const rows = trades.slice(-10).map(trade => `
      <tr>
        <td>${new Date(trade.entryTime).toLocaleString('es-ES')}</td>
        <td>$${parseFloat(trade.entryPrice).toFixed(2)}</td>
        <td>$${parseFloat(trade.exitPrice).toFixed(2)}</td>
        <td style="color: ${trade.isWin ? '#4caf50' : '#ff6666'};">
          ${trade.isWin ? '✓' : '✗'} ${trade.pnlPercent.toFixed(2)}%
        </td>
        <td>$${parseFloat(trade.pnl).toFixed(2)}</td>
      </tr>
    `).join('');

    return `
      <table style="width: 100%; font-size: 12px;">
        <thead>
          <tr>
            <th>Entrada</th>
            <th>Precio Entrada</th>
            <th>Precio Salida</th>
            <th>Resultado</th>
            <th>P&L</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
      <p style="color: #aaa; font-size: 11px; margin-top: 10px;">
        Últimos 10 trades mostrados
      </p>
    `;
  }

  extractEquityCurve(trades) {
    if (!trades || trades.length === 0) return [];

    const curve = [10000]; // Initial equity
    let runningEquity = 10000;

    trades.forEach(trade => {
      runningEquity += trade.pnl;
      curve.push(runningEquity);
    });

    return curve;
  }

  calculatePnLDistribution(trades) {
    if (!trades || trades.length === 0) return {};

    const ranges = {
      'Large Win (>10%)': 0,
      'Medium Win (5-10%)': 0,
      'Small Win (0-5%)': 0,
      'Small Loss (0-5%)': 0,
      'Medium Loss (5-10%)': 0,
      'Large Loss (<-10%)': 0
    };

    trades.forEach(trade => {
      const pnlPercent = parseFloat(trade.pnlPercent);
      if (pnlPercent > 10) ranges['Large Win (>10%)']++;
      else if (pnlPercent > 5) ranges['Medium Win (5-10%)']++;
      else if (pnlPercent > 0) ranges['Small Win (0-5%)']++;
      else if (pnlPercent > -5) ranges['Small Loss (0-5%)']++;
      else if (pnlPercent > -10) ranges['Medium Loss (5-10%)']++;
      else ranges['Large Loss (<-10%)']++;
    });

    return ranges;
  }

  async deleteBacktest(backtestId) {
    const res = await fetch(this._url(`/api/db/backtests?id=${backtestId}`), {
      method: 'DELETE',
      headers: this._authHeaders()
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Error eliminando backtest');
    await this.loadBacktests();
    return true;
  }

  getBacktestsBySymbol(symbol) {
    return this.backtests.filter(b => b.symbol === symbol.toUpperCase());
  }

  getBestBacktest(symbol) {
    const backtests = this.getBacktestsBySymbol(symbol);
    if (backtests.length === 0) return null;
    return backtests.reduce((best, current) =>
      (parseFloat(current.roi) > parseFloat(best.roi)) ? current : best
    );
  }
}

// Create global instance
const backtestPanel = new BacktestPanel();
