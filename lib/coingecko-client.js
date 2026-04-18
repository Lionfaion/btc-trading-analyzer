const https = require('https');

class CoinGeckoClient {
  constructor() {
    this.baseUrl = 'https://api.coingecko.com/api/v3';
    this.delay = 1000;
  }

  async sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async request(endpoint) {
    return new Promise((resolve, reject) => {
      https.get(`${this.baseUrl}${endpoint}`, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            reject(e);
          }
        });
      }).on('error', reject);
    });
  }

  async getHistoricalCandles(symbol, days = 365) {
    const coinMap = {
      'BTCUSDT': 'bitcoin',
      'BTC': 'bitcoin',
      'ETHUSDT': 'ethereum',
      'ETH': 'ethereum',
      'SOLUSDT': 'solana',
      'SOL': 'solana'
    };

    const coinId = coinMap[symbol] || symbol.toLowerCase();
    console.log(`📊 Fetching ${days}-day history for ${coinId} from CoinGecko...`);

    try {
      const data = await this.request(
        `/coins/${coinId}/market_chart?vs_currency=usd&days=${days}&interval=daily`
      );

      await this.sleep(this.delay);

      const candles = [];
      const prices = data.prices || [];
      const volumes = data.total_volumes || [];

      for (let i = 0; i < prices.length; i++) {
        if (i + 1 < prices.length) {
          const current = prices[i];
          const next = prices[i + 1];

          candles.push({
            symbol: symbol,
            timeframe: '1d',
            open_time: new Date(current[0]).toISOString(),
            open: current[1],
            high: current[1],
            low: current[1],
            close: next[1],
            volume: volumes[i]?.[1] || 0
          });
        }
      }

      console.log(`✅ Fetched ${candles.length} candles`);
      return candles;
    } catch (e) {
      console.error('❌ CoinGecko error:', e.message);
      throw e;
    }
  }

  async getCurrentPrice(symbol) {
    const coinMap = {
      'BTCUSDT': 'bitcoin',
      'BTC': 'bitcoin',
      'ETHUSDT': 'ethereum',
      'ETH': 'ethereum',
      'SOLUSDT': 'solana',
      'SOL': 'solana'
    };

    const coinId = coinMap[symbol] || symbol.toLowerCase();

    try {
      const data = await this.request(
        `/simple/price?ids=${coinId}&vs_currencies=usd&include_market_cap=true&include_24hr_vol=true`
      );

      const price = data[coinId]?.usd || 0;
      const marketCap = data[coinId]?.usd_market_cap || 0;
      const volume = data[coinId]?.usd_24h_vol || 0;

      return { price, marketCap, volume };
    } catch (e) {
      console.error('❌ CoinGecko price error:', e.message);
      throw e;
    }
  }
}

module.exports = CoinGeckoClient;
