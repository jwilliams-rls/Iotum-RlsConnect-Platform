const { openStore } = require('./db');
const { createIotumClient, DEFAULT_ORIGIN } = require('./iotum-client');
const { prepareTest, getTest, activateTest } = require('./iotum-provision');
process.umask(0o077);
function display(job) {
  console.log(JSON.stringify({ jobId: job.id, state: job.state, companyName: job.draft.companyName,
    email: job.draft.email, subdomain: job.draft.subdomain, plan: job.draft.planSlug,
    productId: job.draft.productId, referenceSupplierMonthlyCents: job.draft.supplierMonthlyCents,
    companyId: job.company_id, hostId: job.host_id, meetingUrl: job.meeting_url }, null, 2));
}
(async () => {
  const [command = 'check', ...args] = process.argv.slice(2);
  if (command === 'check') {
    const client = createIotumClient();
    await client.authenticate();
    const products = await client.post('/subscription/fetch_products');
    if (!Array.isArray(products)) throw new Error('Unexpected product list.');
    console.log('Iotum connection successful. No company, subscription, or host was created.');
    console.table(products.map(p => ({ Name: p.name, Code: p.slug, Type: p.plan ? 'Plan' : 'Add-on', ProductID: p.id ?? 'Not supplied by API' })));
    return;
  }
  if (command === 'hosts') {
    if (args.length !== 1 || !/^[1-9][0-9]*$/.test(args[0])) throw new Error('Usage: npm run iotum -- hosts COMPANY_ID');
    const { listCompanyHosts } = require('./iotum-host-list');
    const result = await listCompanyHosts(Number(args[0]), createIotumClient());
    console.log(JSON.stringify({ companyId: result.companyId, name: result.name, subdomain: result.subdomain }, null, 2));
    console.table(result.hosts);
    console.log('Read-only inspection complete. No accounts, subscriptions, roles or local website records were changed.');
    return;
  }
  const store = openStore();
  try {
    if (command === 'signups') {
      console.table(store.db.prepare('SELECT id, name, email, status FROM users ORDER BY created_at DESC').all());
    } else if (command === 'rooms' && args.length === 1) {
      if (!/^[1-9][0-9]*$/.test(args[0])) throw new Error('Usage: npm run iotum -- rooms COMPANY_ID');
      console.table(require('./iotum-link').listRoomLinks(store.db, Number(args[0])));
      console.log('Local Pro test calendars. Linking a host does not enable live booking.');
    } else if (command === 'link-host' && args.length === 4) {
      const [company, host, email, plan] = args;
      if (!/^[1-9][0-9]*$/.test(company) || !/^[1-9][0-9]*$/.test(host) || !['reallife_basic','reallife_plus'].includes(plan)) throw new Error('Usage: npm run iotum -- link-host COMPANY_ID HOST_ID EMAIL reallife_basic_OR_reallife_plus');
      const { inspectExistingHost, checkWebsiteLink, linkWebsiteHost } = require('./iotum-link');
      const verified = await inspectExistingHost(store.db, { companyId:Number(company), hostId:Number(host), email, plan }, createIotumClient());
      let result = checkWebsiteLink(store.db, verified);
      if (!result.alreadyLinked) {
        console.log('Verified existing Host and organization. Create its separate website password below.');
        const password = await require('./private-password').chooseWebsitePassword();
        const passwordHash = await require('./passwords').hashPassword(password);
        const fresh = await inspectExistingHost(store.db, { companyId:Number(company), hostId:Number(host), email, plan }, createIotumClient());
        result = linkWebsiteHost(store.db, fresh, passwordHash);
      }
      console.log(JSON.stringify({ ...result, companyId:verified.companyId, hostId:verified.hostId, plan:verified.plan }, null, 2));
      console.log(result.alreadyLinked ? 'Already linked; existing website password and permissions were preserved.' : 'Website member created and linked. Sign in with its email and the website password you just chose.');
      console.log('No provider account, subscription, role, password or email notification was changed. Room assignments are managed in Organization Admin.');
    } else if (command === 'link-room' && args.length === 4) {
      const [company, host, email, roomId] = args;
      if (!/^[1-9][0-9]*$/.test(company) || !/^[1-9][0-9]*$/.test(host)) throw new Error('Usage: npm run iotum -- link-room COMPANY_ID PRO_HOST_ID EMAIL ROOM_ID');
      const { inspectExistingHost, linkRoomHost } = require('./iotum-link');
      const verified = await inspectExistingHost(store.db, { companyId:Number(company), hostId:Number(host), email, plan:'reallife_pro' }, createIotumClient());
      console.log(JSON.stringify({ ...linkRoomHost(store.db, verified, roomId), roomId, hostId:verified.hostId }, null, 2));
      console.log('Existing Pro host linked to the local test calendar. No website login was created for this room. Live meetings and notifications remain disconnected.');
    } else if (command === 'prepare') {
      const [email, productId, subdomain, companyName] = args;
      if (!email || !productId || !subdomain) throw new Error('Usage: npm run iotum -- prepare EMAIL BASIC_PRODUCT_ID_OR_default UNIQUE_SUBDOMAIN ["Company Name"]');
      display(prepareTest(store.db, { email, productId: productId === 'default' ? null : Number(productId), subdomain, companyName }));
      console.log('Draft saved locally. No Iotum account was created. Review before activating.');
    } else if (command === 'status' && args[0]) {
      display(getTest(store.db, args[0]));
    } else if (command === 'test-role' && args[0]) {
      const { testHostRole } = require('./iotum-role-test');
      console.log(JSON.stringify(await testHostRole(store.db, args[0], createIotumClient(), args[1]), null, 2));
      console.log('Sign out of the test host portal and sign back in to check its menus. Website administrator permissions are separate.');
    } else if (command === 'activate' && args[0]) {
      display(await activateTest(store.db, args[0], createIotumClient()));
      console.log(`Test host is provisioned. Sign into the Iotum portal at ${DEFAULT_ORIGIN} using the host email; use its password-reset flow to establish the separate Iotum password.`);
      console.log('The meeting URL is an attendee link, not an authenticated host login. Use Open My Meetings after signing into the Real Life Connect website for host-specific access.');
    } else throw new Error('Commands: check | hosts COMPANY_ID | rooms COMPANY_ID | link-host COMPANY_ID HOST_ID EMAIL PLAN_CODE | link-room COMPANY_ID PRO_HOST_ID EMAIL ROOM_ID | signups | prepare EMAIL PRODUCT_ID SUBDOMAIN [COMPANY_NAME] | status JOB_ID | activate JOB_ID | test-role JOB_ID [HOST|COMPANY_ADMIN]');
  } finally { store.close(); }
})().catch(error => { console.error(error.message); process.exitCode = 1; });
