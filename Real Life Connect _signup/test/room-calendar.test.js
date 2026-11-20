const { test } = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { openStore } = require('../db');
const { hashPassword } = require('../passwords');
const { createApp } = require('../server');

test('Pro calendars enforce assignment, ten-user capacity, time limits, privacy, overlap and cancellation boundaries', async () => {
  const store = openStore(':memory:'), db=store.db;
  const password='Calendar-test-password-123', passwordHash=await hashPassword(password);
  function person(email,plan='reallife_basic') {
    const u=store.createSignup({orgName:email,adminName:email,adminEmail:email,passwordHash});
    db.prepare(`INSERT INTO iotum_provisioning(id,user_id,organization_id,state,draft,updated_at) VALUES (?,?,?,'ready_test',?,?)`).run(randomUUID(),u.userId,u.orgId,JSON.stringify({planSlug:plan}),new Date().toISOString());return u;
  }
  const owner=person('owner@example.test'), plus=person('plus@example.test','reallife_plus'), stranger=person('stranger@example.test'), pro=person('pro@example.test','reallife_pro');
  for(const u of [plus,pro]) db.prepare("INSERT INTO memberships VALUES (?,?,'member')").run(u.userId,owner.orgId);
  const extras=Array.from({length:9},(_,i)=>person(`member${i}@example.test`));
  for(const u of extras)db.prepare("INSERT INTO memberships VALUES (?,?,'member')").run(u.userId,owner.orgId);
  const server=createApp(store).listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));
  const base=`http://127.0.0.1:${server.address().port}`, api=`/api/workspaces/${owner.orgId}/room-calendars`;
  const call=(path,method='GET',body,cookie,headers={})=>fetch(base+path,{method,headers:{'Content-Type':'application/json','X-RLC-Request':'1',...(cookie?{Cookie:cookie}:{}),...headers},...(body===undefined?{}:{body:JSON.stringify(body)})});
  async function login(email){const r=await call('/api/login','POST',{email,password});assert.equal(r.status,200);return r.headers.get('set-cookie').split(';')[0];}
  try {
    const a=await login('owner@example.test'), b=await login('plus@example.test'), c=await login('stranger@example.test');
    assert.equal((await call(api)).status,401);
    assert.equal((await call(api,'GET',undefined,c)).status,403);
    assert.equal((await call(api,'POST',{name:'Pro test'},b)).status,403);
    assert.equal((await call(api,'POST',{name:'Pro test'},a,{'X-RLC-Request':''})).status,403);
    assert.equal((await call(api,'POST',{name:'Pro test',plan:'plus'},a)).status,400);
    const created=await call(api,'POST',{name:'Pro test'},a);assert.equal(created.status,201);
    const room=(await created.json()).id, path=api+'/'+room;
    const save=(ids,max=60)=>call(path,'PUT',{name:'Pro test',maxMinutes:max,assignedUserIds:ids},a);
    assert.equal((await save([owner.userId,plus.userId])).status,200);
    assert.equal((await save([pro.userId])).status,400);
    assert.equal((await save([stranger.userId])).status,400);
    assert.equal((await save([owner.userId,owner.userId])).status,400);
    assert.equal((await save([owner.userId,plus.userId,...extras.map(u=>u.userId)])).status,400);
    assert.equal((await save([owner.userId,...extras.map(u=>u.userId)])).status,200);
    assert.equal(db.prepare('SELECT count(*) n FROM room_assignments WHERE room_id=?').get(room).n,10);
    assert.throws(()=>db.prepare('INSERT INTO room_assignments VALUES (?,?)').run(room,plus.userId),/Invalid shared Pro/);
    assert.equal((await save([owner.userId,plus.userId])).status,200);
    assert.equal((await save([owner.userId,plus.userId],600)).status,400);
    const list=await (await call(api,'GET',undefined,b)).json();assert.equal(list.rooms.length,1);assert.equal(list.rooms[0].canReserve,true);assert.equal(list.members,undefined);assert.equal(list.rooms[0].assignedUserIds,undefined);
    // Shared-room broadcasting is an explicit approval, never inherited from Plus.
    assert.deepEqual(list.rooms[0].permissions,{liveStreaming:false,youtubeStreaming:false});
    const flags=[{userId:owner.userId,liveStreaming:true,youtubeStreaming:false},{userId:plus.userId,liveStreaming:false,youtubeStreaming:true}];
    const settings={name:'Pro test',maxMinutes:60,assignedUserIds:[owner.userId,plus.userId],assignedUserPermissions:flags};
    assert.equal((await call(path,'PUT',settings,b)).status,403);
    assert.equal((await call(path,'PUT',settings,c)).status,403);
    assert.equal((await call(path,'PUT',{...settings,assignedUserPermissions:[{...flags[0],liveStreaming:'true'},flags[1]]},a)).status,400);
    assert.equal((await call(path,'PUT',{...settings,assignedUserPermissions:[flags[0],{...flags[1],userId:stranger.userId}]},a)).status,400);
    assert.equal((await call(path,'PUT',{...settings,assignedUserPermissions:[flags[0],flags[0]]},a)).status,400);
    assert.equal((await call(path,'PUT',{...settings,assignedUserPermissions:[]},a)).status,400);
    assert.equal((await call(path,'PUT',settings,a)).status,200);
    const approved=await (await call(api,'GET',undefined,b)).json();
    assert.deepEqual(approved.rooms[0].permissions,{liveStreaming:false,youtubeStreaming:true});
    assert.equal(approved.rooms[0].assignedUserPermissions,undefined);
    assert.equal((await save([owner.userId,plus.userId])).status,200); // Preferences/older clients preserve approvals.
    const adminList=await (await call(api,'GET',undefined,a)).json();
    assert.deepEqual(adminList.rooms[0].assignedUserPermissions.find(p=>p.userId===plus.userId),flags[1]);
    // Removing and re-adding a user must not restore the previous approval.
    assert.equal((await save([owner.userId])).status,200);
    assert.equal((await save([owner.userId,plus.userId])).status,200);
    assert.deepEqual((await (await call(api,'GET',undefined,b)).json()).rooms[0].permissions,{liveStreaming:false,youtubeStreaming:false});
    const day=Date.now()+86400000, start=new Date(day).toISOString(), end=new Date(day+3600000).toISOString();
    const booking=(title,startsAt=start,durationMinutes=60,cookie=a)=>call(path+'/reservations','POST',{title,description:'Private notes for '+title,startsAt,durationMinutes},cookie);
    assert.equal((await booking('Too long',start,61)).status,400);
    assert.equal((await booking('Past',new Date(0).toISOString())).status,400);
    const result=await booking('Private strategy');assert.equal(result.status,201);const reservation=(await result.json()).id;
    const collision=await Promise.all([booking('Collision A',start,30,b),booking('Collision B',new Date(day+1800000).toISOString(),30,b)]);assert.ok(collision.every(r=>r.status===409));
    assert.equal((await booking('Adjacent',end,30,b)).status,201);
    const range='?'+new URLSearchParams({from:new Date(day-3600000).toISOString(),to:new Date(day+86400000).toISOString()});
    const visible=await (await call(path+'/reservations'+range,'GET',undefined,b)).json();assert.equal(visible.reservations[0].title,'Reserved');assert.equal(visible.reservations[0].canCancel,false);assert.equal(visible.reservations[0].description,'');assert.equal(visible.reservations[1].description,'Private notes for Adjacent');assert.equal(visible.reservations[1].title,'Adjacent');
    assert.equal((await call(path+'/reservations/'+reservation,'DELETE',{},b)).status,404);
    assert.equal((await save([plus.userId])).status,409);
    assert.equal((await call(path+'/reservations/'+reservation,'DELETE',{},a)).status,200);
    assert.equal((await booking('Replacement')).status,201);
    assert.equal((await call(path+'/reservations/'+visible.reservations[1].id,'DELETE',{},a)).status,200);
    const fullMonth='?'+new URLSearchParams({from:'2026-10-01T07:00:00.000Z',to:'2026-11-01T08:00:00.000Z'});assert.equal((await call(path+'/reservations'+fullMonth,'GET',undefined,b)).status,200);
    assert.equal((await call(path+'/reservations?from=bad&to=bad','GET',undefined,a)).status,400);
    assert.equal((await call(path+'/reservations'+range,'GET',undefined,c)).status,403);
    db.prepare("UPDATE users SET status='suspended' WHERE id=?").run(plus.userId);
    assert.equal((await call(api,'GET',undefined,b)).status,401);
    assert.equal(db.prepare('SELECT count(*) n FROM iotum_provisioning').get().n,13);
  } finally {await new Promise(r=>server.close(r));store.close();}
});

test('version-seven upgrade preserves users, catalog edits and existing rooms; reservations survive reopening', async () => {
  const { mkdtempSync, rmSync } = require('node:fs');
  const { tmpdir } = require('node:os');
  const { join } = require('node:path');
  const dir=mkdtempSync(join(tmpdir(),'rlc-calendar-')), file=join(dir,'test.sqlite');
  let store=openStore(file);
  try {
    const u=store.createSignup({orgName:'Preserved',adminName:'Owner',adminEmail:'preserved@example.test',passwordHash:'fixture'});
    const db=store.db;
    db.prepare("INSERT INTO rooms VALUES ('existing-pro',?,'Existing Pro','pro','pending')").run(u.orgId);
    const catalog=db.prepare('SELECT document FROM catalog_versions ORDER BY revision DESC LIMIT 1').get().document;
    db.exec('DROP TABLE room_meeting_options; DROP TABLE room_user_permissions; DROP TABLE room_provider_links; DROP TRIGGER room_assignment_rules; DROP TABLE room_reservations; DROP TABLE room_calendar_settings; PRAGMA user_version = 7');
    store.close();store=openStore(file);
    assert.equal(store.db.prepare('PRAGMA user_version').get().user_version,12);
    assert.equal(store.db.prepare('SELECT email FROM users WHERE id=?').get(u.userId).email,'preserved@example.test');
    assert.equal(store.db.prepare('SELECT document FROM catalog_versions ORDER BY revision DESC LIMIT 1').get().document,catalog);
    assert.equal(store.db.prepare("SELECT name FROM rooms WHERE id='existing-pro'").get().name,'Existing Pro');
    store.db.exec("INSERT INTO room_calendar_settings(room_id) VALUES ('existing-pro')");
    store.db.prepare("INSERT INTO room_reservations VALUES ('preserved','existing-pro',?,'Persistent reservation',?,?,?,NULL)").run(u.userId,Date.now()+86400000,Date.now()+90000000,new Date().toISOString());
    store.close();store=openStore(file);
    assert.equal(store.db.prepare("SELECT title FROM room_reservations WHERE id='preserved'").get().title,'Persistent reservation');
  }finally{store.close();rmSync(dir,{recursive:true,force:true});}
});


test('version-nine upgrade preserves assignments and defaults streaming off; approvals survive reopening', () => {
  const {mkdtempSync,rmSync}=require('node:fs'),{tmpdir}=require('node:os'),{join}=require('node:path');
  const dir=mkdtempSync(join(tmpdir(),'rlc-permissions-')),file=join(dir,'test.sqlite');
  let store=openStore(file);
  try {
    const u=store.createSignup({orgName:'Migration organization',adminName:'Owner',adminEmail:'permissions@example.test',passwordHash:'fixture'});
    store.db.prepare("INSERT INTO rooms VALUES ('pro',?,'Preserved Pro','pro','pending')").run(u.orgId);
    store.db.prepare("INSERT INTO room_assignments VALUES ('pro',?)").run(u.userId);
    store.db.exec('DROP TABLE room_meeting_options; DROP TABLE room_user_permissions; PRAGMA user_version=9');
    store.close();store=openStore(file);
    assert.equal(store.db.prepare('PRAGMA user_version').get().user_version,12);
    assert.equal(store.db.prepare('SELECT count(*) n FROM room_assignments').get().n,1);
    store.db.prepare("INSERT INTO room_user_permissions(room_id,user_id) VALUES ('pro',?)").run(u.userId);
    assert.equal(store.db.prepare('SELECT live_streaming FROM room_user_permissions').get().live_streaming,0);
    assert.equal(store.db.prepare('SELECT youtube_streaming FROM room_user_permissions').get().youtube_streaming,0);
    assert.throws(()=>store.db.prepare("UPDATE room_user_permissions SET live_streaming=2").run(),/CHECK/);
    store.db.prepare('UPDATE room_user_permissions SET youtube_streaming=1').run();
    store.close();store=openStore(file);
    assert.equal(store.db.prepare('SELECT youtube_streaming FROM room_user_permissions').get().youtube_streaming,1);
    store.db.prepare('DELETE FROM room_assignments WHERE user_id=?').run(u.userId);
    assert.equal(store.db.prepare('SELECT count(*) n FROM room_user_permissions').get().n,0);
  }finally{store.close();rmSync(dir,{recursive:true,force:true});}
});
