const {test}=require('node:test');
const assert=require('node:assert/strict');
const {randomUUID}=require('node:crypto');
const {openStore}=require('../db');
const {hashPassword}=require('../passwords');
const {createApp}=require('../server');

test('host upcoming meetings span assigned rooms, include only own unended reservations and expose current approvals',async()=>{
 const store=openStore(':memory:'),db=store.db,password='Room-meetings-test-123',passwordHash=await hashPassword(password);
 function person(email){const p=store.createSignup({orgName:email,adminName:email,adminEmail:email,passwordHash});db.prepare("INSERT INTO iotum_provisioning(id,user_id,organization_id,state,draft,updated_at) VALUES (?,?,?,'ready_test',?,?)").run(randomUUID(),p.userId,p.orgId,JSON.stringify({planSlug:'reallife_basic'}),new Date().toISOString());return p;}
 const owner=person('owner@example.test'),member=person('member@example.test'),outsider=person('outside@example.test');
 db.prepare("INSERT INTO memberships VALUES (?,?,'member')").run(member.userId,owner.orgId);
 for(const id of ['first','second','suspended','unassigned']){db.prepare("INSERT INTO rooms VALUES (?,?,?,'pro',?)").run(id,owner.orgId,id,id==='suspended'?'suspended':'pending');db.prepare('INSERT INTO room_calendar_settings(room_id) VALUES (?)').run(id);if(id!=='unassigned')for(const userId of [owner.userId,member.userId])db.prepare('INSERT INTO room_assignments VALUES (?,?)').run(id,userId);}
 db.prepare("INSERT INTO room_user_permissions VALUES ('second',?,0,1)").run(member.userId);
 const now=Date.now();function reservation(id,room,user,offset,ended=false,cancelled=false){db.prepare('INSERT INTO room_reservations VALUES (?,?,?,?,?,?,?,?)').run(id,room,user,id,now+offset,now+offset+(ended?1000:1800000),new Date().toISOString(),cancelled?new Date().toISOString():null);}
 reservation('member-later','second',member.userId,180*86400000);
 reservation('member-first','first',member.userId,86400000);
 reservation('owner-only','first',owner.userId,2*86400000);
 reservation('past','second',member.userId,-86400000,true);
 reservation('cancelled','first',member.userId,3*86400000,false,true);
 reservation('suspended-room','suspended',member.userId,86400000);
 reservation('removed-assignment','unassigned',member.userId,86400000);
 reservation('ongoing','second',member.userId,-60000);
 const server=createApp(store).listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));const base='http://127.0.0.1:'+server.address().port;
 async function login(email){const r=await fetch(base+'/api/login',{method:'POST',headers:{'Content-Type':'application/json','X-RLC-Request':'1'},body:JSON.stringify({email,password})});assert.equal(r.status,200);return r.headers.get('set-cookie').split(';')[0];}
 const path='/api/workspaces/'+owner.orgId+'/room-meetings';
 try{
  const a=await login('owner@example.test'),b=await login('member@example.test'),c=await login('outside@example.test');
  assert.equal((await fetch(base+path)).status,401);assert.equal((await fetch(base+path,{headers:{Cookie:c}})).status,403);
  const response=await fetch(base+path,{headers:{Cookie:b}});assert.equal(response.headers.get('cache-control'),'no-store');const data=await response.json();
  assert.deepEqual(data.meetings.map(m=>m.id),['ongoing','member-first','member-later']);assert.equal(data.meetings[0].status,'in_progress_reservation');assert.deepEqual(data.meetings[2].permissions,{liveStreaming:false,youtubeStreaming:true});assert.ok(data.meetings.every(m=>m.canCancel));assert.equal(data.meetings[2].roomName,'second');assert.doesNotMatch(JSON.stringify(data),/email|password|host_id|assignedUser/);
  const admin=await(await fetch(base+path,{headers:{Cookie:a}})).json();assert.deepEqual(admin.meetings.map(m=>m.id),['owner-only']);
  const cancel='/api/workspaces/'+owner.orgId+'/room-calendars/first/reservations/member-first';
  assert.equal((await fetch(base+cancel,{method:'DELETE',headers:{Cookie:b,'X-RLC-Request':'1','Content-Type':'application/json'},body:'{}'})).status,200);
  assert.deepEqual((await(await fetch(base+path,{headers:{Cookie:b}})).json()).meetings.map(m=>m.id),['ongoing','member-later']);
  db.prepare("UPDATE iotum_provisioning SET draft=? WHERE user_id=?").run(JSON.stringify({planSlug:'reallife_pro'}),member.userId);
  assert.deepEqual((await(await fetch(base+path,{headers:{Cookie:b}})).json()).meetings,[]);
 }finally{await new Promise(r=>server.close(r));store.close();}
});
