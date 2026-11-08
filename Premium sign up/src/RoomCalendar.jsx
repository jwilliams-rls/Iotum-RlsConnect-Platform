import { useEffect, useRef, useState } from 'react';
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
  return <form className="rc-settings" onSubmit={save}><h3>{room.name}</h3><label>Room name<input required maxLength={80} disabled={busy} value={name} onChange={e=>{setName(e.target.value);setSaved(false);}}/></label><label>Maximum reservation duration (minutes)<input type="number" min="15" max="480" required disabled={busy} value={maxMinutes} onChange={e=>{setMax(e.target.value);setSaved(false);}}/></label><fieldset disabled={busy}><legend>Assigned users · {assigned.length}/10</legend>{members.length ? members.map(m=><label className="rc-checkbox" key={m.id}><input type="checkbox" checked={assigned.includes(m.id)} disabled={!m.eligible || !assigned.includes(m.id) && assigned.length>=10} onChange={e=>{setAssigned(ids=>e.target.checked?[...ids,m.id]:ids.filter(id=>id!==m.id));setSaved(false);}}/><span>{m.name} <small>{m.email}{!m.eligible && ' · linked Basic or Plus account required'}</small></span></label>) : <p>No organization members.</p>}</fieldset><p className="ac-note">The duration limit applies to new reservations. Existing reservations keep their original duration.</p><button className="mc-action" disabled={busy}>{busy?'Saving…':'Save room preferences'}</button>{error && <p className="ac-error" role="alert">{error}</p>}{saved && <p role="status">Room preferences saved.</p>}</form>;
}
function Calendar({ room, request, base }) {
  const [first,setFirst] = useState(()=>dateValue(new Date())), [rows,setRows] = useState([]), [revision,setRevision] = useState(0);
  const [title,setTitle] = useState(''), [start,setStart] = useState(''), [duration,setDuration] = useState(Math.min(60,room.max_minutes));
  const [error,setError] = useState(''), [message,setMessage] = useState(''), [busy,setBusy] = useState(false), [loading,setLoading] = useState(true);
  const [stage,setStage] = useState('form'), [confirmation,setConfirmation] = useState(null);
  const confirmationHeading=useRef(null), newReservationButton=useRef(null), titleInput=useRef(null);
  useEffect(()=>{
    if(stage==='confirmation') confirmationHeading.current?.focus({preventScroll:true});
    if(stage==='closed') newReservationButton.current?.focus({preventScroll:true});
    if(stage==='form') titleInput.current?.focus({preventScroll:true});
  },[stage]);
  const endpoint = base+'/'+encodeURIComponent(room.id)+'/reservations';
  useEffect(()=>{setDuration(value=>Math.min(Number(value) || 60,room.max_minutes));},[room.max_minutes]);
  useEffect(()=>{
    if (!first) return;
    let live=true; setError(''); setLoading(true);
    const from=atMidnight(first), to=addDays(from,7);
    request(endpoint+'?'+new URLSearchParams({from:from.toISOString(),to:to.toISOString()})).then(d=>{if(live)setRows(d.reservations);}).catch(e=>{if(live){setError(e.message);setRows([]);}}).finally(()=>{if(live)setLoading(false);});
    return ()=>{live=false;};
  },[endpoint,first,revision,request]);
  async function reserve(e){
    e.preventDefault();
    if(busy || loading) return;
    setBusy(true);setError('');setMessage('');
    try{
      const startsAt=new Date(start).toISOString(), minutes=Number(duration);
      const d=await request(endpoint,{method:'POST',body:JSON.stringify({title,startsAt,durationMinutes:minutes})});
      setConfirmation({id:d.id,title:title.trim(),startsAt,endsAt:new Date(Date.parse(startsAt)+minutes*60000).toISOString(),message:d.message});
      setStage('confirmation');setRevision(n=>n+1);
    }catch(e){setError(e.message);}finally{setBusy(false);}
  }
  function anotherReservation(){
    setTitle('');setStart('');setDuration(Math.min(60,room.max_minutes));setError('');setMessage('');setConfirmation(null);setStage('form');
  }
  async function cancel(id){
    setBusy(true);setError('');setMessage('');
    try{
      await request(endpoint+'/'+encodeURIComponent(id),{method:'DELETE',body:'{}'});
      if(confirmation?.id===id){setConfirmation(null);setStage('closed');}
      setMessage('Test reservation cancelled.');setRevision(n=>n+1);
    }catch(e){setError(e.message);}finally{setBusy(false);}
  }
  const days = first ? Array.from({length:7},(_,i)=>addDays(atMidnight(first),i)) : [];
  return <section className="rc-calendar"><h3>{room.name}</h3><p className="ac-note">Pro shared room · maximum {room.max_minutes} minutes per reservation. Times shown in {zone}.</p><div className="rc-toolbar"><button type="button" disabled={!first} onClick={()=>setFirst(dateValue(addDays(atMidnight(first),-7)))}>← Previous week</button><label>Week beginning<input type="date" required value={first} onChange={e=>{if(e.target.value)setFirst(e.target.value);}}/></label><button type="button" disabled={!first} onClick={()=>setFirst(dateValue(addDays(atMidnight(first),7)))}>Next week →</button></div>{loading && <p role="status">Loading reservations…</p>}<div className="rc-week" aria-label="Seven-day room availability">{days.map(day=>{const next=addDays(day,1), bookings=rows.filter(r=>new Date(r.startsAt)<next && new Date(r.endsAt)>day);return <article key={dateValue(day)}><h4>{dayLabel(day)}</h4>{bookings.length ? bookings.map(r=><div className={'rc-booking'+(r.mine?' rc-mine':'')} key={r.id}><strong>{r.title}</strong><span>{new Date(r.startsAt)<day?'Continues':time(r.startsAt)} – {new Date(r.endsAt)>next?'next day':time(r.endsAt)}</span>{r.mine && <small>Your reservation</small>}{r.canCancel && <button disabled={busy} onClick={()=>cancel(r.id)}>Cancel reservation</button>}</div>) : <p className="ac-note">No reservations</p>}</article>;})}</div>{room.canReserve ? stage==='confirmation' && confirmation ? <section className="rc-confirmation" aria-labelledby="reservation-saved-heading"><h4 id="reservation-saved-heading" tabIndex={-1} ref={confirmationHeading}>Reservation saved</h4><p role="status">{confirmation.message}</p><dl><dt>Room</dt><dd>{room.name}</dd><dt>Meeting</dt><dd>{confirmation.title}</dd><dt>When</dt><dd>{new Date(confirmation.startsAt).toLocaleDateString([], {weekday:'short',month:'short',day:'numeric',year:'numeric'})} · {time(confirmation.startsAt)} – {new Date(confirmation.endsAt).toDateString()!==new Date(confirmation.startsAt).toDateString() ? dayLabel(new Date(confirmation.endsAt))+' ' : ''}{time(confirmation.endsAt)} ({zone})</dd></dl><div className="rc-confirmation-actions"><button type="button" className="mc-action" onClick={anotherReservation}>Create another reservation</button><button type="button" className="mc-action mc-action-secondary" onClick={()=>{setConfirmation(null);setStage('closed');}}>Close</button></div></section> : stage==='closed' ? <button ref={newReservationButton} type="button" className="mc-action rc-new-reservation" onClick={anotherReservation}>Reserve a time</button> : <form className="rc-reserve" onSubmit={reserve}><h4>Reserve a time</h4><label>Meeting title<input ref={titleInput} disabled={busy} required maxLength={120} value={title} onChange={e=>setTitle(e.target.value)}/></label><label>Start ({zone})<input required disabled={busy} type="datetime-local" value={start} onChange={e=>setStart(e.target.value)}/></label><label>Duration (minutes)<input required disabled={busy} type="number" min="15" max={room.max_minutes} value={duration} onChange={e=>setDuration(e.target.value)}/></label><button disabled={busy || loading} className="mc-action">{busy?'Saving…':'Save test reservation'}</button></form> : <p className="ac-note">To reserve this room yourself, assign your linked Basic or Plus account in Organization Admin.</p>}{error && <p className="ac-error" role="alert">{error}</p>}{message && <p role="status">{message}</p>}</section>;
}
export default function RoomCalendar({ workspaceId, request, administration=false }) {
  const [data,setData] = useState(null), [error,setError] = useState(''), [revision,setRevision] = useState(0), [selected,setSelected] = useState('');
  const [name,setName] = useState(''), [busy,setBusy] = useState(false);
  const base='/api/workspaces/'+encodeURIComponent(workspaceId)+'/room-calendars';
  useEffect(()=>{let live=true;setError('');request(base).then(d=>{if(live){setData(d);setSelected(id=>d.rooms.some(r=>r.id===id)?id:d.rooms[0]?.id || '');}}).catch(e=>{if(live){setError(e.message);setData(null);}});return()=>{live=false;};},[base,revision,request]);
  async function create(e){e.preventDefault();setError('');setBusy(true);try{const r=await request(base,{method:'POST',body:JSON.stringify({name})});setSelected(r.id);setName('');setRevision(n=>n+1);}catch(e){setError(e.message);}finally{setBusy(false);}}
  const room=data?.rooms.find(r=>r.id===selected);
  // A refresh must not remount these forms with the previous server snapshot.
  // Room identity, rather than the fetch revision, controls their lifetime.
  return <div className="rc-root"><h2>{administration?'Shared Pro room management':'Shared Pro room calendar'}</h2><p className="rc-test-note">Test calendars only. Reservations are saved here; live meetings, invitations, and meeting-summary notices are not connected yet. No Pro subscription is created or charged.</p>{administration && <form className="rc-create" onSubmit={create}><label>New test room name<input required maxLength={80} value={name} onChange={e=>setName(e.target.value)}/></label><button className="mc-action" disabled={busy}>{busy?'Creating…':'Create test Pro calendar'}</button></form>}{error && <p className="ac-error" role="alert">{error}</p>}{!data && !error && <p role="status">Loading rooms…</p>}{data && (data.rooms.length ? <><label>Room<select value={selected} onChange={e=>setSelected(e.target.value)}>{data.rooms.map(r=><option key={r.id} value={r.id}>{r.name}</option>)}</select></label>{room && <>{administration && <RoomSettings key={'settings-'+room.id} room={room} members={data.members || []} request={request} base={base} onSaved={()=>setRevision(n=>n+1)}/>}<Calendar key={'calendar-'+room.id} room={room} request={request} base={base}/></>}</> : <p>{administration?'Create a test Pro calendar to configure assignments and try reservations.':'No shared Pro calendars are assigned to you. Your organization administrator manages room access.'}</p>)}</div>;
}
