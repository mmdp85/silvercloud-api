const IOL_BASE = 'https://api.invertironline.com';

let cachedToken = null;
let tokenExpiry = 0;

async function getToken() {
  const now = Date.now();
  if (cachedToken && now < tokenExpiry - 60000) {
    return cachedToken;
  }

  const username = process.env.IOL_USERNAME;
  const password = process.env.IOL_PASSWORD;

  if (!username || !password) {
    throw new Error('Credentials not configured');
  }

  const resp = await fetch(IOL_BASE + '/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'username=' + encodeURIComponent(username) + '&password=' + encodeURIComponent(password) + '&grant_type=password'
  });

  if (!resp.ok) {
    throw new Error('Auth failed: ' + resp.status);
  }

  const data = await resp.json();
  cachedToken = data.access_token;
  tokenExpiry = now + 12 * 60 * 1000;
  return cachedToken;
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    var iolPath = req.url.replace(/^\/api\/iol/, '');

    if (!iolPath || iolPath === '/' || iolPath === '/health' || req.url === '/api/health' || req.url === '/api/iol') {
      return res.status(200).json({
        status: 'ok',
        message: 'SilverCloud IOL Proxy',
        timestamp: new Date().toISOString(),
        hasCredentials: !!(process.env.IOL_USERNAME && process.env.IOL_PASSWORD)
      });
    }

    var token = await getToken();

    var url = IOL_BASE + '/api' + iolPath;
    var resp = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': 'Bearer ' + token,
        'Accept': 'application/json'
      }
    });

    if (!resp.ok) {
      var errText = await resp.text();
      return res.status(resp.status).json({ error: 'IOL error ' + resp.status, detail: errText });
    }

    var data = await resp.json();
    return res.status(200).json(data);

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
