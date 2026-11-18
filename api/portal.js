// Opens the Stripe customer portal (cancel, update card, invoices) for the pass holder.
const { verify, stripePost, readJson } = require('../lib/pass.js');
const LOGIN_URL = 'https://billing.stripe.com/p/login/8x2fZibMH6rMftL7JP7ss00';

module.exports = async (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  try {
    const { token } = await readJson(req);
    const p = verify(token);
    if (!p) { res.statusCode = 200; return res.end(JSON.stringify({ success: true, url: LOGIN_URL })); }
    const s = await stripePost('billing_portal/sessions', { customer: p.c, return_url: 'https://nocturne-grimoire.vercel.app/' });
    res.statusCode = 200; res.end(JSON.stringify({ success: true, url: s.url }));
  } catch (e) { res.statusCode = 200; console.error('portal failed:', e.message); res.end(JSON.stringify({ success: true, url: LOGIN_URL })); }
};
