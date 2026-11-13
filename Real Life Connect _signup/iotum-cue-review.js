// Generate a LOCAL, read-only HTML review of one Iotum meeting.
// It does not upload, change, delete or commit any meeting content.
const {createIotumClient}=require('./iotum-client');
const {mkdirSync,writeFileSync,chmodSync}=require('node:fs');
const path=require('node:path');
const conferenceId=Number(process.argv[2]);
if(!Number.isSafeInteger(conferenceId)||conferenceId<=0||process.argv.length!==3){
  console.error('Usage: node iotum-cue-review.js <positive-conference-id>');
  process.exit(1);
}
const esc=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const stringify=value=>typeof value==='string'?value:JSON.stringify(value,null,2);
function structured(value){
  if(value===undefined||value===null||value==='')return '<em>Not supplied by the API</em>';
  return '<pre>'+esc(stringify(value))+'</pre>';
}
function table(data){
  if(!Array.isArray(data)||!data.length)return '<p>No entries returned.</p>';
  const keys=[...new Set(data.flatMap(v=>v&&typeof v==='object'&&!Array.isArray(v)?Object.keys(v):['value']))];
  return '<div class="tablewrap"><table><thead><tr>'+keys.map(k=>'<th>'+esc(k)+'</th>').join('')+'</tr></thead><tbody>'+
    data.map(obj=>'<tr>'+keys.map(k=>'<td>'+structured(obj&&typeof obj==='object'&&!Array.isArray(obj)?obj[k]:obj)+'</td>').join('')+'</tr>').join('')+'</tbody></table></div>';
}
(async()=>{
  const client=createIotumClient();
  await client.authenticate();
  const response=await client.post('/conference/fetch',{conference_id:conferenceId,output:'detail'});
  const meeting=Array.isArray(response)?response.find(x=>Number(x?.conference_id)===conferenceId):response;
  if(!meeting||Number(meeting.conference_id)!==conferenceId)throw Error('Meeting identifier did not match response.');
  const recordings=Array.isArray(meeting.recordings)?meeting.recordings:[];
  const transcript=recordings.flatMap((r,recordingIndex)=>(Array.isArray(r.transcription_segments)?r.transcription_segments:[]).map((segment,index)=>({recording:recordingIndex+1,segment:index+1,...(segment&&typeof segment==='object'&&!Array.isArray(segment)?segment:{hypothesis:segment})})));
  const tags=recordings.flatMap((r,recordingIndex)=>(Array.isArray(r.transcription_tags)?r.transcription_tags:[]).map(x=>({recording:recordingIndex+1,...(x&&typeof x==='object'&&!Array.isArray(x)?x:{value:x})})));
  const actions=Array.isArray(meeting.action_items)?meeting.action_items:[];
  const meta={conference_id:meeting.conference_id,subject:meeting.subject,start_time:meeting.start_time,end_time:meeting.end_time,recording_count:recordings.length,transcript_segment_count:transcript.length,action_item_count:actions.length,transcription_tag_count:tags.length,sentiment_available:meeting.sentiment_available,sentiment_mean:meeting.sentiment_mean,sentiment_min:meeting.sentiment_min,sentiment_max:meeting.sentiment_max};
  // Plain text companion for easy reading, copying and sharing by the owner.
  const lines=[
    'IOTUM MEETING DATA — CONFERENCE '+conferenceId,
    '',
    'MEETING INFORMATION',
    ...Object.entries(meta).map(([key,value])=>key+': '+String(value??'')),
    '',
    'ACTION ITEMS ('+actions.length+')',
    ...actions.flatMap((item,i)=>['',String(i+1)+'.',...Object.entries(item&&typeof item==='object'?item:{value:item}).map(([key,value])=>key+': '+stringify(value))]),
    '',
    'TRANSCRIPTION TAGS ('+tags.length+')',
    ...tags.map((item,i)=>(i+1)+'. '+stringify(item)),
    '',
    'TRANSCRIPT ('+transcript.length+' segments)',
    ...transcript.map((item,i)=>(i+1)+'. '+stringify(item)),
    '',
    'NOTE: Cue Overview and Detailed Summary were not found as dedicated fields in this API response.',
    'NOTE: This file contains private meeting data. Do not commit or publicly share it.'
  ];
  const html=`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><meta name="referrer" content="no-referrer"><title>Local Cue review ${esc(conferenceId)}</title><style>
    :root{font:15px/1.5 system-ui,sans-serif;color:#18243a;background:#f6f8fc}body{margin:0 auto;max-width:1150px;padding:26px}h1{font-size:27px}h2{margin:0 0 12px;font-size:20px}section{background:#fff;padding:22px;margin:18px 0;border:1px solid #d8dfeb;border-radius:12px}table{width:100%;border-collapse:collapse}th,td{border:1px solid #dbe1ec;text-align:left;vertical-align:top;padding:8px}th{background:#eef2f8}pre{margin:0;white-space:pre-wrap;overflow-wrap:anywhere;font:13px/1.45 ui-monospace,monospace}.tablewrap{overflow-x:auto}small{color:#58677d}button{padding:9px 14px;cursor:pointer}summary{cursor:pointer;font-weight:600}details{margin-top:12px}.hint{padding:12px;background:#fff4d9;border-radius:8px}</style></head><body>
    <h1>Iotum Cue meeting data — local review</h1>
    <p class="hint">Private local file. Contains actual transcript and action item content. Do not upload, commit, or publish it. Recording URLs, tokens and moderator links are intentionally excluded.</p>
    <section><h2>Meeting metadata</h2>${table(Object.entries(meta).map(([field,value])=>({field,value})))}</section>
    <section><h2>Cue action items (${actions.length})</h2>${table(actions)}</section>
    <section><h2>Transcript segments (${transcript.length})</h2><p><small>Ordered as returned by the API; compare against Cue's displayed transcript.</small></p>${table(transcript)}</section>
    <section><h2>Transcription tags (${tags.length})</h2>${table(tags)}</section>
    <section><h2>AI overview and detailed summary</h2><p>The conference/fetch response did not include dedicated fields for these items. This is not proof that another supported endpoint cannot supply them.</p></section>
    </body></html>`;
  const dir=path.join(__dirname,'var');
  mkdirSync(dir,{recursive:true,mode:0o700});
  const file=path.join(dir,`cue-review-${conferenceId}.html`);
  writeFileSync(file,html,{encoding:'utf8',mode:0o600});
  const txtFile=path.join(dir,`cue-review-${conferenceId}.txt`);
  writeFileSync(txtFile,lines.join('\\n').replaceAll('\\n','\n'),{encoding:'utf8',mode:0o600});
  chmodSync(txtFile,0o600);
  chmodSync(file,0o600);
  console.log('Local text report created: '+txtFile);
  console.log('Action items: '+actions.length+'; transcript segments: '+transcript.length+'; tags: '+tags.length);
  console.log('Open the HTML file in your Codespace file explorer to compare it with Cue. Do not commit or share this file.');
})().catch(e=>{console.error('Review failed: '+e.message);process.exitCode=1;});
