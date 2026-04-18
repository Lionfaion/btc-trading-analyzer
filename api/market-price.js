const ASSETS = {
  BTC: 'bitcoin',
  ETH: 'ethereum',
  SOL: 'solana'
};

export default async function handler(req, res) {
  try {
    const { asset = 'BTC' } = req.query;

    if (!ASSETS[asset]) {
      return res.status(400).json({
        error: `Unsupported asset: ${asset}`,
        supported: Object.keys(ASSETS)
      });
    }

    const assetId = ASSETS[asset];
    const url = `https://api.coingecko.com/api/v3/coins/${assetId}?localization=false&market_data=true`;

    const response = await fetch(url, {
      headers: { 'Accept-Encoding': 'gzip' },
      timeout: 20000
    });

    if (!response.ok) {
      throw new Error(`CoinGecko API error: ${response.status}`);
    }

    const data = await response.json();

    return res.status(200).json({
      asset,
      current_price: data.market_data?.current_price?.usd,
      market_cap: data.market_data?.market_cap?.usd,
      volume_24h: data.market_data?.total_volume?.usd,
      price_change_24h: data.market_data?.price_change_24h,
      price_change_percent_24h: data.market_data?.price_change_percentage_24h,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Market price error:', error);
    return res.status(500).json({
      error: error.message
    });
  }
}
