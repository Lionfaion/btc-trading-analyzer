const ASSETS = {
  BTC: { id: 'bitcoin', symbol: 'btc' },
  ETH: { id: 'ethereum', symbol: 'eth' },
  SOL: { id: 'solana', symbol: 'sol' }
};

const COINGECKO_BASE = 'https://api.coingecko.com/api/v3';

async function fetchOHLCHistory(assetId, days = 730, interval = 'daily') {
  try {
    const url = `${COINGECKO_BASE}/coins/${assetId}/ohlc?vs_currency=usd&days=${days}`;

    const response = await fetch(url, {
      headers: { 'Accept-Encoding': 'gzip' },
      timeout: 30000
    });

    if (!response.ok) {
      throw new Error(`CoinGecko API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    if (!Array.isArray(data)) {
      throw new Error('Invalid OHLC data format');
    }

    return data.map(candle => ({
      timestamp: candle[0],
      open: candle[1],
      high: candle[2],
      low: candle[3],
      close: candle[4]
    }));
  } catch (error) {
    console.error(`Error fetching OHLC for ${assetId}:`, error.message);
    throw error;
  }
}

async function fetchCurrentPrice(assetId) {
  try {
    const url = `${COINGECKO_BASE}/simple/price?ids=${assetId}&vs_currencies=usd`;

    const response = await fetch(url, {
      headers: { 'Accept-Encoding': 'gzip' },
      timeout: 15000
    });

    if (!response.ok) {
      throw new Error(`CoinGecko API error: ${response.status}`);
    }

    const data = await response.json();
    return data[assetId]?.usd || null;
  } catch (error) {
    console.error(`Error fetching price for ${assetId}:`, error.message);
    throw error;
  }
}

async function fetchMarketData(assetId) {
  try {
    const url = `${COINGECKO_BASE}/coins/${assetId}?localization=false&market_data=true`;

    const response = await fetch(url, {
      headers: { 'Accept-Encoding': 'gzip' },
      timeout: 20000
    });

    if (!response.ok) {
      throw new Error(`CoinGecko API error: ${response.status}`);
    }

    const data = await response.json();
    return {
      current_price: data.market_data?.current_price?.usd,
      market_cap: data.market_data?.market_cap?.usd,
      volume_24h: data.market_data?.total_volume?.usd,
      price_change_24h: data.market_data?.price_change_24h,
      price_change_percent_24h: data.market_data?.price_change_percentage_24h
    };
  } catch (error) {
    console.error(`Error fetching market data for ${assetId}:`, error.message);
    throw error;
  }
}

module.exports = {
  ASSETS,
  fetchOHLCHistory,
  fetchCurrentPrice,
  fetchMarketData
};
