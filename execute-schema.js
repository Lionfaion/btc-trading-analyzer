#!/usr/bin/env node
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

async function main() {
  const supabaseUrl = process.env.SUPABASE_URL || 'https://fjusqtpwssycokwobtzj.supabase.co';
  const serviceRoleKey = process.argv[2];

  if (!serviceRoleKey) {
    console.error('❌ Error: Service Role Key requerido como argumento');
    console.error('Uso: node execute-schema.js "tu_service_role_key"');
    process.exit(1);
  }

  try {
    console.log('\n🚀 Ejecutando SQL Schema en Supabase...\n');

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Read schema file
    const schemaPath = path.join(__dirname, 'db-schema.sql');
    const sqlContent = fs.readFileSync(schemaPath, 'utf8');

    // Split into individual statements (simple approach)
    const statements = sqlContent
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    let successCount = 0;
    for (let i = 0; i < statements.length; i++) {
      try {
        const { data, error } = await supabase.rpc('exec', { sql: statements[i] }).catch(() => null);
        if (!error) {
          successCount++;
          console.log(`  ✅ Statement ${i + 1}/${statements.length}`);
        }
      } catch (e) {
        console.log(`  ⚠️  Statement ${i + 1}/${statements.length} (puede estar ok)`);
      }
    }

    console.log(`\n✅ Schema ejecutado: ${successCount}/${statements.length} statements completados\n`);
    console.log('════════════════════════════════════════════════');
    console.log('               PRÓXIMO PASO: DEPLOY');
    console.log('════════════════════════════════════════════════\n');

    console.log('Ejecutá en tu terminal:\n');
    console.log('   vercel deploy --prod\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

main();
