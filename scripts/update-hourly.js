#!/usr/bin/env node

const http = require('http');

const ASSETS = ['BTC', 'ETH', 'SOL'];
const API_URL = process.env.API_URL || 'http://localhost:3000';

async function updateAssets() {
  console.log(`[${new Date().toISOString()}] Starting hourly update...`);

  for (const asset of ASSETS) {
    try {
      const url = `${API_URL}/api/historical/update`;
      const body = JSON.stringify({ asset });

      await new Promise((resolve, reject) => {
        const req = http.request(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(body)
          }
        }, (res) => {
          let data = '';
          res.on('data', chunk => data += chunk);
          res.on('end', () => {
            try {
              const result = JSON.parse(data);
              if (result.success) {
                console.log(`✓ ${asset}: ${result.currentPrice} USD (${result.totalCandles} candles)`);
              } else {
                console.error(`✗ ${asset}: ${result.error}`);
              }
              resolve();
            } catch (e) {
              reject(e);
            }
          });
        });

        req.on('error', reject);
        req.write(body);
        req.end();
      });
    } catch (error) {
      console.error(`Error updating ${asset}:`, error.message);
    }
  }

  console.log(`[${new Date().toISOString()}] Hourly update completed\n`);
}

// Run update every hour
console.log('BTC Trading Analyzer - Hourly Update Service');
console.log('=============================================');
console.log(`API URL: ${API_URL}`);
console.log(`Next update in 1 hour...\n`);

updateAssets();
setInterval(updateAssets, 3600000);
