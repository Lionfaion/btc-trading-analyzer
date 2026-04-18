import { ASSETS, fetchCurrentPrice } from '../../lib/coingecko-client.js';

const DB_FILE = process.env.DB_FILE || './data/ohlc.json';
const fs = require('fs').promises;
const path = require('path');

async function loadDatabase() {
  try {
    const content = await fs.readFile(DB_FILE, 'utf-8');
    return JSON.parse(content);
  } catch {
    return { BTC: [], ETH: [], SOL: [], lastUpdate: null };
  }
}

async function saveDatabase(data) {
  const dir = path.dirname(DB_FILE);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(DB_FILE, JSON.stringify(data, null, 2));
}

function createHourlyCandle(previousCandle, currentPrice, timestamp) {
  const candleTime = new Date(timestamp);
  candleTime.setMinutes(0, 0, 0);

  return {
    timestamp: candleTime.getTime(),
    open: previousCandle?.close || currentPrice,
    high: Math.max(previousCandle?.high || currentPrice, currentPrice),
    low: Math.min(previousCandle?.low || currentPrice, currentPrice),
    close: currentPrice
  };
}

async function updateAssetCandle(assetSymbol) {
  try {
    const asset = ASSETS[assetSymbol];
    if (!asset) {
      throw new Error(`Asset ${assetSymbol} not supported`);
    }

    const currentPrice = await fetchCurrentPrice(asset.id);
    const db = await loadDatabase();
    const candles = db[assetSymbol] || [];

    const now = Date.now();
    const lastCandle = candles[candles.length - 1];

    const newCandle = createHourlyCandle(lastCandle, currentPrice, now);
    const lastCandleTime = lastCandle?.timestamp || 0;

    if (newCandle.timestamp !== lastCandleTime) {
      candles.push(newCandle);
      if (candles.length > 17520) {
        candles.shift();
      }
    } else if (lastCandle) {
      lastCandle.high = Math.max(lastCandle.high, currentPrice);
      lastCandle.low = Math.min(lastCandle.low, currentPrice);
      lastCandle.close = currentPrice;
    }

    db[assetSymbol] = candles;
    db.lastUpdate = new Date().toISOString();

    await saveDatabase(db);

    return {
      success: true,
      asset: assetSymbol,
      currentPrice,
      candleTime: new Date(newCandle.timestamp).toISOString(),
      totalCandles: candles.length
    };
  } catch (error) {
    console.error(`Update error for ${assetSymbol}:`, error.message);
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
    const { asset } = req.body;

    if (asset) {
      const result = await updateAssetCandle(asset);
      return res.status(result.success ? 200 : 500).json(result);
    }

    const results = {};
    for (const assetSymbol of Object.keys(ASSETS)) {
      results[assetSymbol] = await updateAssetCandle(assetSymbol);
    }

    return res.status(200).json({
      success: true,
      results,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return res.status(500).json({
      error: error.message,
      success: false
    });
  }
}
