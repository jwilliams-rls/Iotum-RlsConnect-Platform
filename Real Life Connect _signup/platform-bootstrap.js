// Local, deliberate first-system-administrator setup. Never expose this as a web route.
const { openStore } = require('./db');
const { randomUUID } = require('node:crypto');
const email=process.argv[2]?.trim().toLowerCase();
if(process.argv.length!==3||!email||!/^\S+@\S+\.\S+$/.test(email)){
  console.error('Usage: node platform-bootstrap.js existing-admin@example.com');
  process.exitCode=1;
}else{
  const store=openStore();
  try {
    const db=store.db;
    const user=db.prepare('SELECT id,email FROM users WHERE email=?').get(email);
    if(!user)throw Error('No existing account with that email. Create the account first.');
    if(db.prepare("SELECT 1 FROM platform_roles WHERE role='system_admin' LIMIT 1").get())throw Error('Initial System Administrator already exists. Use the System Administration screen to manage additional roles.');
    const now=new Date().toISOString();
    db.exec('BEGIN IMMEDIATE');
    try{
      db.prepare('INSERT INTO platform_roles(user_id,role,granted_at,granted_by) VALUES (?,?,?,NULL)').run(user.id,'system_admin',now);
      db.prepare('INSERT INTO platform_audit(id,actor_user_id,action,target_type,target_id,details,created_at) VALUES (?,?,?,?,?,?,?)')
        .run(randomUUID(),user.id,'initial_platform_admin_bootstrap','user',user.id,JSON.stringify({role:'system_admin'}),now);
      db.exec('COMMIT');
      console.log('Initial System Administrator established for '+user.email+'.');
    }catch(e){db.exec('ROLLBACK');throw e;}
  }catch(e){console.error(e.message);process.exitCode=1;}finally{store.close();}
}
