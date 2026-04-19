// Header Component - Top navigation with balance and status

class Header {
  constructor() {
    this.balance = 10000;
    this.bybitConnected = false;
    this.currentMode = 'demo';
  }

  async init() {
    this.setupEventListeners();
    await this.updateBalance();
    await this.checkBybitStatus();
  }

  setupEventListeners() {
    const modeButtons = document.querySelectorAll('.mode-btn');
    modeButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        this.setMode(e.target.dataset.mode);
      });
    });
  }

  setMode(mode) {
    this.currentMode = mode;
    console.log('Mode changed to:', mode);

    // Visual feedback
    if (typeof AnimationEngine !== 'undefined') {
      AnimationEngine.showSuccessToast(`Modo cambiado a ${mode.toUpperCase()}`);
    }
  }

  async updateBalance() {
    try {
      // In the future, this will fetch from Bybit API
      // For now, use placeholder
      const balanceEl = document.getElementById('headerBalance');
      if (balanceEl) {
        balanceEl.textContent = '$' + this.balance.toFixed(2);
      }
    } catch (error) {
      console.error('Error updating balance:', error);
    }
  }

  async checkBybitStatus() {
    try {
      const token = localStorage.getItem('sb-token');
      if (!token) {
        this.setBybitStatus(false);
        return;
      }

      const baseUrl = 'https://api-jeqjmp909-automates-projects-a5315662.vercel.app';
      const response = await fetch(baseUrl + '/api/bybit/status', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        this.setBybitStatus(data.connected);
        if (data.balance) {
          this.balance = data.balance;
          this.updateBalance();
        }
      } else {
        this.setBybitStatus(false);
      }
    } catch (error) {
      console.error('Error checking Bybit status:', error);
      this.setBybitStatus(false);
    }
  }

  setBybitStatus(connected) {
    this.bybitConnected = connected;
    const badgeEl = document.getElementById('bybitStatus');

    if (badgeEl) {
      if (connected) {
        badgeEl.textContent = 'Conectado';
        badgeEl.classList.remove('disconnected');
        badgeEl.classList.add('connected');

        if (typeof AnimationEngine !== 'undefined') {
          AnimationEngine.pulseBadge(badgeEl);
        }
      } else {
        badgeEl.textContent = 'Desconectado';
        badgeEl.classList.remove('connected');
        badgeEl.classList.add('disconnected');
      }
    }
  }

  updateHeaderValue(selector, value, animate = true) {
    const el = document.querySelector(selector);
    if (!el) return;

    if (animate && typeof AnimationEngine !== 'undefined') {
      AnimationEngine.countTo(el, parseFloat(value), 0.5);
    } else {
      el.textContent = value;
    }
  }
}

const header = new Header();
header.init();
