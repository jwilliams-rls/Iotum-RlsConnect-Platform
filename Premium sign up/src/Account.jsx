import { useEffect, useState } from 'react';
import './account.css';
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
export function Dashboard({ onSignedOut }) {
  const [data, setData] = useState(null), [error, setError] = useState(''), [workspace, setWorkspace] = useState('');
  const [tab, setTab] = useState(()=>window.location.hash.includes('?rooms') ? 'rooms' : window.location.hash.includes('?profile') ? 'profile' : window.location.hash.includes('?admin') ? 'admin' : 'meetings');
  const [admin, setAdmin] = useState(null), [adminError, setAdminError] = useState('');
  const [reload, setReload] = useState(0);
  useEffect(()=>{ function navigate(){ if(window.location.hash.includes('?admin')) setTab('admin'); if(window.location.hash.includes('?profile')) setTab('profile'); if(window.location.hash.includes('?rooms')) setTab('rooms'); if(window.location.hash.includes('?meetings')) setTab('meetings'); } window.addEventListener('hashchange', navigate); return ()=>window.removeEventListener('hashchange',navigate); },[]);
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
  return <section className="ac-dashboard"><header><div><h1>My Dashboard</h1><p>{data.workspace.kind === 'personal' ? 'Your personal workspace' : data.workspace.name}</p></div>{data.workspaces.length>1 && <label>Workspace<select value={data.workspace.id} onChange={e=>setWorkspace(e.target.value)}>{data.workspaces.map(w=><option key={w.id} value={w.id}>{w.kind==='personal'?'Personal':w.name}</option>)}</select></label>}</header><div className="ac-tabs" role="group" aria-label="Account sections"><button aria-pressed={tab==='meetings'} onClick={()=>{setTab('meetings');window.location.hash='account?meetings';}}>My Meetings</button><button aria-pressed={tab==='rooms'} onClick={()=>{setTab('rooms');window.location.hash='account?rooms';}}>Shared Rooms</button><button aria-pressed={tab==='profile'} onClick={()=>{setTab('profile');window.location.hash='account?profile';}}>My Account</button>{isAdmin && <button aria-pressed={tab==='admin'} onClick={()=>{setTab('admin');window.location.hash='account?admin';}}>Organization Admin</button>}</div>
    {tab==='meetings' && <div className="ac-panel"><h2>Your Personal Meeting Space</h2>{data.personalMeeting.provisioned ? <><p className="ac-plan">Plan: <strong>{plans.find(p=>p.code===data.personalMeeting.plan)?.name || 'Meeting account'}</strong></p><div className="ac-meeting-actions"><article><h3>Manage Meetings</h3><p>Schedule meetings, view upcoming sessions, and access your meeting history and recordings.</p><a className="mc-action" href={data.personalMeeting.loginUrl} target="_blank" rel="noopener noreferrer">Open My Meetings ↗</a></article>{data.personalMeeting.meetingUrl && <article><h3>Your Meeting Room</h3><p>Open your personal room. Sign in to host, or share this room link with your guests.</p><a className="mc-action mc-action-secondary" href={data.personalMeeting.meetingUrl} target="_blank" rel="noopener noreferrer">Open Room Link ↗</a></article>}</div><p className="ac-note">Meeting pages open in a new tab and may ask you to sign in.</p></> : <p>Your personal meeting space is awaiting activation.</p>}</div>}
    {tab==='rooms' && <div className="ac-panel"><h2>Your shared rooms</h2>{data.rooms.length ? <div className="ac-room-grid">{data.rooms.map(room=><article key={room.id}><h3>{room.name}</h3><p>{room.plan==='pro'?'Pro':'Plus'} room · {room.status}</p><p className="ac-note">Calendar booking is not available yet.</p></article>)}</div> : <p>No shared rooms have been assigned to you in this workspace.</p>}</div>}
    {tab==='profile' && <div className="ac-panel"><h2>My account</h2><dl><dt>Name</dt><dd>{data.user.name}</dd><dt>Email</dt><dd>{data.user.email}</dd><dt>Workspace permission</dt><dd>{data.workspace.role==='admin'?'Administrator':'Member'}</dd><dt>Payment status</dt><dd>{data.user.status==='pending_payment'?'Pending payment':data.user.status}</dd></dl></div>}
    {tab==='admin' && isAdmin && <div className="ac-panel"><p className="mc-kicker">ORGANIZATION ADMINISTRATION</p><h2>{data.workspace.name}</h2><p>Review the people and rooms in your organization.</p><p className="ac-note">Account changes are not available yet.</p>{adminError ? <p role="alert" className="ac-error">{adminError}</p> : !admin ? <p role="status">Loading organization…</p> : <><div className="ac-table"><table><caption>Organization members</caption><thead><tr><th>Name</th><th>Email</th><th>Website role</th><th>Payment status</th></tr></thead><tbody>{admin.members.map(m=><tr key={m.id}><td>{m.name}</td><td>{m.email}</td><td>{m.role}</td><td>{m.status}</td></tr>)}</tbody></table></div><h3>Organization rooms</h3>{admin.rooms.length ? <ul>{admin.rooms.map(r=><li key={r.id}>{r.name} · {r.plan} · {r.status}</li>)}</ul> : <p>No shared rooms have been configured.</p>}</>}</div>}
  </section>;
}
