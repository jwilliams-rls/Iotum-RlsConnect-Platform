import { useEffect, useState } from 'react';
import './room-calendar.css';
const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
const dateValue = date => `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
const atMidnight = text => new Date(text + 'T00:00:00');
const addDays = (date, n) => { const d = new Date(date); d.setDate(d.getDate()+n); return d; };
const time = value => new Date(value).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
const dayLabel = date => date.toLocaleDateString([], { weekday:'short', month:'short', day:'numeric' });
function RoomSettings({ room, members, request, base, onSaved }) {
  const [name,setName] = useState(room.name), [maxMinutes,setMax] = useState(room.max_minutes), [assigned,setAssigned] = useState(room.assignedUserIds || []);
  const [busy,setBusy] = useState(false), [error,setError] = useState(''), [saved,setSaved] = useState(false);
  async function save(e) {
    e.preventDefault(); setBusy(true); setError(''); setSaved(false);
    try { await request(base+'/'+encodeURIComponent(room.id), { method:'PUT', body:JSON.stringify({name,maxMinutes:Number(maxMinutes),assignedUserIds:assigned}) }); setSaved(true); onSaved(); }
    catch(e){setError(e.message);} finally{setBusy(false);}
  }
  return <form className="rc-settings" onSubmit={save}><h3>{room.name}</h3><label>Room name<input required maxLength={80} value={name} onChange={e=>setName(e.target.value)}/></label><label>Maximum reservation duration (minutes)<input type="number" min="15" max="480" required value={maxMinutes} onChange={e=>setMax(e.target.value)}/></label><fieldset><legend>Assigned users · {assigned.length}/10</legend>{members.length ? members.map(m=><label className="rc-checkbox" key={m.id}><input type="checkbox" checked={assigned.includes(m.id)} disabled={!m.eligible || !assigned.includes(m.id) && assigned.length>=10} onChange={e=>setAssigned(ids=>e.target.checked?[...ids,m.id]:ids.filter(id=>id!==m.id))}/><span>{m.name} <small>{m.email}{!m.eligible && ' · linked Basic or Plus account required'}</small></span></label>) : <p>No organization members.</p>}</fieldset><p className="ac-note">The duration limit applies to new reservations. Existing reservations keep their original duration.</p><button className="mc-action" disabled={busy}>{busy?'Saving…':'Save room preferences'}</button>{error && <p className="ac-error" role="alert">{error}</p>}{saved && <p role="status">Room preferences saved.</p>}</form>;
}
function Calendar({ room, request, base }) {
  const [first,setFirst] = useState(()=>dateValue(new Date())), [rows,setRows] = useState([]), [revision,setRevision] = useState(0);
  const [title,setTitle] = useState(''), [start,setStart] = useState(''), [duration,setDuration] = useState(Math.min(60,room.max_minutes));
  const [error,setError] = useState(''), [message,setMessage] = useState(''), [busy,setBusy] = useState(false), [loading,setLoading] = useState(true);
  const endpoint = base+'/'+encodeURIComponent(room.id)+'/reservations';
  useEffect(()=>{
    if (!first) return;
    let live=true; setError(''); setLoading(true);
    const from=atMidnight(first), to=addDays(from,7);
    request(endpoint+'?'+new URLSearchParams({from:from.toISOString(),to:to.toISOString()})).then(d=>{if(live)setRows(d.reservations);}).catch(e=>{if(live){setError(e.message);setRows([]);}}).finally(()=>{if(live)setLoading(false);});
    return ()=>{live=false;};
  },[endpoint,first,revision,request]);
  async function reserve(e){
    e.preventDefault();setBusy(true);setError('');setMessage('');
    try{const d=await request(endpoint,{method:'POST',body:JSON.stringify({title,startsAt:new Date(start).toISOString(),durationMinutes:Number(duration)})});setMessage(d.message);setTitle('');setFirst(dateValue(new Date(start)));setRevision(n=>n+1);}
    catch(e){setError(e.message);}finally{setBusy(false);}
  }
  async function cancel(id){
    setBusy(true);setError('');setMessage('');
    try{await request(endpoint+'/'+encodeURIComponent(id),{method:'DELETE',body:'{}'});setMessage('Test reservation cancelled.');setRevision(n=>n+1);}
    catch(e){setError(e.message);}finally{setBusy(false);}
  }
  const days = first ? Array.from({length:7},(_,i)=>addDays(atMidnight(first),i)) : [];
  return <section className="rc-calendar"><h3>{room.name}</h3><p className="ac-note">Pro shared room · maximum {room.max_minutes} minutes per reservation. Times shown in {zone}.</p><div className="rc-toolbar"><button type="button" disabled={!first} onClick={()=>setFirst(dateValue(addDays(atMidnight(first),-7)))}>← Previous week</button><label>Week beginning<input type="date" required value={first} onChange={e=>{if(e.target.value)setFirst(e.target.value);}}/></label><button type="button" disabled={!first} onClick={()=>setFirst(dateValue(addDays(atMidnight(first),7)))}>Next week →</button></div>{loading ? <p role="status">Loading reservations…</p> : <div className="rc-week" aria-label="Seven-day room availability">{days.map(day=>{const next=addDays(day,1), bookings=rows.filter(r=>new Date(r.startsAt)<next && new Date(r.endsAt)>day);return <article key={dateValue(day)}><h4>{dayLabel(day)}</h4>{bookings.length ? bookings.map(r=><div className={'rc-booking'+(r.mine?' rc-mine':'')} key={r.id}><strong>{r.title}</strong><span>{new Date(r.startsAt)<day?'Continues':time(r.startsAt)} – {new Date(r.endsAt)>next?'next day':time(r.endsAt)}</span>{r.mine && <small>Your reservation</small>}{r.canCancel && <button disabled={busy} onClick={()=>cancel(r.id)}>Cancel reservation</button>}</div>) : <p className="ac-note">No reservations</p>}</article>;})}</div>}{room.canReserve ? <form className="rc-reserve" onSubmit={reserve}><h4>Reserve a time</h4><label>Meeting title<input required maxLength={120} value={title} onChange={e=>setTitle(e.target.value)}/></label><label>Start ({zone})<input required type="datetime-local" value={start} onChange={e=>setStart(e.target.value)}/></label><label>Duration (minutes)<input required type="number" min="15" max={room.max_minutes} value={duration} onChange={e=>setDuration(e.target.value)}/></label><button disabled={busy || loading} className="mc-action">{busy?'Saving…':'Save test reservation'}</button></form> : <p className="ac-note">To reserve this room yourself, assign your linked Basic or Plus account in Organization Admin.</p>}{error && <p className="ac-error" role="alert">{error}</p>}{message && <p role="status">{message}</p>}</section>;
}
export default function RoomCalendar({ workspaceId, request, administration=false }) {
  const [data,setData] = useState(null), [error,setError] = useState(''), [revision,setRevision] = useState(0), [selected,setSelected] = useState('');
  const [name,setName] = useState(''), [busy,setBusy] = useState(false), [notice,setNotice] = useState('');
  const base='/api/workspaces/'+encodeURIComponent(workspaceId)+'/room-calendars';
  useEffect(()=>{let live=true;setError('');request(base).then(d=>{if(live){setData(d);setSelected(id=>d.rooms.some(r=>r.id===id)?id:d.rooms[0]?.id || '');}}).catch(e=>{if(live){setError(e.message);setData(null);}});return()=>{live=false;};},[base,revision,request]);
  async function create(e){e.preventDefault();setError('');setBusy(true);try{const r=await request(base,{method:'POST',body:JSON.stringify({name})});setSelected(r.id);setName('');setRevision(n=>n+1);}catch(e){setError(e.message);}finally{setBusy(false);}}
  const room=data?.rooms.find(r=>r.id===selected);
  return <div className="rc-root"><h2>{administration?'Shared Pro room management':'Shared Pro room calendar'}</h2><p className="rc-test-note">Test calendars only. Reservations are saved here; live meetings, invitations, and meeting-summary notices are not connected yet. No Pro subscription is created or charged.</p>{administration && <form className="rc-create" onSubmit={create}><label>New test room name<input required maxLength={80} value={name} onChange={e=>setName(e.target.value)}/></label><button className="mc-action" disabled={busy}>{busy?'Creating…':'Create test Pro calendar'}</button></form>}{error && <p className="ac-error" role="alert">{error}</p>}{notice && <p role="status">{notice}</p>}{!data && !error && <p role="status">Loading rooms…</p>}{data && (data.rooms.length ? <><label>Room<select value={selected} onChange={e=>setSelected(e.target.value)}>{data.rooms.map(r=><option key={r.id} value={r.id}>{r.name}</option>)}</select></label>{room && <>{administration && <RoomSettings key={'settings-'+room.id+revision} room={room} members={data.members || []} request={request} base={base} onSaved={()=>{setNotice('Room preferences saved.');setRevision(n=>n+1);}}/>}<Calendar key={'calendar-'+room.id+revision} room={room} request={request} base={base}/></>}</> : <p>{administration?'Create a test Pro calendar to configure assignments and try reservations.':'No shared Pro calendars are assigned to you. Your organization administrator manages room access.'}</p>)}</div>;
}
