import { useEffect, useRef, useState } from 'react';
import './account.css';
import RoomCalendar from './RoomCalendar';
import { plans } from './pricing';
export async function accountRequest(path, options = {}) {
  const response = await fetch(path, { credentials: 'same-origin', ...options, headers: { 'Content-Type': 'application/json', 'X-RLC-Request': '1', ...options.headers } });
  if (!response.ok) { const error = new Error(await response.text() || 'Request failed.'); error.status = response.status; throw error; }
  return response.json();
}
export function AccountMenu({ user, onSignedOut }) {
  const [error, setError] = useState('');
  if (!user) return <a className="mc-signin" href="#signin">Sign In</a>;
  async function logout() {
    try { await accountRequest('/api/logout', { method: 'POST', body: '{}' }); onSignedOut(); window.location.hash = 'signin'; }
    catch (e) { if (e.status === 401) { onSignedOut(); window.location.hash = 'signin'; } else setError(e.message); }
  }
  return <details className="ac-menu"><summary>{user.name}</summary><div><a href="#account?profile">My Account</a><button onClick={logout}>Sign Out</button>{error && <p role="alert">{error}</p>}</div></details>;
}
export function SignIn({ onSignedIn }) {
  const [email, setEmail] = useState(''), [password, setPassword] = useState('');
  const [error, setError] = useState(''), [busy, setBusy] = useState(false);
  async function submit(e) {
    e.preventDefault(); setError(''); setBusy(true);
    try { await accountRequest('/api/login', { method: 'POST', body: JSON.stringify({ email, password }) });
      const data = await accountRequest('/api/session'); onSignedIn(data.user); window.location.hash = 'account'; }
    catch (e) { setError(e.message); } finally { setBusy(false); }
  }
  return <section className="ac-login"><div><p className="mc-kicker">WELCOME BACK</p><h1>Your connections.<br/>Your workspace.</h1><p>Sign in to see your personal meeting account and the shared rooms your organization has assigned to you.</p><p className="ac-note">Use the password you created for your Real Life Connect website account.</p></div><form onSubmit={submit}><h2>Sign in to Real Life Connect</h2>{error && <p className="ac-error" role="alert">{error}</p>}<label htmlFor="account-email">Email address</label><input id="account-email" type="email" autoComplete="username" required maxLength={254} value={email} onChange={e=>setEmail(e.target.value)}/><label htmlFor="account-password">Password</label><input id="account-password" type="password" autoComplete="current-password" required maxLength={256} value={password} onChange={e=>setPassword(e.target.value)}/><button className="mc-action" disabled={busy}>{busy ? 'Signing in…' : 'Sign In'}</button><p className="ac-note">To sign in directly to your meeting dashboard, use the link below.</p><a href="https://real-life.reallife-connect.live/login" target="_blank" rel="noopener noreferrer">Sign in to meeting dashboard ↗</a></form></section>;
}
function SectionIcon({kind}) {
  const paths={meetings:<><rect x="3" y="6" width="12" height="12" rx="2"/><path d="m15 10 6-3v10l-6-3"/></>,rooms:<><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></>,profile:<><circle cx="12" cy="8" r="4"/><path d="M4 22v-3a8 8 0 0 1 16 0v3"/></>,admin:<><path d="m12 3 9 4v5c0 5-5 8-9 10-4-2-9-5-9-10V7z"/><path d="m8 12 3 3 5-6"/></>};
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[kind]}</svg>;
}
function accountSection(){
  const hash=window.location.hash;
  return hash.includes('?rooms')?'rooms':hash.includes('?profile')?'profile':hash.includes('?admin')?'admin':'meetings';
}

function DepartmentsAdmin({workspaceId,request}) {
  const [departments,setDepartments]=useState([]),[name,setName]=useState(''),[editing,setEditing]=useState(null);
  const [loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
  const endpoint='/api/workspaces/'+encodeURIComponent(workspaceId)+'/departments';
  useEffect(()=>{let live=true;request(endpoint).then(d=>{if(live)setDepartments(d.departments);}).catch(e=>{if(live)setError(e.message);}).finally(()=>{if(live)setLoading(false);});return()=>{live=false;};},[endpoint,request]);
  async function save(e) {
    e.preventDefault();if(busy)return;setBusy(true);setError('');setNotice('');
    try {
      const path=editing?endpoint+'/'+encodeURIComponent(editing.id):endpoint;
      const d=await request(path,{method:editing?'PUT':'POST',body:JSON.stringify({name})});
      setDepartments(prev=>[...prev.filter(item=>item.id!==d.id),d].sort((a,b)=>a.name.localeCompare(b.name)));
      setNotice(editing?'Department renamed.':'Department added.');setEditing(null);setName('');
    } catch(e){setError(e.message);}finally{setBusy(false);}
  }
  return <section className="ac-departments">
    <p className="ac-note">Manage departments for your organization. The future Create Host form will use these as its department choices. Departments do not purchase subscriptions or grant access to shared rooms.</p>
    <form className="ac-department-form" onSubmit={save}>
      <label htmlFor="ac-department-name">{editing?'Rename department':'Department name'}</label>
      <input id="ac-department-name" required maxLength={80} value={name} onChange={e=>setName(e.target.value)} placeholder="e.g., Operations" disabled={busy}/>
      <button type="submit" className="mc-action" disabled={busy}>{busy?'Saving…':editing?'Save name':'Add department'}</button>
      {editing&&<button type="button" className="rc-button" onClick={()=>{setEditing(null);setName('');}}>Cancel</button>}
    </form>
    {error&&<p role="alert" className="ac-error">{error}</p>}{notice&&<p role="status">{notice}</p>}
    {loading?<p role="status">Loading departments…</p>:<div className="ac-table" role="region" aria-label="Departments" tabIndex={0}>
      <table className="app-data-table"><thead><tr><th scope="col">Department</th><th scope="col">Action</th></tr></thead>
        <tbody>{departments.map(d=><tr key={d.id}><th scope="row">{d.name}</th><td><button type="button" className="rc-button" onClick={()=>{setEditing(d);setName(d.name);setError('');}}>Rename</button></td></tr>)}
        {!departments.length&&<tr><td colSpan={2}>No departments yet.</td></tr>}</tbody>
      </table>
    </div>}
  </section>;
}

function OrganizationMembersTable({members}) {
  const [filters,setFilters]=useState({name:'',email:'',department:'',role:'',status:''});
  const fields=[['name','Name'],['email','Email'],['department','Department'],['role','Website role'],['status','Payment status']];
  const filtered=members.filter(m=>fields.every(([key])=>{
    const value=key==='department'?m.departmentName||'':m[key]||'';
    return String(value).toLocaleLowerCase().includes(filters[key].trim().toLocaleLowerCase());
  }));
  const update=(key,value)=>setFilters(current=>({...current,[key]:value}));
  return <section className="ac-member-search">
    <p className="ac-note">Search by one or more columns. All filters apply to the entire table at the same time.</p>
    <div className="ac-table" role="region" aria-label="Organization members table" tabIndex={0}>
      <table className="app-data-table ac-filterable-table">
        <caption>{filtered.length} of {members.length} organization members shown</caption>
        <thead>
          <tr>{fields.map(([key,label])=><th scope="col" key={key}>{label}</th>)}</tr>
          <tr className="ac-column-filters">{fields.map(([key,label])=><th key={key}><label className="rlc-sr-only" htmlFor={'ac-filter-'+key}>Search {label}</label><input id={'ac-filter-'+key} type="search" value={filters[key]} onChange={e=>update(key,e.target.value)} placeholder={'Search '+label.toLowerCase()} autoComplete="off"/></th>)}</tr>
        </thead>
        <tbody>{filtered.map(m=><tr key={m.id}><th scope="row">{m.name}</th><td>{m.email}</td><td>{m.departmentName||'Unassigned'}</td><td>{m.role}</td><td>{m.status}</td></tr>)}
        {!filtered.length&&<tr><td colSpan={5}>No members match these filters. <button type="button" className="rc-button" onClick={()=>setFilters({name:'',email:'',department:'',role:'',status:''})}>Clear filters</button></td></tr>}</tbody>
      </table>
    </div>
    {Object.values(filters).some(Boolean)&&<button type="button" className="rc-button" onClick={()=>setFilters({name:'',email:'',department:'',role:'',status:''})}>Clear all filters</button>}
  </section>;
}
export function Dashboard({ onSignedOut, user:sessionUser }) {
  const [data, setData] = useState(null), [error, setError] = useState(''), [workspace, setWorkspace] = useState('');
  const [tab,setTab]=useState(accountSection);
  const [adminSection,setAdminSection]=useState(()=>window.location.hash.includes('view=departments')?'departments':window.location.hash.includes('view=rooms')?'rooms':'members');
  const [mobileOpen,setMobileOpen]=useState(false);
  const mobileDialog=useRef(null),menuButton=useRef(null),content=useRef(null),pageHeading=useRef(null);
  const [admin, setAdmin] = useState(null), [adminError, setAdminError] = useState('');
  const [reload, setReload] = useState(0);
  const [openingMeetings, setOpeningMeetings] = useState(false), [meetingError, setMeetingError] = useState('');
  useEffect(()=>{
    function navigate(){setTab(accountSection());setAdminSection(window.location.hash.includes('view=departments')?'departments':window.location.hash.includes('view=rooms')?'rooms':'members');setMobileOpen(false);}
    window.addEventListener('hashchange',navigate);return()=>window.removeEventListener('hashchange',navigate);
  },[]);
  useEffect(()=>{
    if(!mobileOpen)return;
    const dialog=mobileDialog.current;dialog.showModal();
    return()=>{dialog.close();menuButton.current?.focus({preventScroll:true});};
  },[mobileOpen]);
  useEffect(()=>{
    content.current?.scrollTo?.({top:0,left:0});pageHeading.current?.focus({preventScroll:true});
    const names={meetings:'My Meetings',rooms:'Shared Rooms',profile:'My Account',admin:'Organization Admin'};
    document.title=names[tab]+' | Real Life Connect';
  },[tab,adminSection,workspace]);
  useEffect(()=>{
    let live = true; setError(''); setData(null); setAdmin(null); setAdminError('');
    accountRequest('/api/dashboard' + (workspace ? '?workspace=' + encodeURIComponent(workspace) : '')).then(d=>{if(live){setData(d);if(d.workspace.role !== 'admin' || d.workspace.kind !== 'organization') setTab(t=>t==='admin'?'meetings':t);}}).catch(e=>{if(live){setError(e.message); if(e.status===401)onSignedOut();}});
    return ()=>{live=false;};
  },[workspace,reload,onSignedOut]);
  useEffect(()=>{
    if(tab!=='admin' || !data || data.workspace.role!=='admin' || data.workspace.kind!=='organization') return;
    let live=true; setAdmin(null); setAdminError('');
    accountRequest('/api/workspaces/' + encodeURIComponent(data.workspace.id) + '/admin').then(d=>{if(live)setAdmin(d);}).catch(e=>{if(live)setAdminError(e.message);});
    return ()=>{live=false;};
  },[tab,data]);
  useEffect(()=>{
    if(data && tab==='admin' && (data.workspace.role!=='admin'||data.workspace.kind!=='organization')){
      setTab('meetings');window.location.hash='account?meetings';
    }
  },[data,tab]);
  async function openMeetings() {
    if(openingMeetings || !data) return;
    // Open on the user gesture to avoid popup blockers during the authenticated request.
    const meetingTab = window.open('about:blank', '_blank');
    if(meetingTab) {
      meetingTab.opener = null;
      meetingTab.document.title = 'Real Life Connect';
      meetingTab.document.body.textContent = 'Opening your meetings…';
    }
    setOpeningMeetings(true); setMeetingError('');
    try {
      const result = await accountRequest('/api/workspaces/' + encodeURIComponent(data.workspace.id) + '/meeting-access', { method: 'POST', body: '{}' });
      if(typeof result.launchUrl !== 'string' || !/^\/api\/meeting-access\/launch\?ticket=[a-f0-9]{64}$/.test(result.launchUrl)) throw new Error('Could not open meetings. Please try again.');
      if(meetingTab && !meetingTab.closed) meetingTab.location.replace(window.location.origin + result.launchUrl);
      else window.location.assign(result.launchUrl);
    } catch(e) {
      if(meetingTab && !meetingTab.closed) meetingTab.close();
      setMeetingError(e.message);
      if(e.status===401) onSignedOut();
    } finally { setOpeningMeetings(false); }
  }
  const isAdmin=Boolean(data&&data.workspace.role==='admin'&&data.workspace.kind==='organization');
  const currentUser=data?.user||sessionUser;
  const labels={meetings:'My Meetings',rooms:'Shared Rooms',profile:'My Account',admin:'Organization Admin'};
  function go(section,subsection='members'){
    setTab(section);setAdminSection(subsection);setMobileOpen(false);
    window.location.hash='account?'+section+(section==='admin'&&subsection!=='members'?'&view='+subsection:'');
  }
  function navigation(){
    return <><a className="ac-app-brand" href="#account?meetings" onClick={e=>{e.preventDefault();go('meetings');}}><img src={`${import.meta.env.BASE_URL}real-life-connect-logo.png`} alt="Real Life Connect workspace"/><span>WORKSPACE</span></a>
      <div className="ac-workspace-name"><small>{data?.workspace.kind==='personal'?'PERSONAL ACCOUNT':'ORGANIZATION'}</small><strong>{data?.workspace.name||'Your workspace'}</strong></div>
      <nav className="ac-side-nav" aria-label="Workspace navigation"><div className="ac-nav-group"><h2 className="ac-side-heading"><SectionIcon kind="meetings"/><span>Host Admin</span></h2><div className="ac-side-subnav">{['meetings','rooms','profile'].map(key=><a key={key} href={'#account?'+key} aria-current={tab===key?'page':undefined} onClick={e=>{e.preventDefault();go(key);}}>{labels[key]}</a>)}</div></div>
        {isAdmin&&<div className="ac-nav-group"><h2 className="ac-side-heading"><SectionIcon kind="admin"/><span>Organization Admin</span></h2><div className="ac-side-subnav"><a href="#account?admin" aria-current={tab==='admin'&&adminSection==='members'?'page':undefined} onClick={e=>{e.preventDefault();go('admin');}}>Members</a><a href="#account?admin&view=departments" aria-current={tab==='admin'&&adminSection==='departments'?'page':undefined} onClick={e=>{e.preventDefault();go('admin','departments');}}>Departments</a><a href="#account?admin&view=rooms" aria-current={tab==='admin'&&adminSection==='rooms'?'page':undefined} onClick={e=>{e.preventDefault();go('admin','rooms');}}>Shared room settings</a></div></div>}
      </nav><div className="ac-side-bottom"><a href="#home" onClick={()=>setMobileOpen(false)}>← Public website</a><div><span className="ac-avatar" aria-hidden="true">{(currentUser?.name||'RL').split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase()}</span><p><strong>{currentUser?.name||'Your account'}</strong><small>{data?.workspace.kind==='personal'?'Personal account':isAdmin?'Organization administrator':'Member'}</small></p></div></div></>;
  }
  return <div className="ac-app">
    <a href="#ac-workspace-content" className="ac-app-skip" onClick={e=>{e.preventDefault();content.current?.focus();}}>Skip to workspace</a>
    <aside className="ac-sidebar">{navigation()}</aside>
    {mobileOpen&&<dialog className="ac-mobile-drawer" ref={mobileDialog} aria-label="Workspace menu" onCancel={e=>{e.preventDefault();setMobileOpen(false);}}><button className="ac-drawer-close" onClick={()=>setMobileOpen(false)} aria-label="Close navigation">×</button>{navigation()}</dialog>}
    <div className="ac-app-main"><header className="ac-app-topbar"><div className="ac-app-title"><button ref={menuButton} className="ac-menu-toggle" aria-label="Open navigation" aria-expanded={mobileOpen} onClick={()=>setMobileOpen(true)}>☰</button><div><p>REAL LIFE CONNECT / WORKSPACE</p><h1 tabIndex={-1} ref={pageHeading}>{labels[tab]}</h1></div></div><div className="ac-topbar-actions">{data&&data.workspaces.length>1&&<label>Workspace<select value={data.workspace.id} onChange={e=>setWorkspace(e.target.value)}>{data.workspaces.map(w=><option key={w.id} value={w.id}>{w.kind==='personal'?'Personal':w.name}</option>)}</select></label>}<AccountMenu user={currentUser} onSignedOut={onSignedOut}/></div></header>
    <main className="ac-workspace" id="ac-workspace-content" tabIndex={-1} ref={content}>
    {error?<section className="ac-message"><h2>Your workspace could not be loaded</h2><p className="ac-error" role="alert">{error}</p><button className="rc-button" onClick={()=>setReload(n=>n+1)}>Try again</button></section>:!data?<section className="ac-message" role="status">Loading your workspace…</section>:<>
    {tab==='meetings' && <div className="ac-panel"><h2>Your Personal Meeting Space</h2>{data.personalMeeting.provisioned ? <><p className="ac-plan">Plan: <strong>{plans.find(p=>p.code===data.personalMeeting.plan)?.name || 'Meeting account'}</strong></p><div className="ac-meeting-actions"><article><h3>Manage Meetings</h3><p>Schedule meetings, view upcoming sessions, and access your meeting history and recordings.</p><button className="mc-action" type="button" disabled={openingMeetings} onClick={openMeetings}>{openingMeetings ? "Opening meetings…" : "Open My Meetings ↗"}</button></article>{data.personalMeeting.meetingUrl && <article><h3>Your Meeting Room</h3><p>Open your personal room. Sign in to host, or share this room link with your guests.</p><a className="mc-action mc-action-secondary" href={data.personalMeeting.meetingUrl} target="_blank" rel="noopener noreferrer">Open Room Link ↗</a></article>}</div>{meetingError && <p className="ac-error" role="alert">{meetingError}</p>}<p className="ac-note">Your meeting dashboard opens in a new tab.</p></> : <p>Your personal meeting space is awaiting activation.</p>}</div>}
    {tab==='rooms' && <div className="ac-panel"><RoomCalendar key={data.workspace.id} workspaceId={data.workspace.id} request={accountRequest} canManage={false}/></div>}
    {tab==='profile' && <div className="ac-panel"><h2>My account</h2><dl><dt>Name</dt><dd>{data.user.name}</dd><dt>Email</dt><dd>{data.user.email}</dd><dt>Workspace permission</dt><dd>{data.workspace.role==='admin'?'Administrator':'Member'}</dd><dt>Payment status</dt><dd>{data.user.status==='pending_payment'?'Pending payment':data.user.status}</dd></dl></div>}
    {tab==='admin'&&isAdmin&&<section className="ac-panel ac-admin-panel"><header className="ac-section-header"><div><p className="ac-plan">{data.workspace.name}</p><h2>{adminSection==='members'?'Organization members':adminSection==='departments'?'Departments':'Shared room settings'}</h2></div><nav className="ac-admin-switch" aria-label="Organization sections"><button aria-pressed={adminSection==='members'} onClick={()=>go('admin')}>Members</button><button aria-pressed={adminSection==='departments'} onClick={()=>go('admin','departments')}>Departments</button><button aria-pressed={adminSection==='rooms'} onClick={()=>go('admin','rooms')}>Shared rooms</button></nav></header>
      {adminSection==='departments'?<DepartmentsAdmin key={data.workspace.id} workspaceId={data.workspace.id} request={accountRequest}/>:adminSection==='rooms'?<RoomCalendar key={data.workspace.id} workspaceId={data.workspace.id} request={accountRequest} administration/>:adminError?<p role="alert" className="ac-error">{adminError}</p>:!admin?<p role="status">Loading organization…</p>:<OrganizationMembersTable members={admin.members}/>}
    </section>}
    </>}
    </main><footer className="ac-app-footer">Real Life Connect · Real Life Systems, LLC</footer></div>
  </div>;
}
