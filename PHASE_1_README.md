# PHASE 1: Data Collection Pipeline

## Archivos Creados

### 1. `/lib/coingecko-client.js`
Cliente para CoinGecko API con funciones:
- `fetchOHLCHistory(assetId, days, interval)` - Obtiene candles históricos
- `fetchCurrentPrice(assetId)` - Obtiene precio actual
- `fetchMarketData(assetId)` - Obtiene datos de mercado (market cap, volumen, cambios)

Soporta: BTC, ETH, SOL

### 2. `/api/historical/sync.js`
Endpoint POST para sincronizar histórico inicial:
```bash
POST /api/historical/sync
Body: { "asset": "BTC", "days": 730 }
```
- Descarga 2 años de candles 1h desde CoinGecko
- Guarda en `./data/ohlc.json`
- Retorna: `{ success, asset, candles, lastSync }`

### 3. `/api/historical/update.js`
Endpoint POST para actualizar cada hora:
```bash
POST /api/historical/update
Body: { "asset": "BTC" } // opcional
```
- Obtiene precio actual del activo
- Crea/actualiza candle 1h
- Mantiene máximo 17520 candles (2 años)
- Retorna: `{ success, asset, currentPrice, candleTime, totalCandles }`

### 4. `/api/market-price.js`
Endpoint GET para obtener precio actual + datos de mercado:
```bash
GET /api/market-price?asset=BTC
```
- Retorna: `{ current_price, market_cap, volume_24h, price_change_24h, price_change_percent_24h }`

### 5. `index.html` - Actualizaciones
- Selector dropdown: BTC, ETH, SOL
- Botón "Sincronizar Histórico" - Ejecuta /api/historical/sync
- Interfaz dinámica por activo seleccionado
- Datos demo para fallback si CoinGecko no disponible

## Flujo de Uso

### 1. Sincronización Inicial (Una sola vez)
```javascript
// Desde UI o cron job
await fetch('/api/historical/sync', {
  method: 'POST',
  body: JSON.stringify({ asset: 'BTC', days: 730 })
})
```

### 2. Actualización Horaria (Automática)
```javascript
// Cron job cada hora
await fetch('/api/historical/update', {
  method: 'POST',
  body: JSON.stringify({ asset: 'BTC' })
})
```

### 3. Lectura de Datos
```javascript
// Desde client-side
const price = await fetch('/api/market-price?asset=BTC').then(r => r.json())
```

## Base de Datos (ohlc.json)
```json
{
  "BTC": [
    { "timestamp": 1234567890, "open": 45000, "high": 45500, "low": 44800, "close": 45200 },
    ...
  ],
  "ETH": [...],
  "SOL": [...],
  "lastSync": "2026-04-18T12:00:00Z",
  "lastUpdate": "2026-04-18T13:00:00Z"
}
```

## Variables de Entorno
- `DB_FILE` - Ruta del archivo JSON (default: `./data/ohlc.json`)

## Próximos Pasos (PHASE 2)
- Análisis técnico sobre los candles históricos
- Detección de patrones
- Backtest de estrategias
