export default async function handler(req, res) {
  const apiKey = process.env.COINGLASS_API_KEY;

  if (!apiKey) {
    return res.status(200).json({
      data: null,
      message: 'Coinglass API key not configured'
    });
  }

  try {
    const response = await fetch('https://open-api.coinglass.com/public/v2/liquidation/realtime?symbol=BTC', {
      method: 'GET',
      headers: {
        'coinglassSecret': apiKey
      }
    });

    if (!response.ok) {
      return res.status(200).json({
        data: null,
        message: `Coinglass unavailable: ${response.status}`
      });
    }

    const data = await response.json();
    return res.status(200).json(data);

  } catch (error) {
    console.error('Coinglass proxy error:', error);
    return res.status(200).json({
      data: null,
      message: error.message
    });
  }
}
