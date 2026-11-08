const {test}=require('node:test');
const assert=require('node:assert/strict');
const {randomUUID}=require('node:crypto');
const {openStore}=require('../db');
const {createApp}=require('../server');
const {hashPassword}=require('../passwords');

test('hosts save mode and PIN on creation and edit only their own future meeting without altering time or streaming policy',async()=>{
 const store=openStore(':memory:'),db=store.db,password='Meeting-options-test-123',passwordHash=await hashPassword(password);
 function person(email){const u=store.createSignup({orgName:email,adminName:email,adminEmail:email,passwordHash});db.prepare("INSERT INTO iotum_provisioning(id,user_id,organization_id,state,draft,updated_at) VALUES (?,?,?,'ready_test',?,?)").run(randomUUID(),u.userId,u.orgId,JSON.stringify({planSlug:'reallife_basic'}),new Date().toISOString());return u;}
 const admin=person('admin@example.test'),host=person('host@example.test'),outside=person('outside@example.test');
 db.prepare("INSERT INTO memberships VALUES (?,?,'member')").run(host.userId,admin.orgId);
 db.prepare("INSERT INTO rooms VALUES ('pro',?,'Pro','pro','pending')").run(admin.orgId);db.exec("INSERT INTO room_calendar_settings(room_id) VALUES ('pro')");
 for(const u of [admin,host])db.prepare("INSERT INTO room_assignments VALUES ('pro',?)").run(u.userId);
 const server=createApp(store).listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));const base='http://127.0.0.1:'+server.address().port;
 const call=(p,method='GET',body,cookie,header=true)=>fetch(base+p,{method,headers:{'Content-Type':'application/json',...(header?{'X-RLC-Request':'1'}:{}),...(cookie?{Cookie:cookie}:{})},...(body===undefined?{}:{body:JSON.stringify(body)})});
 async function login(email){const r=await call('/api/login','POST',{email,password});assert.equal(r.status,200);return r.headers.get('set-cookie').split(';')[0];}
 const path='/api/workspaces/'+admin.orgId+'/room-calendars/pro/reservations',start=new Date(Date.now()+86400000).toISOString();
 try{
  const a=await login('admin@example.test'),h=await login('host@example.test'),o=await login('outside@example.test');
  const draft={title:'Host choices',startsAt:start,durationMinutes:30,muteMode:'q&a',requirePin:true,securityPin:'012345'};
  assert.equal((await call(path,'POST',{...draft,securityPin:'abc'},h)).status,400);
  assert.equal(db.prepare('SELECT count(*) n FROM room_reservations').get().n,0);
  const created=await call(path,'POST',draft,h);assert.equal(created.status,201);assert.doesNotMatch(JSON.stringify(await created.clone().json()),/012345/);const id=(await created.json()).id,endpoint=path+'/'+id;
  assert.equal((await call(endpoint)).status,401);assert.equal((await call(endpoint,'GET',undefined,a)).status,404);assert.equal((await call(endpoint,'GET',undefined,o)).status,403);
  const response=await call(endpoint,'GET',undefined,h);assert.equal(response.headers.get('cache-control'),'no-store');const settings=await response.json();assert.equal(settings.muteMode,'q&a');assert.equal(settings.requirePin,true);assert.doesNotMatch(JSON.stringify(settings),/012345|securityPin/);
  const upcoming=await(await call('/api/workspaces/'+admin.orgId+'/room-meetings','GET',undefined,h)).json();assert.equal(upcoming.meetings[0].canEdit,true);assert.equal(upcoming.meetings[0].muteMode,'q&a');assert.doesNotMatch(JSON.stringify(upcoming),/012345|securityPin/);
  const range='?'+new URLSearchParams({from:start,to:new Date(Date.parse(start)+86400000).toISOString()});assert.doesNotMatch(JSON.stringify(await(await call(path+range,'GET',undefined,h)).json()),/012345|securityPin/);
  const edit={title:'Updated',muteMode:'presentation',requirePin:true,revision:settings.revision};
  assert.equal((await call(endpoint,'PUT',edit,a)).status,404);assert.equal((await call(endpoint,'PUT',edit,h,false)).status,403);
  assert.equal((await call(endpoint,'PUT',{...edit,startsAt:new Date(Date.now()+2*86400000).toISOString()},h)).status,400);
  assert.equal((await call(endpoint,'PUT',{...edit,liveStreaming:true},h)).status,400);
  assert.equal((await call(endpoint,'PUT',{...edit,muteMode:'invalid'},h)).status,400);
  assert.equal((await call(endpoint,'PUT',edit,h)).status,200);assert.equal((await call(endpoint,'PUT',edit,h)).status,409);
  const row=db.prepare('SELECT * FROM room_reservations WHERE id=?').get(id);assert.equal(row.starts_at,Date.parse(start));assert.equal(row.ends_at,Date.parse(start)+30*60000);assert.equal(row.title,'Updated');
  assert.equal(db.prepare('SELECT security_pin FROM room_meeting_options WHERE reservation_id=?').get(id).security_pin,'012345');
  const updated=await(await call(endpoint,'GET',undefined,h)).json();
  assert.equal((await call(endpoint,'PUT',{...edit,revision:updated.revision,requirePin:false},h)).status,200);
  assert.equal(db.prepare('SELECT security_pin FROM room_meeting_options WHERE reservation_id=?').get(id).security_pin,null);
  const noPin=await(await call(endpoint,'GET',undefined,h)).json();assert.equal(noPin.requirePin,false);
  assert.equal((await call(endpoint,'PUT',{...edit,revision:noPin.revision},h)).status,400);
  db.prepare('UPDATE room_reservations SET cancelled_at=? WHERE id=?').run(new Date().toISOString(),id);assert.equal((await call(endpoint,'GET',undefined,h)).status,404);
 }finally{await new Promise(r=>server.close(r));store.close();}
});

test('version-ten migration preserves reservations; host options survive reopening with safe defaults',()=>{
 const {mkdtempSync,rmSync}=require('node:fs'),{tmpdir}=require('node:os'),{join}=require('node:path');const dir=mkdtempSync(join(tmpdir(),'rlc-options-')),file=join(dir,'db.sqlite');let store=openStore(file);
 try{
  const u=store.createSignup({orgName:'Preserved',adminName:'Host',adminEmail:'preserve@example.test',passwordHash:'fixture'});
  store.db.prepare("INSERT INTO rooms VALUES ('pro',?,'Pro','pro','pending')").run(u.orgId);store.db.exec("INSERT INTO room_calendar_settings(room_id) VALUES ('pro')");
  store.db.prepare("INSERT INTO room_reservations VALUES ('booking','pro',?,'Preserved',?,?,?,NULL)").run(u.userId,Date.now()+86400000,Date.now()+90000000,new Date().toISOString());
  store.db.exec('DROP TABLE room_meeting_options; PRAGMA user_version=10');store.close();store=openStore(file);
  assert.equal(store.db.prepare('PRAGMA user_version').get().user_version,11);assert.equal(store.db.prepare('SELECT title FROM room_reservations').get().title,'Preserved');
  store.db.exec("INSERT INTO room_meeting_options(reservation_id) VALUES ('booking')");assert.equal(store.db.prepare('SELECT mute_mode FROM room_meeting_options').get().mute_mode,'conversation');assert.equal(store.db.prepare('SELECT security_pin FROM room_meeting_options').get().security_pin,null);
  store.db.exec("UPDATE room_meeting_options SET mute_mode='presentation',security_pin='012345'");store.close();store=openStore(file);assert.equal(store.db.prepare('SELECT security_pin FROM room_meeting_options').get().security_pin,'012345');
 }finally{store.close();rmSync(dir,{recursive:true,force:true});}
});
