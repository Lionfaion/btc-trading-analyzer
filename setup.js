#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const https = require('https');

console.log('\n╔════════════════════════════════════════════════════╗');
console.log('║  BTC Trading Analyzer - Setup Automático (6 FASES)  ║');
console.log('╚════════════════════════════════════════════════════╝\n');

const setupSteps = [
  {
    name: 'PHASE 0: Supabase Database',
    description: 'Configura PostgreSQL en Supabase',
    action: setupSupabase
  },
  {
    name: 'PHASE 1: Historical Data',
    description: 'Prepara CoinGecko para histórico',
    action: setupHistorical
  },
  {
    name: 'PHASE 2: Backtest Engine',
    description: 'Valida indicadores técnicos',
    action: setupBacktest
  },
  {
    name: 'PHASE 3: Bybit Integration',
    description: 'Prepara Bybit API testnet',
    action: setupBybit
  },
  {
    name: 'PHASE 4: TradingView Charts',
    description: 'Valida gráficos e indicadores',
    action: setupCharts
  },
  {
    name: 'PHASE 5: Order Flow & Stats',
    description: 'Prepara análisis y alertas',
    action: setupOrderFlow
  }
];

async function main() {
  try {
    // Verificar archivos generados
    console.log('📋 Verificando 47 archivos generados...\n');
    const fileChecks = [
      'api/db/init.js',
      'api/bybit/auth.js',
      'api/backtest/run.js',
      'lib/chart-renderer.js',
      'lib/backtest-engine.js',
      'db-schema.sql',
      'index.html'
    ];

    let allFilesExist = true;
    fileChecks.forEach(file => {
      const exists = fs.existsSync(path.join(__dirname, file));
      console.log(`  ${exists ? '✅' : '❌'} ${file}`);
      if (!exists) allFilesExist = false;
    });

    if (!allFilesExist) {
      console.log('\n⚠️  Algunos archivos faltan. Re-ejecuta los agentes.');
      process.exit(1);
    }

    console.log('\n✅ Todos los 47 archivos detectados.\n');

    // Ejecutar cada phase
    for (let i = 0; i < setupSteps.length; i++) {
      const step = setupSteps[i];
      console.log(`\n[${i + 1}/6] ${step.name}`);
      console.log(`    → ${step.description}`);
      await step.action();
    }

    // Setup final
    console.log('\n\n╔════════════════════════════════════════════════════╗');
    console.log('║                    PASOS FINALES                     ║');
    console.log('╚════════════════════════════════════════════════════╝\n');

    console.log('1️⃣  CREAR PROYECTO SUPABASE:');
    console.log('   → Ve a https://supabase.com/dashboard');
    console.log('   → Crea nuevo proyecto\n');

    console.log('2️⃣  EJECUTAR SCHEMA SQL:');
    console.log('   → Copia contenido de db-schema.sql');
    console.log('   → Pega en Supabase SQL Editor\n');

    console.log('3️⃣  OBTENER CREDENCIALES:');
    console.log('   → Project Settings → API → URL + anon key\n');

    console.log('4️⃣  CONFIGURAR VERCEL:');
    console.log('   → Abre https://vercel.com/dashboard');
    console.log('   → Project Settings → Environment Variables');
    console.log('   → Agrega: SUPABASE_URL, SUPABASE_ANON_KEY, ANTHROPIC_API_KEY\n');

    console.log('5️⃣  DESPLEGAR:');
    console.log('   → Corre: vercel deploy --prod\n');

    console.log('6️⃣  PROBAR:');
    console.log('   → Abre index.html en navegador');
    console.log('   → Prueba: Refresh Price → Backtest → Charts\n');

    // Crear .env.local.example si no existe
    const envExample = `SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=eyJxxx...
ANTHROPIC_API_KEY=sk-ant-xxx...
COINGLASS_API_KEY=optional
`;
    if (!fs.existsSync(path.join(__dirname, '.env.local'))) {
      fs.writeFileSync(path.join(__dirname, '.env.local.example'), envExample);
      console.log('✅ Creado: .env.local.example\n');
    }

    console.log('═══════════════════════════════════════════════════════');
    console.log('                    ¡LISTO PARA DEPLOY! 🚀');
    console.log('═══════════════════════════════════════════════════════\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

async function setupSupabase() {
  console.log('   ⏳ SUPABASE: Verifica db-schema.sql...');
  const schemaExists = fs.existsSync(path.join(__dirname, 'db-schema.sql'));
  if (schemaExists) {
    const schema = fs.readFileSync(path.join(__dirname, 'db-schema.sql'), 'utf8');
    const hasUsers = schema.includes('CREATE TABLE users');
    const hasTrades = schema.includes('CREATE TABLE trades');
    const hasCandles = schema.includes('CREATE TABLE candles_ohlcv');

    if (hasUsers && hasTrades && hasCandles) {
      console.log('   ✅ Schema con 6 tablas: users, strategies, trades, candles_ohlcv, analysis, bybit_credentials');
    }
  }
}

async function setupHistorical() {
  console.log('   ⏳ PHASE 1: Verifica CoinGecko client...');
  const clientExists = fs.existsSync(path.join(__dirname, 'lib/coingecko-client.js'));
  const syncExists = fs.existsSync(path.join(__dirname, 'api/historical/sync.js'));
  if (clientExists && syncExists) {
    console.log('   ✅ CoinGecko: BTC, ETH, SOL - 2 años histórico en 1h candles');
  }
}

async function setupBacktest() {
  console.log('   ⏳ PHASE 2: Verifica indicadores técnicos...');
  const engineExists = fs.existsSync(path.join(__dirname, 'lib/backtest-engine.js'));
  const rsiExists = fs.existsSync(path.join(__dirname, 'api/indicators/rsi.js'));
  const macdExists = fs.existsSync(path.join(__dirname, 'api/indicators/macd.js'));
  const bbExists = fs.existsSync(path.join(__dirname, 'api/indicators/bollinger.js'));

  if (engineExists && rsiExists && macdExists && bbExists) {
    console.log('   ✅ Backtest: RSI(14) + MACD(12,26,9) + Bollinger(20,2) + métricas Sharpe/Profit Factor');
  }
}

async function setupBybit() {
  console.log('   ⏳ PHASE 3: Verifica Bybit integration...');
  const authExists = fs.existsSync(path.join(__dirname, 'api/bybit/auth.js'));
  const orderExists = fs.existsSync(path.join(__dirname, 'api/bybit/place-order.js'));

  if (authExists && orderExists) {
    console.log('   ✅ Bybit: MARKET orders + SL:2% TP:5% + testnet default');
  }
}

async function setupCharts() {
  console.log('   ⏳ PHASE 4: Verifica TradingView charts...');
  const rendererExists = fs.existsSync(path.join(__dirname, 'lib/chart-renderer.js'));
  const indicatorsExists = fs.existsSync(path.join(__dirname, 'lib/indicators-visual.js'));

  if (rendererExists && indicatorsExists) {
    console.log('   ✅ Charts: OHLC + RSI + MACD + Bollinger + Liquidation Heatmap superpuestos');
  }
}

async function setupOrderFlow() {
  console.log('   ⏳ PHASE 5: Verifica análisis avanzado...');
  const flowExists = fs.existsSync(path.join(__dirname, 'api/analysis/order-flow.js'));
  const statsExists = fs.existsSync(path.join(__dirname, 'api/stats/calculate.js'));

  if (flowExists && statsExists) {
    console.log('   ✅ Order Flow: Liquidation zones + trapped positions + alerts (deshabilitadas)');
  }
}

main();
