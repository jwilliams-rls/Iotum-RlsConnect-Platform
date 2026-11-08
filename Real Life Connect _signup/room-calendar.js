const { randomUUID } = require('node:crypto');
function installRoomCalendar(app, store, { signedIn, workspace, protectedMutation }) {
  const db = store.db;
  const base = '/api/workspaces/:id/room-calendars';
  function admin(req, res, next) {
    if (req.workspace.kind !== 'organization' || req.workspace.role !== 'admin') return res.status(403).send('Organization administrator access is required.');
    next();
  }
  function permissions(roomId, userId) {
    const row = db.prepare('SELECT live_streaming, youtube_streaming FROM room_user_permissions WHERE room_id = ? AND user_id = ?').get(roomId, userId);
    return { liveStreaming: Boolean(row?.live_streaming), youtubeStreaming: Boolean(row?.youtube_streaming) };
  }
  function eligible(userId) {
    const user = db.prepare('SELECT status FROM users WHERE id = ?').get(userId);
    const job = db.prepare("SELECT draft FROM iotum_provisioning WHERE user_id = ? AND state = 'ready_test'").get(userId);
    if (!user || user.status === 'suspended' || !job) return false;
    return ['reallife_basic', 'reallife_plus'].includes(JSON.parse(job.draft).planSlug);
  }
  function roomAccess(req, res, next) {
    const room = db.prepare(`SELECT r.*, s.max_minutes, s.mode FROM rooms r JOIN room_calendar_settings s ON s.room_id = r.id WHERE r.id = ? AND r.organization_id = ? AND r.plan = 'pro' AND r.status != 'suspended'`).get(req.params.roomId, req.workspace.id);
    const isAdmin = req.workspace.kind === 'organization' && req.workspace.role === 'admin';
    if (!room || (!isAdmin && (!eligible(req.account.user_id) || !db.prepare('SELECT 1 FROM room_assignments WHERE room_id = ? AND user_id = ?').get(room.id, req.account.user_id)))) return res.status(404).send('Room calendar is not available to this account.');
    req.room = room; req.roomAdmin = isAdmin; next();
  }
  const read = [signedIn, workspace], write = [protectedMutation, signedIn, workspace];
  app.get('/api/workspaces/:id/room-meetings', ...read, (req, res) => {
    res.set('Cache-Control', 'no-store');
    if (!eligible(req.account.user_id)) return res.json({ meetings: [], mode: 'local_test' });
    const now = Date.now();
    const meetings = db.prepare(`SELECT b.id, b.title, b.room_id, r.name room_name, b.starts_at, b.ends_at
      FROM room_reservations b
      JOIN rooms r ON r.id = b.room_id
      JOIN room_assignments a ON a.room_id = r.id AND a.user_id = b.user_id
      WHERE r.organization_id = ? AND b.user_id = ? AND r.plan = 'pro' AND r.status != 'suspended'
        AND b.cancelled_at IS NULL AND b.ends_at > ?
      ORDER BY b.starts_at, b.id LIMIT 100`).all(req.workspace.id, req.account.user_id, now).map(b => ({
        id: b.id, title: b.title, roomId: b.room_id, roomName: b.room_name,
        startsAt: new Date(b.starts_at).toISOString(), endsAt: new Date(b.ends_at).toISOString(),
        status: b.starts_at <= now ? 'in_progress_reservation' : 'upcoming',
        permissions: permissions(b.room_id, req.account.user_id), canCancel: true
      }));
    res.json({ meetings, mode: 'local_test' });
  });
  app.get(base, ...read, (req, res) => {
    const isAdmin = req.workspace.kind === 'organization' && req.workspace.role === 'admin';
    const rooms = db.prepare(`SELECT r.id, r.name, r.status, s.max_minutes, s.mode FROM rooms r JOIN room_calendar_settings s ON s.room_id = r.id WHERE r.organization_id = ? AND r.plan = 'pro' AND r.status != 'suspended' ORDER BY r.name`).all(req.workspace.id)
      .filter(r => isAdmin || eligible(req.account.user_id) && db.prepare('SELECT 1 FROM room_assignments WHERE room_id = ? AND user_id = ?').get(r.id, req.account.user_id))
      .map(r => ({ ...r, assignedUserIds: isAdmin ? db.prepare('SELECT user_id FROM room_assignments WHERE room_id = ?').all(r.id).map(a => a.user_id) : undefined,
        assignedUserPermissions: isAdmin ? db.prepare('SELECT user_id FROM room_assignments WHERE room_id = ?').all(r.id).map(a => ({ userId: a.user_id, ...permissions(r.id, a.user_id) })) : undefined,
        permissions: permissions(r.id, req.account.user_id),
        canReserve: eligible(req.account.user_id) && Boolean(db.prepare('SELECT 1 FROM room_assignments WHERE room_id = ? AND user_id = ?').get(r.id, req.account.user_id)) }));
    const members = isAdmin ? db.prepare(`SELECT u.id, u.name, u.email FROM memberships m JOIN users u ON u.id = m.user_id WHERE m.organization_id = ? ORDER BY u.name`).all(req.workspace.id).map(u => ({ ...u, eligible: eligible(u.id) })) : undefined;
    res.json({ rooms, members, maxAssignedUsers: 10, mode: 'local_test' });
  });
  app.post(base, ...write, admin, (req, res) => {
    const { name } = req.body || {};
    if (typeof name !== 'string' || !name.trim() || name.trim().length > 80 || Object.keys(req.body).some(k => k !== 'name')) return res.status(400).send('Enter a room name of 1–80 characters.');
    if (db.prepare('SELECT count(*) n FROM rooms WHERE organization_id = ?').get(req.workspace.id).n >= 100) return res.status(409).send('This organization has reached the calendar limit.');
    const id = randomUUID(); db.exec('BEGIN IMMEDIATE');
    try {
      db.prepare("INSERT INTO rooms VALUES (?, ?, ?, 'pro', 'pending')").run(id, req.workspace.id, name.trim());
      db.prepare('INSERT INTO room_calendar_settings(room_id) VALUES (?)').run(id); db.exec('COMMIT');
      res.status(201).json({ id });
    } catch (e) { db.exec('ROLLBACK'); throw e; }
  });
  app.put(base + '/:roomId', ...write, admin, roomAccess, (req, res) => {
    const { name, maxMinutes, assignedUserIds, assignedUserPermissions } = req.body || {};
    if (typeof name !== 'string' || !name.trim() || name.trim().length > 80 || !Number.isInteger(maxMinutes) || maxMinutes < 15 || maxMinutes > 480 || !Array.isArray(assignedUserIds) || assignedUserIds.length > 10 || new Set(assignedUserIds).size !== assignedUserIds.length || assignedUserIds.some(id => typeof id !== 'string') || Object.keys(req.body).some(k => !['name','maxMinutes','assignedUserIds','assignedUserPermissions'].includes(k))) return res.status(400).send('Enter a room name, a maximum of 15–480 minutes, and up to 10 distinct users.');
    if (assignedUserPermissions !== undefined && (!Array.isArray(assignedUserPermissions) || assignedUserPermissions.length !== assignedUserIds.length || new Set(assignedUserPermissions.map(p => p?.userId)).size !== assignedUserIds.length || assignedUserPermissions.some(p => !p || typeof p !== 'object' || Array.isArray(p) || !assignedUserIds.includes(p.userId) || typeof p.liveStreaming !== 'boolean' || typeof p.youtubeStreaming !== 'boolean' || Object.keys(p).some(k => !['userId','liveStreaming','youtubeStreaming'].includes(k))))) return res.status(400).send('Provide one streaming permission setting for each assigned user, using checkbox values only.');
    db.exec('BEGIN IMMEDIATE');
    try {
      const nextPermissions = assignedUserPermissions || assignedUserIds.map(userId => ({ userId, ...permissions(req.room.id, userId) }));
      for (const id of assignedUserIds) if (!eligible(id) || !db.prepare('SELECT 1 FROM memberships WHERE user_id = ? AND organization_id = ?').get(id, req.workspace.id)) { db.exec('ROLLBACK'); return res.status(400).send('Only organization members with a linked Basic or Plus account can be assigned.'); }
      const future = db.prepare('SELECT user_id FROM room_reservations WHERE room_id = ? AND cancelled_at IS NULL AND ends_at > ?').all(req.room.id, Date.now());
      if (future.some(r => !assignedUserIds.includes(r.user_id))) { db.exec('ROLLBACK'); return res.status(409).send('Cancel the user’s upcoming reservations before removing their room access.'); }
      db.prepare('UPDATE rooms SET name = ? WHERE id = ?').run(name.trim(), req.room.id);
      db.prepare('UPDATE room_calendar_settings SET max_minutes = ? WHERE room_id = ?').run(maxMinutes, req.room.id);
      db.prepare('DELETE FROM room_assignments WHERE room_id = ?').run(req.room.id);
      const add = db.prepare('INSERT INTO room_assignments VALUES (?, ?)'); for (const id of assignedUserIds) add.run(req.room.id, id);
      const savePermissions = db.prepare('INSERT INTO room_user_permissions VALUES (?, ?, ?, ?)');
      for (const p of nextPermissions) savePermissions.run(req.room.id, p.userId, Number(p.liveStreaming), Number(p.youtubeStreaming));
      db.exec('COMMIT'); res.json({ saved: true });
    } catch (e) { db.exec('ROLLBACK'); throw e; }
  });
  app.get(base + '/:roomId/reservations', ...read, roomAccess, (req, res) => {
    const from = Date.parse(req.query.from), to = Date.parse(req.query.to);
    if (!Number.isFinite(from) || !Number.isFinite(to) || to <= from || to - from > 31 * 86400000) return res.status(400).send('Choose a calendar range of up to 31 days.');
    const reservations = db.prepare(`SELECT id, user_id, title, starts_at, ends_at FROM room_reservations WHERE room_id = ? AND cancelled_at IS NULL AND starts_at < ? AND ends_at > ? ORDER BY starts_at`).all(req.room.id, to, from).map(r => {
      const mine = r.user_id === req.account.user_id;
      return { id: r.id, title: mine || req.roomAdmin ? r.title : 'Reserved', startsAt: new Date(r.starts_at).toISOString(), endsAt: new Date(r.ends_at).toISOString(), mine, canCancel: (mine || req.roomAdmin) && r.ends_at > Date.now() };
    });
    res.json({ reservations });
  });
  app.post(base + '/:roomId/reservations', ...write, roomAccess, (req, res) => {
    if (!eligible(req.account.user_id) || !db.prepare('SELECT 1 FROM room_assignments WHERE room_id = ? AND user_id = ?').get(req.room.id, req.account.user_id)) return res.status(403).send('You must be assigned to this room with a linked Basic or Plus account to reserve it.');
    const { title, startsAt, durationMinutes } = req.body || {};
    const start = typeof startsAt === 'string' && /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(startsAt) ? Date.parse(startsAt) : NaN;
    if (typeof title !== 'string' || !title.trim() || title.trim().length > 120 || !Number.isFinite(start) || new Date(start).toISOString() !== startsAt || start <= Date.now() || start > Date.now() + 365 * 86400000 || !Number.isInteger(durationMinutes) || durationMinutes < 15 || durationMinutes > req.room.max_minutes || Object.keys(req.body).some(k => !['title','startsAt','durationMinutes'].includes(k))) return res.status(400).send('Enter a title and a future time within one year. Duration must be at least 15 minutes and within the room limit.');
    if (db.prepare('SELECT count(*) n FROM room_reservations WHERE user_id = ? AND cancelled_at IS NULL AND ends_at > ?').get(req.account.user_id, Date.now()).n >= 100) return res.status(429).send('You have reached the limit of 100 upcoming reservations.');
    const id = randomUUID();
    try {
      db.prepare('INSERT INTO room_reservations VALUES (?, ?, ?, ?, ?, ?, ?, NULL)').run(id, req.room.id, req.account.user_id, title.trim(), start, start + durationMinutes * 60000, new Date().toISOString());
      res.status(201).json({ id, mode: 'local_test', message: 'Test reservation saved. No live meeting or invitation was created.' });
    } catch (e) {
      if (e.message.includes('Room time is already reserved')) return res.status(409).send('That time overlaps an existing reservation. Choose another time.');
      throw e;
    }
  });
  app.delete(base + '/:roomId/reservations/:reservationId', ...write, roomAccess, (req, res) => {
    const row = db.prepare('SELECT * FROM room_reservations WHERE id = ? AND room_id = ? AND cancelled_at IS NULL').get(req.params.reservationId, req.room.id);
    if (!row || !req.roomAdmin && row.user_id !== req.account.user_id) return res.status(404).send('Reservation is not available.');
    if (row.ends_at <= Date.now()) return res.status(409).send('Past reservations cannot be cancelled.');
    db.prepare('UPDATE room_reservations SET cancelled_at = ? WHERE id = ?').run(new Date().toISOString(), row.id);
    res.json({ cancelled: true });
  });
}
module.exports = { installRoomCalendar };
