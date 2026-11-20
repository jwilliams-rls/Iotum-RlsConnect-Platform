const { test } = require('node:test');
const assert = require('node:assert/strict');
const { openStore } = require('../db');
const { prepareTest } = require('../iotum-provision');
const { testHostRole } = require('../iotum-role-test');
function setup() {
  const store = openStore(':memory:');
  store.createSignup({ orgName: 'Role test', adminName: 'Admin', adminEmail: 'role@example.test', passwordHash: 'fixture' });
  const job = prepareTest(store.db, { email: 'role@example.test', productId: null, subdomain: 'role-test' });
  store.db.prepare("UPDATE iotum_provisioning SET state = 'ready_test', company_id = 100, host_id = 200 WHERE id = ?").run(job.id);
  return { store, job };
}
test('role-only update is verified and leaves subscriptions and local admin status alone', async () => {
  const { store, job } = setup(); let role = 'COMPANY_ADMIN'; const writes = [];
  const client = { async authenticate() {}, async post(endpoint, body) {
    if (endpoint === '/host/fetch') return { host_id: 200, company_id: 100, email: 'role@example.test', role };
    writes.push(body); role = body.role; return {};
  } };
  try {
    const result = await testHostRole(store.db, job.id, client, 'HOST');
    assert.equal(result.verifiedRole, 'HOST');
    assert.deepEqual(writes, [{ host_id: 200, role: 'HOST' }]);
    assert.equal(store.db.prepare('SELECT role FROM users').get().role, 'admin');
    await testHostRole(store.db, job.id, client, 'HOST'); assert.equal(writes.length, 1);
    await testHostRole(store.db, job.id, client); assert.equal(writes.length, 1);
  } finally { store.close(); }
});
test('identity mismatch or reseller admin role prevents writes', async () => {
  for (const override of [{ company_id: 999 }, { role: 'RESELLER_ADMIN' }]) {
    const { store, job } = setup(); let writes = 0;
    const client = { async authenticate() {}, async post(endpoint) {
      if (endpoint !== '/host/fetch') { writes++; throw new Error('Unexpected write'); }
      return { host_id: 200, company_id: 100, email: 'role@example.test', role: 'COMPANY_ADMIN', ...override };
    } };
    try { await assert.rejects(testHostRole(store.db, job.id, client, 'HOST')); assert.equal(writes, 0); }
    finally { store.close(); }
  }
});
