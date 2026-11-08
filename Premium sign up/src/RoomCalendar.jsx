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
function RoomSettings({room,members,request,base,onClose,onSaved,onCalendar,usersOnly=false}) {
  const [name,setName]=useState(room.name),[maxMinutes,setMax]=useState(room.max_minutes),[assigned,setAssigned]=useState(room.assignedUserIds||[]);
  const [busy,setBusy]=useState(false),[error,setError]=useState(''),[saved,setSaved]=useState(false);
  const [adding,setAdding]=useState(false),[candidate,setCandidate]=useState('');
  const [permissions,setPermissions]=useState(()=>Object.fromEntries((room.assignedUserPermissions||[]).map(p=>[p.userId,{liveStreaming:p.liveStreaming===true,youtubeStreaming:p.youtubeStreaming===true}])));
  function setPermission(userId,feature,allowed){setPermissions(current=>({...current,[userId]:{liveStreaming:false,youtubeStreaming:false,...current[userId],[feature]:allowed}}));}
  function removeUser(userId){setAssigned(ids=>ids.filter(id=>id!==userId));setPermissions(current=>{const next={...current};delete next[userId];return next;});}
  const available=members.filter(m=>m.eligible&&!assigned.includes(m.id));
  function addUser(){if(assigned.length>=10||!available.some(m=>m.id===candidate))return;setAssigned(ids=>[...ids,candidate]);setCandidate('');setAdding(false);}
  async function save(e){
    e.preventDefault();if(busy)return;setBusy(true);setError('');
    try{await request(base+'/'+encodeURIComponent(room.id),{method:'PUT',body:JSON.stringify({name,maxMinutes:Number(maxMinutes),assignedUserIds:assigned,...(usersOnly?{assignedUserPermissions:assigned.map(userId=>({userId,liveStreaming:permissions[userId]?.liveStreaming===true,youtubeStreaming:permissions[userId]?.youtubeStreaming===true}))}:{})})});setSaved(true);onSaved();}
    catch(e){setError(e.message);}finally{setBusy(false);}
  }
  return <TaskDialog title={usersOnly?(saved?'Room users saved':'Manage room users'):(saved?'Room preferences saved':'Room preferences')} busy={busy} onClose={onClose}>
    {saved ? <div className="rc-complete"><p role="status"><strong>{name}</strong> has {assigned.length} assigned users and a maximum reservation duration of {maxMinutes} minutes.</p><div className="rc-task-actions"><button className="mc-action" onClick={onCalendar}>View calendar</button><button className="rc-button" onClick={onClose}>{usersOnly?'Close users':'Close preferences'}</button></div></div> :
    <form className="rc-settings" onSubmit={save}><p>{room.name}</p>{!usersOnly&&<fieldset disabled={busy} className="rc-fields"><label>Room name<input required maxLength={80} value={name} onChange={e=>setName(e.target.value)}/></label><label>Maximum reservation duration (minutes)<input type="number" min="15" max="480" required value={maxMinutes} onChange={e=>setMax(e.target.value)}/></label></fieldset>}
      {usersOnly&&<><p>Add existing Basic or Plus users from this organization, or remove their room access. Save your changes when finished.</p><fieldset disabled={busy}><legend>Assigned users · {assigned.length}/10</legend>
        {assigned.length?assigned.map(id=>{const m=members.find(m=>m.id===id);return <div className="rc-assigned-member" key={id}><div className="rc-assigned-user"><span>{m?.name||'Assigned user'}<small>{m?.email||'User details unavailable'}</small></span><button type="button" className="rc-button" aria-label={'Remove '+(m?.name||'user')+' from room'} onClick={()=>removeUser(id)}>Remove</button></div><fieldset className="rc-feature-permissions"><legend>Shared-room feature approvals for {m?.name||'assigned user'}</legend><label><input type="checkbox" checked={permissions[id]?.liveStreaming===true} onChange={e=>setPermission(id,'liveStreaming',e.target.checked)}/>Allow live streaming</label><label><input type="checkbox" checked={permissions[id]?.youtubeStreaming===true} onChange={e=>setPermission(id,'youtubeStreaming',e.target.checked)}/>Allow YouTube streaming</label></fieldset></div>;}):<p>No users assigned to this room.</p>}
        {!adding?<button type="button" className="rc-button" disabled={assigned.length>=10} onClick={()=>setAdding(true)}>Add existing user</button>:<div className="rc-add-user"><label>Existing organization user<select value={candidate} onChange={e=>setCandidate(e.target.value)}><option value="">Select a user</option>{available.map(m=><option key={m.id} value={m.id}>{m.name} — {m.email}</option>)}</select></label>{!available.length&&<p>No additional eligible users are available. Only linked Basic or Plus accounts in this organization can be assigned.</p>}<div className="rc-task-actions"><button type="button" className="rc-button" disabled={!candidate||assigned.length>=10} onClick={addUser}>Add to room</button><button type="button" className="rc-button" onClick={()=>{setAdding(false);setCandidate('');}}>Cancel adding user</button></div></div>}
        {assigned.length>=10&&<p>Room limit reached: 10 users.</p>}
      </fieldset><p className="ac-note">Adding or removing users here changes room assignments only. Their accounts and plans are unchanged. Approvals apply only to this shared room and are not inherited from a personal Plus plan. Both streaming permissions default to off. Live shared-room streaming is not connected yet. Select Save room users to save assignments and approvals.</p></>}

      {!usersOnly&&<p className="ac-note">The duration limit applies to new reservations. Existing reservations keep their original duration.</p>}{error&&<p className="ac-error" role="alert">{error}</p>}
      <div className="rc-task-actions"><button className="mc-action" disabled={busy}>{busy?'Saving…':usersOnly?'Save room users':'Save room preferences'}</button><button type="button" className="rc-button" disabled={busy} onClick={onClose}>Cancel</button></div>
    </form>}
  </TaskDialog>;
}
function RoomActionIcon({kind}) {
  return <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {kind==='users'?<><circle cx="9" cy="8" r="3"/><path d="M3 21v-2a6 6 0 0 1 12 0v2M16 5a3 3 0 0 1 0 6m3 10v-2a6 6 0 0 0-3-5"/></>:kind==='calendar'?<><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4m10-4v4M3 11h18M7 15h2m6 0h2m-10 3h2"/></>:<><path d="m15 5 4 4M4 20l4-1L20 7a2.8 2.8 0 0 0-4-4L4 15z"/><path d="m4 15 4 4"/></>}
  </svg>;
}
function AddRoom({request,base,onClose,onCreated}) {
  const [name,setName]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');
  async function create(e){
    e.preventDefault();if(busy)return;setBusy(true);setError('');
    try{const r=await request(base,{method:'POST',body:JSON.stringify({name})});onCreated({id:r.id,name:name.trim()});}
    catch(e){setError(e.message);}finally{setBusy(false);}
  }
  return <TaskDialog title="Add shared room" busy={busy} onClose={onClose}>
    <form className="rc-create" onSubmit={create}><p>This creates a test calendar only. It does not purchase or activate a Pro subscription.</p><label>Room name<input required maxLength={80} disabled={busy} value={name} onChange={e=>setName(e.target.value)}/></label>{error&&<p className="ac-error" role="alert">{error}</p>}<div className="rc-task-actions"><button type="submit" className="mc-action" disabled={busy}>{busy?'Submitting…':'Submit'}</button><button type="button" className="rc-button" disabled={busy} onClick={onClose}>Cancel</button></div></form>
  </TaskDialog>;
}
function ReserveRoom({room,request,endpoint,onClose,onSaved,onReturnToMeetings}) {
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
  return <TaskDialog title={saved?'Reservation saved':'Create reservation'} busy={busy} onClose={saved&&onReturnToMeetings?onReturnToMeetings:onClose}>
    {saved ? <section className="rc-confirmation"><p role="status">{saved.message}</p><dl><dt>Room</dt><dd>{room.name}</dd><dt>Meeting</dt><dd>{saved.title}</dd><dt>When</dt><dd>{fullDate(saved.startsAt)} · {time(saved.startsAt)} – {new Date(saved.endsAt).toDateString()!==new Date(saved.startsAt).toDateString()?dayLabel(new Date(saved.endsAt))+' ':''}{time(saved.endsAt)} ({zone})</dd></dl><div className="rc-task-actions"><button className="mc-action" onClick={another}>Create another reservation</button><button className="rc-button" onClick={onReturnToMeetings||onClose}>{onReturnToMeetings?'Close — return to upcoming meetings':'Close — return to calendar'}</button></div></section> :
    <form className="rc-reserve" onSubmit={save}><p><strong>{room.name}</strong> · maximum {room.max_minutes} minutes</p><fieldset disabled={busy} className="rc-fields"><label>Meeting title<input required maxLength={120} value={title} onChange={e=>setTitle(e.target.value)}/></label><label>Start ({zone})<input required type="datetime-local" value={start} onChange={e=>setStart(e.target.value)}/></label><label>Duration (minutes)<input required type="number" min="15" max={room.max_minutes} value={duration} onChange={e=>setDuration(e.target.value)}/></label></fieldset><p className="ac-note">Test reservation only. No live meeting or invitation is created.</p>{error&&<p className="ac-error" role="alert">{error}</p>}<div className="rc-task-actions"><button disabled={busy} className="mc-action">{busy?'Saving…':'Save test reservation'}</button><button type="button" className="rc-button" disabled={busy} onClick={onClose}>Cancel — return to calendar</button></div></form>}
  </TaskDialog>;
}
function Calendar({room,request,base,onBack,onPreferences,canManage,initialDate,onUpcoming}) {
  const [first,setFirst]=useState(()=>dateValue(initialDate?new Date(initialDate):new Date())),[rows,setRows]=useState([]),[revision,setRevision]=useState(0);
  const [error,setError]=useState(''),[message,setMessage]=useState(''),[loading,setLoading]=useState(true),[cancelling,setCancelling]=useState(false),[reserving,setReserving]=useState(false);
  const titleRef=useRef(null);
  useEffect(()=>{titleRef.current?.focus({preventScroll:true});},[]);
  const endpoint=base+'/'+encodeURIComponent(room.id)+'/reservations';
  useEffect(()=>{
    let live=true;setError('');setLoading(true);
    const from=atMidnight(first),to=addDays(from,7);
    request(endpoint+'?'+new URLSearchParams({from:from.toISOString(),to:to.toISOString()})).then(d=>{if(live)setRows(d.reservations.map(r=>canManage?r:{...r,title:r.mine?r.title:'Reserved',canCancel:r.mine&&r.canCancel}));}).catch(e=>{if(live){setError(e.message);setRows([]);}}).finally(()=>{if(live)setLoading(false);});
    return()=>{live=false;};
  },[endpoint,first,revision,request,canManage]);
  async function cancel(id){
    setCancelling(true);setError('');setMessage('');
    try{await request(endpoint+'/'+encodeURIComponent(id),{method:'DELETE',body:'{}'});setMessage('Test reservation cancelled.');setRevision(n=>n+1);}
    catch(e){setError(e.message);}finally{setCancelling(false);}
  }
  function openReservation(){setMessage('');setReserving(true);}
  const days=Array.from({length:7},(_,i)=>addDays(atMidnight(first),i));
  return <section className="rc-calendar">
    <header className="rc-local-nav"><div>{onUpcoming&&<button className="rc-button" onClick={onUpcoming}>← Upcoming meetings</button>}<button className="rc-button" onClick={onBack}>← Back to shared rooms</button><h3 ref={titleRef} tabIndex={-1}>{room.name}</h3></div><div className="rc-task-actions">{canManage&&<button className="rc-button" onClick={onPreferences}>Room preferences</button>}{room.canReserve&&<button className="mc-action" disabled={cancelling} onClick={openReservation}>Create reservation</button>}</div></header>
    <p className="ac-note">Pro shared room · maximum {room.max_minutes} minutes per reservation. Times shown in {zone}.</p>
    <div className="rc-toolbar"><button type="button" onClick={()=>setFirst(dateValue(addDays(atMidnight(first),-7)))}>← Previous week</button><label>Week beginning<input type="date" required value={first} onChange={e=>{if(e.target.value)setFirst(e.target.value);}}/></label><button type="button" onClick={()=>setFirst(dateValue(addDays(atMidnight(first),7)))}>Next week →</button></div>
    {loading&&<p role="status">Loading reservations…</p>}{error&&<p className="ac-error" role="alert">{error}</p>}{message&&<p role="status">{message}</p>}
    <div className="rc-week" aria-label="Seven-day room availability">{days.map(day=>{const next=addDays(day,1),bookings=rows.filter(r=>new Date(r.startsAt)<next&&new Date(r.endsAt)>day);return <article key={dateValue(day)}><h4>{dayLabel(day)}</h4>{bookings.length?bookings.map(r=><div className={'rc-booking'+(r.mine?' rc-mine':'')} key={r.id}><strong>{r.title}</strong><span>{new Date(r.startsAt)<day?'Continues':time(r.startsAt)} – {new Date(r.endsAt)>next?'next day':time(r.endsAt)}</span>{r.mine&&<small>Your reservation</small>}{r.canCancel&&<button disabled={cancelling} onClick={()=>cancel(r.id)}>Cancel reservation</button>}</div>):<p className="ac-note">No reservations</p>}</article>;})}</div>
    {!room.canReserve&&<p className="ac-note">Your administrator must assign your linked Basic or Plus account before you can reserve this room.</p>}
    <footer className="rc-task-actions rc-calendar-footer"><button className="rc-button" onClick={onBack}>Back to shared rooms</button>{room.canReserve&&<button className="mc-action" disabled={cancelling} onClick={openReservation}>Create reservation</button>}</footer>
    {reserving&&<ReserveRoom room={room} request={request} endpoint={endpoint} onClose={()=>setReserving(false)} onSaved={()=>setRevision(n=>n+1)} onReturnToMeetings={onUpcoming}/>}
  </section>;
}
function MeetingFeatures({permissions={}}) {
  return <div className="rc-meeting-features"><span className={permissions.youtubeStreaming?'rc-feature-approved':''}>YouTube streaming: {permissions.youtubeStreaming?'Approved':'Not approved'}</span><span className={permissions.liveStreaming?'rc-feature-approved':''}>Live streaming: {permissions.liveStreaming?'Approved':'Not approved'}</span></div>;
}
function HostRoomMeetings({workspaceId,request,onReserve,onCalendar}) {
  const [data,setData]=useState(null),[error,setError]=useState(''),[revision,setRevision]=useState(0),[loading,setLoading]=useState(true);
  const [selected,setSelected]=useState(null),[task,setTask]=useState(''),[busy,setBusy]=useState(false),[taskError,setTaskError]=useState(''),[notice,setNotice]=useState('');
  const heading=useRef(null),base='/api/workspaces/'+encodeURIComponent(workspaceId);
  useEffect(()=>{heading.current?.focus({preventScroll:true});},[]);
  useEffect(()=>{
    let live=true;setLoading(true);setError('');
    request(base+'/room-meetings').then(d=>{if(live)setData(d);}).catch(e=>{if(live)setError(e.message);}).finally(()=>{if(live)setLoading(false);});
    return()=>{live=false;};
  },[base,revision,request]);
  function open(meeting,next){setSelected(meeting);setTaskError('');setTask(next);}
  function close(){if(!busy){setTask('');setTaskError('');}}
  async function cancel(){
    if(busy)return;setBusy(true);setTaskError('');
    try{await request(base+'/room-calendars/'+encodeURIComponent(selected.roomId)+'/reservations/'+encodeURIComponent(selected.id),{method:'DELETE',body:'{}'});setNotice('Reservation cancelled: '+selected.title+'.');setTask('');setData(d=>({...d,meetings:d.meetings.filter(m=>m.id!==selected.id)}));setRevision(n=>n+1);}
    catch(e){setTaskError(e.message);}finally{setBusy(false);}
  }
  return <section className="rc-host-meetings"><header className="rc-room-list-header"><h2 ref={heading} tabIndex={-1}>My upcoming room meetings</h2><p>Your reservations across the shared Pro rooms assigned to you.</p></header>
    <div className="rc-table-toolbar"><button className="mc-action" onClick={onReserve}>Reserve a room</button><button className="rc-button" disabled={loading} onClick={()=>setRevision(n=>n+1)}>Refresh meetings</button></div>
    <p className="ac-note">Times shown in {zone}. Feature indicators show your administrator’s approvals, not an active broadcast.</p>
    {notice&&<p className="rc-room-notice" role="status">{notice}</p>}{loading&&<p role="status">Loading upcoming meetings…</p>}{error&&<div className="ac-error" role="alert">{error} <button className="rc-button" onClick={()=>setRevision(n=>n+1)}>Retry meetings</button></div>}
    {data&&!error&&<div className="rc-rooms-table-wrap" role="region" aria-label="Upcoming shared-room meetings" tabIndex={0}><table className="rc-rooms-table rc-meetings-table"><caption className="rlc-sr-only">My upcoming shared-room reservations</caption><thead><tr><th scope="col">Meeting</th><th scope="col">Room</th><th scope="col">Date and time</th><th scope="col">Feature approvals</th><th scope="col">Actions</th></tr></thead><tbody>
      {data.meetings.map(m=><tr key={m.id}><th scope="row">{m.title}<small className="rc-meeting-status">{m.status==='in_progress_reservation'?'Reserved time in progress':'Upcoming'} · test reservation</small></th><td>{m.roomName}</td><td><time dateTime={m.startsAt}>{fullDate(m.startsAt)}<br/>{time(m.startsAt)}</time> – <time dateTime={m.endsAt}>{new Date(m.startsAt).toDateString()!==new Date(m.endsAt).toDateString()?fullDate(m.endsAt)+' ':''}{time(m.endsAt)}</time></td><td><MeetingFeatures permissions={m.permissions}/></td><td><div className="rc-meeting-actions"><button className="rc-button" aria-label={'View details for '+m.title} onClick={()=>open(m,'details')}>View details</button><button className="rc-button" aria-label={'View calendar for '+m.title} onClick={()=>onCalendar(m.roomId,m.startsAt)}>Calendar</button>{m.canCancel&&<button className="rc-button" aria-label={'Cancel reservation for '+m.title} onClick={()=>open(m,'cancel')}>Cancel</button>}</div></td></tr>)}
      {!data.meetings.length&&<tr><td colSpan={5} className="rc-table-empty"><strong>No upcoming room meetings.</strong> Select Reserve a room to view your assigned rooms and schedule a reservation.</td></tr>}
    </tbody></table></div>}
    {task&&selected&&<TaskDialog title={task==='cancel'?'Cancel reservation':'Meeting details'} busy={busy} onClose={close}>
      <dl><dt>Meeting</dt><dd>{selected.title}</dd><dt>Room</dt><dd>{selected.roomName}</dd><dt>When</dt><dd>{fullDate(selected.startsAt)} · {time(selected.startsAt)} – {new Date(selected.startsAt).toDateString()!==new Date(selected.endsAt).toDateString()?fullDate(selected.endsAt)+' ':''}{time(selected.endsAt)} ({zone})</dd></dl>
      {task==='cancel'?<><p>Cancel this reservation and release the room’s reserved time? No cancellation emails will be sent for this test reservation.</p>{taskError&&<p className="ac-error" role="alert">{taskError}</p>}<div className="rc-task-actions"><button className="mc-action" disabled={busy} onClick={cancel}>{busy?'Cancelling…':'Confirm cancellation'}</button><button className="rc-button" disabled={busy} onClick={close}>Keep reservation</button></div></>:<><h4>Shared-room feature approvals</h4><MeetingFeatures permissions={selected.permissions}/><p className="ac-note">These are permissions for your account in this room. No broadcast has been configured for this test reservation.</p><h4>Meeting tools</h4><p>Starting a shared-room meeting, adding documents and sending participant invitations are not available yet.</p><div className="rc-task-actions"><button className="rc-button" disabled>Start meeting</button><button className="rc-button" disabled>Add documents</button><button className="rc-button" disabled>Add participants</button></div><div className="rc-task-actions"><button className="mc-action" onClick={()=>onCalendar(selected.roomId,selected.startsAt)}>View room calendar</button><button className="rc-button" onClick={close}>Close details</button></div></>}
    </TaskDialog>}
  </section>;
}
export default function RoomCalendar({workspaceId,request,administration=false,canManage=administration}) {
  const [data,setData]=useState(null),[error,setError]=useState(''),[revision,setRevision]=useState(0),[selected,setSelected]=useState('');
  const [view,setView]=useState(canManage?'rooms':'upcoming'),[task,setTask]=useState(null),[notice,setNotice]=useState(''),[refreshing,setRefreshing]=useState(false);
  const [calendarDate,setCalendarDate]=useState('');
  const heading=useRef(null),returnFocus=useRef(null),root=useRef(null);
  const base='/api/workspaces/'+encodeURIComponent(workspaceId)+'/room-calendars';
  useEffect(()=>{
    let live=true;setError('');setRefreshing(true);
    request(base).then(d=>{if(live)setData(canManage?d:{...d,rooms:d.rooms.filter(r=>r.canReserve),members:undefined});}).catch(e=>{if(live)setError(e.message);}).finally(()=>{if(live)setRefreshing(false);});
    return()=>{live=false;};
  },[base,revision,request,canManage]);
  useEffect(()=>{root.current?.closest('.ac-workspace')?.scrollTo?.({top:0,left:0});if(view==='rooms')heading.current?.focus({preventScroll:true});},[view]);
  const room=data?.rooms.find(r=>r.id===selected);
  const refresh=()=>setRevision(n=>n+1);
  function openCalendar(id,startsAt=''){setCalendarDate(startsAt);setNotice('');returnFocus.current=document.activeElement;setSelected(id);setView('calendar');}
  function back(){setView('rooms');setTask(null);requestAnimationFrame(()=>{if(returnFocus.current?.isConnected)returnFocus.current.focus({preventScroll:true});else heading.current?.focus({preventScroll:true});});}
  function manageUsers(id){setNotice('');setSelected(id);setTask('users');}
  function configure(id){setNotice('');setSelected(id);setTask('settings');}
  return <div className="rc-root" ref={root}>
    <p className="rc-test-note">Test mode: calendars and reservations are saved here. Live meetings, invitations, and summary notices are not connected.</p>
    {error&&<div className="ac-error" role="alert">{error} <button className="rc-button" onClick={refresh}>Retry room list</button></div>}
    {!data&&!error&&<p role="status">Loading shared rooms…</p>}
    {!canManage&&view==='upcoming'&&<HostRoomMeetings workspaceId={workspaceId} request={request} onReserve={()=>{refresh();setView('rooms');}} onCalendar={openCalendar}/>}
    {view==='rooms'&&<><header className="rc-room-list-header">{!canManage&&<button className="rc-button" onClick={()=>setView('upcoming')}>← Upcoming meetings</button>}<h2 ref={heading} tabIndex={-1}>{canManage?'Shared rooms':'Reserve a room'}</h2><p>{canManage?'Use the people icon to assign users, the calendar to view availability, or the pencil to edit room preferences.':'Use the calendar icon to view availability and create a reservation.'}</p></header>
      <div className="rc-table-toolbar">{canManage&&<button className="mc-action" onClick={()=>{setNotice('');setTask('create');}}>Add shared room</button>}{data&&<span>{data.rooms.length} {data.rooms.length===1?'room':'rooms'}</span>}</div>
      {notice&&<p className="rc-room-notice" role="status">{notice}</p>}{refreshing&&data&&<p className="ac-note" role="status">Updating shared rooms…</p>}
      {data&&<div className="rc-rooms-table-wrap" role="region" aria-label="Shared rooms table" tabIndex={0}><table className={'rc-rooms-table'+(canManage?'':' rc-rooms-member-table')}><caption className="rlc-sr-only">Shared Pro rooms and available actions</caption><thead><tr><th scope="col">Room name</th><th scope="col">Plan</th><th scope="col">Maximum duration</th>{canManage&&<th scope="col" className="rc-action-column">Users</th>}<th scope="col" className="rc-action-column">Calendar</th>{canManage&&<th scope="col" className="rc-action-column">Preferences</th>}</tr></thead><tbody>
        {data.rooms.map(r=><tr key={r.id}><th scope="row">{r.name}</th><td>Pro</td><td>{r.max_minutes} minutes</td>{canManage&&<td className="rc-action-column"><button type="button" className="rc-row-action" aria-label={'Manage users for '+r.name} title="Manage room users" onClick={()=>manageUsers(r.id)}><RoomActionIcon kind="users"/></button></td>}<td className="rc-action-column"><button type="button" className="rc-row-action" aria-label={'View calendar for '+r.name} title="View calendar" onClick={()=>openCalendar(r.id)}><RoomActionIcon kind="calendar"/></button></td>{canManage&&<td className="rc-action-column"><button type="button" className="rc-row-action" aria-label={'Edit room preferences for '+r.name} title="Edit room preferences" onClick={()=>configure(r.id)}><RoomActionIcon kind="edit"/></button></td>}</tr>)}
        {!data.rooms.length&&<tr><td colSpan={canManage?6:4} className="rc-table-empty"><strong>No shared rooms yet.</strong> {canManage?'Add a shared Pro test calendar to get started.':'Your organization administrator needs to assign a shared Pro room to you.'}</td></tr>}
      </tbody></table></div>}
      <footer className="rc-list-footer"><a className="rc-button" href="#account?meetings">Exit shared rooms — My Meetings</a></footer></>}
    {view==='calendar'&&(room?<Calendar key={room.id+calendarDate} initialDate={calendarDate} onUpcoming={canManage?undefined:()=>{setTask(null);setView('upcoming');}} room={room} request={request} base={base} onBack={back} canManage={canManage} onPreferences={()=>configure(room.id)}/>:data&&<div className="rc-empty"><p>This room is no longer available.</p><button className="rc-button" onClick={back}>Back to shared rooms</button></div>)}
    {task==='create'&&canManage&&<AddRoom request={request} base={base} onClose={()=>setTask(null)} onCreated={created=>{setTask(null);setNotice(created.name+' was added as a Pro test calendar. Use the people icon to assign users and the pencil to set room preferences.');refresh();}}/>}
    {(task==='settings'||task==='users')&&canManage&&room&&<RoomSettings key={room.id+task} usersOnly={task==='users'} room={room} members={data?.members||[]} request={request} base={base} onClose={()=>setTask(null)} onSaved={refresh} onCalendar={()=>{setTask(null);setView('calendar');}}/>}
  </div>;
}
