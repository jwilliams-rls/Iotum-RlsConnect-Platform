import { useEffect, useRef, useState } from 'react';
import './account.css';
import RoomCalendar from './RoomCalendar';
import { plans } from './pricing';
export async function accountRequest(path, options = {}) {
  const response = await fetch(path, { credentials: 'same-origin', ...options, headers: { 'Content-Type': 'application/json', 'X-RLC-Request': '1', ...options.headers } });
  if (!response.ok) { const detail=await response.text(); const message=response.status===404 && path.includes('/api/workspaces/') ? 'This feature is unavailable on the running backend. Pull the latest branch and restart the backend on port 4001.' : detail || 'Request failed.'; const error = new Error(message); error.status = response.status; throw error; }
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
  const emptyFilters={name:'',email:'',department:'',role:'',status:''};
  const [filters,setFilters]=useState(emptyFilters);
  const [pageSize,setPageSize]=useState(10);
  const [page,setPage]=useState(1);
  const fields=[['name','Name'],['email','Email'],['department','Department'],['role','Website role'],['status','Payment status']];
  const filtered=members.filter(m=>fields.every(([key])=>{
    const value=key==='department'?m.departmentName||'':m[key]||'';
    return String(value).toLocaleLowerCase().includes(filters[key].trim().toLocaleLowerCase());
  }));
  const pageCount=Math.max(1,Math.ceil(filtered.length/pageSize));
  const currentPage=Math.min(page,pageCount);
  const startIndex=(currentPage-1)*pageSize;
  const visible=filtered.slice(startIndex,startIndex+pageSize);
  function update(key,value){setFilters(current=>({...current,[key]:value}));setPage(1);}
  function clearFilters(){setFilters(emptyFilters);setPage(1);}
  return <section className="ac-member-search">
    <p className="ac-note">Search by one or more columns. The entire member list is filtered before results are divided into pages.</p>
    <div className="ac-table" role="region" aria-label="Organization members table" tabIndex={0}>
      <table className="app-data-table ac-filterable-table">
        <caption>{filtered.length} of {members.length} organization members match your filters</caption>
        <thead>
          <tr>{fields.map(([key,label])=><th scope="col" key={key}>{label}</th>)}</tr>
          <tr className="ac-column-filters">{fields.map(([key,label])=><th key={key}><label className="rlc-sr-only" htmlFor={'ac-filter-'+key}>Search {label}</label><input id={'ac-filter-'+key} type="search" value={filters[key]} onChange={e=>update(key,e.target.value)} placeholder={'Search '+label.toLowerCase()} autoComplete="off"/></th>)}</tr>
        </thead>
        <tbody>{visible.map(m=><tr key={m.id}><th scope="row">{m.name}</th><td>{m.email}</td><td>{m.departmentName||'Unassigned'}</td><td>{m.role}</td><td>{m.status}</td></tr>)}
        {!filtered.length&&<tr><td colSpan={5}>No members match these filters. <button type="button" className="rc-button" onClick={clearFilters}>Clear filters</button></td></tr>}</tbody>
      </table>
    </div>
    <div className="ac-table-pagination" aria-label="Member result pages">
      <label htmlFor="ac-page-size">Rows per page <select id="ac-page-size" value={pageSize} onChange={e=>{setPageSize(Number(e.target.value));setPage(1);}}><option value={10}>10</option><option value={25}>25</option><option value={50}>50</option></select></label>
      <span aria-live="polite">{filtered.length?startIndex+1:0}–{Math.min(startIndex+pageSize,filtered.length)} of {filtered.length} results · Page {currentPage} of {pageCount}</span>
      <nav aria-label="Member result pagination">
        <button type="button" className="rc-button" disabled={currentPage===1} onClick={()=>setPage(1)} aria-label="First page">«</button>
        <button type="button" className="rc-button" disabled={currentPage===1} onClick={()=>setPage(n=>Math.max(1,n-1))}>Previous</button>
        {Array.from({length:pageCount},(_,i)=>i+1).filter(n=>n===1||n===pageCount||Math.abs(n-currentPage)<=2).map((n,i,shown)=><span key={n} className="ac-page-item">{i>0&&n-shown[i-1]>1&&<span aria-hidden="true">…</span>}<button type="button" className="rc-button" aria-label={'Page '+n} aria-current={n===currentPage?'page':undefined} onClick={()=>setPage(n)}>{n}</button></span>)}
        <button type="button" className="rc-button" disabled={currentPage===pageCount} onClick={()=>setPage(n=>Math.min(pageCount,n+1))}>Next</button>
        <button type="button" className="rc-button" disabled={currentPage===pageCount} onClick={()=>setPage(pageCount)} aria-label="Last page">»</button>
      </nav>
    </div>
    {Object.values(filters).some(Boolean)&&<button type="button" className="rc-button" onClick={clearFilters}>Clear all filters</button>}
  </section>;
}


function CreateHostAdmin({workspaceId,request}) {
  const initial={name:'',email:'',phone:'',jobTitle:'',departmentId:'',timezone:Intl.DateTimeFormat().resolvedOptions().timeZone||'America/Los_Angeles',plan:'basic'};
  const [details,setDetails]=useState(initial),[step,setStep]=useState(1),[departments,setDepartments]=useState([]),[drafts,setDrafts]=useState([]);
  const [pendingPageSize,setPendingPageSize]=useState(10),[pendingPage,setPendingPage]=useState(1);
  const [hostFilters,setHostFilters]=useState({name:'',email:'',department:'',jobTitle:'',plan:'',status:''});
  const [editingHost,setEditingHost]=useState(null),[cancellingHost,setCancellingHost]=useState(null);
  const [error,setError]=useState(''),[notice,setNotice]=useState(''),[busy,setBusy]=useState(false),[loading,setLoading]=useState(true),[newDepartment,setNewDepartment]=useState(''),[addingDepartment,setAddingDepartment]=useState(false),[showNewDepartment,setShowNewDepartment]=useState(false);
  const base='/api/workspaces/'+encodeURIComponent(workspaceId);
  useEffect(()=>{let live=true;setLoading(true);setError('');
    Promise.all([request(base+'/departments'),request(base+'/pending-hosts')]).then(([d,h])=>{if(live){setDepartments(d.departments);setDrafts(h.hosts);}}).catch(e=>{if(live)setError(e.message);}).finally(()=>{if(live)setLoading(false);});
    return()=>{live=false;};
  },[base,request]);
  async function addDepartment(e){
    e.preventDefault();if(addingDepartment||!newDepartment.trim())return;
    setAddingDepartment(true);setError('');setNotice('');
    try{
      const d=await request(base+'/departments',{method:'POST',body:JSON.stringify({name:newDepartment.trim()})});
      setDepartments(old=>[...old,d].sort((a,b)=>a.name.localeCompare(b.name)));
      setDetails(old=>({...old,departmentId:d.id}));setNewDepartment('');setShowNewDepartment(false);
      setNotice('Department added and selected for this host.');
    }catch(e){setError(e.message);}finally{setAddingDepartment(false);}
  }
  function field(key,value){setDetails(d=>({...d,[key]:value}));setError('');}
  function next(e){e.preventDefault();if(showNewDepartment){setError('Save or cancel the new department before continuing.');return;}if(!details.name.trim()||!details.email.trim())return;setStep(2);}
  async function save(){
    if(busy)return;setBusy(true);setError('');setNotice('');
    try{
      await request(base+'/pending-hosts',{method:'POST',body:JSON.stringify(details)});
      const fresh=await request(base+'/pending-hosts');
      setDrafts(fresh.hosts);
      setNotice('Host saved and confirmed in Pending Host Requests. No payment was collected and no invitation or Iotum account was created.');
      setDetails(initial);setStep(1);
    }catch(e){setError(e.message);}finally{setBusy(false);}
  }
  const hostColumns=[['name','Name'],['email','Email'],['department','Department'],['jobTitle','Job title'],['plan','Plan'],['status','Status']];
  const filteredHosts=drafts.filter(d=>hostColumns.every(([key])=>{
    const value=key==='department'?d.departmentName||'Unassigned':key==='status'?d.status==='cancelled'?'Cancelled':'Pending billing':key==='jobTitle'?d.jobTitle||'':d[key]||'';
    return String(value).toLocaleLowerCase().includes(hostFilters[key].trim().toLocaleLowerCase());
  }));
  function hostFilter(key,value){setHostFilters(f=>({...f,[key]:value}));setPendingPage(1);}
  async function refreshHosts(){const result=await request(base+'/pending-hosts');setDrafts(result.hosts);}
  async function updateHost(e){
    e.preventDefault();if(busy||!editingHost)return;setBusy(true);setError('');setNotice('');
    try{
      await request(base+'/pending-hosts/'+encodeURIComponent(editingHost.id),{method:'PUT',body:JSON.stringify({
        name:editingHost.name,email:editingHost.email,phone:editingHost.phone||'',jobTitle:editingHost.jobTitle||'',
        departmentId:editingHost.departmentId||'',timezone:editingHost.timezone,plan:editingHost.plan
      })});
      await refreshHosts();setEditingHost(null);setNotice('Pending host updated.');
    }catch(e){setError(e.message);}finally{setBusy(false);}
  }
  async function cancelHost(){
    if(busy||!cancellingHost)return;setBusy(true);setError('');setNotice('');
    try{
      await request(base+'/pending-hosts/'+encodeURIComponent(cancellingHost.id)+'/cancel',{method:'POST',body:'{}'});
      await refreshHosts();setCancellingHost(null);setNotice('Request cancelled. No payment or Iotum action occurred.');
    }catch(e){setError(e.message);}finally{setBusy(false);}
  }
  const pendingPageCount=Math.max(1,Math.ceil(filteredHosts.length/pendingPageSize));
  const currentPendingPage=Math.min(pendingPage,pendingPageCount);
  const pendingStart=(currentPendingPage-1)*pendingPageSize;
  const visibleDrafts=filteredHosts.slice(pendingStart,pendingStart+pendingPageSize);
  return <section className="ac-host-admin">
    <p className="ac-note">Create a personal Basic, Plus, or Pro host subscription independently of shared rooms. This development form saves a pending request only; billing, invitations and Iotum activation are not connected.</p>
    {loading?<p role="status">Loading host setup…</p>:<>
      <div className="ac-host-steps" aria-label="Host registration steps"><span aria-current={step===1?'step':undefined}>1. Host details</span><span aria-current={step===2?'step':undefined}>2. Select plan</span><span aria-current={step===3?'step':undefined}>3. Review</span></div>
      {step===1&&<form className="ac-host-form" onSubmit={next}>
        <label>Full name *<input required maxLength={200} value={details.name} onChange={e=>field('name',e.target.value)} autoComplete="off"/></label>
        <label>Email address *<input required type="email" maxLength={254} value={details.email} onChange={e=>field('email',e.target.value)} autoComplete="off"/></label>
        <label>Phone number (optional)<input type="tel" maxLength={40} value={details.phone} onChange={e=>field('phone',e.target.value)} placeholder="Phone number"/></label>
        <label>Job title (optional)<input maxLength={120} value={details.jobTitle} onChange={e=>field('jobTitle',e.target.value)} placeholder="e.g., Program Director"/></label>
        <label>Department (optional)<select value={showNewDepartment?'__add_new__':details.departmentId} onChange={e=>{if(e.target.value==='__add_new__'){setShowNewDepartment(true);setError('');}else{setShowNewDepartment(false);setNewDepartment('');field('departmentId',e.target.value);}}} disabled={addingDepartment}><option value="">No department assigned</option>{departments.map(d=><option key={d.id} value={d.id}>{d.name}</option>)}<option value="__add_new__">+ Add New Department…</option></select></label>
        {showNewDepartment&&<div className="ac-inline-department"><label htmlFor="ac-new-host-department">New department name</label><div><input id="ac-new-host-department" maxLength={80} value={newDepartment} onChange={e=>setNewDepartment(e.target.value)} placeholder="Enter department name" disabled={addingDepartment} onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();addDepartment(e);}}}/><button type="button" className="rc-button" disabled={addingDepartment||!newDepartment.trim()} onClick={addDepartment}>{addingDepartment?'Saving…':'Save department'}</button><button type="button" className="rc-button" disabled={addingDepartment} onClick={()=>{setShowNewDepartment(false);setNewDepartment('');}}>Cancel</button></div></div>}
        <p className="ac-note">Choose an existing department, add a new one from the dropdown, or leave unassigned.</p>
        <label>Time zone *<select required value={details.timezone} onChange={e=>field('timezone',e.target.value)}>{[...new Set([details.timezone,'America/Los_Angeles','America/Denver','America/Chicago','America/New_York','America/Phoenix','Pacific/Honolulu','America/Anchorage','UTC'])].map(z=><option key={z} value={z}>{z.replaceAll('_',' ')}</option>)}</select></label>
        <button type="submit" className="mc-action">Continue to plan selection</button>
      </form>}
      {step===2&&<div className="ac-host-form"><h3>Select personal host subscription</h3><fieldset><legend>Subscription plan</legend>{[['basic','Basic'],['plus','Plus'],['pro','Pro']].map(([value,label])=><label key={value} className="ac-host-plan"><input type="radio" name="host-plan" checked={details.plan===value} onChange={()=>field('plan',value)}/>{label}</label>)}</fieldset><p className="ac-note">A shared room is not required. Pricing and payment will be presented when billing integration is available.</p><div className="ac-host-actions"><button type="button" className="rc-button" onClick={()=>setStep(1)}>Back</button><button type="button" className="mc-action" onClick={()=>setStep(3)}>Review host</button></div></div>}
      {step===3&&<div className="ac-host-form"><h3>Review host request</h3><dl><dt>Host</dt><dd>{details.name}</dd><dt>Email</dt><dd>{details.email}</dd><dt>Phone</dt><dd>{details.phone||'Not provided'}</dd><dt>Job title</dt><dd>{details.jobTitle||'Not provided'}</dd><dt>Department</dt><dd>{departments.find(d=>d.id===details.departmentId)?.name||'Unassigned'}</dd><dt>Time zone</dt><dd>{details.timezone}</dd><dt>Personal plan</dt><dd>{details.plan.toUpperCase()}</dd><dt>Initial status</dt><dd>Pending billing — no activation</dd></dl><div className="ac-host-actions"><button type="button" className="rc-button" disabled={busy} onClick={()=>setStep(2)}>Back</button><button type="button" className="mc-action" disabled={busy} onClick={save}>{busy?'Saving…':'Save pending host'}</button></div></div>}
      {error&&<p role="alert" className="ac-error">{error}</p>}{notice&&<p role="status">{notice}</p>}
      <h3>Pending host requests</h3>
      {editingHost&&<form className="ac-host-form ac-host-edit" onSubmit={updateHost}>
        <h4>Edit pending host: {editingHost.name}</h4>
        <label>Full name<input required maxLength={200} value={editingHost.name} onChange={e=>setEditingHost(h=>({...h,name:e.target.value}))}/></label>
        <label>Email<input type="email" required maxLength={254} value={editingHost.email} onChange={e=>setEditingHost(h=>({...h,email:e.target.value}))}/></label>
        <label>Phone (optional)<input maxLength={40} value={editingHost.phone||''} onChange={e=>setEditingHost(h=>({...h,phone:e.target.value}))}/></label>
        <label>Job title (optional)<input maxLength={120} value={editingHost.jobTitle||''} onChange={e=>setEditingHost(h=>({...h,jobTitle:e.target.value}))}/></label>
        <label>Department<select value={editingHost.departmentId||''} onChange={e=>setEditingHost(h=>({...h,departmentId:e.target.value}))}><option value="">Unassigned</option>{departments.map(d=><option key={d.id} value={d.id}>{d.name}</option>)}</select></label>
        <label>Time zone<select value={editingHost.timezone} onChange={e=>setEditingHost(h=>({...h,timezone:e.target.value}))}>{[...new Set([editingHost.timezone,'America/Los_Angeles','America/Denver','America/Chicago','America/New_York','America/Phoenix','Pacific/Honolulu','America/Anchorage','UTC'])].map(z=><option key={z} value={z}>{z.replaceAll('_',' ')}</option>)}</select></label>
        <label>Personal subscription<select value={editingHost.plan} onChange={e=>setEditingHost(h=>({...h,plan:e.target.value}))}><option value="basic">Basic</option><option value="plus">Plus</option><option value="pro">Pro</option></select></label>
        <div className="ac-host-actions"><button className="mc-action" disabled={busy}>{busy?'Saving…':'Save changes'}</button><button type="button" className="rc-button" disabled={busy} onClick={()=>setEditingHost(null)}>Close editor</button></div>
      </form>}
      {cancellingHost&&<div className="ac-host-confirm" role="group" aria-label="Confirm cancel request">
        <strong>Cancel the pending request for {cancellingHost.name}?</strong>
        <p>The request will remain in history as Cancelled. No billing or Iotum action will occur.</p>
        <div className="ac-host-actions"><button type="button" className="rc-button" disabled={busy} onClick={cancelHost}>{busy?'Cancelling…':'Confirm cancellation'}</button><button type="button" className="rc-button" disabled={busy} onClick={()=>setCancellingHost(null)}>Keep request</button></div>
      </div>}
      <div className="ac-table" role="region" aria-label="Pending host requests" tabIndex={0}>
        <table className="app-data-table ac-filterable-table">
          <caption>{filteredHosts.length} of {drafts.length} host requests match your filters</caption>
          <thead><tr>{hostColumns.map(([key,label])=><th scope="col" key={key}>{label}</th>)}<th scope="col">Actions</th></tr>
            <tr className="ac-column-filters">{hostColumns.map(([key,label])=><th key={key}><label className="rlc-sr-only" htmlFor={'ac-host-filter-'+key}>Search {label}</label><input id={'ac-host-filter-'+key} type="search" value={hostFilters[key]} onChange={e=>hostFilter(key,e.target.value)} placeholder={'Search '+label.toLowerCase()}/></th>)}<th><button type="button" className="rc-button" onClick={()=>{setHostFilters({name:'',email:'',department:'',jobTitle:'',plan:'',status:''});setPendingPage(1);}}>Clear</button></th></tr>
          </thead>
          <tbody>{visibleDrafts.map(d=><tr key={d.id}><th scope="row">{d.name}</th><td>{d.email}</td><td>{d.departmentName||'Unassigned'}</td><td>{d.jobTitle||'—'}</td><td>{d.plan.toUpperCase()}</td><td>{d.status==='cancelled'?'Cancelled':'Pending billing'}</td><td className="ac-host-row-actions">{d.status!=='cancelled'?<><button type="button" className="rc-button" title={'Edit '+d.name} aria-label={'Edit '+d.name} onClick={()=>{setEditingHost({...d});setCancellingHost(null);setError('');}}>✎</button><button type="button" className="rc-button" title={'Cancel request for '+d.name} aria-label={'Cancel request for '+d.name} onClick={()=>{setCancellingHost(d);setEditingHost(null);setError('');}}>✕</button></>:<span>—</span>}</td></tr>)}{!filteredHosts.length&&<tr><td colSpan={7}>No host requests match the current filters.</td></tr>}</tbody>
        </table>
      </div>
      <div className="ac-table-pagination" aria-label="Pending host result pages">
        <label htmlFor="ac-pending-page-size">Rows per page <select id="ac-pending-page-size" value={pendingPageSize} onChange={e=>{setPendingPageSize(Number(e.target.value));setPendingPage(1);}}><option value={10}>10</option><option value={25}>25</option><option value={50}>50</option></select></label>
        <span aria-live="polite">{filteredHosts.length?pendingStart+1:0}–{Math.min(pendingStart+pendingPageSize,filteredHosts.length)} of {filteredHosts.length} results · Page {currentPendingPage} of {pendingPageCount}</span>
        <nav aria-label="Pending host pagination">
          <button type="button" className="rc-button" disabled={currentPendingPage===1} onClick={()=>setPendingPage(1)} aria-label="First page">«</button>
          <button type="button" className="rc-button" disabled={currentPendingPage===1} onClick={()=>setPendingPage(p=>Math.max(1,p-1))}>Previous</button>
          {Array.from({length:pendingPageCount},(_,i)=>i+1).filter(n=>n===1||n===pendingPageCount||Math.abs(n-currentPendingPage)<=2).map((n,i,shown)=><span key={n} className="ac-page-item">{i>0&&n-shown[i-1]>1&&<span aria-hidden="true">…</span>}<button type="button" className="rc-button" aria-label={'Page '+n} aria-current={n===currentPendingPage?'page':undefined} onClick={()=>setPendingPage(n)}>{n}</button></span>)}
          <button type="button" className="rc-button" disabled={currentPendingPage===pendingPageCount} onClick={()=>setPendingPage(p=>Math.min(pendingPageCount,p+1))}>Next</button>
          <button type="button" className="rc-button" disabled={currentPendingPage===pendingPageCount} onClick={()=>setPendingPage(pendingPageCount)} aria-label="Last page">»</button>
        </nav>
      </div>
    </>}
  </section>;
}

export function Dashboard({ onSignedOut, user:sessionUser }) {
  const [data, setData] = useState(null), [error, setError] = useState(''), [workspace, setWorkspace] = useState('');
  const [tab,setTab]=useState(accountSection);
  const [adminSection,setAdminSection]=useState(()=>window.location.hash.includes('view=hosts')?'hosts':window.location.hash.includes('view=departments')?'departments':window.location.hash.includes('view=rooms')?'rooms':'members');
  const [mobileOpen,setMobileOpen]=useState(false);
  const mobileDialog=useRef(null),menuButton=useRef(null),content=useRef(null),pageHeading=useRef(null);
  const [admin, setAdmin] = useState(null), [adminError, setAdminError] = useState('');
  const [reload, setReload] = useState(0);
  const [openingMeetings, setOpeningMeetings] = useState(false), [meetingError, setMeetingError] = useState('');
  useEffect(()=>{
    function navigate(){setTab(accountSection());setAdminSection(window.location.hash.includes('view=hosts')?'hosts':window.location.hash.includes('view=departments')?'departments':window.location.hash.includes('view=rooms')?'rooms':'members');setMobileOpen(false);}
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
        {isAdmin&&<div className="ac-nav-group"><h2 className="ac-side-heading"><SectionIcon kind="admin"/><span>Organization Admin</span></h2><div className="ac-side-subnav"><a href="#account?admin" aria-current={tab==='admin'&&adminSection==='members'?'page':undefined} onClick={e=>{e.preventDefault();go('admin');}}>Members</a><a href="#account?admin&view=hosts" aria-current={tab==='admin'&&adminSection==='hosts'?'page':undefined} onClick={e=>{e.preventDefault();go('admin','hosts');}}>Create New Host</a><a href="#account?admin&view=departments" aria-current={tab==='admin'&&adminSection==='departments'?'page':undefined} onClick={e=>{e.preventDefault();go('admin','departments');}}>Departments</a><a href="#account?admin&view=rooms" aria-current={tab==='admin'&&adminSection==='rooms'?'page':undefined} onClick={e=>{e.preventDefault();go('admin','rooms');}}>Shared room settings</a></div></div>}
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
    {tab==='admin'&&isAdmin&&<section className="ac-panel ac-admin-panel"><header className="ac-section-header"><div><p className="ac-plan">{data.workspace.name}</p><h2>{adminSection==='members'?'Organization members':adminSection==='hosts'?'Create New Host':adminSection==='departments'?'Departments':'Shared room settings'}</h2></div><nav className="ac-admin-switch" aria-label="Organization sections"><button aria-pressed={adminSection==='members'} onClick={()=>go('admin')}>Members</button><button aria-pressed={adminSection==='hosts'} onClick={()=>go('admin','hosts')}>Create Host</button><button aria-pressed={adminSection==='departments'} onClick={()=>go('admin','departments')}>Departments</button><button aria-pressed={adminSection==='rooms'} onClick={()=>go('admin','rooms')}>Shared rooms</button></nav></header>
      {adminSection==='hosts'?<CreateHostAdmin key={data.workspace.id} workspaceId={data.workspace.id} request={accountRequest}/>:adminSection==='departments'?<DepartmentsAdmin key={data.workspace.id} workspaceId={data.workspace.id} request={accountRequest}/>:adminSection==='rooms'?<RoomCalendar key={data.workspace.id} workspaceId={data.workspace.id} request={accountRequest} administration/>:adminError?<p role="alert" className="ac-error">{adminError}</p>:!admin?<p role="status">Loading organization…</p>:<OrganizationMembersTable members={admin.members}/>}
    </section>}
    </>}
    </main><footer className="ac-app-footer">Real Life Connect · Real Life Systems, LLC</footer></div>
  </div>;
}
