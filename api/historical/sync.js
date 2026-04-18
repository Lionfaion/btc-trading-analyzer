import { ASSETS, fetchOHLCHistory } from '../../lib/coingecko-client.js';

const DB_FILE = process.env.DB_FILE || './data/ohlc.json';
const fs = require('fs').promises;
const path = require('path');

async function loadDatabase() {
  try {
    const content = await fs.readFile(DB_FILE, 'utf-8');
    return JSON.parse(content);
  } catch {
    return { BTC: [], ETH: [], SOL: [], lastSync: null };
  }
}

async function saveDatabase(data) {
  const dir = path.dirname(DB_FILE);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(DB_FILE, JSON.stringify(data, null, 2));
}

async function syncHistoricalData(assetSymbol = 'BTC', days = 730) {
  try {
    const asset = ASSETS[assetSymbol];
    if (!asset) {
      throw new Error(`Asset ${assetSymbol} not supported`);
    }

    console.log(`Syncing ${assetSymbol} historical data (${days} days)...`);

    const ohlcData = await fetchOHLCHistory(asset.id, days);

    const db = await loadDatabase();
    db[assetSymbol] = ohlcData;
    db.lastSync = new Date().toISOString();

    await saveDatabase(db);

    console.log(`Synced ${ohlcData.length} candles for ${assetSymbol}`);
    return {
      success: true,
      asset: assetSymbol,
      candles: ohlcData.length,
      lastSync: db.lastSync
    };
  } catch (error) {
    console.error(`Sync error for ${assetSymbol}:`, error.message);
    return {
      success: false,
      asset: assetSymbol,
      error: error.message
    };
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { asset = 'BTC', days = 730 } = req.body;

    const result = await syncHistoricalData(asset, days);

    if (!result.success) {
      return res.status(500).json(result);
    }

    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({
      error: error.message,
      success: false
    });
  }
}
