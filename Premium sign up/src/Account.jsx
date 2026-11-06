import { useEffect, useState } from 'react';
import './account.css';
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
  return <details className="ac-menu"><summary>{user.name}</summary><div><a href="#account">My Dashboard</a><a href="#account?meetings">My Meetings</a><a href="#account?rooms">Shared Rooms</a><button onClick={logout}>Sign Out</button>{error && <p role="alert">{error}</p>}</div></details>;
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
  return <section className="ac-login"><div><p className="mc-kicker">WELCOME BACK</p><h1>Your connections.<br/>Your workspace.</h1><p>Sign in to see your personal meeting account and the shared rooms your organization has assigned to you.</p><p className="ac-note">Use the password you created on this website. Your Iotum password may be different while we connect the two services.</p></div><form onSubmit={submit}><h2>Sign in to Real Life Connect</h2>{error && <p className="ac-error" role="alert">{error}</p>}<label htmlFor="account-email">Email address</label><input id="account-email" type="email" autoComplete="username" required maxLength={254} value={email} onChange={e=>setEmail(e.target.value)}/><label htmlFor="account-password">Password</label><input id="account-password" type="password" autoComplete="current-password" required maxLength={256} value={password} onChange={e=>setPassword(e.target.value)}/><button className="mc-action" disabled={busy}>{busy ? 'Signing in…' : 'Sign In'}</button><p className="ac-note">Website password reset is not available yet. If you only need your existing Iotum meeting account, use its sign-in below.</p><a href="https://real-life.reallife-connect.live/login" target="_blank" rel="noopener noreferrer">Open Iotum sign-in ↗</a></form></section>;
}
export function Dashboard({ onSignedOut }) {
  const [data, setData] = useState(null), [error, setError] = useState(''), [workspace, setWorkspace] = useState('');
  const [tab, setTab] = useState(()=>window.location.hash.includes('?rooms') ? 'rooms' : 'meetings');
  const [admin, setAdmin] = useState(null), [adminError, setAdminError] = useState('');
  const [reload, setReload] = useState(0);
  useEffect(()=>{ function navigate(){ if(window.location.hash.includes('?rooms')) setTab('rooms'); if(window.location.hash.includes('?meetings')) setTab('meetings'); } window.addEventListener('hashchange', navigate); return ()=>window.removeEventListener('hashchange',navigate); },[]);
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
  if(error) return <section className="ac-message"><h1>Your account</h1><p role="alert">{error}</p><a href="#signin">Sign in again</a><button onClick={()=>setReload(n=>n+1)}>Try again</button></section>;
  if(!data) return <section className="ac-message" role="status">Loading your workspace…</section>;
  const isAdmin = data.workspace.role === 'admin' && data.workspace.kind === 'organization';
  return <section className="ac-dashboard"><header><div><p className="mc-kicker">YOUR REAL LIFE CONNECT</p><h1>Hello, {data.user.name}.</h1><p>{data.workspace.kind === 'personal' ? 'Your personal workspace' : data.workspace.name}</p></div>{data.workspaces.length>1 && <label>Workspace<select value={data.workspace.id} onChange={e=>setWorkspace(e.target.value)}>{data.workspaces.map(w=><option key={w.id} value={w.id}>{w.kind==='personal'?'Personal':w.name}</option>)}</select></label>}</header><div className="ac-tabs" role="group" aria-label="Account sections"><button aria-pressed={tab==='meetings'} onClick={()=>setTab('meetings')}>My Meetings</button><button aria-pressed={tab==='rooms'} onClick={()=>setTab('rooms')}>Shared Rooms</button><button aria-pressed={tab==='profile'} onClick={()=>setTab('profile')}>My Account</button>{isAdmin && <button aria-pressed={tab==='admin'} onClick={()=>setTab('admin')}>Organization Admin</button>}</div>
    {tab==='meetings' && <div className="ac-panel"><p className="mc-kicker">YOUR PERSONAL MEETING SPACE</p><h2>Make time to connect.</h2>{data.personalMeeting.provisioned ? <><p>Your Iotum test account is provisioned. Open its meeting dashboard to schedule or host a meeting.</p><p className="ac-status">Saved plan: {data.personalMeeting.plan} · Provisioned test account</p><a className="mc-action" href={data.personalMeeting.loginUrl} target="_blank" rel="noopener noreferrer">Open Meeting Dashboard ↗</a>{data.personalMeeting.meetingUrl && <a className="ac-secondary" href={data.personalMeeting.meetingUrl} target="_blank" rel="noopener noreferrer">Open meeting link ↗</a>}<p className="ac-note">Iotum may ask you to sign in separately. The meeting link alone does not sign you in as the host. Upcoming meetings and recordings currently appear inside Iotum.</p></> : <><p>Your website account is saved. A meeting account has not been linked to this workspace yet.</p><p className="ac-note">Payment and automatic activation are not connected in this preview.</p></>}</div>}
    {tab==='rooms' && <div className="ac-panel"><p className="mc-kicker">ADVANCED TOOLS, SHARED BY YOUR TEAM</p><h2>Your shared rooms</h2>{data.rooms.length ? <div className="ac-room-grid">{data.rooms.map(room=><article key={room.id}><h3>{room.name}</h3><p>{room.plan==='pro'?'Pro':'Plus'} room · {room.status}</p><p className="ac-note">You are assigned to this room. Calendar reservations and independent host access are the next integration step.</p></article>)}</div> : <p>No shared rooms have been assigned to you in this workspace.</p>}<p className="ac-note">All assigned room users need a Basic account. Reservations and conflict checks are still being developed; this page does not book or start shared-room meetings yet.</p></div>}
    {tab==='profile' && <div className="ac-panel"><h2>My account</h2><dl><dt>Name</dt><dd>{data.user.name}</dd><dt>Email</dt><dd>{data.user.email}</dd><dt>Workspace permission</dt><dd>{data.workspace.role==='admin'?'Administrator':'Member'}</dd><dt>Payment status</dt><dd>{data.user.status==='pending_payment'?'Pending payment':data.user.status}</dd></dl>{data.personalMeeting.isTest && <p className="ac-note">Your Iotum test was provisioned separately. It does not mark this website account as paid.</p>}</div>}
    {tab==='admin' && isAdmin && <div className="ac-panel"><p className="mc-kicker">ORGANIZATION ADMINISTRATION</p><h2>{data.workspace.name}</h2><p>Review the people and rooms in your organization.</p><p className="ac-note">User invitations, purchases, plan changes, and room assignments will be added after billing and permissions are connected. This first dashboard provides a view of existing records.</p>{adminError ? <p role="alert" className="ac-error">{adminError}</p> : !admin ? <p role="status">Loading organization…</p> : <><div className="ac-table"><table><caption>Organization members</caption><thead><tr><th>Name</th><th>Email</th><th>Website role</th><th>Payment status</th></tr></thead><tbody>{admin.members.map(m=><tr key={m.id}><td>{m.name}</td><td>{m.email}</td><td>{m.role}</td><td>{m.status}</td></tr>)}</tbody></table></div><h3>Organization rooms</h3>{admin.rooms.length ? <ul>{admin.rooms.map(r=><li key={r.id}>{r.name} · {r.plan} · {r.status}</li>)}</ul> : <p>No shared rooms have been configured.</p>}</>}</div>}
  </section>;
}
