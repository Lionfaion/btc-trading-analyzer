#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const https = require('https');

async function executeSqlOnSupabase(supabaseUrl, serviceRoleKey, sqlContent) {
  return new Promise((resolve, reject) => {
    const url = new URL(`${supabaseUrl}/rest/v1/`);

    const body = JSON.stringify({
      query: sqlContent
    });

    const options = {
      hostname: url.hostname,
      port: 443,
      path: '/rest/v1/rpc/sql',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': body.length,
        'Authorization': `Bearer ${serviceRoleKey}`,
        'apikey': serviceRoleKey
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve({ success: true, data });
        } else {
          reject(new Error(`Status ${res.statusCode}: ${data}`));
        }
      });
    });

    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

async function main() {
  try {
    console.log('\n🚀 SETUP AUTOMÁTICO - BTC Trading Analyzer\n');

    // Check .env.local exists
    const envPath = path.join(__dirname, '.env.local');
    if (!fs.existsSync(envPath)) {
      console.error('❌ .env.local no encontrado');
      process.exit(1);
    }

    // Read env vars
    const envContent = fs.readFileSync(envPath, 'utf8');
    const supabaseUrl = envContent.match(/SUPABASE_URL=(.+)/)?.[1];

    if (!supabaseUrl) {
      console.error('❌ SUPABASE_URL no encontrada en .env.local');
      process.exit(1);
    }

    console.log('✅ .env.local detectado');
    console.log(`✅ URL Supabase: ${supabaseUrl}\n`);

    // Read SQL schema
    const sqlPath = path.join(__dirname, 'db-schema.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');
    console.log('✅ db-schema.sql cargado\n');

    // Prompt for service role key (stdin)
    console.log('📝 Pegá tu Service Role Key (Secret keys de Supabase Settings > API):\n');
    console.log('   (Nota: esto es sensible, no será guardado)\n');

    const serviceRoleKey = await promptInput('Service Role Key: ');

    if (!serviceRoleKey) {
      console.error('❌ Service Role Key vacía');
      process.exit(1);
    }

    console.log('\n⏳ Ejecutando SQL schema en Supabase...\n');

    // Execute SQL
    const result = await executeSqlOnSupabase(supabaseUrl, serviceRoleKey, sqlContent);

    console.log('✅ Schema SQL ejecutado exitosamente!\n');
    console.log('════════════════════════════════════════════════');
    console.log('               PRÓXIMO PASO: VERCEL DEPLOY');
    console.log('════════════════════════════════════════════════\n');

    console.log('Ejecutá este comando en tu terminal:\n');
    console.log('   vercel deploy --prod\n');

    console.log('Después de desplegar:');
    console.log('1. Abre tu navegador en el link que te da Vercel');
    console.log('2. Prueba: Refresh Price → Backtest → Charts\n');

    console.log('¿Necesitas ANTHROPIC_API_KEY?');
    console.log('   Obtén una en: https://console.anthropic.com/api/keys\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

function promptInput(question) {
  return new Promise(resolve => {
    process.stdout.write(question);
    let input = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (data) => {
      input += data;
      if (input.includes('\n')) {
        process.stdin.pause();
        resolve(input.trim());
      }
    });
  });
}

main();
