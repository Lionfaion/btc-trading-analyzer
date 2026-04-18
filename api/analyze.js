export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'Claude API key not configured' });
  }

  const { btcPrice, liquidationData, timeframe } = req.body;

  if (!btcPrice || !liquidationData) {
    return res.status(400).json({ error: 'Missing required data' });
  }

  const prompt = `Analiza estos datos de trading de BTC y proporciona un análisis conciso:

Precio actual: $${btcPrice}
Liquidaciones en Long: ${liquidationData.longLiquidations || 0}
Liquidaciones en Short: ${liquidationData.shortLiquidations || 0}
Timeframe: ${timeframe || '1H'}

Proporciona un análisis en este formato JSON exacto (sin markdown):
{
  "bias": "Bullish o Bearish",
  "risk_zones": "Descripción de zonas de riesgo",
  "institutional_traps": "Descripción de posibles trampas",
  "confidence": "70",
  "action": "Recomendación de acción"
}`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-opus-4-20250514',
        max_tokens: 500,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Claude API error: ${response.status} - ${error.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();
    const analysis = data.content[0].text;

    return res.status(200).json({ analysis });

  } catch (error) {
    console.error('Claude API error:', error);
    return res.status(500).json({ error: error.message });
  }
}
