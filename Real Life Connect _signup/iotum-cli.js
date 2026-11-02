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
  const store = openStore();
  try {
    if (command === 'signups') {
      console.table(store.db.prepare('SELECT id, name, email, status FROM users ORDER BY created_at DESC').all());
    } else if (command === 'prepare') {
      const [email, productId, subdomain, companyName] = args;
      if (!email || !productId || !subdomain) throw new Error('Usage: npm run iotum -- prepare EMAIL BASIC_PRODUCT_ID_OR_default UNIQUE_SUBDOMAIN ["Company Name"]');
      display(prepareTest(store.db, { email, productId: productId === 'default' ? null : Number(productId), subdomain, companyName }));
      console.log('Draft saved locally. No Iotum account was created. Review before activating.');
    } else if (command === 'status' && args[0]) {
      display(getTest(store.db, args[0]));
    } else if (command === 'activate' && args[0]) {
      display(await activateTest(store.db, args[0], createIotumClient()));
      console.log(`Test host is provisioned. Sign into the Iotum portal at ${DEFAULT_ORIGIN} using the host email; use its password-reset flow to establish the separate Iotum password.`);
      console.log('The meeting URL is an attendee link, not an authenticated host login. Our website SSO is not connected yet.');
    } else throw new Error('Commands: check | signups | prepare EMAIL PRODUCT_ID SUBDOMAIN [COMPANY_NAME] | status JOB_ID | activate JOB_ID');
  } finally { store.close(); }
})().catch(error => { console.error(error.message); process.exitCode = 1; });
