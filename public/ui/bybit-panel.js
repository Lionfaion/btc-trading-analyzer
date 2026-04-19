// Bybit Panel Component - API credentials and account management

class BybitPanel {
  constructor() {
    this.credentials = null;
  }

  async init() {
    await this.loadCredentials();
  }

  async loadCredentials() {
    try {
      const saved = localStorage.getItem('bybit_credentials');
      if (saved) {
        this.credentials = JSON.parse(saved);
        console.log('✅ Credenciales de Bybit cargadas desde localStorage');
      }
    } catch (error) {
      console.error('Error loading Bybit credentials:', error);
    }
  }
}

const bybitPanel = new BybitPanel();
bybitPanel.init();
