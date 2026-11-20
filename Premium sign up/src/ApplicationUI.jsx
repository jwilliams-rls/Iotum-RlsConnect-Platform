import './application-ui.css';

export function ActionIcon({kind}) {
  return <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {kind==='details'?<><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></>:kind==='cancel'?<><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4m10-4v4M3 11h18m-12 3 6 5m0-5-6 5"/></>:kind==='users'?<><circle cx="9" cy="8" r="3"/><path d="M3 21v-2a6 6 0 0 1 12 0v2M16 5a3 3 0 0 1 0 6m3 10v-2a6 6 0 0 0-3-5"/></>:kind==='calendar'?<><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4m10-4v4M3 11h18M7 15h2m6 0h2m-10 3h2"/></>:<><path d="m15 5 4 4M4 20l4-1L20 7a2.8 2.8 0 0 0-4-4L4 15z"/><path d="m4 15 4 4"/></>}
  </svg>;
}
export function RowAction({kind,label,title,onClick,disabled=false}) {
  return <button type="button" className="app-row-action rc-row-action" aria-label={label} title={title||label} onClick={onClick} disabled={disabled}><ActionIcon kind={kind}/></button>;
}
