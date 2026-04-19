// Trading Dashboard Component - Live trading view

class TradingDashboard {
  constructor() {
    this.orders = [];
    this.positions = [];
    this.isConnected = false;
  }

  async init() {
    this.setupEventListeners();
    await this.loadOrders();
  }

  setupEventListeners() {
    const connectBtn = document.getElementById('connectBybitBtn');
    if (connectBtn) {
      connectBtn.addEventListener('click', () => this.connectBybit());
    }

    const orderForm = document.getElementById('orderForm');
    if (orderForm) {
      orderForm.addEventListener('submit', (e) => this.handleOrderSubmit(e));
    }
  }

  async connectBybit() {
    const connectBtn = document.getElementById('connectBybitBtn');
    if (connectBtn) {
      connectBtn.textContent = 'Conectando...';
      connectBtn.disabled = true;
    }

    try {
      const token = localStorage.getItem('sb-token');
      if (!token) {
        throw new Error('No estás autenticado');
      }

      // Check connection status with API
      const baseUrl = 'https://api-jeqjmp909-automates-projects-a5315662.vercel.app';
      const response = await fetch(baseUrl + '/api/bybit/status', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const data = await response.json();

      if (data.connected) {
        this.isConnected = true;
        const statusEl = document.getElementById('bybitConnectionStatus');
        if (statusEl) {
          statusEl.innerHTML = `<p>✅ Conectado a Bybit ${data.testnet ? '(Testnet)' : '(Live)'}</p><p>Balance: $${data.balance.toFixed(2)}</p>`;
          statusEl.classList.remove('disconnected');
          statusEl.classList.add('connected');
        }

        await this.loadPositions();

        if (typeof AnimationEngine !== 'undefined') {
          AnimationEngine.showSuccessToast('Bybit conectado');
        }
      } else {
        throw new Error(data.message || 'No conectado a Bybit');
      }
    } catch (error) {
      if (typeof AnimationEngine !== 'undefined') {
        AnimationEngine.showErrorToast(error.message);
      }
    } finally {
      if (connectBtn) {
        connectBtn.textContent = 'Conectar Bybit';
        connectBtn.disabled = false;
      }
    }
  }

  async handleOrderSubmit(e) {
    e.preventDefault();

    if (!this.isConnected) {
      if (typeof AnimationEngine !== 'undefined') {
        AnimationEngine.showErrorToast('Conecta Bybit primero');
      }
      return;
    }

    if (typeof AnimationEngine !== 'undefined') {
      AnimationEngine.showSuccessToast('Orden colocada en modo Demo');
    }
  }

  async loadPositions() {
    try {
      const token = localStorage.getItem('sb-token');
      if (!token) return;

      const baseUrl = 'https://api-jeqjmp909-automates-projects-a5315662.vercel.app';
      const response = await fetch(baseUrl + '/api/bybit/positions', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const data = await response.json();
      if (data.success) {
        this.positions = data.positions || [];
        this.renderPositions();
      }
    } catch (error) {
      console.error('Error loading positions:', error);
    }
  }

  renderPositions() {
    const positionsContainer = document.getElementById('activePositions');
    if (!positionsContainer) return;

    if (this.positions.length === 0) {
      positionsContainer.innerHTML = '<p>No hay posiciones abiertas</p>';
      return;
    }

    const html = this.positions.map(pos => `
      <div class="position-item glass-card">
        <div class="position-header">
          <h4>${pos.symbol}</h4>
          <span class="side-badge ${pos.side.toLowerCase()}">${pos.side}</span>
        </div>
        <div class="position-details">
          <div class="detail">
            <label>Cantidad:</label>
            <span>${pos.size}</span>
          </div>
          <div class="detail">
            <label>Entrada:</label>
            <span>$${parseFloat(pos.entryPrice).toFixed(2)}</span>
          </div>
          <div class="detail">
            <label>Precio Actual:</label>
            <span>$${parseFloat(pos.currentPrice).toFixed(2)}</span>
          </div>
          <div class="detail">
            <label>P&L:</label>
            <span class="${parseFloat(pos.unrealizedPnL) >= 0 ? 'profit' : 'loss'}">
              $${parseFloat(pos.unrealizedPnL).toFixed(2)} (${pos.unrealizedPnLPercent}%)
            </span>
          </div>
        </div>
      </div>
    `).join('');

    positionsContainer.innerHTML = html;
  }

  async loadOrders() {
    try {
      // Load orders from API - to be implemented
      await this.loadPositions();
    } catch (error) {
      console.error('Error loading orders:', error);
    }
  }
}

const tradingDashboard = new TradingDashboard();
tradingDashboard.init();
