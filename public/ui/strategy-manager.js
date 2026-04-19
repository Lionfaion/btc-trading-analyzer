// Strategy Manager Component - Create and edit strategies

class StrategyManager {
  constructor() {
    this.strategies = [];
  }

  async init() {
    this.setupEventListeners();
    await this.loadStrategies();
  }

  setupEventListeners() {
    const strategyForm = document.getElementById('strategyForm');
    if (strategyForm) {
      strategyForm.addEventListener('submit', (e) => this.handleStrategySave(e));
    }
  }

  async handleStrategySave(e) {
    e.preventDefault();

    const formData = new FormData(e.target);
    const strategy = {
      name: formData.get('name') || e.target.querySelector('input[placeholder="Mi Estrategia"]').value,
      description: formData.get('description') || e.target.querySelector('textarea:first-of-type').value,
      parameters: JSON.parse(e.target.querySelector('textarea:last-of-type').value || '{}')
    };

    try {
      const response = await fetch('/api/db/strategies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(strategy)
      });

      const data = await response.json();
      if (data.success) {
        if (typeof AnimationEngine !== 'undefined') {
          AnimationEngine.showSuccessToast('Estrategia guardada');
        }
        e.target.reset();
        await this.loadStrategies();
      } else {
        throw new Error(data.error || 'Error al guardar estrategia');
      }
    } catch (error) {
      if (typeof AnimationEngine !== 'undefined') {
        AnimationEngine.showErrorToast(error.message);
      }
    }
  }

  async loadStrategies() {
    try {
      const response = await fetch('/api/db/strategies');
      const data = await response.json();

      if (data.success) {
        this.strategies = data.strategies || [];
        this.renderStrategies();
      }
    } catch (error) {
      console.error('Error loading strategies:', error);
    }
  }

  renderStrategies() {
    const listEl = document.getElementById('strategiesList');
    if (!listEl) return;

    if (this.strategies.length === 0) {
      listEl.innerHTML = '<div class="empty-state"><p>No hay estrategias guardadas</p></div>';
      return;
    }

    listEl.innerHTML = this.strategies.map(strategy => `
      <div class="strategy-card glass-card" style="margin-bottom: 15px;">
        <div class="card-header" style="border: none; padding-bottom: 0;">
          <h4>${strategy.name}</h4>
        </div>
        <p style="color: var(--color-text-secondary); font-size: 12px; margin-bottom: 10px;">
          ${strategy.description || 'Sin descripción'}
        </p>
        <button class="btn-small" onclick="strategyManager.deleteStrategy('${strategy.id}')">
          Eliminar
        </button>
      </div>
    `).join('');
  }

  async deleteStrategy(strategyId) {
    if (!confirm('¿Eliminar esta estrategia?')) return;

    try {
      const response = await fetch(`/api/db/strategies/${strategyId}`, {
        method: 'DELETE'
      });

      const data = await response.json();
      if (data.success) {
        if (typeof AnimationEngine !== 'undefined') {
          AnimationEngine.showSuccessToast('Estrategia eliminada');
        }
        await this.loadStrategies();
      } else {
        throw new Error(data.error || 'Error al eliminar estrategia');
      }
    } catch (error) {
      if (typeof AnimationEngine !== 'undefined') {
        AnimationEngine.showErrorToast(error.message);
      }
    }
  }
}

const strategyManager = new StrategyManager();
strategyManager.init();
