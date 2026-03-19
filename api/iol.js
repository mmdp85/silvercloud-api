// /api/iol.js — Vercel Serverless Proxy for IOL API
// Credentials are stored in Vercel Environment Variables (never in code)

const IOL_BASE = 'https://api.invertironline.com';

// Token cache (in-memory, per cold start)
let cachedToken = null;
let tokenExpiry = 0;

async function getToken() {
  const now = Date.now();

  // Reuse token if still valid (with 60s buffer)
  if (cachedToken && now < tokenExpiry - 60000) {
    return cachedToken;
  }

  const username = process.env.IOL_USERNAME;
  const password = process.env.IOL_PASSWORD;

  if (!username || !password) {
    throw new Error('IOL credentials not configured. Set IOL_USERNAME and IOL_PASSWORD in Vercel Environment Variables.');
  }

  const resp = await fetch(`${IOL_BASE}/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}&grant_type=password`
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`IOL auth failed (${resp.status}): ${text}`);
  }

  const data = await resp.json();
  cachedToken = data.access_token;
  // IOL tokens last ~15 min, we cache for 12 min
  tokenExpiry = now + 12 * 60 * 1000;

  return cachedToken;
}

async function proxyRequest(path, token) {
  const url = `${IOL_BASE}${path}`;

  const resp = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json'
    }
  });

  if (!resp.ok) {
    const text = await resp.text();
    return { status: resp.status, body: { error: `IOL API error (${resp.status})`, detail: text } };
  }

  const data = await resp.json();
  return { status: 200, body: data };
}

export default async function handler(req, res) {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin',
