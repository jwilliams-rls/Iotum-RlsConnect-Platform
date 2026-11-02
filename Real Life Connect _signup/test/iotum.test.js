const { test } = require('node:test');
const assert = require('node:assert/strict');
const { openStore } = require('../db');
const { prepareTest, getTest, activateTest } = require('../iotum-provision');
const { createIotumClient } = require('../iotum-client');
function setup() {
  const store = openStore(':memory:');
  store.createSignup({ orgName: 'Test Company', adminName: 'Test Admin', adminEmail: 'test@example.test', passwordHash: 'fixture' });
  const job = prepareTest(store.db, { email: 'test@example.test', productId: 7, subdomain: 'rlc-test-demo', companyName: 'Real Life Connect Test' });
  return { store, job };
}
function fakeClient({ failAt, wrongPlan = false } = {}) {
  const calls = [];
  return { calls, async authenticate() {}, async post(endpoint, payload) {
    calls.push({ endpoint, payload });
    if (failAt === endpoint) throw new Error('Connection interrupted');
    if (endpoint === '/subscription/fetch_products') return [{ slug: 'reallife_basic', plan: true, id: 7 }];
    if (endpoint === '/company/create') return { id: 101 };
    if (endpoint === '/subscription/fetch') return [{ id: 201, status: 'Active', product: { slug: wrongPlan ? 'wrong' : 'reallife_basic' } }];
    if (endpoint === '/host/create') return { host_id: 301, company_id: 101, plan_slug: 'reallife_basic', meeting_url: 'https://test.reallife-connect.live/conf/call/123', password_creation_link: 'PRIVATE_LINK', login_token_public_key: 'PRIVATE_KEY' };
    throw new Error('Unexpected endpoint');
  } };
}
test('prepared test performs no provider writes; completion is repeatable and keeps signup unpaid', async () => {
  const { store, job } = setup(); const client = fakeClient();
  try {
    assert.equal(job.state, 'prepared');
    assert.equal(job.draft.companyName, 'Real Life Connect Test');
    assert.throws(() => prepareTest(store.db, { email: 'test@example.test', productId: 7, subdomain: 'another-test' }), /UNIQUE/);
    const completed = await activateTest(store.db, job.id, client);
    assert.equal(completed.state, 'ready_test'); assert.equal(completed.company_id, 101); assert.equal(completed.host_id, 301);
    assert.equal(store.db.prepare('SELECT status FROM users').get().status, 'pending_payment');
    assert.doesNotMatch(JSON.stringify(completed), /PRIVATE_LINK|PRIVATE_KEY/);
    const host = client.calls.find(c => c.endpoint === '/host/create').payload;
    assert.deepEqual(host.subscription_ids, [201]); assert.equal(host.no_welcome_email, true);
    assert.equal(host.disable_emails.conference_summaries, false); assert.equal(host.auto_record, 'none');
    const count = client.calls.length; await activateTest(store.db, job.id, client); assert.equal(client.calls.length, count);
  } finally { store.close(); }
});
test('ambiguous company or host writes require review and never retry creation', async () => {
  for (const endpoint of ['/company/create', '/host/create']) {
    const { store, job } = setup(); const client = fakeClient({ failAt: endpoint });
    try {
      await assert.rejects(activateTest(store.db, job.id, client), /Connection interrupted/);
      assert.equal(getTest(store.db, job.id).state, 'review_required');
      if (endpoint === '/host/create') assert.equal(getTest(store.db, job.id).company_id, 101);
      const count = client.calls.length;
      await assert.rejects(activateTest(store.db, job.id, client), /manual review/);
      assert.equal(client.calls.length, count);
    } finally { store.close(); }
  }
});
test('wrong subscription prevents host creation; a transient read can resume without another company', async () => {
  const { store, job } = setup(); const client = fakeClient({ wrongPlan: true });
  try {
    await assert.rejects(activateTest(store.db, job.id, client), /does not match/);
    assert.equal(getTest(store.db, job.id).state, 'company_created');
    assert.equal(client.calls.some(c => c.endpoint === '/host/create'), false);
    const fixed = fakeClient(); await activateTest(store.db, job.id, fixed);
    assert.equal(fixed.calls.some(c => c.endpoint === '/company/create'), false);
  } finally { store.close(); }
});
test('client redacts provider errors, refuses redirects and does not expose API tokens', async () => {
  const client = createIotumClient({ token: 'SECRET', fetchImpl: async (url, opts) => {
    assert.equal(opts.redirect, 'error'); assert.equal(new URL(url).protocol, 'https:');
    return { ok: false, status: 401, async json() { return { message: 'SECRET' }; } };
  } });
  await assert.rejects(client.authenticate(), error => error.message.includes('401') && !error.message.includes('SECRET'));
});

test('reseller-default creation omits product_id and verifies Basic before assigning the host', async () => {
  const store = openStore(':memory:');
  try {
    store.createSignup({ orgName: 'Default test', adminName: 'Admin', adminEmail: 'default@example.test', passwordHash: 'fixture' });
    const job = prepareTest(store.db, { email: 'default@example.test', productId: null, subdomain: 'default-test' });
    const client = fakeClient();
    const result = await activateTest(store.db, job.id, client);
    assert.equal(result.state, 'ready_test');
    assert.equal(Object.hasOwn(client.calls.find(c => c.endpoint === '/company/create').payload, 'product_id'), false);
    assert.deepEqual(client.calls.find(c => c.endpoint === '/host/create').payload.subscription_ids, [201]);
  } finally { store.close(); }
});
