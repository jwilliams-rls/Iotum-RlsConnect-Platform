const { randomBytes, createHash } = require('node:crypto');
const { createIotumClient } = require('./iotum-client');
const digest = value => createHash('sha256').update(value).digest('hex');
function installMeetingAccess(app, store, { signedIn, workspace, protectedMutation }, clientFactory = createIotumClient) {
  const db = store.db;
  const unavailable = 'Meeting access is temporarily unavailable. Please return to your dashboard and try again.';
  const ownedJob = (jobId, userId, workspaceId) => db.prepare(`SELECT p.*, u.email FROM iotum_provisioning p JOIN users u ON u.id = p.user_id JOIN memberships m ON m.user_id = p.user_id AND m.organization_id = p.organization_id WHERE p.id = ? AND p.user_id = ? AND p.organization_id = ? AND p.state = 'ready_test' AND u.status != 'suspended'`).get(jobId, userId, workspaceId);
  app.post('/api/workspaces/:id/meeting-access', protectedMutation, signedIn, workspace, (req, res) => {
    if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body) || Object.keys(req.body).length) return res.status(400).send('Use the meeting action in your dashboard.');
    const now = Date.now();
    const job = db.prepare("SELECT id FROM iotum_provisioning WHERE user_id = ? AND organization_id = ? AND state = 'ready_test'").get(req.account.user_id, req.workspace.id);
    if (!job) return res.status(409).send('Your personal meeting account is awaiting activation.');
    db.prepare('DELETE FROM meeting_handoffs WHERE expires_at <= ?').run(now);
    if (db.prepare('SELECT count(*) n FROM meeting_handoffs WHERE user_id = ?').get(req.account.user_id).n >= 10) return res.status(429).send('Please wait a minute before opening meetings again.');
    const ticket = randomBytes(32).toString('hex');
    db.prepare('INSERT INTO meeting_handoffs (ticket_hash, user_id, organization_id, session_hash, provisioning_id, expires_at) VALUES (?, ?, ?, ?, ?, ?)').run(digest(ticket), req.account.user_id, req.workspace.id, req.account.token_hash, job.id, now + 60000);
    res.json({ launchUrl: '/api/meeting-access/launch?ticket=' + ticket });
  });
  app.get('/api/meeting-access/launch', signedIn, async (req, res) => {
    res.set({ 'Cache-Control': 'no-store', Pragma: 'no-cache', 'Referrer-Policy': 'no-referrer', 'X-Content-Type-Options': 'nosniff', 'Cross-Origin-Opener-Policy': 'same-origin' });
    if (req.get('Sec-Fetch-Site') === 'cross-site') return res.status(403).send('Open meetings from your Real Life Connect dashboard.');
    const ticket = req.query.ticket;
    if (typeof ticket !== 'string' || !/^[a-f0-9]{64}$/.test(ticket)) return res.status(400).send('Open meetings from your dashboard.');
    const now = Date.now();
    const handoff = db.prepare('UPDATE meeting_handoffs SET used_at = ? WHERE ticket_hash = ? AND user_id = ? AND session_hash = ? AND expires_at > ? AND used_at IS NULL RETURNING *').get(now, digest(ticket), req.account.user_id, req.account.token_hash, now);
    if (!handoff) return res.status(410).send('This meeting sign-in link expired or was already used. Open meetings again from your dashboard.');
    try {
      const job = ownedJob(handoff.provisioning_id, req.account.user_id, handoff.organization_id);
      if (!job?.host_id || !job.company_id) throw new Error('No linked host');
      const draft = JSON.parse(job.draft);
      if (!/^[a-z0-9](?:[a-z0-9-]{1,48}[a-z0-9])$/.test(draft.subdomain)) throw new Error('Invalid company domain');
      const origin = `https://${draft.subdomain}.reallife-connect.live`;
      const client = clientFactory();
      await client.authenticate();
      const host = await client.post('/host/fetch', { host_id: job.host_id });
      if (host.host_id !== job.host_id || host.company_id !== job.company_id || host.role !== 'HOST' || typeof host.email !== 'string' || host.email.toLowerCase() !== job.email.toLowerCase() || host.email.toLowerCase() !== draft.email.toLowerCase()) throw new Error('Host identity mismatch');
      if (typeof host.login_token_public_key !== 'string' || !host.login_token_public_key || host.login_token_public_key.length > 4096) throw new Error('Missing host sign-on credential');
      // Confirm the provider room belongs to the same company domain. Never accept a client redirect.
      const room = new URL(host.meeting_url);
      if (room.origin !== origin || room.username || room.password) throw new Error('Unexpected meeting domain');
      const validSession = db.prepare(`SELECT s.user_id FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token_hash = ? AND s.expires_at > ? AND s.last_seen > ? AND u.status != 'suspended'`).get(req.account.token_hash, Date.now(), Date.now() - 30 * 60 * 1000);
      const current = ownedJob(handoff.provisioning_id, req.account.user_id, handoff.organization_id);
      if (!validSession || validSession.user_id !== req.account.user_id || current?.host_id !== job.host_id || current.company_id !== job.company_id) throw new Error('Account access changed');
      const signIn = new URL('/auth', origin);
      signIn.searchParams.set('host_id', String(job.host_id));
      signIn.searchParams.set('login_token_public_key', host.login_token_public_key);
      signIn.searchParams.set('redirect_url', '/conf/meetings/upcoming');
      // The provider documents browser GET sign-on. Its host credential is briefly
      // in the provider URL; never log this URL or persist it in our database.
      res.set('Content-Security-Policy', "default-src 'none'; base-uri 'none'; frame-ancestors 'none'");
      // An empty response avoids echoing the sensitive Location into an HTML body.
      return res.status(303).set('Location', signIn.href).end();
    } catch {
      // Do not print provider responses or error strings: they may contain sign-on credentials.
      console.error('Meeting sign-on could not be completed.');
      return res.status(502).type('text').send(unavailable);
    }
  });
}
module.exports = { installMeetingAccess };
