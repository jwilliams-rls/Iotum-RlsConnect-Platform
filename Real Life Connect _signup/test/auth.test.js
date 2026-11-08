const { test } = require('node:test');
const assert = require('node:assert/strict');
const { openStore } = require('../db');
const { createApp } = require('../server');
const { hashPassword } = require('../passwords');

test('website sessions enforce membership, admin role, expiry, logout and request protection', async () => {
  const store = openStore(':memory:');
  const password = 'Website-test-password-123';
  const passwordHash = await hashPassword(password);
  const admin = store.createSignup({ orgName: 'Test A', adminName: 'Admin A', adminEmail: 'admin@example.test', passwordHash });
  const member = store.createSignup({ orgName: 'Test B', adminName: 'Member B', adminEmail: 'member@example.test', passwordHash });
  store.db.prepare("UPDATE memberships SET role = 'member' WHERE user_id = ?").run(member.userId);
  store.db.prepare("INSERT INTO rooms VALUES ('assigned', ?, 'Assigned Pro', 'pro', 'active')").run(member.orgId);
  store.db.prepare("INSERT INTO rooms VALUES ('hidden', ?, 'Private room', 'plus', 'active')").run(member.orgId);
  store.db.prepare("INSERT INTO room_assignments VALUES ('assigned', ?)").run(member.userId);
  const server = createApp(store).listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const send = (url, body, cookie, extra = {}) => fetch(base + url, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-RLC-Request': '1', ...(cookie ? { Cookie: cookie } : {}), ...extra }, body: JSON.stringify(body) });
  const get = (url, cookie) => fetch(base + url, { headers: cookie ? { Cookie: cookie } : {} });
  try {
    assert.equal((await get('/api/dashboard')).status, 401);
    assert.equal((await send('/api/login', { email: 'admin@example.test', password }, null, { 'X-RLC-Request': '' })).status, 403);
    assert.equal((await send('/api/login', { email: 'admin@example.test', password }, null, { 'Sec-Fetch-Site': 'cross-site' })).status, 403);
    assert.equal((await send('/api/login', { email: 'admin@example.test', password: 'incorrect' })).status, 401);
    const response = await send('/api/login', { email: 'ADMIN@example.test', password });
    assert.equal(response.status, 200);
    const header = response.headers.get('set-cookie');
    assert.match(header, /HttpOnly/); assert.match(header, /SameSite=Strict/);
    const cookie = header.split(';')[0];
    assert.doesNotMatch(store.db.prepare('SELECT token_hash FROM sessions').get().token_hash, new RegExp(cookie.split('=')[1]));
    const dashboard = await (await get('/api/dashboard', cookie)).json();
    assert.equal(dashboard.workspace.id, admin.orgId);
    assert.doesNotMatch(JSON.stringify(dashboard), /password_hash|supplierMonthlyCents|auth_token/);
    assert.equal((await get(`/api/workspaces/${admin.orgId}/admin`, cookie)).status, 200);
    assert.equal((await get('/api/dashboard?workspace=' + member.orgId, cookie)).status, 403);
    assert.equal((await get(`/api/workspaces/${member.orgId}/admin`, cookie)).status, 403);
    const memberResponse = await send('/api/login', { email: 'member@example.test', password });
    const memberCookie = memberResponse.headers.get('set-cookie').split(';')[0];
    const memberData = await (await get('/api/dashboard', memberCookie)).json();
    assert.equal(memberData.workspace.role, 'member');
    assert.deepEqual(memberData.rooms.map(r=>r.id), ['assigned']);
    assert.equal((await get(`/api/workspaces/${member.orgId}/admin`, memberCookie)).status, 403);
    assert.equal((await send('/api/logout', {}, memberCookie)).status, 200);
    assert.equal((await get('/api/session', memberCookie)).status, 401);
    store.db.prepare('UPDATE sessions SET last_seen = 0').run();
    assert.equal((await get('/api/session', cookie)).status, 401);
    store.db.prepare("UPDATE users SET status = 'suspended' WHERE id = ?").run(admin.userId);
    assert.equal((await send('/api/login', { email: 'admin@example.test', password })).status, 401);
  } finally { await new Promise(resolve=>server.close(resolve)); store.close(); }
});

test('existing provisioned test signup survives migration and receives its local administrator workspace', () => {
  const { mkdtempSync, rmSync } = require('node:fs');
  const { tmpdir } = require('node:os');
  const path = require('node:path');
  const { prepareTest } = require('../iotum-provision');
  const dir = mkdtempSync(path.join(tmpdir(), 'rlc-auth-migration-'));
  const file = path.join(dir, 'test.sqlite');
  let store = openStore(file);
  try {
    const signup = store.createSignup({ orgName: 'Individual account', adminName: 'Test Admin', adminEmail: 'migration@example.test', passwordHash: 'preserved-hash' });
    const job = prepareTest(store.db, { email: 'migration@example.test', productId: null, subdomain: 'migration-test', companyName: 'Real Life Connect Test' });
    store.db.prepare("UPDATE iotum_provisioning SET state = 'ready_test', company_id = 100, host_id = 200, meeting_url = 'https://migration-test.reallife-connect.live/conf/call/123' WHERE id = ?").run(job.id);
    store.db.exec('DROP TABLE room_user_permissions; DROP TABLE room_provider_links; DROP TRIGGER room_assignment_rules; DROP TABLE room_reservations; DROP TABLE room_calendar_settings; DROP TABLE meeting_handoffs; DROP TABLE room_assignments; DROP TABLE rooms; DROP TABLE login_attempts; DROP TABLE sessions; DROP TABLE memberships; ALTER TABLE organizations DROP COLUMN kind; PRAGMA user_version = 5;');
    store.close(); store = openStore(file);
    assert.equal(store.db.prepare('SELECT password_hash FROM users').get().password_hash, 'preserved-hash');
    assert.deepEqual({ ...store.db.prepare('SELECT name, kind FROM organizations').get() }, { name: 'Real Life Connect Test', kind: 'organization' });
    assert.equal(store.db.prepare('SELECT role FROM memberships WHERE user_id = ?').get(signup.userId).role, 'admin');
    assert.equal(store.db.prepare('SELECT host_id FROM iotum_provisioning').get().host_id, 200);
    store.close(); store = openStore(file);
    assert.equal(store.db.prepare('SELECT count(*) n FROM memberships').get().n, 1);
  } finally { store.close(); rmSync(dir, { recursive: true, force: true }); }
});
