// Grimoire Pass: $4.99/mo Stripe subscription.
// A signed pass token ({c: customer, exp}) unlocks premium features. Tokens are short-lived (3 days)
// and refreshed via /api/pass, which re-checks the subscription with Stripe, so cancellations take effect.
const crypto = require('crypto');

const PRICE_ID = 'price_1Ud41EIMozRGYFc4TMCQEwi2';
const TOKEN_DAYS = 3;

const b64u = (b) => Buffer.from(b).toString('base64url');
function sign(payload) {
  const body = b64u(JSON.stringify(payload));
  const mac = crypto.createHmac('sha256', process.env.PASS_SECRET || '').update(body).digest('base64url');
  return `${body}.${mac}`;
}
function verify(token, { allowExpired = false } = {}) {
  if (!token || !process.env.PASS_SECRET) return null;
  const [body, mac] = String(token).split('.');
  if (!body || !mac) return null;
  const expect = crypto.createHmac('sha256', process.env.PASS_SECRET).update(body).digest('base64url');
  if (mac.length !== expect.length || !crypto.timingSafeEqual(Buffer.from(mac), Buffer.from(expect))) return null;
  try {
    const p = JSON.parse(Buffer.from(body, 'base64url').toString());
    return (allowExpired || p.exp > Date.now()) ? p : null;
  } catch { return null; }
}
const issue = (customer) => sign({ c: customer, exp: Date.now() + TOKEN_DAYS * 86400000 });

async function stripe(path, params) {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('STRIPE_SECRET_KEY not set');
  const url = `https://api.stripe.com/v1/${path}${params ? '?' + new URLSearchParams(params) : ''}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${key}` } });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return data;
}
async function stripePost(path, params) {
  const res = await fetch(`https://api.stripe.com/v1/${path}`, {
    method: 'POST', headers: { Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(params),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return data;
}

// True when the customer has an active (or trialing / briefly past-due) Grimoire Pass subscription.
async function hasActivePass(customer) {
  const subs = await stripe('subscriptions', { customer, status: 'all', limit: '10' });
  return subs.data.some((s) => ['active', 'trialing', 'past_due'].includes(s.status)
    && s.items.data.some((i) => i.price.id === PRICE_ID));
}

// For premium API routes: returns the pass payload or sends 402 and returns null.
function requirePass(req, res) {
  const p = verify(req.headers['x-grimoire-pass']);
  if (p) return p;
  res.statusCode = 402;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify({ success: false, paywall: true, error: 'Grimoire Pass required' }));
  return null;
}

async function readJson(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') return JSON.parse(req.body || '{}');
  return {};
}

module.exports = { PRICE_ID, verify, issue, stripe, stripePost, hasActivePass, requirePass, readJson };
