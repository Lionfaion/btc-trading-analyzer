# Deployment en Railway.app

## Pasos Rápidos

### 1. **Crear Proyecto en Railway**
   - Abre https://railway.app/dashboard
   - Click en **"Create New Project"**
   - Selecciona **"Deploy from GitHub"** (si tienes repo) o **"Empty Project"**

### 2. **Configurar Variables de Entorno**
   En Railway Dashboard → Settings → Variables:
   ```
   SUPABASE_URL = https://fjusqtpwssycokwobtzj.supabase.co
   SUPABASE_ANON_KEY = sb_publishable_S9p5vRZlZ8sDzsMGuXJ60A_pimQBeyD
   ANTHROPIC_API_KEY = (opcional - agrega después si quieres análisis)
   ```

### 3. **Opción A: Subir Archivo (Más Simple)**
   - En Railway Dashboard → Click el botón **"Deploy"**
   - Selecciona **"Deploy from Repository"** → **"Empty Project"**
   - Click en **"Add Service"** → **"GitHub"** (o conecta tu repo manualmente)
   - Railway automáticamente detectará Node.js y desplegará

### 3. **Opción B: Desde GitHub (Recomendado)**
   - Push tu código a GitHub: 
     ```bash
     git init
     git add .
     git commit -m "BTC Trading Analyzer 6-phase platform"
     git remote add origin https://github.com/tu-usuario/btc-trading-analyzer
     git push -u origin main
     ```
   - En Railway: Connect GitHub repo
   - Railway automáticamente deployará en cada push

### 4. **Esperar Deployment**
   - Railway mostrará logs en vivo
   - Cuando veas **"Build successful"**, el deploy completó
   - Tu URL aparecerá como: `https://btc-trading-analyzer-production.up.railway.app`

### 5. **Verificar Funcionamiento**
   - Abre tu URL
   - Prueba: Dropdown de assets, Backtest, Charts
   - Si ves errores, revisa los logs en Railway Dashboard

---

## Costos
- **Gratis** - Forever (Railway ofrece $5 USD/mes gratis, suficiente para MVP)
- Sin límite de funciones serverless
- PostgreSQL incluido (ya tenemos Supabase, así que no lo necesitamos)

---

## Troubleshooting

| Error | Solución |
|-------|----------|
| `Cannot find module '@supabase/supabase-js'` | Ya instalado en package.json |
| `SUPABASE_URL not found` | Verifica variables de entorno en Railway Settings |
| `Deployment timeout` | Espera 5 min, Railway a veces es lento en deploys iniciales |
| `Port already in use` | Railway asigna puertos automáticamente, ignora este error |

---

## Próximos Pasos (Después de Deployment)

1. **Si falta ANTHROPIC_API_KEY:**
   - Obtén en: https://console.anthropic.com/api/keys
   - Agrega en Railway Settings → Variables

2. **Para actualizaciones:**
   - Git push → Railway redeploya automáticamente
   - O usa Railway CLI: `railway up`

3. **Monitorear en vivo:**
   - Railway Dashboard → Logs (ver requests en tiempo real)
   - Railway Metrics (ver CPU, memoria, etc)

---

**¿Listo? Sigue los pasos de arriba y dime cuando veas "Build successful" en Railway.**
