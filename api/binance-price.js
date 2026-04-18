// Simple in-memory cache
let cachedPrice = null;
let cacheTime = 0;
const CACHE_DURATION = 30000; // 30 seconds

export default async function handler(req, res) {
  try {
    const now = Date.now();

    // Return cached price if still valid
    if (cachedPrice && (now - cacheTime) < CACHE_DURATION) {
      return res.status(200).json(cachedPrice);
    }

    // Use CoinGecko API instead (more accessible globally)
    const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd&include_24hr_change=true', {
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });

    if (!response.ok) {
      throw new Error(`CoinGecko error: ${response.status}`);
    }

    const data = await response.json();
    const btcData = data.bitcoin;

    const result = {
      price: btcData.usd.toString(),
      priceChangePercent: btcData.usd_24h_change.toFixed(2),
      priceChange: (btcData.usd * (btcData.usd_24h_change / 100)).toFixed(2)
    };

    // Cache the result
    cachedPrice = result;
    cacheTime = now;

    return res.status(200).json(result);
  } catch (error) {
    console.error('Price API error:', error);
    // Return cached price even if expired, rather than error
    if (cachedPrice) {
      return res.status(200).json(cachedPrice);
    }
    return res.status(500).json({ error: error.message });
  }
}
