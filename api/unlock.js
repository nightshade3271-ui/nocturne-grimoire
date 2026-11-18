// After Stripe checkout: confirms the session paid for the Grimoire Pass and returns a pass token.
const { PRICE_ID, issue, stripe } = require('../lib/pass.js');

module.exports = async (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  const send = (code, obj) => { res.statusCode = code; res.end(JSON.stringify(obj)); };
  try {
    const id = new URL(req.url, 'http://x').searchParams.get('session_id') || '';
    if (!/^cs_(live|test)_[A-Za-z0-9]+$/.test(id)) return send(400, { success: false, error: 'bad session' });
    const s = await stripe(`checkout/sessions/${id}`, { 'expand[]': 'line_items' });
    const isPass = (s.line_items?.data || []).some((li) => li.price?.id === PRICE_ID);
    if (!isPass || s.status !== 'complete' || !s.customer) return send(402, { success: false, error: 'not a completed Grimoire Pass checkout' });
    send(200, { success: true, token: issue(s.customer) });
  } catch (e) { console.error('unlock failed:', e.message); send(500, { success: false, error: 'could not confirm payment right now' }); }
};
