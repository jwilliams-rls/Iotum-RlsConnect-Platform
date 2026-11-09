const { randomBytes, createHash, randomUUID } = require('node:crypto');
const { hashPassword, verifyPassword } = require('./passwords');
const { getTest } = require('./iotum-provision');
const hash = value => createHash('sha256').update(value).digest('hex');
const COOKIE = 'rlc_session';
const idle = 30 * 60 * 1000, lifetime = 8 * 60 * 60 * 1000;
function installAccountRoutes(app, store, options = {}) {
  const db = store.db;
  let verifying = 0, dummy;
  const secure = process.env.NODE_ENV === 'production' || process.env.CODESPACES === 'true';
  const cookie = (token, age) => `${COOKIE}=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${age}${secure ? '; Secure' : ''}`;
  function protectedMutation(req, res, next) {
    if (req.get('X-RLC-Request') !== '1' || req.get('Sec-Fetch-Site') === 'cross-site' || !req.is('application/json')) return res.status(403).send('Open this action from the Real Life Connect website.');
    next();
  }
  function signedIn(req, res, next) {
    res.set('Cache-Control', 'no-store');
    const token = (req.headers.cookie || '').split(';').map(v => v.trim()).find(v => v.startsWith(COOKIE + '='))?.slice(COOKIE.length + 1);
    if (!token || !/^[a-f0-9]{64}$/.test(token)) return res.status(401).send('Please sign in.');
    const now = Date.now();
    const session = db.prepare(`SELECT s.*, u.name, u.email, u.status FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token_hash = ? AND s.expires_at > ? AND s.last_seen > ?`).get(hash(token), now, now - idle);
    if (!session || session.status === 'suspended') return res.status(401).send('Please sign in again.');
    db.prepare('UPDATE sessions SET last_seen = ? WHERE token_hash = ?').run(now, session.token_hash);
    req.account = session; next();
  }
  app.post('/api/login', protectedMutation, async (req, res, next) => {
    res.set('Cache-Control', 'no-store');
    const { email, password } = req.body || {};
    if (typeof email !== 'string' || email.length > 254 || typeof password !== 'string' || !password || password.length > 256) return res.status(400).send('Enter your email and password.');
    const key = hash(email.trim().toLowerCase()), now = Date.now(), windowStart = now - 15 * 60 * 1000;
    db.prepare('DELETE FROM login_attempts WHERE attempted_at < ?').run(windowStart);
    const attempts = db.prepare('SELECT count(*) n FROM login_attempts WHERE email_hash = ?').get(key).n;
    const total = db.prepare('SELECT count(*) n FROM login_attempts').get().n;
    if (attempts >= 20 || total >= 1000 || verifying >= 2) { res.set('Retry-After', '900'); return res.status(429).send('Too many sign-in attempts. Please try again later.'); }
    db.prepare('INSERT INTO login_attempts (email_hash, attempted_at) VALUES (?, ?)').run(key, now);
    verifying++;
    try {
      const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.trim().toLowerCase());
      dummy ||= hashPassword(randomBytes(32).toString('hex'));
      const valid = await verifyPassword(password, user?.password_hash || await dummy);
      if (!user || !valid || user.status === 'suspended') return res.status(401).send('Email or password is incorrect.');
      db.prepare('DELETE FROM sessions WHERE expires_at <= ? OR last_seen <= ?').run(now, now - idle);
      const oldToken = (req.headers.cookie || '').split(';').map(v => v.trim()).find(v => v.startsWith(COOKIE + '='))?.slice(COOKIE.length + 1);
      if (oldToken) db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(hash(oldToken));
      const token = randomBytes(32).toString('hex');
      db.prepare('INSERT INTO sessions VALUES (?, ?, ?, ?, ?)').run(hash(token), user.id, now, now, now + lifetime);
      res.set('Set-Cookie', cookie(token, lifetime / 1000));
      return res.json({ signedIn: true });
    } catch (error) { next(error); } finally { verifying--; }
  });
  app.get('/api/session', signedIn, (req, res) => {
    res.json({ user: { id: req.account.user_id, name: req.account.name, email: req.account.email } });
  });
  app.post('/api/logout', protectedMutation, signedIn, (req, res) => {
    db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(req.account.token_hash);
    res.set('Set-Cookie', cookie('', 0)); res.json({ signedIn: false });
  });
  function memberships(userId) {
    return db.prepare(`SELECT o.id, o.name, o.kind, m.role FROM memberships m JOIN organizations o ON o.id = m.organization_id WHERE m.user_id = ? ORDER BY o.created_at, o.id`).all(userId);
  }
  function workspace(req, res, next) {
    const all = memberships(req.account.user_id);
    const chosen = req.params.id || req.query.workspace || all[0]?.id;
    const member = all.find(w => w.id === chosen);
    if (!member) return res.status(403).send('You do not have access to this workspace.');
    req.workspace = member; req.workspaces = all; next();
  }
  require('./room-calendar').installRoomCalendar(app, store, { signedIn, workspace, protectedMutation });
  require('./meeting-access').installMeetingAccess(app, store, { signedIn, workspace, protectedMutation }, options.iotumClientFactory);
  app.get('/api/dashboard', signedIn, workspace, (req, res) => {
    const a = req.account, w = req.workspace;
    const provision = db.prepare(`SELECT id FROM iotum_provisioning WHERE user_id = ? AND organization_id = ? AND state = 'ready_test'`).get(a.user_id, w.id);
    const job = provision ? getTest(db, provision.id) : null;
    let meetingUrl = null;
    if (job?.meeting_url) {
      try { const u = new URL(job.meeting_url); if (u.protocol === 'https:' && u.hostname.endsWith('.reallife-connect.live') && !u.username && !u.password) meetingUrl = u.href; } catch {}
    }
    const rooms = db.prepare(`SELECT r.id, r.name, r.plan, r.status FROM rooms r JOIN room_assignments a ON a.room_id = r.id WHERE r.organization_id = ? AND a.user_id = ? ORDER BY r.name`).all(w.id, a.user_id);
    res.json({ user: { id: a.user_id, name: a.name, email: a.email, status: a.status },
      workspaces: req.workspaces, workspace: w, rooms,
      personalMeeting: { provisioned: Boolean(job), meetingUrl, plan: job?.draft.planSlug || null, isTest: Boolean(job), loginUrl: 'https://real-life.reallife-connect.live/login' } });
  });
  // Departments belong to a specific organization, not to meeting rooms or subscriptions.
  app.get('/api/workspaces/:id/departments', signedIn, workspace, (req,res) => {
    if (req.workspace.kind !== 'organization' || req.workspace.role !== 'admin') return res.status(403).send('Organization administrator access is required.');
    const departments=db.prepare('SELECT id,name FROM departments WHERE organization_id=? ORDER BY name COLLATE NOCASE').all(req.workspace.id);
    res.json({ departments });
  });
  app.post('/api/workspaces/:id/departments', protectedMutation, signedIn, workspace, (req,res) => {
    if (req.workspace.kind !== 'organization' || req.workspace.role !== 'admin') return res.status(403).send('Organization administrator access is required.');
    const name=typeof req.body?.name==='string'?req.body.name.trim():'';
    if (!name || name.length>80) return res.status(400).send('Department name must be 1–80 characters.');
    const id=randomUUID();
    try {db.prepare('INSERT INTO departments (id,organization_id,name,created_at) VALUES (?,?,?,?)').run(id,req.workspace.id,name,new Date().toISOString());}
    catch(e) {if(e.code==='ERR_SQLITE_ERROR' && /UNIQUE constraint failed/.test(e.message))return res.status(409).send('This department already exists.');throw e;}
    res.status(201).json({id,name});
  });
  app.put('/api/workspaces/:id/departments/:departmentId', protectedMutation, signedIn, workspace, (req,res) => {
    if (req.workspace.kind !== 'organization' || req.workspace.role !== 'admin') return res.status(403).send('Organization administrator access is required.');
    const name=typeof req.body?.name==='string'?req.body.name.trim():'';
    if (!name || name.length>80) return res.status(400).send('Department name must be 1–80 characters.');
    try {
      const result=db.prepare('UPDATE departments SET name=? WHERE id=? AND organization_id=?').run(name,req.params.departmentId,req.workspace.id);
      if(!result.changes)return res.status(404).send('Department not found.');
    } catch(e) {if(e.code==='ERR_SQLITE_ERROR' && /UNIQUE constraint failed/.test(e.message))return res.status(409).send('This department already exists.');throw e;}
    res.json({id:req.params.departmentId,name});
  });
  app.get('/api/workspaces/:id/admin', signedIn, workspace, (req, res) => {
    if (req.workspace.role !== 'admin') return res.status(403).send('Organization administrator access is required.');
    const members = db.prepare(`SELECT u.id, u.name, u.email, u.status, m.role, m.department_id AS departmentId, d.name AS departmentName FROM memberships m JOIN users u ON u.id = m.user_id LEFT JOIN departments d ON d.id=m.department_id AND d.organization_id=m.organization_id WHERE m.organization_id = ? ORDER BY u.name`).all(req.workspace.id);
    const rooms = db.prepare('SELECT id, name, plan, status FROM rooms WHERE organization_id = ? ORDER BY name').all(req.workspace.id);
    res.json({ workspace: req.workspace, members, rooms, purchasingEnabled: false });
  });
}
module.exports = { installAccountRoutes };
