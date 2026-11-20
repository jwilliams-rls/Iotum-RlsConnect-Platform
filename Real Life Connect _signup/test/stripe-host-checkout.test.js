const { test } = require('node:test');
const assert = require('node:assert/strict');
const { openStore } = require('../db');
const { createApp } = require('../server');
const { hashPassword } = require('../passwords');

test('host checkout uses saved pricing and confirms only a matching paid Stripe test session', async () => {
  const store = openStore(':memory:');
  const password = 'test-fixture-password';
  const passwordHash = await hashPassword(password);
  const admin = store.createSignup({ orgName: 'Example', adminName: 'Admin', adminEmail: 'admin@example.test', passwordHash });
  store.createSignup({ orgName: 'Other', adminName: 'Other', adminEmail: 'other@example.test', passwordHash });
  let session, createCalls = 0, retryKey, failFirst = true;
  const stripeFetch = async (url, init) => {
    assert.equal(init.headers.Authorization, 'Bearer sk_test_fixture');
    if (init.method === 'POST') {
      createCalls++;
      const form = new URLSearchParams(init.body);
      assert.equal(form.get('customer_email'), 'admin@example.test');
      assert.equal(form.get('line_items[0][price_data][unit_amount]'), '799');
      assert.equal(form.get('line_items[0][price_data][recurring][interval]'), 'month');
      assert.equal(form.get('success_url'), 'https://example.test/#account?admin&view=requests');
      if (failFirst) {
        retryKey = init.headers['Idempotency-Key'];
        failFirst = false;
        throw new Error('Connection dropped');
      }
      assert.equal(init.headers['Idempotency-Key'], retryKey);
      session = { id: 'cs_test_fixture', mode: 'subscription', livemode: false, client_reference_id: form.get('client_reference_id'),
        currency: 'usd', amount_total: 799, status: 'open', payment_status: 'unpaid', url: 'https://checkout.stripe.com/example' };
    } else {
      assert.equal(url, 'https://api.stripe.com/v1/checkout/sessions/cs_test_fixture');
    }
    return new Response(JSON.stringify(session));
  };
  const server = createApp(store, { stripeFetch, stripeEnv: { STRIPE_SECRET_KEY: 'sk_test_fixture', STRIPE_CHECKOUT_ORIGIN: 'https://example.test' } }).listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  const origin = 'http://127.0.0.1:' + server.address().port;
  function call(path, method = 'GET', body, cookie) {
    return fetch(origin + path, { method, body: JSON.stringify(body), headers: {
      'Content-Type': 'application/json', 'X-RLC-Request': '1', ...(cookie ? { Cookie: cookie } : {}),
    } });
  }
  async function login(email) {
    const response = await call('/api/login', 'POST', { email, password });
    assert.equal(response.status, 200);
    return response.headers.get('set-cookie').split(';')[0];
  }

  try {
    const a = await login('admin@example.test'), b = await login('other@example.test');
    const list = '/api/workspaces/' + admin.orgId + '/pending-hosts';
    const created = await call(list, 'POST', { name: 'Host', email: 'host@example.test', timezone: 'UTC', plan: 'basic' }, a);
    assert.equal(created.status, 201);
    const path = list + '/' + (await created.json()).id;
    const checkout = (action, cookie = a) => call(path + '/checkout', 'POST', { action }, cookie);
    assert.equal((await checkout('start', b)).status, 403);
    assert.equal((await (await checkout('check')).json()).status, 'not_started');
    assert.equal((await checkout('start')).status, 502);
    assert.equal((await call(path + '/cancel', 'POST', {}, a)).status, 409);
    assert.equal((await checkout('start')).status, 200);
    assert.equal((await (await checkout('check')).json()).status, 'open');
    assert.equal(createCalls, 2);
    session.amount_total = 800;
    session.status = 'complete'; session.payment_status = 'paid'; session.subscription = 'sub_fixture';
    assert.equal((await checkout('check')).status, 502);
    session.amount_total = 799;
    assert.equal((await (await checkout('check')).json()).status, 'paid');
    assert.equal((await (await checkout('start')).json()).status, 'paid');
    const { checkoutEnabled, hosts } = await (await call(list, 'GET', undefined, a)).json();
    assert.equal(checkoutEnabled, true);
    assert.equal(hosts[0].checkoutStatus, 'paid');
    assert.equal(hosts[0].status, 'pending_billing');
    assert.equal(store.db.prepare('SELECT subscription_id FROM host_checkout').get().subscription_id, 'sub_fixture');
  } finally {
    await new Promise(resolve => server.close(resolve));
    store.close();
  }
});
