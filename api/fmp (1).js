const FMP_BASE = 'https://financialmodelingprep.com';

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const apiKey = process.env.FMP_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'FMP_API_KEY not configured' });
    }

    // Extraer el path después de /api/fmp (ej: /quote/AAPL,MSFT)
    let fmpPath = req.url.replace(/^\/api\/fmp/, '');
    if (!fmpPath || fmpPath === '/') {
      return res.status(200).json({ status: 'ok', message: 'SilverCloud FMP Proxy' });
    }

    // Agregar apikey al query string
    const separator = fmpPath.includes('?') ? '&' : '?';
    const url = FMP_BASE + fmpPath + separator + 'apikey=' + apiKey;

    const resp = await fetch(url, {
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    });

    if (!resp.ok) {
      const errText = await resp.text();
      return res.status(resp.status).json({ error: 'FMP error ' + resp.status, detail: errText });
    }

    const data = await resp.json();
    return res.status(200).json(data);

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
