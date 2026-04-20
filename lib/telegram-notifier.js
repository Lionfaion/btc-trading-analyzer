'use strict';

// Telegram Bot notifications via sendMessage API
// Bot token and chat ID are read from environment variables:
//   TELEGRAM_BOT_TOKEN — from @BotFather
//   TELEGRAM_CHAT_ID   — your personal chat ID (get from @userinfobot)

const TELEGRAM_API = 'https://api.telegram.org';

async function sendMessage(text, opts = {}) {
  const token  = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatId) return { ok: false, error: 'TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID not set' };

  const payload = {
    chat_id:    chatId,
    text,
    parse_mode: opts.parseMode || 'HTML',
    ...( opts.disablePreview ? { disable_web_page_preview: true } : {} )
  };

  try {
    const res = await fetch(`${TELEGRAM_API}/bot${token}/sendMessage`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(payload)
    });
    const json = await res.json();
    return json;
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

// Pre-formatted notification helpers

function notifySignal({ symbol, signal, price, strategyType, demoMode }) {
  const emoji  = signal === 'BUY' ? '🟢' : signal === 'SELL' ? '🔴' : '⚪';
  const mode   = demoMode ? '<i>[DEMO]</i>' : '<b>[LIVE]</b>';
  const text = [
    `${emoji} <b>${signal}</b> — ${symbol}`,
    `💵 Precio: <b>$${Number(price).toLocaleString('en-US', { minimumFractionDigits: 2 })}</b>`,
    `📊 Estrategia: ${strategyType}`,
    `${mode}`,
    `⏰ ${new Date().toUTCString()}`
  ].join('\n');
  return sendMessage(text, { disablePreview: true });
}

function notifyOrderPlaced({ symbol, signal, price, orderId, demoMode }) {
  const emoji = signal === 'BUY' ? '✅' : '⛔';
  const mode  = demoMode ? '[DEMO]' : '[LIVE]';
  const text = [
    `${emoji} <b>Orden ${signal} ejecutada</b> ${mode}`,
    `🪙 ${symbol} @ $${Number(price).toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
    orderId ? `🆔 Order ID: <code>${orderId}</code>` : '',
    `⏰ ${new Date().toUTCString()}`
  ].filter(Boolean).join('\n');
  return sendMessage(text, { disablePreview: true });
}

function notifyError({ context, error }) {
  const text = [
    `⚠️ <b>Error en automatización</b>`,
    `📍 Contexto: ${context}`,
    `❌ ${error}`,
    `⏰ ${new Date().toUTCString()}`
  ].join('\n');
  return sendMessage(text, { disablePreview: true });
}

function notifyCronSummary({ results }) {
  if (!results || results.length === 0) return sendMessage('🤖 Cron ejecutado — sin trabajos activos', { disablePreview: true });

  const lines = results.map(r => {
    const emoji  = r.signal === 'BUY' ? '🟢' : r.signal === 'SELL' ? '🔴' : '⚪';
    const order  = r.orderPlaced ? ' ✅ orden colocada' : '';
    const price  = r.price ? ` $${Number(r.price).toLocaleString('en-US', { minimumFractionDigits: 2 })}` : '';
    return `${emoji} ${r.symbol}: <b>${r.signal}</b>${price}${order}`;
  });

  const text = [
    `🤖 <b>Automatización — ${new Date().toUTCString()}</b>`,
    ...lines
  ].join('\n');
  return sendMessage(text, { disablePreview: true });
}

module.exports = { sendMessage, notifySignal, notifyOrderPlaced, notifyError, notifyCronSummary };
