import { useEffect, useId, useRef, useState } from 'react';
import './room-calendar.css';
import {RowAction} from './ApplicationUI';
import {monthLayout,dayReservations} from './calendar-dates';
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
const participationModes={conversation:'Everyone starts unmuted.', 'q&a':'Participants start muted and may unmute themselves. Only moderators can share screens or use the whiteboard.',presentation:'Participants cannot unmute themselves. Only moderators’ video is visible, and only moderators can share screens or use the whiteboard.'};
function MeetingOptionFields({value,onChange,existingPin=false}) {
  return <fieldset className="rc-meeting-options"><legend>Host meeting settings</legend><label>Meeting participation mode<select value={value.muteMode} onChange={e=>onChange({...value,muteMode:e.target.value})}><option value="conversation">Conversation</option><option value="q&a">Q&amp;A</option><option value="presentation">Presentation</option></select></label><p className="ac-note">{participationModes[value.muteMode]}</p><label className="rc-pin-toggle"><input type="checkbox" checked={value.requirePin} onChange={e=>onChange({...value,requirePin:e.target.checked,securityPin:''})}/>Require a meeting PIN</label>{value.requirePin&&<label>{existingPin?'New meeting PIN (leave blank to keep the current PIN)':'Meeting PIN'}<input type="password" inputMode="numeric" autoComplete="new-password" minLength={4} maxLength={12} pattern="[0-9]{4,12}" required={!existingPin} value={value.securityPin} onChange={e=>onChange({...value,securityPin:e.target.value})}/><small>Use 4–12 digits. Share the PIN with invited participants.</small></label>}<p className="ac-note">Saved as test meeting settings. Participation rules and PIN protection will apply to live conferences after the meeting integration is connected.</p></fieldset>;
}
function EditRoomMeeting({meeting,request,base,onClose,onSaved}) {
  const endpoint=base+'/room-calendars/'+encodeURIComponent(meeting.roomId)+'/reservations/'+encodeURIComponent(meeting.id);
  const [data,setData]=useState(null),[options,setOptions]=useState({muteMode:'conversation',requirePin:false,securityPin:''}),[title,setTitle]=useState(''),[description,setDescription]=useState('');
  const [error,setError]=useState(''),[busy,setBusy]=useState(false),[loading,setLoading]=useState(true),[reload,setReload]=useState(0);
  useEffect(()=>{let live=true;setLoading(true);setError('');request(endpoint).then(d=>{if(live){setData(d);setTitle(d.title);setDescription(d.description||'');setOptions({muteMode:d.muteMode,requirePin:d.requirePin,securityPin:''});}}).catch(e=>{if(live)setError(e.message);}).finally(()=>{if(live)setLoading(false);});return()=>{live=false;};},[endpoint,request,reload]);
  async function save(e){e.preventDefault();if(busy||loading||!data)return;setBusy(true);setError('');try{const result=await request(endpoint,{method:'PUT',body:JSON.stringify({title,description,muteMode:options.muteMode,requirePin:options.requirePin,...(options.requirePin&&options.securityPin?{securityPin:options.securityPin}:{}),revision:data.revision})});onSaved(result.message);}catch(e){setError(e.message);}finally{setBusy(false);}}
  return <TaskDialog title="Edit meeting" busy={busy} onClose={onClose}>{loading?<p role="status">Loading meeting settings…</p>:!data?<><p className="ac-error" role="alert">{error}</p><button className="rc-button" onClick={()=>setReload(n=>n+1)}>Retry meeting settings</button><button className="rc-button" onClick={onClose}>Close</button></>:<form className="rc-edit-meeting" onSubmit={save}><p>{meeting.roomName} · {fullDate(meeting.startsAt)} · {time(meeting.startsAt)}</p><fieldset disabled={busy}><label>Meeting title<input required maxLength={120} value={title} onChange={e=>setTitle(e.target.value)}/></label><label>Brief description (optional)<textarea maxLength={2000} rows={3} value={description} onChange={e=>setDescription(e.target.value)}/></label><MeetingOptionFields value={options} onChange={setOptions} existingPin={data.requirePin}/></fieldset><p className="ac-note">These settings are chosen by the meeting host. Streaming approvals remain under Organization Admin. This form does not change the reserved room or time.</p>{error&&<p className="ac-error" role="alert">{error}</p>}<div className="rc-task-actions"><button className="mc-action" disabled={busy}>{busy?'Saving…':'Save meeting settings'}</button><button type="button" className="rc-button" disabled={busy} onClick={onClose}>Cancel</button></div></form>}</TaskDialog>;
}
function defaultReservationStart(day){
  if(!day)return '';
  const date=day===dateValue(new Date())?new Date(Date.now()+30*60000):atMidnight(day);
  if(day!==dateValue(new Date()))date.setHours(9);
  return dateValue(date)+'T'+String(date.getHours()).padStart(2,'0')+':'+String(date.getMinutes()).padStart(2,'0');
}
function ReserveRoom({room,request,endpoint,onClose,onSaved,onReturnToMeetings,initialDay=''}) {
  const [options,setOptions]=useState({muteMode:'conversation',requirePin:false,securityPin:''});
  const [description,setDescription]=useState('');
  const [title,setTitle]=useState(''),[start,setStart]=useState(()=>defaultReservationStart(initialDay)),[duration,setDuration]=useState(Math.min(60,room.max_minutes));
  const [busy,setBusy]=useState(false),[error,setError]=useState(''),[saved,setSaved]=useState(null);
  async function save(e){
    e.preventDefault();if(busy||saved)return;setBusy(true);setError('');
    try{
      const startsAt=new Date(start).toISOString(),minutes=Number(duration);
      const d=await request(endpoint,{method:'POST',body:JSON.stringify({title,description,startsAt,durationMinutes:minutes,muteMode:options.muteMode,requirePin:options.requirePin,...(options.requirePin?{securityPin:options.securityPin}:{})})});
      setSaved({title:title.trim(),startsAt,endsAt:new Date(Date.parse(startsAt)+minutes*60000).toISOString(),message:d.message});onSaved();
    }catch(e){setError(e.message);}finally{setBusy(false);}
  }
  function another(){setDescription('');setOptions({muteMode:'conversation',requirePin:false,securityPin:''});setTitle('');setStart('');setDuration(Math.min(60,room.max_minutes));setError('');setSaved(null);}
  return <TaskDialog title={saved?'Reservation saved':'Create reservation'} busy={busy} onClose={saved&&onReturnToMeetings?onReturnToMeetings:onClose}>
    {saved ? <section className="rc-confirmation"><p role="status">{saved.message}</p><dl><dt>Room</dt><dd>{room.name}</dd><dt>Meeting</dt><dd>{saved.title}</dd><dt>When</dt><dd>{fullDate(saved.startsAt)} · {time(saved.startsAt)} – {new Date(saved.endsAt).toDateString()!==new Date(saved.startsAt).toDateString()?dayLabel(new Date(saved.endsAt))+' ':''}{time(saved.endsAt)} ({zone})</dd></dl><div className="rc-task-actions"><button className="mc-action" onClick={another}>Create another reservation</button><button className="rc-button" onClick={onReturnToMeetings||onClose}>{onReturnToMeetings?'Close — return to upcoming meetings':'Close — return to calendar'}</button></div></section> :
    <form className="rc-reserve" onSubmit={save}><p><strong>{room.name}</strong> · maximum {room.max_minutes} minutes</p><fieldset disabled={busy} className="rc-fields"><label>Meeting title<input required maxLength={120} value={title} onChange={e=>setTitle(e.target.value)}/></label><label>Brief description (optional)<textarea maxLength={2000} rows={3} value={description} onChange={e=>setDescription(e.target.value)}/></label><label>Start ({zone})<input required type="datetime-local" value={start} onChange={e=>setStart(e.target.value)}/></label><label>Duration (minutes)<input required type="number" min="15" max={room.max_minutes} value={duration} onChange={e=>setDuration(e.target.value)}/></label><MeetingOptionFields value={options} onChange={setOptions}/></fieldset><p className="ac-note">Test reservation only. No live meeting or invitation is created.</p>{error&&<p className="ac-error" role="alert">{error}</p>}<div className="rc-task-actions"><button disabled={busy} className="mc-action">{busy?'Saving…':'Save test reservation'}</button><button type="button" className="rc-button" disabled={busy} onClick={onClose}>Cancel — return to calendar</button></div></form>}
  </TaskDialog>;
}
function Calendar({room,request,base,onBack,onPreferences,canManage,initialDate,onUpcoming}) {
  const [month,setMonth]=useState(()=>dateValue(initialDate?new Date(initialDate):new Date()).slice(0,7)),[selectedDay,setSelectedDay]=useState('');
  const [rows,setRows]=useState([]),[revision,setRevision]=useState(0),[error,setError]=useState(''),[message,setMessage]=useState('');
  const [loading,setLoading]=useState(true),[cancelling,setCancelling]=useState(false),[reserving,setReserving]=useState(false),[cancelTarget,setCancelTarget]=useState(null),[cancelError,setCancelError]=useState('');
  const titleRef=useRef(null),dayHeading=useRef(null),monthTable=useRef(null),calendarRoot=useRef(null),lastDay=useRef('');
  useEffect(()=>{titleRef.current?.focus({preventScroll:true});},[]);
  useEffect(()=>{calendarRoot.current?.closest('.ac-workspace')?.scrollTo?.({top:0,left:0});if(selectedDay)dayHeading.current?.focus({preventScroll:true});else if(lastDay.current)monthTable.current?.querySelector('button[data-date="'+lastDay.current+'"]')?.focus({preventScroll:true});},[selectedDay]);
  const endpoint=base+'/'+encodeURIComponent(room.id)+'/reservations';
  useEffect(()=>{
    let live=true;setError('');setLoading(true);setRows([]);
    const {first,next}=monthLayout(month);
    request(endpoint+'?'+new URLSearchParams({from:first.toISOString(),to:next.toISOString()})).then(d=>{if(live)setRows(d.reservations.map(r=>canManage?r:{...r,title:r.mine?r.title:'Reserved',description:r.mine?r.description:'',canCancel:r.mine&&r.canCancel}));}).catch(e=>{if(live)setError(e.message);}).finally(()=>{if(live)setLoading(false);});
    return()=>{live=false;};
  },[endpoint,month,revision,request,canManage]);
  async function cancel(){
    if(cancelling)return;setCancelling(true);setCancelError('');
    try{await request(endpoint+'/'+encodeURIComponent(cancelTarget.id),{method:'DELETE',body:'{}'});setMessage('Test reservation cancelled.');setCancelTarget(null);setRevision(n=>n+1);}
    catch(e){setCancelError(e.message);}finally{setCancelling(false);}
  }
  function changeMonth(value){if(value===month)setRevision(n=>n+1);setMonth(value);setSelectedDay('');setMessage('');setLoading(true);}
  function shiftMonth(n){const d=monthLayout(month).first;d.setMonth(d.getMonth()+n);changeMonth(dateValue(d).slice(0,7));}
  function openReservation(){setMessage('');setReserving(true);}
  function showMonth(){setSelectedDay('');}
  const {first,cells}=monthLayout(month),today=dateValue(new Date()),dayRows=selectedDay?dayReservations(rows,selectedDay):[];
  const canCreate=room.canReserve&&(!selectedDay||selectedDay>=today);
  const monthTitle=first.toLocaleDateString([],{month:'long',year:'numeric'});
  return <section className="rc-calendar" ref={calendarRoot}>
    <header className="rc-local-nav rc-calendar-header"><h3 ref={titleRef} tabIndex={-1}>{room.name} Calendar</h3><div className="rc-calendar-nav-row"><nav className="rc-calendar-back-links" aria-label="Calendar navigation">{onUpcoming&&<button className="rc-button" onClick={onUpcoming}>← Upcoming meetings</button>}<button className="rc-button" onClick={onBack}>← Back to shared rooms</button></nav><div className="rc-task-actions">{canManage&&<button className="rc-button" onClick={onPreferences}>Room preferences</button>}{room.canReserve&&<button className="mc-action" disabled={cancelling||!canCreate} onClick={openReservation}>Create reservation</button>}</div></div></header>
    <p className="ac-note">Pro shared room · maximum {room.max_minutes} minutes per reservation. Times shown in {zone}. Counts include reservations that continue across midnight.</p>
    {loading&&<p role="status">Loading reservations…</p>}{error&&<div className="ac-error" role="alert">{error} <button className="rc-button" onClick={()=>setRevision(n=>n+1)}>Retry calendar</button></div>}{message&&<p role="status">{message}</p>}
    {!selectedDay?<><div className="rc-toolbar rc-month-toolbar"><button type="button" onClick={()=>shiftMonth(-1)}>← Previous month</button><h4 aria-live="polite">{monthTitle}</h4><label>Month<input type="month" value={month} onChange={e=>{if(e.target.value)changeMonth(e.target.value);}}/></label><button type="button" onClick={()=>changeMonth(today.slice(0,7))}>Today</button><button type="button" onClick={()=>shiftMonth(1)}>Next month →</button></div>
      <p className="ac-note">Select a date to see its scheduled times and meeting details.</p><div className="rc-month-wrap" ref={monthTable} tabIndex={-1}><table className="rc-month-grid" aria-label={monthTitle+' room reservations'}><thead><tr>{['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'].map(d=><th scope="col" key={d}><abbr title={d}>{d.slice(0,3)}</abbr></th>)}</tr></thead><tbody>{Array.from({length:cells.length/7},(_,week)=><tr key={week}>{cells.slice(week*7,week*7+7).map(cell=>{const count=dayReservations(rows,cell.key).length;return <td key={cell.key} className={cell.inMonth?'':'rc-month-outside'}>{cell.inMonth?<button type="button" className="rc-day-button" data-date={cell.key} disabled={loading||Boolean(error)} aria-current={cell.key===today?'date':undefined} aria-label={fullDate(cell.date)+' — '+(loading?'Loading':error?'Unavailable':count+' scheduled '+(count===1?'meeting':'meetings'))} onClick={()=>{lastDay.current=cell.key;setSelectedDay(cell.key);setMessage('');}}><span className="rc-day-number">{cell.date.getDate()}</span><span className={'rc-day-count'+(count?' rc-has-meetings':'')}>{loading?'…':error?'Unavailable':count+' '+(count===1?'meeting':'meetings')}</span></button>:<span className="rc-day-outside-number" aria-hidden="true">{cell.date.getDate()}</span>}</td>;})}</tr>)}</tbody></table></div></>:
      <section className="rc-day-agenda"><div className="rc-day-agenda-heading"><button className="rc-button" onClick={showMonth}>← Back to month</button><h4 ref={dayHeading} tabIndex={-1}>{fullDate(atMidnight(selectedDay))}</h4><p>{loading?'Loading…':error?'Schedule unavailable':dayRows.length+' scheduled '+(dayRows.length===1?'meeting':'meetings')}</p></div>
        {!loading&&!error&&<div className="rc-rooms-table-wrap"><table className="app-data-table rc-day-table"><caption className="rlc-sr-only">Scheduled meetings for {fullDate(atMidnight(selectedDay))}</caption><thead><tr><th scope="col">Time</th><th scope="col">Meeting</th><th scope="col">Brief description</th><th scope="col">Actions</th></tr></thead><tbody>{dayRows.map(r=><tr key={r.id}><td>{new Date(r.startsAt)<atMidnight(selectedDay)?'Continues from '+fullDate(r.startsAt):time(r.startsAt)} – {new Date(r.endsAt)>addDays(atMidnight(selectedDay),1)?'continues to '+fullDate(r.endsAt):time(r.endsAt)}</td><th scope="row">{r.title}{r.mine&&<small className="rc-meeting-status">Your reservation</small>}</th><td className="rc-description">{r.description||(!r.mine&&!canManage?'Private meeting':'No description provided.')}</td><td>{r.canCancel&&<RowAction kind="cancel" label={'Cancel reservation for '+r.title} title="Cancel reservation" onClick={()=>{setCancelError('');setCancelTarget(r);}}/>}</td></tr>)}{!dayRows.length&&<tr><td colSpan={4}>No meetings scheduled for this date.</td></tr>}</tbody></table></div>}
      </section>}
    {!room.canReserve&&<p className="ac-note">Your administrator must assign your linked Basic or Plus account before you can reserve this room.</p>}
    <footer className="rc-task-actions rc-calendar-footer">{selectedDay&&<button className="rc-button" onClick={showMonth}>Back to month</button>}<button className="rc-button" onClick={onBack}>Back to shared rooms</button>{room.canReserve&&<button className="mc-action" disabled={cancelling||!canCreate} onClick={openReservation}>Create reservation</button>}</footer>
    {reserving&&<ReserveRoom room={room} request={request} endpoint={endpoint} initialDay={selectedDay} onClose={()=>setReserving(false)} onSaved={()=>setRevision(n=>n+1)} onReturnToMeetings={onUpcoming}/>}
    {cancelTarget&&<TaskDialog title="Cancel reservation" busy={cancelling} onClose={()=>{if(!cancelling)setCancelTarget(null);}}><p>Cancel <strong>{cancelTarget.title}</strong> and release its reserved time?</p>{cancelError&&<p className="ac-error" role="alert">{cancelError}</p>}<div className="rc-task-actions"><button className="mc-action" disabled={cancelling} onClick={cancel}>Confirm cancellation</button><button className="rc-button" disabled={cancelling} onClick={()=>setCancelTarget(null)}>Keep reservation</button></div></TaskDialog>}
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
    {data&&!error&&<div className="rc-rooms-table-wrap" role="region" aria-label="Upcoming shared-room meetings" tabIndex={0}><table className="app-data-table rc-rooms-table rc-meetings-table"><caption className="rlc-sr-only">My upcoming shared-room reservations</caption><thead><tr><th scope="col">Meeting</th><th scope="col">Room</th><th scope="col">Date and time</th><th scope="col">Feature approvals</th><th scope="col">Actions</th></tr></thead><tbody>
      {data.meetings.map(m=><tr key={m.id}><th scope="row">{m.title}<small className="rc-meeting-status">{m.status==='in_progress_reservation'?'Reserved time in progress':'Upcoming'} · test reservation</small></th><td>{m.roomName}</td><td><time dateTime={m.startsAt}>{fullDate(m.startsAt)}<br/>{time(m.startsAt)}</time> – <time dateTime={m.endsAt}>{new Date(m.startsAt).toDateString()!==new Date(m.endsAt).toDateString()?fullDate(m.endsAt)+' ':''}{time(m.endsAt)}</time></td><td><MeetingFeatures permissions={m.permissions}/></td><td><div className="rc-meeting-actions"><RowAction kind="details" label={'View details for '+m.title} onClick={()=>open(m,'details')} title="View meeting details"/>{m.canEdit&&<RowAction kind="edit" label={'Edit meeting '+m.title} onClick={()=>open(m,'edit')} title="Edit meeting"/>}<RowAction kind="calendar" title="View room calendar" label={'View calendar for '+m.title} onClick={()=>onCalendar(m.roomId,m.startsAt)}/>{m.canCancel&&<RowAction kind="cancel" title="Cancel reservation" label={'Cancel reservation for '+m.title} onClick={()=>open(m,'cancel')}/>}</div></td></tr>)}
      {!data.meetings.length&&<tr><td colSpan={5} className="rc-table-empty"><strong>No upcoming room meetings.</strong> Select Reserve a room to view your assigned rooms and schedule a reservation.</td></tr>}
    </tbody></table></div>}
    {task==='edit'&&selected&&<EditRoomMeeting meeting={selected} request={request} base={base} onClose={close} onSaved={message=>{setTask('');setNotice(message);setRevision(n=>n+1);}}/>}
    {task&&task!=='edit'&&selected&&<TaskDialog title={task==='cancel'?'Cancel reservation':'Meeting details'} busy={busy} onClose={close}>
      <dl><dt>Meeting</dt><dd>{selected.title}</dd><dt>Room</dt><dd>{selected.roomName}</dd><dt>When</dt><dd>{fullDate(selected.startsAt)} · {time(selected.startsAt)} – {new Date(selected.startsAt).toDateString()!==new Date(selected.endsAt).toDateString()?fullDate(selected.endsAt)+' ':''}{time(selected.endsAt)} ({zone})</dd></dl>
      {task==='cancel'?<><p>Cancel this reservation and release the room’s reserved time? No cancellation emails will be sent for this test reservation.</p>{taskError&&<p className="ac-error" role="alert">{taskError}</p>}<div className="rc-task-actions"><button className="mc-action" disabled={busy} onClick={cancel}>{busy?'Cancelling…':'Confirm cancellation'}</button><button className="rc-button" disabled={busy} onClick={close}>Keep reservation</button></div></>:<><h4>Shared-room feature approvals</h4><MeetingFeatures permissions={selected.permissions}/><p className="ac-note">These are permissions for your account in this room. No broadcast has been configured for this test reservation.</p><h4>Host meeting settings</h4><p>Participation: {selected.muteMode==='q&a'?'Q&A':selected.muteMode==='presentation'?'Presentation':'Conversation'} · Meeting PIN: {selected.requirePin?'Required':'Not required'}</p>{selected.canEdit&&<button className="rc-button" onClick={()=>setTask('edit')}>Edit meeting</button>}<h4>Meeting tools</h4><p>Starting a shared-room meeting, adding documents and sending participant invitations are not available yet.</p><div className="rc-task-actions"><button className="rc-button" disabled>Start meeting</button><button className="rc-button" disabled>Add documents</button><button className="rc-button" disabled>Add participants</button></div><div className="rc-task-actions"><button className="mc-action" onClick={()=>onCalendar(selected.roomId,selected.startsAt)}>View room calendar</button><button className="rc-button" onClick={close}>Close details</button></div></>}
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
      {data&&<div className="rc-rooms-table-wrap" role="region" aria-label="Shared rooms table" tabIndex={0}><table className={'app-data-table rc-rooms-table'+(canManage?'':' rc-rooms-member-table')}><caption className="rlc-sr-only">Shared Pro rooms and available actions</caption><thead><tr><th scope="col">Room name</th><th scope="col">Plan</th><th scope="col">Maximum duration</th>{canManage&&<th scope="col" className="rc-action-column">Users</th>}<th scope="col" className="rc-action-column">Calendar</th>{canManage&&<th scope="col" className="rc-action-column">Preferences</th>}</tr></thead><tbody>
        {data.rooms.map(r=><tr key={r.id}><th scope="row">{r.name}</th><td>Pro</td><td>{r.max_minutes} minutes</td>{canManage&&<td className="rc-action-column"><RowAction kind="users" label={'Manage users for '+r.name} title="Manage room users" onClick={()=>manageUsers(r.id)}/></td>}<td className="rc-action-column"><RowAction kind="calendar" label={'View calendar for '+r.name} title="View calendar" onClick={()=>openCalendar(r.id)}/></td>{canManage&&<td className="rc-action-column"><RowAction kind="edit" label={'Edit room preferences for '+r.name} title="Edit room preferences" onClick={()=>configure(r.id)}/></td>}</tr>)}
        {!data.rooms.length&&<tr><td colSpan={canManage?6:4} className="rc-table-empty"><strong>No shared rooms yet.</strong> {canManage?'Add a shared Pro test calendar to get started.':'Your organization administrator needs to assign a shared Pro room to you.'}</td></tr>}
      </tbody></table></div>}
      <footer className="rc-list-footer"><a className="rc-button" href="#account?meetings">Exit shared rooms — My Meetings</a></footer></>}
    {view==='calendar'&&(room?<Calendar key={room.id+calendarDate} initialDate={calendarDate} onUpcoming={canManage?undefined:()=>{setTask(null);setView('upcoming');}} room={room} request={request} base={base} onBack={back} canManage={canManage} onPreferences={()=>configure(room.id)}/>:data&&<div className="rc-empty"><p>This room is no longer available.</p><button className="rc-button" onClick={back}>Back to shared rooms</button></div>)}
    {task==='create'&&canManage&&<AddRoom request={request} base={base} onClose={()=>setTask(null)} onCreated={created=>{setTask(null);setNotice(created.name+' was added as a Pro test calendar. Use the people icon to assign users and the pencil to set room preferences.');refresh();}}/>}
    {(task==='settings'||task==='users')&&canManage&&room&&<RoomSettings key={room.id+task} usersOnly={task==='users'} room={room} members={data?.members||[]} request={request} base={base} onClose={()=>setTask(null)} onSaved={refresh} onCalendar={()=>{setTask(null);setView('calendar');}}/>}
  </div>;
}
