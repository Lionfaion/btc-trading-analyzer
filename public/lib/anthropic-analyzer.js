// Anthropic API Client for Market Analysis

class AnthropicAnalyzer {
  constructor() {
    this.apiKey = null;
    this.baseUrl = 'https://api.anthropic.com/v1';
    this.model = 'claude-3-5-sonnet-20241022';
  }

  setApiKey(key) {
    this.apiKey = key;
    return this.validateApiKey();
  }

  getApiKey() {
    return this.apiKey || localStorage.getItem('anthropic_api_key');
  }

  validateApiKey() {
    const key = this.getApiKey();
    return key && key.startsWith('sk-ant-');
  }

  async analyzePrice(symbol, currentPrice, priceHistory, indicators) {
    if (!this.validateApiKey()) {
      throw new Error('API Key de Anthropic no configurada. Ve a Account y agrega tu API Key.');
    }

    const context = `
Eres un analista técnico de criptomonedas experto. Analiza el siguiente activo:

**Activo:** ${symbol}
**Precio Actual:** $${currentPrice.toFixed(2)}

**Datos Históricos (últimas 24h):**
${this.formatPriceHistory(priceHistory)}

**Indicadores Técnicos:**
${this.formatIndicators(indicators)}

Proporciona:
1. **Tendencia Actual:** Alcista/Bajista/Lateral
2. **Zonas Clave:** Soporte y resistencia principales
3. **Señal de Entrada:** ¿Dónde comprar?
4. **Señal de Salida:** ¿Dónde vender?
5. **Stop Loss Recomendado:** Porcentaje de pérdida máxima
6. **Take Profit Objetivo:** Porcentaje de ganancia esperada
7. **Nivel de Riesgo:** Alto/Medio/Bajo
8. **Confianza en Análisis:** 0-100%

Sé conciso, específico y accionable para un trader.`;

    try {
      const response = await fetch(`${this.baseUrl}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.getApiKey(),
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: this.model,
          max_tokens: 1024,
          messages: [
            {
              role: 'user',
              content: context
            }
          ]
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`Anthropic API error: ${error.error?.message || 'Unknown error'}`);
      }

      const data = await response.json();

      return {
        success: true,
        analysis: data.content[0].text,
        usage: {
          inputTokens: data.usage.input_tokens,
          outputTokens: data.usage.output_tokens
        },
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Analysis error:', error);
      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  async analyzeBacktestResults(strategyName, results) {
    if (!this.validateApiKey()) {
      throw new Error('API Key de Anthropic no configurada.');
    }

    const context = `
Analiza los resultados de este backtest de estrategia de trading:

**Estrategia:** ${strategyName}

**Resultados:**
- Total Trades: ${results.totalTrades}
- Trades Ganadores: ${results.winningTrades} (${(results.winRate * 100).toFixed(1)}%)
- Trades Perdedores: ${results.losingTrades}
- Ganancia Total: $${results.totalPnL.toFixed(2)}
- Ganancia %: ${(results.totalPnLPercent * 100).toFixed(2)}%
- Max Drawdown: ${(results.maxDrawdown * 100).toFixed(2)}%
- Profit Factor: ${results.profitFactor.toFixed(2)}
- Sharpe Ratio: ${results.sharpeRatio.toFixed(2)}

**Análisis Requerido:**
1. ¿Es esta una estrategia viable?
2. ¿Qué puntos fuertes tiene?
3. ¿Qué debilidades identifi cas?
4. Recomendaciones de mejora
5. ¿Vale la pena ejecutarla en live trading?

Sé crítico pero constructivo.`;

    try {
      const response = await fetch(`${this.baseUrl}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.getApiKey(),
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: this.model,
          max_tokens: 1024,
          messages: [
            {
              role: 'user',
              content: context
            }
          ]
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`Anthropic API error: ${error.error?.message || 'Unknown error'}`);
      }

      const data = await response.json();

      return {
        success: true,
        analysis: data.content[0].text,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Backtest analysis error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  formatPriceHistory(priceHistory) {
    if (!priceHistory || priceHistory.length === 0) return 'Sin datos históricos';

    const high = Math.max(...priceHistory);
    const low = Math.min(...priceHistory);
    const avg = (priceHistory.reduce((a, b) => a + b, 0) / priceHistory.length).toFixed(2);

    return `- Máximo: $${high.toFixed(2)}
- Mínimo: $${low.toFixed(2)}
- Promedio: $${avg}
- Volatilidad: ${((high - low) / low * 100).toFixed(2)}%`;
  }

  formatIndicators(indicators) {
    if (!indicators) return 'Sin indicadores';

    let formatted = '';

    if (indicators.rsi !== undefined) {
      const rsiStatus = indicators.rsi > 70 ? 'Sobrecomprado' : indicators.rsi < 30 ? 'Sobrevvendido' : 'Neutral';
      formatted += `- RSI: ${indicators.rsi.toFixed(2)} (${rsiStatus})\n`;
    }

    if (indicators.macd !== undefined) {
      const macdStatus = indicators.macd > 0 ? 'Alcista' : 'Bajista';
      formatted += `- MACD: ${indicators.macd.toFixed(2)} (${macdStatus})\n`;
    }

    if (indicators.bb !== undefined) {
      formatted += `- Bollinger Bands: Upper: ${indicators.bb.upper.toFixed(2)}, Middle: ${indicators.bb.middle.toFixed(2)}, Lower: ${indicators.bb.lower.toFixed(2)}\n`;
    }

    if (indicators.ema !== undefined) {
      formatted += `- EMA (20): ${indicators.ema.toFixed(2)}\n`;
    }

    return formatted || 'Sin indicadores calculados';
  }
}

// Create global instance
const anthropicAnalyzer = new AnthropicAnalyzer();

// Auto-load API key from localStorage
document.addEventListener('DOMContentLoaded', () => {
  const savedKey = localStorage.getItem('anthropic_api_key');
  if (savedKey) {
    anthropicAnalyzer.setApiKey(savedKey);
    console.log('✅ Anthropic API Key cargada desde localStorage');
  }
});

// Make available globally
if (typeof window !== 'undefined') {
  window.AnthropicAnalyzer = AnthropicAnalyzer;
  window.anthropicAnalyzer = anthropicAnalyzer;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = AnthropicAnalyzer;
}
