const { randomUUID } = require('node:crypto');
const { readCatalog } = require('./catalog');
function linkedOrganization(db, companyId) {
  if (!Number.isSafeInteger(companyId) || companyId < 1) throw new Error('A positive numeric company ID is required.');
  const rows = db.prepare(`SELECT DISTINCT o.id, o.name, o.kind FROM organizations o JOIN iotum_provisioning p ON p.organization_id = o.id WHERE p.company_id = ? AND p.state = 'ready_test'`).all(companyId);
  if (rows.length !== 1 || rows[0].kind !== 'organization') throw new Error('Company must already map to exactly one local organization.');
  return rows[0];
}
async function inspectExistingHost(db, {companyId, hostId, email, plan}, client) {
  const org = linkedOrganization(db, companyId);
  if (!Number.isSafeInteger(hostId) || hostId < 1 || typeof email !== 'string' || !email.trim() || email.length > 254 || !['reallife_basic','reallife_plus','reallife_pro'].includes(plan)) throw new Error('Supply the company ID, host ID, expected email and exact plan code.');
  await client.authenticate();
  const company = await client.post('/company/fetch', {company_id:companyId});
  const host = await client.post('/host/fetch', {host_id:hostId});
  if (!Array.isArray(company.hosts) || !company.hosts.includes(hostId) || typeof company.subdomain !== 'string' || !/^[a-z0-9](?:[a-z0-9-]{1,48}[a-z0-9])$/.test(company.subdomain)) throw new Error('Host does not match the selected company.');
  if (host.host_id !== hostId || host.company_id !== companyId || host.role !== 'HOST' || host.plan_slug !== plan || typeof host.email !== 'string' || host.email.toLowerCase() !== email.trim().toLowerCase() || typeof host.name !== 'string' || !host.name.trim() || host.name.length > 200) throw new Error('Host identity, role or plan does not match. No records were linked.');
  const url = new URL(host.meeting_url);
  if (url.origin !== `https://${company.subdomain}.reallife-connect.live` || url.username || url.password || url.search || url.hash || !/^\/conf\/call\/[A-Za-z0-9_-]+$/.test(url.pathname)) throw new Error('Unexpected meeting-room URL.');
  // Explicit allowlist: do not carry the host's SSO token, PINs or password links onward.
  return {organizationId:org.id,companyId,hostId,email:host.email.toLowerCase(),name:host.name.trim(),plan,subdomain:company.subdomain,meetingUrl:url.href};
}
function checkWebsiteLink(db, verified) {
  const org=linkedOrganization(db,verified.companyId);
  if(org.id!==verified.organizationId)throw new Error('Local organization mapping changed.');
  if(!['reallife_basic','reallife_plus'].includes(verified.plan))throw new Error('Website member linking is limited to Basic and Plus. Link Pro to a room calendar.');
  if(db.prepare('SELECT 1 FROM room_provider_links WHERE host_id = ?').get(verified.hostId))throw new Error('This host is already linked as a shared room.');
  const existing=db.prepare('SELECT * FROM users WHERE email = ?').get(verified.email);
  const mapping=db.prepare('SELECT * FROM iotum_provisioning WHERE host_id = ?').get(verified.hostId);
  if(existing || mapping) {
    if(existing && existing.status!=='suspended' && mapping?.user_id===existing.id && mapping.organization_id===org.id && mapping.company_id===verified.companyId && mapping.state==='ready_test' && JSON.parse(mapping.draft).planSlug===verified.plan && db.prepare('SELECT 1 FROM memberships WHERE user_id=? AND organization_id=?').get(existing.id,org.id)) return {alreadyLinked:true,userId:existing.id};
    throw new Error('Email or host ID is already linked differently. Existing accounts and passwords were not changed.');
  }
  return {alreadyLinked:false};
}
function linkWebsiteHost(db, verified, passwordHash) {
  db.exec('BEGIN IMMEDIATE');
  try {
    const checked=checkWebsiteLink(db,verified);
    if(checked.alreadyLinked){db.exec('COMMIT');return checked;}
    if(typeof passwordHash!=='string' || !/^scrypt\$65536\$8\$1\$[a-f0-9]{32}\$[a-f0-9]{128}$/.test(passwordHash)) throw new Error('A salted website password hash is required.');
    const userId=randomUUID(), now=new Date().toISOString(), catalog=readCatalog(db);
    const plan=catalog.catalog.plans.find(p=>p.code===verified.plan);
    if(!plan)throw new Error('The verified plan is not in the local catalog.');
    db.prepare(`INSERT INTO users(id,organization_id,name,email,password_hash,role,status,created_at) VALUES (?,?,?,?,?,'member','pending_payment',?)`).run(userId,verified.organizationId,verified.name,verified.email,passwordHash,now);
    db.prepare("INSERT INTO memberships VALUES (?,?,'member')").run(userId,verified.organizationId);
    const draft={userId,organizationId:verified.organizationId,companyName:linkedOrganization(db,verified.companyId).name,name:verified.name,email:verified.email,subdomain:verified.subdomain,productId:null,planSlug:verified.plan,supplierMonthlyCents:plan.supplierMonthlyCents,catalogRevision:catalog.revision,purpose:'linked existing operator test host; no provider writes or customer payment'};
    db.prepare("INSERT INTO iotum_provisioning VALUES (?,?,?,'ready_test',?,?,?,?,?)").run(randomUUID(),userId,verified.organizationId,JSON.stringify(draft),verified.companyId,verified.hostId,verified.meetingUrl,now);
    db.exec('COMMIT');return{alreadyLinked:false,userId};
  }catch(e){db.exec('ROLLBACK');throw e;}
}
function listRoomLinks(db, companyId) {
  const org=linkedOrganization(db,companyId);
  return db.prepare(`SELECT r.id RoomID,r.name Name,r.status Status,l.host_id ProHostID FROM rooms r JOIN room_calendar_settings s ON s.room_id=r.id LEFT JOIN room_provider_links l ON l.room_id=r.id WHERE r.organization_id=? AND r.plan='pro' ORDER BY r.name`).all(org.id);
}
function linkRoomHost(db, verified, roomId) {
  db.exec('BEGIN IMMEDIATE');
  try {
    const org=linkedOrganization(db,verified.companyId);
    if(org.id!==verified.organizationId || verified.plan!=='reallife_pro' || typeof roomId!=='string' || !db.prepare(`SELECT 1 FROM rooms r JOIN room_calendar_settings s ON s.room_id=r.id WHERE r.id=? AND r.organization_id=? AND r.plan='pro' AND r.status!='suspended'`).get(roomId,org.id))throw new Error('Choose a Pro test calendar in the verified organization.');
    if(db.prepare('SELECT 1 FROM iotum_provisioning WHERE host_id=?').get(verified.hostId))throw new Error('This host already belongs to a personal website account.');
    const existing=db.prepare('SELECT * FROM room_provider_links WHERE room_id=? OR host_id=?').all(roomId,verified.hostId);
    if(existing.length){
      if(existing.length===1 && existing[0].room_id===roomId && existing[0].host_id===verified.hostId && existing[0].company_id===verified.companyId && existing[0].email===verified.email && existing[0].subdomain===verified.subdomain){db.exec('COMMIT');return{alreadyLinked:true};}
      throw new Error('Room or Pro host is already linked differently. Nothing was replaced.');
    }
    db.prepare('INSERT INTO room_provider_links VALUES (?,?,?,?,?,?)').run(roomId,verified.companyId,verified.hostId,verified.email,verified.subdomain,new Date().toISOString());
    db.exec('COMMIT');return{alreadyLinked:false};
  }catch(e){db.exec('ROLLBACK');throw e;}
}
module.exports={linkedOrganization,inspectExistingHost,checkWebsiteLink,linkWebsiteHost,listRoomLinks,linkRoomHost};
