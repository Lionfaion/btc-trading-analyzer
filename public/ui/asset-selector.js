// Asset Selector - Multi-asset support for Phase 1

class AssetSelector {
  constructor(containerId = 'asset-selector') {
    this.containerId = containerId;
    this.assets = [];
    this.currentAsset = 'BTC';
    this.onAssetChange = null;
  }

  async loadAssets() {
    try {
      const response = await fetch('/api/db/assets');
      const data = await response.json();

      if (data.success) {
        this.assets = data.assets;
      }
    } catch (error) {
      console.error('Error loading assets:', error);
      // Fallback to hardcoded assets
      this.assets = [
        { symbol: 'BTC', name: 'Bitcoin', emoji: '₿' },
        { symbol: 'ETH', name: 'Ethereum', emoji: 'Ξ' },
        { symbol: 'SOL', name: 'Solana', emoji: '◎' },
        { symbol: 'XRP', name: 'Ripple', emoji: '✕' },
        { symbol: 'ADA', name: 'Cardano', emoji: '₳' },
        { symbol: 'DOGE', name: 'Dogecoin', emoji: '🐕' },
        { symbol: 'MATIC', name: 'Polygon', emoji: '⬟' },
        { symbol: 'AVAX', name: 'Avalanche', emoji: '▲' }
      ];
    }
  }

  async render() {
    await this.loadAssets();
    const container = document.getElementById(this.containerId);

    if (!container) return;

    container.innerHTML = `
      <div class="asset-selector">
        <label for="asset-dropdown">Activo:</label>
        <select id="asset-dropdown" class="asset-dropdown">
          ${this.assets.map(asset => `
            <option value="${asset.symbol}" ${asset.symbol === this.currentAsset ? 'selected' : ''}>
              ${asset.emoji} ${asset.symbol} - ${asset.name}
            </option>
          `).join('')}
        </select>
        <button id="load-history-btn" class="btn-secondary">Cargar Historia</button>
      </div>
    `;

    // Attach event listeners
    document.getElementById('asset-dropdown').addEventListener('change', (e) => {
      this.currentAsset = e.target.value;
      if (this.onAssetChange) {
        this.onAssetChange(this.currentAsset);
      }
      // Dispatch custom event for other components
      window.dispatchEvent(new CustomEvent('assetChanged', {
        detail: { symbol: this.currentAsset }
      }));
    });

    document.getElementById('load-history-btn').addEventListener('click', () => {
      this.loadHistoricalData();
    });
  }

  async loadHistoricalData() {
    const btn = document.getElementById('load-history-btn');
    btn.disabled = true;
    btn.textContent = 'Cargando...';

    try {
      const response = await fetch('/api/historical/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbol: this.currentAsset, days: 365 })
      });

      const data = await response.json();

      if (data.success) {
        alert(`✅ Cargados ${data.candleCount} candles para ${data.symbol}`);
      } else {
        alert(`❌ Error: ${data.error}`);
      }
    } catch (error) {
      alert(`❌ Error de conexión: ${error.message}`);
    } finally {
      btn.disabled = false;
      btn.textContent = 'Cargar Historia';
    }
  }

  getSelectedAsset() {
    return this.currentAsset;
  }

  setAsset(symbol) {
    this.currentAsset = symbol;
    const dropdown = document.getElementById('asset-dropdown');
    if (dropdown) {
      dropdown.value = symbol;
    }
  }
}
