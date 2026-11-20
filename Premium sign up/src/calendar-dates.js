export function localDate(date) {
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
}
export function monthLayout(value) {
  const [year,month]=value.split('-').map(Number);
  const first=new Date(year,month-1,1),next=new Date(year,month,1),count=new Date(year,month,0).getDate();
  const cells=Array.from({length:Math.ceil((first.getDay()+count)/7)*7},(_,i)=>{
    const date=new Date(year,month-1,1-first.getDay()+i);
    return {date,key:localDate(date),inMonth:date.getMonth()===first.getMonth()};
  });
  return {first,next,cells};
}
export function dayReservations(rows,value) {
  const first=new Date(value+'T00:00:00'),next=new Date(first);next.setDate(next.getDate()+1);
  return rows.filter(r=>new Date(r.startsAt)<next&&new Date(r.endsAt)>first).sort((a,b)=>Date.parse(a.startsAt)-Date.parse(b.startsAt));
}
