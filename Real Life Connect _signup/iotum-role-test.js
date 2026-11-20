const { getTest } = require('./iotum-provision');
async function testHostRole(db, jobId, client, targetRole) {
  if (targetRole !== undefined && !['HOST', 'COMPANY_ADMIN'].includes(targetRole)) throw new Error('Role must be HOST or COMPANY_ADMIN.');
  const job = getTest(db, jobId);
  if (job.state !== 'ready_test' || !job.company_id || !job.host_id) throw new Error('Use a completed test provisioning job.');
  await client.authenticate();
  async function read() {
    const host = await client.post('/host/fetch', { host_id: job.host_id });
    if (host.host_id !== job.host_id || host.company_id !== job.company_id || typeof host.email !== 'string' || host.email.toLowerCase() !== job.draft.email.toLowerCase()) throw new Error('Test host identity does not match the saved company and email. No further changes will be made.');
    if (!['HOST', 'COMPANY_ADMIN'].includes(host.role)) throw new Error('Unexpected role. This command cannot modify reseller administrator accounts.');
    return host;
  }
  const before = await read();
  if (targetRole && before.role !== targetRole) {
    // Only the role is supplied; omitted subscription/login settings stay unchanged.
    try { await client.post('/host/update', { host_id: job.host_id, role: targetRole }); }
    catch (error) { throw new Error(`${error.message} Check the role with test-role JOB_ID before attempting another change.`); }
  }
  const after = targetRole && before.role !== targetRole ? await read() : before;
  if (targetRole && after.role !== targetRole) throw new Error('The requested role was not verified. Inspect the test host in the reseller portal.');
  return { companyId: job.company_id, hostId: job.host_id, email: job.draft.email, previousRole: before.role, verifiedRole: after.role };
}
module.exports = { testHostRole };
