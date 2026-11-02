const { randomUUID } = require('node:crypto');
const { readCatalog } = require('./catalog');
const { DEFAULT_ORIGIN } = require('./iotum-client');
const id = value => Number.isSafeInteger(value) && value > 0;
function prepareTest(db, { email, productId, subdomain }) {
  if (!id(productId) || typeof subdomain !== 'string' || !/^[a-z0-9](?:[a-z0-9-]{1,48}[a-z0-9])$/.test(subdomain)) throw new Error('Supply a positive numeric product ID and a valid 3–50 character subdomain.');
  const user = db.prepare(`SELECT u.id, u.name, u.email, u.organization_id, o.name org_name FROM users u JOIN organizations o ON o.id = u.organization_id WHERE u.email = ?`).get(email);
  if (!user) throw new Error('No local signup matches that email. Submit a development signup first using an email you control.');
  const plan = readCatalog(db).catalog.plans.find(p => p.id === 'basic');
  if (!plan) throw new Error('Basic plan is missing.');
  const draft = { userId: user.id, organizationId: user.organization_id, companyName: user.org_name,
    name: user.name, email: user.email, subdomain, productId, planSlug: plan.code,
    supplierMonthlyCents: plan.supplierMonthlyCents, catalogRevision: readCatalog(db).revision,
    origin: DEFAULT_ORIGIN, purpose: 'operator test within existing minimum commitment; no customer payment collected' };
  const jobId = randomUUID();
  db.prepare(`INSERT INTO iotum_provisioning (id, user_id, organization_id, state, draft, updated_at) VALUES (?, ?, ?, 'prepared', ?, ?)`).run(jobId, user.id, user.organization_id, JSON.stringify(draft), new Date().toISOString());
  return getTest(db, jobId);
}
function getTest(db, jobId) {
  const job = db.prepare('SELECT * FROM iotum_provisioning WHERE id = ?').get(jobId);
  if (!job) throw new Error('Unknown provisioning job.');
  return { ...job, draft: JSON.parse(job.draft) };
}
function safeProviderUrl(value) {
  if (typeof value !== 'string') throw new Error('Missing Iotum link.');
  const url = new URL(value);
  if (url.protocol !== 'https:' || url.username || url.password || (url.port && url.port !== '443') || !(url.hostname === 'reallife-connect.live' || url.hostname.endsWith('.reallife-connect.live'))) throw new Error('Unexpected Iotum link domain.');
  return url.href;
}
async function activateTest(db, jobId, client) {
  let job = getTest(db, jobId);
  if (job.state === 'ready_test') return job;
  if (!['prepared', 'company_created'].includes(job.state)) throw new Error('Provisioning requires manual review. Do not retry creation; inspect the Iotum reseller panel.');
  const d = job.draft;
  const current = readCatalog(db).catalog.plans.find(p => p.id === 'basic');
  if (current.code !== d.planSlug || current.supplierMonthlyCents !== d.supplierMonthlyCents) throw new Error('Basic plan or supplier cost changed. Review a new draft before activation.');
  const user = db.prepare('SELECT name, email, organization_id FROM users WHERE id = ?').get(job.user_id);
  if (!user || user.name !== d.name || user.email !== d.email || user.organization_id !== d.organizationId) throw new Error('Signup changed after preparation. Stop and review the draft.');
  await client.authenticate();
  const products = await client.post('/subscription/fetch_products');
  if (!Array.isArray(products) || !products.some(p => p.slug === d.planSlug && p.plan === true)) throw new Error('The chosen plan slug is not offered by this reseller.');
  // Product IDs are not documented in every fetch_products response. Require operator verification;
  // when an ID is returned, also verify the pairing before any write.
  const product = products.find(p => p.slug === d.planSlug);
  if (product.id !== undefined && Number(product.id) !== d.productId) throw new Error('Product ID does not match the reviewed plan.');
  function state(value) { db.prepare('UPDATE iotum_provisioning SET state = ?, updated_at = ? WHERE id = ?').run(value, new Date().toISOString(), jobId); }
  if (job.state === 'prepared') {
    // Commit before the remote write. A timeout/crash cannot cause a second create on retry.
    const claimed = db.prepare("UPDATE iotum_provisioning SET state = 'company_creating', updated_at = ? WHERE id = ? AND state = 'prepared'").run(new Date().toISOString(), jobId);
    if (claimed.changes !== 1) throw new Error('Another process claimed this job.');
    try {
      const company = await client.post('/company/create', { name: d.companyName, subdomain: d.subdomain, customer_id: d.organizationId, product_id: d.productId });
      if (!id(company.id)) throw new Error('Company creation returned no valid ID.');
      db.prepare("UPDATE iotum_provisioning SET company_id = ?, state = 'company_created', updated_at = ? WHERE id = ?").run(company.id, new Date().toISOString(), jobId);
    } catch (error) { state('review_required'); throw error; }
  }
  job = getTest(db, jobId);
  // A company/create may already create a paid default subscription. Never blindly add another.
  const subscriptions = await client.post('/subscription/fetch', { company_id: job.company_id });
  if (!Array.isArray(subscriptions)) throw new Error('Invalid subscription list; inspect the created company before continuing.');
  const active = subscriptions.filter(s => s.status === 'Active');
  if (active.length !== 1 || active[0].product?.slug !== d.planSlug || !id(active[0].id)) throw new Error('The company subscription does not match one Basic plan. Inspect billing before continuing.');
  const claimed = db.prepare("UPDATE iotum_provisioning SET state = 'host_creating', updated_at = ? WHERE id = ? AND state = 'company_created'").run(new Date().toISOString(), jobId);
  if (claimed.changes !== 1) throw new Error('Another process claimed this job.');
  try {
    const host = await client.post('/host/create', { company_id: job.company_id, name: d.name, email: d.email,
      role: 'COMPANY_ADMIN', subscription_ids: [active[0].id], no_welcome_email: true,
      auto_record: 'none', auto_stream: 'none', native_streaming: false,
      disable_emails: { conference_invitations: false, conference_reminders: false, conference_summaries: false, transcription_summaries: false } });
    if (!id(host.host_id)) throw new Error('Host creation returned no valid ID.');
    // Save the ID before validating remaining response fields, so partial responses can be reconciled.
    db.prepare('UPDATE iotum_provisioning SET host_id = ? WHERE id = ?').run(host.host_id, jobId);
    if (host.company_id !== job.company_id || host.plan_slug !== d.planSlug) throw new Error('Host assignment does not match the reviewed company and plan.');
    const meetingUrl = safeProviderUrl(host.meeting_url);
    db.prepare("UPDATE iotum_provisioning SET meeting_url = ?, state = 'ready_test', updated_at = ? WHERE id = ?").run(meetingUrl, new Date().toISOString(), jobId);
    // Never mark a customer paid/active: this is a separately approved operator test.
  } catch (error) { state('review_required'); throw error; }
  return getTest(db, jobId);
}
module.exports = { prepareTest, getTest, activateTest };
