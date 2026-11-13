// Operator-only inspection. Never return raw provider responses or sign-on credentials.
async function listCompanyHosts(companyId, client) {
  if (!Number.isSafeInteger(companyId) || companyId < 1) throw new Error('Enter a positive numeric company ID.');
  await client.authenticate();
  const company = await client.post('/company/fetch', { company_id: companyId });
  if (!company || typeof company.name !== 'string' || typeof company.subdomain !== 'string' || !Array.isArray(company.hosts) || company.hosts.some(id => !Number.isSafeInteger(id) || id < 1)) throw new Error('Unexpected company details. No accounts were changed.');
  const hosts = await client.post('/host/fetch_all', { company_id: companyId });
  if (!Array.isArray(hosts) || hosts.some(h => !h || !Number.isSafeInteger(h.host_id) || !company.hosts.includes(h.host_id) || ['name','email','role','plan_slug'].some(k => typeof h[k] !== 'string')) || new Set(hosts.map(h => h.host_id)).size !== hosts.length) throw new Error('Host list did not match the selected company. No accounts were changed.');
  const text = value => value.replace(/[\u0000-\u001f\u007f-\u009f]/g, '').slice(0, 254);
  return { companyId, name: text(company.name), subdomain: text(company.subdomain), hosts: hosts.map(h => ({ HostID: h.host_id, Name: text(h.name), Email: text(h.email), Role: text(h.role), Plan: text(h.plan_slug) })) };
}
module.exports = { listCompanyHosts };
