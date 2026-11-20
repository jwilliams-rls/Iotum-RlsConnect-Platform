const { randomUUID } = require('node:crypto');
const { readCatalog } = require('./catalog');

function checkoutConfig(env) {
  const key = env.STRIPE_SECRET_KEY;
  if (!/^sk_test_[A-Za-z0-9]+$/.test(key || '')) return null;
  try {
    const origin = new URL(env.STRIPE_CHECKOUT_ORIGIN);
    if (origin.protocol !== 'https:' && !(origin.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(origin.hostname))) return null;
    return { key, returnUrl: origin.origin + '/#account?admin&view=requests' };
  } catch { return null; }
}

function installHostCheckout(app, db, { signedIn, workspace, protectedMutation }, options = {}) {
  const config = checkoutConfig(options.stripeEnv || process.env);
  const stripeFetch = options.stripeFetch || fetch;
  const attemptFor = db.prepare('SELECT * FROM host_checkout WHERE host_id=?');
  const setSession = db.prepare('UPDATE host_checkout SET session_id=? WHERE host_id=? AND attempt_id=?');
  const setPaid = db.prepare('UPDATE host_checkout SET paid_at=?, subscription_id=? WHERE host_id=? AND attempt_id=? AND paid_at IS NULL');

  async function stripeRequest(path, init = {}) {
    const response = await stripeFetch('https://api.stripe.com/v1/checkout/sessions' + path, {
      ...init,
      headers: { Authorization: 'Bearer ' + config.key, ...init.headers },
      signal: AbortSignal.timeout(10000),
      redirect: 'error',
    });
    if (!response.ok) throw new Error('Stripe request failed');
    return response.json();
  }

  function recordResult(attempt, session) {
    if (!/^cs_test_[A-Za-z0-9]+$/.test(session.id || '') ||
        (attempt.session_id && session.id !== attempt.session_id) ||
        session.livemode !== false || session.mode !== 'subscription' ||
        session.client_reference_id !== attempt.attempt_id ||
        session.currency !== 'usd' || session.amount_total !== attempt.amount_cents) {
      throw new Error('Stripe session does not match the request');
    }
    setSession.run(session.id, attempt.host_id, attempt.attempt_id);
    if (session.status === 'complete' && session.payment_status === 'paid') {
      if (!/^sub_[A-Za-z0-9]+$/.test(session.subscription || '')) throw new Error('Stripe subscription missing');
      setPaid.run(new Date().toISOString(), session.subscription, attempt.host_id, attempt.attempt_id);
      return { status: 'paid' };
    }
    if (session.status === 'expired' && session.payment_status === 'unpaid') {
      db.prepare('DELETE FROM host_checkout WHERE host_id=? AND attempt_id=? AND paid_at IS NULL').run(attempt.host_id, attempt.attempt_id);
      return { status: 'expired' };
    }
    if (session.status === 'open') {
      const url = new URL(session.url);
      if (url.origin !== 'https://checkout.stripe.com' || url.username || url.password) throw new Error('Invalid Checkout URL');
      return { status: 'open', url: url.href };
    }
    return { status: 'awaiting_payment' };
  }

  const active = new Set();
  app.post('/api/workspaces/:id/pending-hosts/:hostId/checkout', protectedMutation, signedIn, workspace, async (req, res) => {
    if (req.workspace.kind !== 'organization' || req.workspace.role !== 'admin') return res.status(403).send('Organization administrator access is required.');
    const host = db.prepare('SELECT id,plan,status FROM pending_hosts WHERE id=? AND organization_id=?').get(req.params.hostId, req.workspace.id);
    if (!host || host.status !== 'pending_billing') return res.status(404).send('Active host request not found.');
    if (!config) return res.status(503).send('Stripe test checkout is not configured.');
    res.set('Cache-Control', 'no-store');
    const action = req.body?.action;
    if (!['start', 'check'].includes(action)) return res.status(400).send('Choose whether to start or check payment.');
    if (active.has(host.id)) return res.status(409).send('Payment is being checked. Try again shortly.');
    active.add(host.id);
    try {
      let attempt = attemptFor.get(host.id);
      if (attempt?.paid_at) return res.json({ status: 'paid' });
      if (attempt?.session_id) {
        const result = recordResult(attempt, await stripeRequest('/' + encodeURIComponent(attempt.session_id)));
        if (result.status !== 'expired' || action === 'check') return res.json(result);
        attempt = null;
      }
      if (!attempt && action === 'check') return res.json({ status: 'not_started' });
      if (!attempt) {
        const plan = readCatalog(db).catalog.plans.find(plan => plan.id === host.plan);
        if (!plan || plan.priceCents < 50 || plan.priceCents > 99999999) return res.status(409).send('Set a supported monthly retail price before opening checkout.');
        const attemptId = randomUUID();
        const createdAt = Date.now();
        const params = new URLSearchParams({
          mode: 'subscription',
          client_reference_id: attemptId,
          customer_email: req.account.email,
          success_url: config.returnUrl,
          cancel_url: config.returnUrl,
          expires_at: String(Math.floor(createdAt / 1000) + 3600),
          'adaptive_pricing[enabled]': 'false',
          'payment_method_types[0]': 'card',
          'line_items[0][quantity]': '1',
          'line_items[0][price_data][currency]': 'usd',
          'line_items[0][price_data][unit_amount]': String(plan.priceCents),
          'line_items[0][price_data][recurring][interval]': 'month',
          'line_items[0][price_data][product_data][name]': 'Real Life Connect ' + plan.name + ' host',
        });
        db.prepare('INSERT OR IGNORE INTO host_checkout(host_id,attempt_id,amount_cents,request_body,created_at) VALUES (?,?,?,?,?)')
          .run(host.id, attemptId, plan.priceCents, params.toString(), createdAt);
        attempt = attemptFor.get(host.id);
      }
      if (Date.now() - attempt.created_at >= 23 * 60 * 60 * 1000) {
        return res.status(409).send('This checkout needs manual reconciliation in Stripe before retrying.');
      }
      const session = await stripeRequest('', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Idempotency-Key': attempt.attempt_id },
        body: attempt.request_body,
      });
      return res.json(recordResult(attempt, session));
    } catch {
      return res.status(502).send('Stripe could not confirm checkout. Try checking payment again.');
    } finally {
      active.delete(host.id);
    }
  });
  return Boolean(config);
}

module.exports = { installHostCheckout };
