// Trades Dashboard - Display and manage trade history

class TradesDashboard {
  constructor(containerId = 'trades-container', dbClient) {
    this.containerId = containerId;
    this.dbClient = dbClient;
    this.trades = [];
    this.isLoading = false;
  }

  async render() {
    const container = document.getElementById(this.containerId);

    if (!this.dbClient.authPanel.currentUser) {
      container.innerHTML = '<p class="info">Inicia sesión para ver tu historial de trades</p>';
      return;
    }

    this.isLoading = true;
    container.innerHTML = '<div class="loading">Cargando trades...</div>';

    const result = await this.dbClient.getTrades();

    if (!result.success) {
      container.innerHTML = `<div class="error">${result.error}</div>`;
      this.isLoading = false;
      return;
    }

    this.trades = result.trades || [];
    this.isLoading = false;

    if (this.trades.length === 0) {
      container.innerHTML = '<div class="info">No hay trades registrados aún</div>';
      return;
    }

    this.renderTradesList();
  }

  renderTradesList() {
    const container = document.getElementById(this.containerId);

    const stats = this.calculateStats();

    container.innerHTML = `
      <div class="trades-panel">
        <div class="trades-header">
          <h3>📊 Historial de Trades (${this.trades.length})</h3>
          <div class="trades-stats">
            <div class="stat">
              <span class="label">Ganancia/Pérdida:</span>
              <span class="value ${stats.totalPnL >= 0 ? 'positive' : 'negative'}">
                ${stats.totalPnL >= 0 ? '+' : ''}${stats.totalPnL.toFixed(2)} USDT
              </span>
            </div>
            <div class="stat">
              <span class="label">Win Rate:</span>
              <span class="value">${stats.winRate.toFixed(1)}%</span>
            </div>
            <div class="stat">
              <span class="label">Ganadores/Perdedores:</span>
              <span class="value">${stats.wins}/${stats.losses}</span>
            </div>
          </div>
        </div>

        <div class="trades-table-wrapper">
          <table class="trades-table">
            <thead>
              <tr>
                <th>Símbolo</th>
                <th>Entrada</th>
                <th>Salida</th>
                <th>Cantidad</th>
                <th>P&L</th>
                <th>%</th>
                <th>Estado</th>
                <th>Origen</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              ${this.trades.map((trade, idx) => this.renderTradeRow(trade, idx)).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;

    // Attach event listeners
    this.trades.forEach((trade, idx) => {
      const editBtn = document.getElementById(`edit-trade-${idx}`);
      if (editBtn) {
        editBtn.addEventListener('click', () => this.showEditForm(idx));
      }
    });
  }

  renderTradeRow(trade, idx) {
    const pnl = trade.pnl || 0;
    const pnlPercent = trade.pnl_percent || 0;
    const status = trade.is_win ? '✅ Ganancia' : trade.exit_price ? '❌ Pérdida' : '⏳ Abierto';
    const pnlClass = pnl >= 0 ? 'positive' : 'negative';

    return `
      <tr class="trade-row ${pnlClass}">
        <td class="symbol">${trade.symbol}</td>
        <td class="price">${trade.entry_price.toFixed(2)}</td>
        <td class="price">${trade.exit_price ? trade.exit_price.toFixed(2) : '—'}</td>
        <td class="quantity">${trade.quantity.toFixed(4)}</td>
        <td class="pnl ${pnlClass}">${pnl >= 0 ? '+' : ''}${pnl.toFixed(2)}</td>
        <td class="pnl-percent ${pnlClass}">${pnlPercent >= 0 ? '+' : ''}${pnlPercent.toFixed(2)}%</td>
        <td class="status">${status}</td>
        <td class="source">${this.formatSource(trade.source)}</td>
        <td class="actions">
          <button id="edit-trade-${idx}" class="btn-sm">Editar</button>
        </td>
      </tr>
    `;
  }

  formatSource(source) {
    const sources = {
      manual: '👤 Manual',
      backtest: '📈 Backtest',
      automated: '🤖 Automático'
    };
    return sources[source] || source;
  }

  calculateStats() {
    const stats = {
      totalPnL: 0,
      wins: 0,
      losses: 0,
      winRate: 0
    };

    this.trades.forEach(trade => {
      if (trade.pnl) {
        stats.totalPnL += trade.pnl;
      }
      if (trade.is_win === true) {
        stats.wins++;
      } else if (trade.is_win === false) {
        stats.losses++;
      }
    });

    const totalTrades = stats.wins + stats.losses;
    stats.winRate = totalTrades > 0 ? (stats.wins / totalTrades) * 100 : 0;

    return stats;
  }

  showEditForm(tradeIdx) {
    const trade = this.trades[tradeIdx];
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
      <div class="modal-content">
        <h3>Editar Trade</h3>
        <form id="edit-trade-form">
          <div class="form-group">
            <label>Precio de Salida</label>
            <input type="number" id="exit-price" value="${trade.exit_price || ''}" step="0.01">
          </div>
          <div class="form-group">
            <label>P&L</label>
            <input type="number" id="pnl" value="${trade.pnl || ''}" step="0.01">
          </div>
          <div class="form-group">
            <label>P&L %</label>
            <input type="number" id="pnl-percent" value="${trade.pnl_percent || ''}" step="0.01">
          </div>
          <div class="form-group">
            <label>Resultado</label>
            <select id="is-win">
              <option value="">— Pendiente —</option>
              <option value="true" ${trade.is_win === true ? 'selected' : ''}>✅ Ganancia</option>
              <option value="false" ${trade.is_win === false ? 'selected' : ''}>❌ Pérdida</option>
            </select>
          </div>
          <div class="modal-buttons">
            <button type="submit" class="btn-primary">Guardar</button>
            <button type="button" class="btn-secondary" onclick="this.closest('.modal').remove()">Cancelar</button>
          </div>
        </form>
      </div>
    `;

    document.body.appendChild(modal);

    document.getElementById('edit-trade-form').addEventListener('submit', async (e) => {
      e.preventDefault();

      const updates = {};
      const exitPrice = document.getElementById('exit-price').value;
      const pnl = document.getElementById('pnl').value;
      const pnlPercent = document.getElementById('pnl-percent').value;
      const isWin = document.getElementById('is-win').value;

      if (exitPrice) updates.exit_price = parseFloat(exitPrice);
      if (pnl) updates.pnl = parseFloat(pnl);
      if (pnlPercent) updates.pnl_percent = parseFloat(pnlPercent);
      if (isWin) updates.is_win = isWin === 'true';

      const result = await this.dbClient.updateTrade(trade.id, updates);

      if (result.success) {
        modal.remove();
        this.render();
      } else {
        alert('Error al actualizar trade: ' + result.error);
      }
    });
  }
}
