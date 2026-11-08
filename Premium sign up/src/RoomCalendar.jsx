import { useEffect, useId, useRef, useState } from 'react';
import './room-calendar.css';
const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
const dateValue = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
const atMidnight = text => new Date(text+'T00:00:00');
const addDays = (date,n) => { const d=new Date(date);d.setDate(d.getDate()+n);return d; };
const time = value => new Date(value).toLocaleTimeString([], {hour:'numeric',minute:'2-digit'});
const dayLabel = d => d.toLocaleDateString([], {weekday:'short',month:'short',day:'numeric'});
const fullDate = value => new Date(value).toLocaleDateString([], {weekday:'short',month:'short',day:'numeric',year:'numeric'});

function TaskDialog({ title, busy=false, onClose, children }) {
  const ref=useRef(null), heading=useRef(null), id=useId();
  useEffect(()=>{
    const dialog=ref.current, previous=document.activeElement;
    const previousOverflow=document.body.style.overflow;
    document.body.style.overflow='hidden';dialog.showModal();
    return ()=>{dialog.close();document.body.style.overflow=previousOverflow;if(previous?.isConnected)previous.focus({preventScroll:true});};
  },[]);
  useEffect(()=>{heading.current?.focus({preventScroll:true});},[title]);
  return <dialog className="rc-dialog" ref={ref} aria-labelledby={id} onCancel={e=>{e.preventDefault();if(!busy)onClose();}}>
    <header className="rc-dialog-header"><h3 id={id} ref={heading} tabIndex={-1}>{title}</h3><button type="button" className="rc-icon-close" aria-label="Close task" disabled={busy} onClick={onClose}>×</button></header>
    <div className="rc-dialog-content">{children}</div>
  </dialog>;
}
function RoomSettings({room,members,request,base,onClose,onSaved,onCalendar}) {
  const [name,setName]=useState(room.name),[maxMinutes,setMax]=useState(room.max_minutes),[assigned,setAssigned]=useState(room.assignedUserIds||[]);
  const [busy,setBusy]=useState(false),[error,setError]=useState(''),[saved,setSaved]=useState(false);
  async function save(e){
    e.preventDefault();if(busy)return;setBusy(true);setError('');
    try{await request(base+'/'+encodeURIComponent(room.id),{method:'PUT',body:JSON.stringify({name,maxMinutes:Number(maxMinutes),assignedUserIds:assigned})});setSaved(true);onSaved();}
    catch(e){setError(e.message);}finally{setBusy(false);}
  }
  return <TaskDialog title={saved?'Room preferences saved':'Room preferences'} busy={busy} onClose={onClose}>
    {saved ? <div className="rc-complete"><p role="status"><strong>{name}</strong> has {assigned.length} assigned users and a maximum reservation duration of {maxMinutes} minutes.</p><div className="rc-task-actions"><button className="mc-action" onClick={onCalendar}>View calendar</button><button className="rc-button" onClick={onClose}>Close preferences</button></div></div> :
    <form className="rc-settings" onSubmit={save}><p>{room.name}</p><fieldset disabled={busy} className="rc-fields"><label>Room name<input required maxLength={80} value={name} onChange={e=>setName(e.target.value)}/></label><label>Maximum reservation duration (minutes)<input type="number" min="15" max="480" required value={maxMinutes} onChange={e=>setMax(e.target.value)}/></label></fieldset>
      <fieldset disabled={busy}><legend>Assigned users · {assigned.length}/10</legend>{members.map(m=><label className="rc-checkbox" key={m.id}><input type="checkbox" checked={assigned.includes(m.id)} disabled={!m.eligible||!assigned.includes(m.id)&&assigned.length>=10} onChange={e=>setAssigned(ids=>e.target.checked?[...ids,m.id]:ids.filter(id=>id!==m.id))}/><span>{m.name}<small>{m.email}{!m.eligible&&' · linked Basic or Plus account required'}</small></span></label>)}</fieldset>
      <p className="ac-note">The duration limit applies to new reservations. Existing reservations keep their original duration.</p>{error&&<p className="ac-error" role="alert">{error}</p>}
      <div className="rc-task-actions"><button className="mc-action" disabled={busy}>{busy?'Saving…':'Save room preferences'}</button><button type="button" className="rc-button" disabled={busy} onClick={onClose}>Cancel</button></div>
    </form>}
  </TaskDialog>;
}
function AddRoom({request,base,onClose,onCreated,onConfigure,rooms}) {
  const [name,setName]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState(''),[created,setCreated]=useState(null);
  async function create(e){
    e.preventDefault();if(busy||created)return;setBusy(true);setError('');
    try{const r=await request(base,{method:'POST',body:JSON.stringify({name})});setCreated({id:r.id,name:name.trim()});onCreated();}
    catch(e){setError(e.message);}finally{setBusy(false);}
  }
  return <TaskDialog title={created?'Shared room added':'Add shared room'} busy={busy} onClose={onClose}>
    {created ? <div className="rc-complete"><p role="status"><strong>{created.name}</strong> was added as a Pro test calendar.</p><p>Next, assign users and set its reservation limit.</p><div className="rc-task-actions"><button className="mc-action" disabled={!rooms.some(r=>r.id===created.id)} onClick={()=>onConfigure(created.id)}>Set room preferences</button><button className="rc-button" onClick={onClose}>Back to shared rooms</button></div></div> :
    <form className="rc-create" onSubmit={create}><p>This creates a test calendar only. It does not purchase or activate a Pro subscription.</p><label>Room name<input required maxLength={80} disabled={busy} value={name} onChange={e=>setName(e.target.value)}/></label>{error&&<p className="ac-error" role="alert">{error}</p>}<div className="rc-task-actions"><button className="mc-action" disabled={busy}>{busy?'Adding…':'Add test shared room'}</button><button type="button" className="rc-button" disabled={busy} onClick={onClose}>Cancel</button></div></form>}
  </TaskDialog>;
}
function ReserveRoom({room,request,endpoint,onClose,onSaved}) {
  const [title,setTitle]=useState(''),[start,setStart]=useState(''),[duration,setDuration]=useState(Math.min(60,room.max_minutes));
  const [busy,setBusy]=useState(false),[error,setError]=useState(''),[saved,setSaved]=useState(null);
  async function save(e){
    e.preventDefault();if(busy||saved)return;setBusy(true);setError('');
    try{
      const startsAt=new Date(start).toISOString(),minutes=Number(duration);
      const d=await request(endpoint,{method:'POST',body:JSON.stringify({title,startsAt,durationMinutes:minutes})});
      setSaved({title:title.trim(),startsAt,endsAt:new Date(Date.parse(startsAt)+minutes*60000).toISOString(),message:d.message});onSaved();
    }catch(e){setError(e.message);}finally{setBusy(false);}
  }
  function another(){setTitle('');setStart('');setDuration(Math.min(60,room.max_minutes));setError('');setSaved(null);}
  return <TaskDialog title={saved?'Reservation saved':'Create reservation'} busy={busy} onClose={onClose}>
    {saved ? <section className="rc-confirmation"><p role="status">{saved.message}</p><dl><dt>Room</dt><dd>{room.name}</dd><dt>Meeting</dt><dd>{saved.title}</dd><dt>When</dt><dd>{fullDate(saved.startsAt)} · {time(saved.startsAt)} – {new Date(saved.endsAt).toDateString()!==new Date(saved.startsAt).toDateString()?dayLabel(new Date(saved.endsAt))+' ':''}{time(saved.endsAt)} ({zone})</dd></dl><div className="rc-task-actions"><button className="mc-action" onClick={another}>Create another reservation</button><button className="rc-button" onClick={onClose}>Close — return to calendar</button></div></section> :
    <form className="rc-reserve" onSubmit={save}><p><strong>{room.name}</strong> · maximum {room.max_minutes} minutes</p><fieldset disabled={busy} className="rc-fields"><label>Meeting title<input required maxLength={120} value={title} onChange={e=>setTitle(e.target.value)}/></label><label>Start ({zone})<input required type="datetime-local" value={start} onChange={e=>setStart(e.target.value)}/></label><label>Duration (minutes)<input required type="number" min="15" max={room.max_minutes} value={duration} onChange={e=>setDuration(e.target.value)}/></label></fieldset><p className="ac-note">Test reservation only. No live meeting or invitation is created.</p>{error&&<p className="ac-error" role="alert">{error}</p>}<div className="rc-task-actions"><button disabled={busy} className="mc-action">{busy?'Saving…':'Save test reservation'}</button><button type="button" className="rc-button" disabled={busy} onClick={onClose}>Cancel — return to calendar</button></div></form>}
  </TaskDialog>;
}
function Calendar({room,request,base,onBack,onPreferences,canManage}) {
  const [first,setFirst]=useState(()=>dateValue(new Date())),[rows,setRows]=useState([]),[revision,setRevision]=useState(0);
  const [error,setError]=useState(''),[message,setMessage]=useState(''),[loading,setLoading]=useState(true),[cancelling,setCancelling]=useState(false),[reserving,setReserving]=useState(false);
  const titleRef=useRef(null);
  useEffect(()=>{titleRef.current?.focus({preventScroll:true});},[]);
  const endpoint=base+'/'+encodeURIComponent(room.id)+'/reservations';
  useEffect(()=>{
    let live=true;setError('');setLoading(true);
    const from=atMidnight(first),to=addDays(from,7);
    request(endpoint+'?'+new URLSearchParams({from:from.toISOString(),to:to.toISOString()})).then(d=>{if(live)setRows(d.reservations);}).catch(e=>{if(live){setError(e.message);setRows([]);}}).finally(()=>{if(live)setLoading(false);});
    return()=>{live=false;};
  },[endpoint,first,revision,request]);
  async function cancel(id){
    setCancelling(true);setError('');setMessage('');
    try{await request(endpoint+'/'+encodeURIComponent(id),{method:'DELETE',body:'{}'});setMessage('Test reservation cancelled.');setRevision(n=>n+1);}
    catch(e){setError(e.message);}finally{setCancelling(false);}
  }
  function openReservation(){setMessage('');setReserving(true);}
  const days=Array.from({length:7},(_,i)=>addDays(atMidnight(first),i));
  return <section className="rc-calendar">
    <header className="rc-local-nav"><div><button className="rc-button" onClick={onBack}>← Back to shared rooms</button><h3 ref={titleRef} tabIndex={-1}>{room.name}</h3></div><div className="rc-task-actions">{canManage&&<button className="rc-button" onClick={onPreferences}>Room preferences</button>}{room.canReserve&&<button className="mc-action" disabled={cancelling} onClick={openReservation}>Create reservation</button>}</div></header>
    <p className="ac-note">Pro shared room · maximum {room.max_minutes} minutes per reservation. Times shown in {zone}.</p>
    <div className="rc-toolbar"><button type="button" onClick={()=>setFirst(dateValue(addDays(atMidnight(first),-7)))}>← Previous week</button><label>Week beginning<input type="date" required value={first} onChange={e=>{if(e.target.value)setFirst(e.target.value);}}/></label><button type="button" onClick={()=>setFirst(dateValue(addDays(atMidnight(first),7)))}>Next week →</button></div>
    {loading&&<p role="status">Loading reservations…</p>}{error&&<p className="ac-error" role="alert">{error}</p>}{message&&<p role="status">{message}</p>}
    <div className="rc-week" aria-label="Seven-day room availability">{days.map(day=>{const next=addDays(day,1),bookings=rows.filter(r=>new Date(r.startsAt)<next&&new Date(r.endsAt)>day);return <article key={dateValue(day)}><h4>{dayLabel(day)}</h4>{bookings.length?bookings.map(r=><div className={'rc-booking'+(r.mine?' rc-mine':'')} key={r.id}><strong>{r.title}</strong><span>{new Date(r.startsAt)<day?'Continues':time(r.startsAt)} – {new Date(r.endsAt)>next?'next day':time(r.endsAt)}</span>{r.mine&&<small>Your reservation</small>}{r.canCancel&&<button disabled={cancelling} onClick={()=>cancel(r.id)}>Cancel reservation</button>}</div>):<p className="ac-note">No reservations</p>}</article>;})}</div>
    {!room.canReserve&&<p className="ac-note">Your administrator must assign your linked Basic or Plus account before you can reserve this room.</p>}
    <footer className="rc-task-actions rc-calendar-footer"><button className="rc-button" onClick={onBack}>Back to shared rooms</button>{room.canReserve&&<button className="mc-action" disabled={cancelling} onClick={openReservation}>Create reservation</button>}</footer>
    {reserving&&<ReserveRoom room={room} request={request} endpoint={endpoint} onClose={()=>setReserving(false)} onSaved={()=>setRevision(n=>n+1)}/>}
  </section>;
}
export default function RoomCalendar({workspaceId,request,administration=false,canManage=administration}) {
  const [data,setData]=useState(null),[error,setError]=useState(''),[revision,setRevision]=useState(0),[selected,setSelected]=useState('');
  const [view,setView]=useState('rooms'),[task,setTask]=useState(null);
  const heading=useRef(null),returnFocus=useRef(null);
  const base='/api/workspaces/'+encodeURIComponent(workspaceId)+'/room-calendars';
  useEffect(()=>{
    let live=true;setError('');
    request(base).then(d=>{if(live)setData(d);}).catch(e=>{if(live)setError(e.message);});
    return()=>{live=false;};
  },[base,revision,request]);
  useEffect(()=>{if(view==='rooms')heading.current?.focus({preventScroll:true});},[view]);
  const room=data?.rooms.find(r=>r.id===selected);
  const refresh=()=>setRevision(n=>n+1);
  function openCalendar(id){returnFocus.current=document.activeElement;setSelected(id);setView('calendar');}
  function back(){setView('rooms');setTask(null);requestAnimationFrame(()=>{if(returnFocus.current?.isConnected)returnFocus.current.focus({preventScroll:true});else heading.current?.focus({preventScroll:true});});}
  function configure(id){setSelected(id);setTask('settings');}
  return <div className="rc-root">
    <p className="rc-test-note">Test mode: calendars and reservations are saved here. Live meetings, invitations, and summary notices are not connected.</p>
    {error&&<div className="ac-error" role="alert">{error} <button className="rc-button" onClick={refresh}>Retry room list</button></div>}
    {!data&&!error&&<p role="status">Loading shared rooms…</p>}
    {view==='rooms'&&<><header className="rc-room-list-header"><div><h2 ref={heading} tabIndex={-1}>Shared rooms</h2><p>Select a Pro room to view availability or create a reservation.</p></div>{canManage&&<button className="mc-action" onClick={()=>setTask('create')}>Add shared room</button>}</header>
      {data&&(data.rooms.length?<div className="rc-room-list">{data.rooms.map(r=><article className="rc-room-card" key={r.id}><span className="rc-badge">SHARED PRO ROOM</span><h3>{r.name}</h3><p>Maximum reservation: {r.max_minutes} minutes</p>{canManage&&<p>{r.assignedUserIds?.length||0} of 10 users assigned</p>}<div className="rc-task-actions"><button className="mc-action" onClick={()=>openCalendar(r.id)}>View calendar</button>{canManage&&<button className="rc-button" onClick={()=>configure(r.id)}>Room preferences</button>}</div></article>)}</div>:<div className="rc-empty"><h3>No shared rooms yet</h3><p>{canManage?'Add a shared Pro test calendar to get started.':'Your organization administrator needs to assign a shared Pro room to you.'}</p></div>)}
      <footer className="rc-list-footer"><a className="rc-button" href="#account?meetings">Exit shared rooms — My Meetings</a></footer></>}
    {view==='calendar'&&(room?<Calendar key={room.id} room={room} request={request} base={base} onBack={back} canManage={canManage} onPreferences={()=>configure(room.id)}/>:data&&<div className="rc-empty"><p>This room is no longer available.</p><button className="rc-button" onClick={back}>Back to shared rooms</button></div>)}
    {task==='create'&&canManage&&<AddRoom request={request} base={base} rooms={data?.rooms||[]} onClose={()=>setTask(null)} onCreated={refresh} onConfigure={configure}/>}
    {task==='settings'&&canManage&&room&&<RoomSettings key={room.id} room={room} members={data?.members||[]} request={request} base={base} onClose={()=>setTask(null)} onSaved={refresh} onCalendar={()=>{setTask(null);setView('calendar');}}/>}
  </div>;
}
