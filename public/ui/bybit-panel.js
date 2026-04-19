// Bybit Panel Component - API credentials and account management

class BybitPanel {
  constructor() {
    this.credentials = null;
    this.accountInfo = null;
  }

  async init() {
    this.setupEventListeners();
    await this.loadCredentials();
    await this.tryAutoConnect();
  }

  setupEventListeners() {
    const credForm = document.getElementById('bybitCredsForm');
    if (credForm) {
      credForm.addEventListener('submit', (e) => this.handleCredentialsSave(e));
    }

    const forgetBtn = document.getElementById('forgetBybitBtn');
    if (forgetBtn) {
      forgetBtn.addEventListener('click', () => this.forgetCredentials());
    }
  }

  async handleCredentialsSave(e) {
    e.preventDefault();

    const inputs = e.target.querySelectorAll('input[type="password"]');
    const isTestnet = e.target.querySelector('input[type="checkbox"]').checked;

    if (inputs[0].value && inputs[1].value) {
      try {
        const baseUrl = window.location.origin;
        const response = await fetch(baseUrl + '/api/bybit/connect', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            apiKey: inputs[0].value,
            apiSecret: inputs[1].value,
            isTestnet: isTestnet
          })
        });

        const data = await response.json();
        if (data.success) {
          this.credentials = {
            apiKey: inputs[0].value,
            apiSecret: inputs[1].value,
            isTestnet: isTestnet,
            connectedAt: new Date().toISOString()
          };
          this.saveCredentials();

          if (typeof AnimationEngine !== 'undefined') {
            AnimationEngine.showSuccessToast(`Conectado a Bybit - Balance: $${data.balance.toFixed(2)}`);
          }
          e.target.reset();
          if (typeof header !== 'undefined') {
            header.checkBybitStatus();
          }
        } else {
          throw new Error(data.error || 'Error al conectar');
        }
      } catch (error) {
        if (typeof AnimationEngine !== 'undefined') {
          AnimationEngine.showErrorToast(error.message);
        }
      }
    } else {
      if (typeof AnimationEngine !== 'undefined') {
        AnimationEngine.showErrorToast('Ingresa API Key y Secret');
      }
    }
  }

  saveCredentials() {
    if (this.credentials) {
      localStorage.setItem('bybit_credentials', JSON.stringify(this.credentials));
    }
  }

  async loadCredentials() {
    try {
      const saved = localStorage.getItem('bybit_credentials');
      if (saved) {
        this.credentials = JSON.parse(saved);
      }
    } catch (error) {
      console.error('Error loading credentials:', error);
    }
  }

  async tryAutoConnect() {
    if (this.credentials && this.credentials.apiKey && this.credentials.apiSecret) {
      try {
        const baseUrl = window.location.origin;
        const response = await fetch(baseUrl + '/api/bybit/connect', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            apiKey: this.credentials.apiKey,
            apiSecret: this.credentials.apiSecret,
            isTestnet: this.credentials.isTestnet
          })
        });

        const data = await response.json();
        if (data.success && typeof header !== 'undefined') {
          header.checkBybitStatus();
        }
      } catch (error) {
        console.error('Auto-connect failed:', error);
      }
    }
  }

  forgetCredentials() {
    this.credentials = null;
    localStorage.removeItem('bybit_credentials');
    if (typeof AnimationEngine !== 'undefined') {
      AnimationEngine.showSuccessToast('Credenciales olvidadas');
    }
    if (typeof header !== 'undefined') {
      header.checkBybitStatus();
    }
  }
}

const bybitPanel = new BybitPanel();
bybitPanel.init();
