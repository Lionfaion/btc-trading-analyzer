// Bybit Panel Component - API credentials and account management

class BybitPanel {
  constructor() {
    this.credentials = null;
    this.accountInfo = null;
  }

  async init() {
    this.setupEventListeners();
    await this.loadCredentials();
  }

  setupEventListeners() {
    const credForm = document.getElementById('bybitCredsForm');
    if (credForm) {
      credForm.addEventListener('submit', (e) => this.handleCredentialsSave(e));
    }
  }

  async handleCredentialsSave(e) {
    e.preventDefault();

    const inputs = e.target.querySelectorAll('input[type="password"]');
    const isTestnet = e.target.querySelector('input[type="checkbox"]').checked;

    if (inputs[0].value && inputs[1].value) {
      try {
        const token = localStorage.getItem('sb-token');
        if (!token) {
          throw new Error('No estás autenticado');
        }

        // Validate and save credentials
        const baseUrl = 'https://api-jeqjmp909-automates-projects-a5315662.vercel.app';
        const response = await fetch(baseUrl + '/api/bybit/connect', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            apiKey: inputs[0].value,
            apiSecret: inputs[1].value,
            isTestnet: isTestnet
          })
        });

        const data = await response.json();
        if (data.success) {
          if (typeof AnimationEngine !== 'undefined') {
            AnimationEngine.showSuccessToast(`Conectado a Bybit - Balance: $${data.balance.toFixed(2)}`);
          }
          e.target.reset();
          // Refresh header status
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

  async loadCredentials() {
    try {
      // Load credentials from database
      // const response = await fetch('/api/bybit/credentials');
      // const data = await response.json();
      // this.credentials = data.credentials;
    } catch (error) {
      console.error('Error loading credentials:', error);
    }
  }
}

const bybitPanel = new BybitPanel();
bybitPanel.init();
