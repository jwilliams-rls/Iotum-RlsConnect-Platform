const { test } = require('node:test');
const assert = require('node:assert/strict');
const { openStore } = require('../db');
const { createApp } = require('../server');
const { hashPassword } = require('../passwords');
const { prepareTest } = require('../iotum-provision');

test('meeting handoff is owned, session-bound, single-use and redirects to the documented host sign-on URL', async () => {
  const store = openStore(':memory:');
  const password = 'Website-secret-example-123';
  const passwordHash = await hashPassword(password);
  const own = store.createSignup({ orgName: 'SSO test', adminName: 'Owner', adminEmail: 'owner@example.test', passwordHash });
  const other = store.createSignup({ orgName: 'Other', adminName: 'Other', adminEmail: 'other@example.test', passwordHash });
  const job = prepareTest(store.db, { email: 'owner@example.test', productId: null, subdomain: 'sso-test' });
  store.db.prepare("UPDATE iotum_provisioning SET state = 'ready_test', company_id = 101, host_id = 201 WHERE id = ?").run(job.id);
  const credential = 'HOST_SECRET<&"';
  let override = {}, fetches = 0;
  const client = { async authenticate() {}, async post(endpoint, payload) {
    assert.equal(endpoint, '/host/fetch'); assert.deepEqual(payload, { host_id: 201 }); fetches++;
    return { host_id: 201, company_id: 101, role: 'HOST', email: 'owner@example.test', login_token_public_key: credential, meeting_url: 'https://sso-test.reallife-connect.live/conf/call/123', ...override };
  } };
  const server = createApp(store, { iotumClientFactory: ()=>client }).listen(0, '127.0.0.1');
  await new Promise(resolve=>server.once('listening',resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const post = (path, body, cookie, headers={}) => fetch(base+path, { method:'POST', headers: { 'Content-Type':'application/json', 'X-RLC-Request':'1', ...(cookie?{Cookie:cookie}:{}), ...headers }, body:JSON.stringify(body) });
  const get = (path,cookie) => fetch(base+path,{redirect:'manual',headers:cookie?{Cookie:cookie}:{}});
  async function login(email) { const res=await post('/api/login',{email,password}); assert.equal(res.status,200);return res.headers.get('set-cookie').split(';')[0]; }
  const issue = cookie => post(`/api/workspaces/${own.orgId}/meeting-access`,{},cookie);
  try {
    const ownerCookie=await login('owner@example.test'), otherCookie=await login('other@example.test');
    assert.equal((await issue()).status,401);
    assert.equal((await issue(otherCookie)).status,403);
    assert.equal((await post(`/api/workspaces/${own.orgId}/meeting-access`,{host_id:999},ownerCookie)).status,400);
    assert.equal((await post(`/api/workspaces/${own.orgId}/meeting-access`,{},ownerCookie,{'X-RLC-Request':''})).status,403);
    assert.equal((await post(`/api/workspaces/${other.orgId}/meeting-access`,{},otherCookie)).status,409);
    const launch=await (await issue(ownerCookie)).json();
    assert.match(launch.launchUrl,/^\/api\/meeting-access\/launch\?ticket=[a-f0-9]{64}$/);
    assert.doesNotMatch(JSON.stringify(launch),/HOST_SECRET|login_token|auth_token|host_id/);
    assert.notEqual(store.db.prepare('SELECT ticket_hash FROM meeting_handoffs').get().ticket_hash,launch.launchUrl.split('=')[1]);
    assert.equal((await get(launch.launchUrl,otherCookie)).status,410);
    const secondOwnerCookie=await login('owner@example.test');
    assert.equal((await get(launch.launchUrl,secondOwnerCookie)).status,410);
    const response=await get(launch.launchUrl,ownerCookie);
    assert.equal(response.status,303); assert.equal(response.headers.get('cache-control'),'no-store');
    assert.equal(response.headers.get('referrer-policy'),'no-referrer');
    const destination = new URL(response.headers.get('location'));
    assert.equal(destination.origin, 'https://sso-test.reallife-connect.live');
    assert.equal(destination.pathname, '/auth');
    assert.equal(destination.searchParams.get('host_id'), '201');
    assert.equal(destination.searchParams.get('login_token_public_key'), credential);
    assert.equal(destination.searchParams.get('redirect_url'), '/conf/meetings/upcoming');
    assert.deepEqual([...destination.searchParams.keys()].sort(), ['host_id','login_token_public_key','redirect_url']);
    assert.equal(destination.username, ''); assert.equal(destination.password, '');
    assert.equal(destination.hash, '');
    assert.equal(await response.text(), '');
    assert.doesNotMatch(destination.href, /example.test|RESELLER_SECRET/);
    assert.equal((await get(launch.launchUrl,ownerCookie)).status,410); assert.equal(fetches,1);
    const expired=await (await issue(ownerCookie)).json();
    store.db.prepare('UPDATE meeting_handoffs SET expires_at = 0').run();
    assert.equal((await get(expired.launchUrl,ownerCookie)).status,410);
    for (const bad of [{role:'COMPANY_ADMIN'},{company_id:999},{email:'someone-else@example.test'},{meeting_url:'https://attacker.example/conf/call/123'}]) {
      override=bad;
      const ticket=await (await issue(ownerCookie)).json();
      const refused=await get(ticket.launchUrl,ownerCookie);
      assert.equal(refused.status,502); assert.doesNotMatch(await refused.text(),/HOST_SECRET|login_token|Iotum/i);
    }
    override={};
    const revoked=await (await issue(ownerCookie)).json();
    await post('/api/logout',{},ownerCookie);
    assert.equal((await get(revoked.launchUrl,ownerCookie)).status,401);
  } finally { await new Promise(resolve=>server.close(resolve));store.close(); }
});
