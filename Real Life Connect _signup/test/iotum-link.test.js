const {test}=require('node:test');const assert=require('node:assert/strict');
const {randomUUID}=require('node:crypto');const {openStore}=require('../db');const {hashPassword,verifyPassword}=require('../passwords');const {createApp}=require('../server');
const {inspectExistingHost,linkWebsiteHost,checkWebsiteLink,linkRoomHost,listRoomLinks}=require('../iotum-link');
async function fixture(filename=':memory:'){
 const store=openStore(filename),db=store.db,password='Existing-owner-password-123',hash=await hashPassword(password);
 const owner=store.createSignup({orgName:'Company',adminName:'Owner',adminEmail:'owner@example.test',passwordHash:hash});
 db.prepare("INSERT INTO iotum_provisioning VALUES ('owner-job',?,?,'ready_test',?,101,201,'https://test-company.reallife-connect.live/conf/call/123',?)").run(owner.userId,owner.orgId,JSON.stringify({name:'Owner',email:'owner@example.test',planSlug:'reallife_basic',subdomain:'test-company'}),new Date().toISOString());
 const calls=[];let overrides={};
 const plans={202:'reallife_basic',203:'reallife_plus',204:'reallife_pro'};
 const client={async authenticate(){},async post(path,body){calls.push(path);if(path==='/company/fetch')return{name:'Company',subdomain:'test-company',hosts:[201,202,203,204]};
 if(path==='/host/fetch')return{company_id:101,host_id:body.host_id,email:body.host_id+'@example.test',name:'Test Host '+body.host_id,role:'HOST',plan_slug:plans[body.host_id],meeting_url:'https://test-company.reallife-connect.live/conf/call/'+body.host_id,login_token_public_key:'HOST_SECRET',moderator_pin:'PIN_SECRET',...overrides};throw Error('Unexpected remote write');}};
 const inspect=(id,plan=plans[id])=>inspectExistingHost(db,{companyId:101,hostId:id,email:id+'@example.test',plan},client);
 return{store,db,owner,password,hash,client,calls,inspect,setOverride:o=>{overrides=o;}};
}
test('link existing Basic and Plus as members of the same company; password, SSO and assignments use the correct host',async()=>{
 const f=await fixture();const {db,store}=f;const websitePassword='New-member-password-123';let server;
 try{
 const basic=await f.inspect(202),plus=await f.inspect(203);assert.doesNotMatch(JSON.stringify(basic),/SECRET|login_token|moderator_pin/);
 const passwordHash=await hashPassword(websitePassword);
 const a=linkWebsiteHost(db,basic,passwordHash),b=linkWebsiteHost(db,plus,passwordHash);
 assert.equal(a.alreadyLinked,false);assert.equal(b.alreadyLinked,false);
 assert.equal(db.prepare('SELECT count(*) n FROM organizations').get().n,1);
 assert.equal(db.prepare('SELECT count(*) n FROM iotum_provisioning WHERE company_id=101').get().n,3);
 const user=db.prepare('SELECT * FROM users WHERE id=?').get(b.userId);assert.equal(user.role,'member');assert.equal(user.status,'pending_payment');assert.ok(await verifyPassword(websitePassword,user.password_hash));
 assert.deepEqual(checkWebsiteLink(db,plus),{alreadyLinked:true,userId:b.userId});assert.equal(linkWebsiteHost(db,plus,'not-a-hash').alreadyLinked,true);assert.equal(db.prepare('SELECT password_hash FROM users WHERE id=?').get(f.owner.userId).password_hash,f.hash);
 assert.throws(()=>linkWebsiteHost(db,{...basic,email:plus.email},passwordHash),/already linked differently/);
 assert.throws(()=>linkWebsiteHost(db,{...basic,hostId:999,email:'new@example.test'},'bad'),/salted/);
 server=createApp(store,{iotumClientFactory:()=>f.client}).listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));const base='http://127.0.0.1:'+server.address().port;
 const request=(path,body,cookie)=>fetch(base+path,{method:'POST',headers:{'Content-Type':'application/json','X-RLC-Request':'1',...(cookie?{Cookie:cookie}:{})},body:JSON.stringify(body)});
 const login=await request('/api/login',{email:plus.email,password:websitePassword});assert.equal(login.status,200);const cookie=login.headers.get('set-cookie').split(';')[0];
 const dashboard=await(await fetch(base+'/api/dashboard',{headers:{Cookie:cookie}})).json();assert.equal(dashboard.workspace.id,f.owner.orgId);assert.equal(dashboard.workspace.role,'member');assert.equal(dashboard.personalMeeting.plan,'reallife_plus');
 assert.equal((await fetch(base+'/api/workspaces/'+f.owner.orgId+'/admin',{headers:{Cookie:cookie}})).status,403);
 const access=await request('/api/workspaces/'+f.owner.orgId+'/meeting-access',{},cookie);const launch=await access.json();
 const handoff=await fetch(base+launch.launchUrl,{redirect:'manual',headers:{Cookie:cookie}});assert.equal(handoff.status,303);assert.equal(new URL(handoff.headers.get('location')).searchParams.get('host_id'),'203');
 db.prepare("INSERT INTO rooms VALUES ('pro-calendar',?,'Team Pro','pro','pending')").run(f.owner.orgId);db.exec("INSERT INTO room_calendar_settings(room_id) VALUES ('pro-calendar')");
 db.prepare("INSERT INTO room_assignments VALUES ('pro-calendar',?)").run(b.userId);
 const calendars=await(await fetch(base+'/api/workspaces/'+f.owner.orgId+'/room-calendars',{headers:{Cookie:cookie}})).json();assert.equal(calendars.rooms[0].canReserve,true);
 assert.ok(f.calls.every(p=>['/company/fetch','/host/fetch'].includes(p)));
 }finally{if(server)await new Promise(r=>server.close(r));store.close();}
});
test('existing host linking refuses identity mismatches, foreign companies and occupied emails without local writes',async()=>{
 const f=await fixture();try{
 for(const bad of [{role:'COMPANY_ADMIN'},{company_id:999},{host_id:999},{email:'foreign@example.test'},{plan_slug:'reallife_pro'},{meeting_url:'https://attacker.example/conf/call/202'}]){f.setOverride(bad);await assert.rejects(f.inspect(202));}
 assert.equal(f.db.prepare('SELECT count(*) n FROM users').get().n,1);
 f.setOverride({});const verified=await f.inspect(202);assert.throws(()=>linkWebsiteHost(f.db,{...verified,organizationId:'foreign'},f.hash),/mapping changed/);
 const other=f.store.createSignup({orgName:'Other',adminName:'Other',adminEmail:verified.email,passwordHash:f.hash});
 assert.throws(()=>linkWebsiteHost(f.db,verified,f.hash),/already linked differently/);assert.equal(f.db.prepare('SELECT organization_id FROM users WHERE id=?').get(other.userId).organization_id,other.orgId);
 }finally{f.store.close();}
});
test('Pro host links to a local calendar without a website login, account overwrite or live booking activation',async()=>{
 const f=await fixture();try{
 f.db.prepare("INSERT INTO rooms VALUES ('room',?,'Team Pro','pro','pending')").run(f.owner.orgId);f.db.exec("INSERT INTO room_calendar_settings(room_id) VALUES ('room')");
 const pro=await f.inspect(204);assert.throws(()=>linkWebsiteHost(f.db,pro,f.hash),/limited to Basic and Plus/);
 assert.equal(linkRoomHost(f.db,pro,'room').alreadyLinked,false);assert.equal(linkRoomHost(f.db,pro,'room').alreadyLinked,true);
 assert.equal(f.db.prepare('SELECT count(*) n FROM users').get().n,1);assert.equal(f.db.prepare("SELECT status FROM rooms WHERE id='room'").get().status,'pending');assert.equal(f.db.prepare("SELECT mode FROM room_calendar_settings WHERE room_id='room'").get().mode,'local_test');
 assert.equal(listRoomLinks(f.db,101)[0].ProHostID,204);assert.throws(()=>linkRoomHost(f.db,{...pro,hostId:205},'room'),/already linked differently/);assert.throws(()=>linkRoomHost(f.db,pro,'unknown'),/Choose a Pro/);
 assert.deepEqual(f.db.prepare('PRAGMA foreign_key_check').all(),[]);
 }finally{f.store.close();}
});
test('version-eight upgrade preserves mappings, sessions, reservations and edited catalog while clearing transient launch tickets',async()=>{
 const {mkdtempSync,rmSync}=require('node:fs'),{tmpdir}=require('node:os'),{join}=require('node:path');
 const dir=mkdtempSync(join(tmpdir(),'rlc-link-')),file=join(dir,'test.sqlite');const f=await fixture(file);let reopened;
 try{
 const db=f.db,now=Date.now();
 db.prepare("INSERT INTO rooms VALUES ('preserved-room',?,'Preserved Pro','pro','pending')").run(f.owner.orgId);db.exec("INSERT INTO room_calendar_settings(room_id) VALUES ('preserved-room')");
 db.prepare("INSERT INTO room_reservations VALUES ('booking','preserved-room',?,'Keep booking',?,?,?,NULL)").run(f.owner.userId,now+86400000,now+90000000,new Date().toISOString());
 db.prepare('INSERT INTO sessions VALUES (?,?,?,?,?)').run('a'.repeat(64),f.owner.userId,now,now,now+3600000);
 db.prepare("INSERT INTO meeting_handoffs VALUES (?,?,?,?,'owner-job',?,NULL)").run('b'.repeat(64),f.owner.userId,f.owner.orgId,'a'.repeat(64),now+60000);
 const catalog=db.prepare('SELECT document FROM catalog_versions ORDER BY revision DESC LIMIT 1').get().document;
 db.exec('DROP TABLE room_provider_links; PRAGMA user_version = 8');f.store.close();
 reopened=openStore(file);assert.equal(reopened.db.prepare('PRAGMA user_version').get().user_version,9);
 assert.equal(reopened.db.prepare("SELECT host_id FROM iotum_provisioning WHERE id='owner-job'").get().host_id,201);
 assert.equal(reopened.db.prepare('SELECT count(*) n FROM sessions').get().n,1);
 assert.equal(reopened.db.prepare('SELECT count(*) n FROM meeting_handoffs').get().n,0);
 assert.equal(reopened.db.prepare("SELECT title FROM room_reservations WHERE id='booking'").get().title,'Keep booking');
 assert.equal(reopened.db.prepare('SELECT document FROM catalog_versions ORDER BY revision DESC LIMIT 1').get().document,catalog);
 assert.deepEqual(reopened.db.prepare('PRAGMA foreign_key_check').all(),[]);
 }finally{if(reopened)reopened.close();else{try{f.store.close();}catch{}}rmSync(dir,{recursive:true,force:true});}
});
