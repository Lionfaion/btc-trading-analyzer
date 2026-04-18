// api/alerts/send.js - Sistema de alertas por email (placeholder para integración)
// En este caso, sin alertas por defecto (usuario eligió "no")
// Este archivo sirve como estructura para futuras integraciones con SendGrid, Mailgun, etc.

/**
 * Tipos de alertas disponibles:
 * - STRATEGY_SIGNAL: Señal de estrategia (BUY/SELL)
 * - LIQUIDATION_ALERT: Alerta por liquidación agresiva
 * - TRADE_EXECUTED: Trade ejecutado
 * - POSITION_CLOSED: Posición cerrada
 * - DAILY_SUMMARY: Resumen diario
 */

const ALERT_TYPES = {
  STRATEGY_SIGNAL: 'strategy_signal',
  LIQUIDATION_ALERT: 'liquidation_alert',
  TRADE_EXECUTED: 'trade_executed',
  POSITION_CLOSED: 'position_closed',
  DAILY_SUMMARY: 'daily_summary'
};

/**
 * Prepara una alerta para envío
 * En este MVP, solo formatea el mensaje
 * Integración real requeriría SendGrid, Mailgun, etc.
 */
function formatAlert(alertType, data) {
  const templates = {
    [ALERT_TYPES.STRATEGY_SIGNAL]: formatStrategySignal,
    [ALERT_TYPES.LIQUIDATION_ALERT]: formatLiquidationAlert,
    [ALERT_TYPES.TRADE_EXECUTED]: formatTradeExecuted,
    [ALERT_TYPES.POSITION_CLOSED]: formatPositionClosed,
    [ALERT_TYPES.DAILY_SUMMARY]: formatDailySummary
  };

  const formatter = templates[alertType];
  if (!formatter) {
    throw new Error(`Unknown alert type: ${alertType}`);
  }

  return formatter(data);
}

function formatStrategySignal(data) {
  return {
    subject: `📊 Strategy Signal: ${data.signal || 'UNKNOWN'}`,
    body: `
Symbol: ${data.symbol || 'BTC'}
Signal: ${data.signal} (${data.confidence || 'N/A'}% confidence)
Price: $${data.price?.toFixed(2) || 'N/A'}
Time: ${new Date().toISOString()}

Recommendation: ${data.recommendation || 'No recommendation'}
    `.trim()
  };
}

function formatLiquidationAlert(data) {
  return {
    subject: `⚠️ Liquidation Alert: ${data.severity || 'UNKNOWN'}`,
    body: `
Zone: ${data.zone || 'UNKNOWN'}
Volume: $${(data.volume / 1000000).toFixed(2)}M
Liquidation Type: ${data.type || 'UNKNOWN'}
Time: ${new Date().toISOString()}

Interpretation: ${data.interpretation || 'Monitor closely'}
Recommendation: ${data.recommendation || 'Adjust position size'}
    `.trim()
  };
}

function formatTradeExecuted(data) {
  return {
    subject: `✅ Trade Executed: ${data.symbol || 'BTC'}`,
    body: `
Strategy: ${data.strategy || 'MANUAL'}
Symbol: ${data.symbol || 'BTC'}
Side: ${data.side || 'UNKNOWN'}
Entry Price: $${data.entryPrice?.toFixed(2) || 'N/A'}
Quantity: ${data.quantity || 'N/A'}
Time: ${new Date().toISOString()}

Stop Loss: $${data.stopLoss?.toFixed(2) || 'N/A'}
Take Profit: $${data.takeProfit?.toFixed(2) || 'N/A'}
    `.trim()
  };
}

function formatPositionClosed(data) {
  return {
    subject: `🔒 Position Closed: ${data.symbol || 'BTC'} ${data.result || 'N/A'}`,
    body: `
Strategy: ${data.strategy || 'MANUAL'}
Symbol: ${data.symbol || 'BTC'}
Exit Price: $${data.exitPrice?.toFixed(2) || 'N/A'}
P&L: $${data.pnl?.toFixed(2) || 'N/A'} (${data.pnlPercent?.toFixed(2) || 'N/A'}%)
Duration: ${data.duration || 'N/A'}
Result: ${data.result || 'UNKNOWN'}
Time: ${new Date().toISOString()}
    `.trim()
  };
}

function formatDailySummary(data) {
  return {
    subject: '📈 Daily Trading Summary',
    body: `
Date: ${new Date().toLocaleDateString()}

Trades Today: ${data.totalTrades || 0}
Wins: ${data.wins || 0}
Losses: ${data.losses || 0}
Win Rate: ${data.winRate?.toFixed(2) || 'N/A'}%
P&L Today: $${data.pnlToday?.toFixed(2) || 'N/A'}
    `.trim()
  };
}

/**
 * Valida si una alerta debe enviarse
 * En este MVP, siempre retorna false (sin alertas por defecto)
 */
function shouldSendAlert(alertType, userPreferences = {}) {
  // Por defecto, el usuario eligió NO recibir alertas
  // Aquí iría la lógica para respetar preferencias del usuario
  return userPreferences.emailAlerts === true;
}

/**
 * API Handler
 * En un futuro, esto integraría SendGrid, Mailgun, etc.
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { alertType, data, userEmail, preferences = {} } = req.body;

    // Validar campos requeridos
    if (!alertType || !data) {
      return res.status(400).json({
        error: 'Missing required fields: alertType, data'
      });
    }

    // Verificar si el usuario tiene habilitadas las alertas
    if (!shouldSendAlert(alertType, preferences)) {
      return res.status(200).json({
        success: true,
        message: 'Alert disabled for this user',
        sent: false,
        alertType
      });
    }

    // Formatear alerta
    const formattedAlert = formatAlert(alertType, data);

    // En un MVP sin SendGrid, solo loguear y retornar simulación
    console.log(`[Alert] ${alertType}:`, {
      to: userEmail || 'demo@example.com',
      subject: formattedAlert.subject,
      body: formattedAlert.body
    });

    // Aquí iría la integración real con SendGrid:
    // const sgMail = require('@sendgrid/mail');
    // sgMail.setApiKey(process.env.SENDGRID_API_KEY);
    // await sgMail.send({
    //   to: userEmail,
    //   from: process.env.ALERT_EMAIL_FROM || 'alerts@btc-analyzer.com',
    //   subject: formattedAlert.subject,
    //   text: formattedAlert.body,
    //   html: convertToHtml(formattedAlert.body)
    // });

    return res.status(200).json({
      success: true,
      message: 'Alert processed (email integration not configured)',
      sent: false,
      alertType,
      alert: formattedAlert,
      note: 'To enable email alerts, set SENDGRID_API_KEY in environment'
    });

  } catch (error) {
    console.error('[Alert Handler Error]', error);
    return res.status(500).json({
      error: error.message,
      success: false
    });
  }
}

// Exportar tipos y funciones para testing
export { ALERT_TYPES, formatAlert, shouldSendAlert };
