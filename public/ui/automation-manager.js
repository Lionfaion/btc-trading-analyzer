// Automation Manager - Control automated strategy execution

class AutomationManager {
  constructor() {
    this.automations = [];
    this.strategies = [];
    this.symbols = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT'];
  }

  async init() {
    this.setupEventListeners();
    await this.loadAutomations();
    await this.loadStrategies();
  }

  setupEventListeners() {
    const enableBtn = document.getElementById('enableAutomationBtn');
    if (enableBtn) {
      enableBtn.addEventListener('click', () => this.showEnableForm());
    }

    const automationForm = document.getElementById('automationForm');
    if (automationForm) {
      automationForm.addEventListener('submit', (e) => this.handleEnableAutomation(e));
    }
  }

  async loadAutomations() {
    try {
      const result = await ApiClient.getAutomations();
      if (result.success) {
        this.automations = result.data.automations || [];
        this.renderAutomations();
      }
    } catch (error) {
      console.error('Error loading automations:', error);
    }
  }

  async loadStrategies() {
    try {
      const result = await ApiClient.getStrategies();
      if (result.success) {
        this.strategies = result.data.strategies || [];
      }
    } catch (error) {
      console.error('Error loading strategies:', error);
    }
  }

  showEnableForm() {
    const modal = document.getElementById('automationModal');
    if (modal) {
      modal.style.display = 'block';
      this.populateStrategiesDropdown();
    }
  }

  populateStrategiesDropdown() {
    const select = document.getElementById('strategySelect');
    if (!select) return;

    select.innerHTML = '<option value="">Selecciona una estrategia</option>' +
      this.strategies.map(s => `<option value="${s.id}">${s.name}</option>`).join('');
  }

  async handleEnableAutomation(e) {
    e.preventDefault();

    const strategyId = document.getElementById('strategySelect').value;
    const symbol = document.getElementById('symbolSelect').value;

    if (!strategyId || !symbol) {
      if (typeof AnimationEngine !== 'undefined') {
        AnimationEngine.showErrorToast('Selecciona estrategia y símbolo');
      }
      return;
    }

    try {
      const result = await ApiClient.enableAutomation(strategyId, symbol);

      if (result.success) {
        if (typeof AnimationEngine !== 'undefined') {
          AnimationEngine.showSuccessToast(result.data.message);
        }
        document.getElementById('automationModal').style.display = 'none';
        e.target.reset();
        await this.loadAutomations();
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      if (typeof AnimationEngine !== 'undefined') {
        AnimationEngine.showErrorToast(error.message);
      }
    }
  }

  async disableAutomation(strategyId, symbol) {
    if (!confirm('¿Desactivar automatización?')) return;

    try {
      const result = await ApiClient.disableAutomation(strategyId, symbol);

      if (result.success) {
        if (typeof AnimationEngine !== 'undefined') {
          AnimationEngine.showSuccessToast(result.data.message);
        }
        await this.loadAutomations();
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      if (typeof AnimationEngine !== 'undefined') {
        AnimationEngine.showErrorToast(error.message);
      }
    }
  }

  renderAutomations() {
    const container = document.getElementById('activeAutomations');
    if (!container) return;

    if (this.automations.length === 0) {
      container.innerHTML = '<p>No hay automatizaciones activas</p>';
      return;
    }

    container.innerHTML = this.automations.map(auto => {
      const strategy = this.strategies.find(s => s.id === auto.strategy_id);
      const lastRun = auto.last_run ? new Date(auto.last_run).toLocaleString('es-ES') : 'Nunca';

      return `
        <div class="automation-card glass-card" style="margin-bottom: 12px; padding: 15px;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <div>
              <h4 style="margin: 0 0 5px 0;">${strategy?.name || 'Estrategia desconocida'}</h4>
              <p style="margin: 0 0 3px 0; font-size: 12px; color: var(--color-text-secondary);">
                ${auto.symbol}
              </p>
              <p style="margin: 0; font-size: 11px; color: var(--color-text-secondary);">
                Última ejecución: ${lastRun}
              </p>
            </div>
            <button
              class="btn-small"
              style="background: var(--color-danger); padding: 6px 12px; font-size: 12px;"
              onclick="automationManager.disableAutomation('${auto.strategy_id}', '${auto.symbol}')">
              Desactivar
            </button>
          </div>
        </div>
      `;
    }).join('');
  }
}

const automationManager = new AutomationManager();
automationManager.init();
