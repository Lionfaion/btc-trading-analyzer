// Backtest Panel - Strategy definition and backtest execution

class BacktestPanel {
  constructor() {
    this.strategies = [];
    this.backtests = [];
    this.currentResults = null;
  }

  async init() {
    await this.loadStrategies();
    await this.loadBacktests();
  }

  async loadStrategies() {
    try {
      const response = await fetch('/api/db/strategies');
      const data = await response.json();
      if (data.success) {
        this.strategies = data.strategies || [];
      }
    } catch (error) {
      console.error('Error loading strategies:', error);
    }
  }

  async loadBacktests() {
    try {
      const response = await fetch('/api/db/backtests');
      const data = await response.json();
      if (data.success) {
        this.backtests = data.backtests || [];
      }
    } catch (error) {
      console.error('Error loading backtests:', error);
    }
  }

  async saveStrategy(strategyData) {
    try {
      const response = await fetch('/api/db/strategies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(strategyData)
      });

      const data = await response.json();
      if (data.success) {
        await this.loadStrategies();
        return data.strategy;
      } else {
        throw new Error(data.error || 'Error guardando estrategia');
      }
    } catch (error) {
      console.error('Strategy save error:', error);
      throw error;
    }
  }

  async saveBacktestResult(backtestData) {
    try {
      const response = await fetch('/api/db/backtests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(backtestData)
      });

      const data = await response.json();
      if (data.success) {
        await this.loadBacktests();
        return data.backtest;
      } else {
        throw new Error(data.error || 'Error guardando backtest');
      }
    } catch (error) {
      console.error('Backtest save error:', error);
      throw error;
    }
  }

  async runBacktest(strategyType, candleData, params = {}) {
    try {
      const response = await fetch('/api/backtest/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          candleData,
          indicators: this.getIndicatorsForStrategy(strategyType),
          timeframe: params.timeframe || '1h',
          initialBalance: params.initialBalance || 10000,
          riskPercentage: params.riskPercentage || 2,
          strategyType
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Error en backtest');
      }

      const result = await response.json();
      this.currentResults = result;
      return result;
    } catch (error) {
      console.error('Backtest execution error:', error);
      throw error;
    }
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
    try {
      const response = await fetch(`/api/db/backtests/${backtestId}`, {
        method: 'DELETE'
      });

      const data = await response.json();
      if (data.success) {
        await this.loadBacktests();
        return true;
      } else {
        throw new Error(data.error || 'Error eliminando backtest');
      }
    } catch (error) {
      console.error('Backtest delete error:', error);
      throw error;
    }
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
