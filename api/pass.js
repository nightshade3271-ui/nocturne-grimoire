// Refreshes a pass token if the subscription is still active; 402 once it has ended.
// Expired (but correctly signed) tokens are accepted here so returning members renew after a Stripe check.
const { verify, issue, hasActivePass, readJson } = require('../lib/pass.js');

module.exports = async (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  const send = (code, obj) => { res.statusCode = code; res.end(JSON.stringify(obj)); };
  try {
    const { token } = await readJson(req);
    const p = verify(token, { allowExpired: true });
    if (!p) return send(401, { success: false, error: 'invalid pass' });
    if (!(await hasActivePass(p.c))) return send(402, { success: false, paywall: true, error: 'subscription not active' });
    send(200, { success: true, token: issue(p.c) });
  } catch (e) { console.error('pass check failed:', e.message); send(500, { success: false, error: 'could not check pass right now' }); }
};
