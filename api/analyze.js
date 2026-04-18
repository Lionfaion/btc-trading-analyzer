const https = require('https');

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

Proporciona:
1. Viés direccional (Bullish/Bearish)
2. Zonas de riesgo principales
3. Detección de trampas institucionales (si aplica)
4. Nivel de confianza del análisis (%)
5. Recomendación de acción (1-2 líneas)

Responde en JSON sin markdown.`;

  try {
    const claudeRequest = new Promise((resolve, reject) => {
      const data = JSON.stringify({
        model: 'claude-opus-4-1',
        max_tokens: 500,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      });

      const options = {
        hostname: 'api.anthropic.com',
        port: 443,
        path: '/v1/messages',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': data.length,
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01'
        }
      };

      const request = https.request(options, (response) => {
        let body = '';
        response.on('data', (chunk) => { body += chunk; });
        response.on('end', () => {
          if (response.statusCode === 200) {
            try {
              const parsed = JSON.parse(body);
              const content = parsed.content[0].text;
              resolve(content);
            } catch (e) {
              reject(new Error('Failed to parse Claude response'));
            }
          } else {
            reject(new Error(`Claude API error: ${response.statusCode}`));
          }
        });
      });

      request.on('error', reject);
      request.write(data);
      request.end();
    });

    const analysis = await claudeRequest;
    return res.status(200).json({ analysis });

  } catch (error) {
    console.error('Claude API error:', error);
    return res.status(500).json({ error: error.message });
  }
}
