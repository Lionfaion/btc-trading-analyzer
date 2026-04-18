# Configuración de Supabase para BTC Trading Analyzer

## Paso 1: Crear Proyecto en Supabase

1. Ir a https://supabase.com/dashboard
2. Click en "New Project"
3. Llenar formulario:
   - **Organization:** (crear nueva o seleccionar)
   - **Project name:** `btc-trading-analyzer`
   - **Database password:** guardar en lugar seguro
   - **Region:** seleccionar cercano a tu ubicación
   - **Pricing plan:** Free (suficiente para MVP)
4. Click "Create new project"
5. Esperar 2-3 minutos a que se cree

## Paso 2: Obtener Credenciales

1. Una vez creado el proyecto, ir a **Settings → API**
2. Copiar y guardar en lugar seguro:
   - **Project URL** → esto es tu `SUPABASE_URL`
   - **anon public** key → esto es tu `SUPABASE_ANON_KEY`

Ejemplo:
```
SUPABASE_URL=https://fjusqtpwssycokwobtzj.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## Paso 3: Crear Tablas en Supabase

1. En Supabase Dashboard, ir a **SQL Editor**
2. Click en **New Query**
3. Copiar TODO el contenido de `db-schema.sql` del proyecto
4. Pegar en el editor SQL
5. Click en **Run** (Ctrl+Enter)
6. Ver confirmación: ✅ Success

*Alternativa:* Ejecutar comando desde CLI:
```bash
psql "postgresql://postgres:PASSWORD@localhost:5432/postgres" < db-schema.sql
```

## Paso 4: Verificar Tablas Creadas

En Supabase Dashboard → **Table Editor**, deberías ver:
- ✅ candles_ohlcv
- ✅ trades
- ✅ analysis_history
- ✅ strategies
- ✅ bybit_credentials
- ✅ backtest_results
- ✅ users

## Paso 5: Configurar en Railway

1. En Railway Dashboard del proyecto btc-trading-analyzer
2. Ir a **Variables**
3. Agregar:
   ```
   SUPABASE_URL=https://xxxx.supabase.co
   SUPABASE_ANON_KEY=eyJxxx...
   ```
4. Click en **Save**
5. Railway redeploya automáticamente

## Paso 6: Verificar Conexión

### Local (desarrollo):
```bash
cd btc-trading-analyzer
echo "SUPABASE_URL=https://xxxx.supabase.co" > .env
echo "SUPABASE_ANON_KEY=eyJxxx..." >> .env
npm install
npm start
# Abrir http://localhost:3000
```

### Railway (producción):
1. Una vez variables agregadas, esperar redeploy (30-60s)
2. Abrir URL de Railway en navegador
3. Click "Sincronizar Histórico" → si no hay error, conexión OK

## Troubleshooting

### Error: "Missing SUPABASE_URL or SUPABASE_ANON_KEY"
- [ ] Verificar que variables están en Railway Dashboard
- [ ] Verificar que no hay espacios en blanco
- [ ] Redeploy fuerza reinicio: push a GitHub

### Error: "Failed to connect to Supabase"
- [ ] Verificar URL está correcta (sin / al final)
- [ ] Verificar anon key está completa (sin truncar)
- [ ] Verificar proyecto en Supabase está activo (no borrado)

### Error: "Table does not exist"
- [ ] Ejecutar db-schema.sql nuevamente
- [ ] Verificar en Table Editor que tablas aparecen
- [ ] Revisar SQL query por errores

### Error: "Permission denied"
- [ ] Tablas creadas con role incorrecto
- [ ] Ejecutar db-schema.sql como admin user
- [ ] En Supabase, verificar RLS policies (debería estar disabled para MVP)

## Security Notes (IMPORTANTE)

⚠️ **Para MVP solo:**
- Anon key está publicada en cliente → OK para desarrollo
- RLS (Row Level Security) está deshabilitado → OK para MVP
- **Antes de producción:** Habilitar RLS y usar service role key en servidor

## Próximas Fases

- **Fase 3:** Encriptar credenciales de Bybit antes de guardar en DB
- **Fase 5:** Habilitar RLS para user isolation
- **Fase 6:** Backup automático diario a AWS S3

¡Listo! Supabase configurado y connected.
