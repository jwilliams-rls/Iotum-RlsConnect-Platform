import {test} from 'node:test';
import assert from 'node:assert/strict';
import {monthLayout,dayReservations,localDate} from '../src/calendar-dates.js';

test('month grids include leap day, complete weeks and six-row months without losing dates',()=>{
 const leap=monthLayout('2028-02');assert.equal(leap.cells.filter(c=>c.inMonth).length,29);assert.ok(leap.cells.some(c=>c.key==='2028-02-29'&&c.inMonth));assert.equal(leap.cells.length%7,0);assert.equal(leap.cells[0].date.getDay(),0);
 const six=monthLayout('2026-08');assert.equal(six.cells.length,42);assert.equal(six.cells.filter(c=>c.inMonth).length,31);assert.equal(localDate(monthLayout('2026-12').next),'2027-01-01');
});
test('day counts and agendas include overnight reservations but exclude meetings ending exactly at midnight',()=>{
 const rows=[{id:'overnight',startsAt:new Date(2026,10,8,23).toISOString(),endsAt:new Date(2026,10,9,1).toISOString()},{id:'midnight',startsAt:new Date(2026,10,8,22).toISOString(),endsAt:new Date(2026,10,9,0).toISOString()},{id:'next',startsAt:new Date(2026,10,9,10).toISOString(),endsAt:new Date(2026,10,9,11).toISOString()}];
 assert.deepEqual(dayReservations(rows,'2026-11-08').map(r=>r.id),['midnight','overnight']);assert.deepEqual(dayReservations(rows,'2026-11-09').map(r=>r.id),['overnight','next']);assert.equal(dayReservations(rows,'2026-11-10').length,0);
});
test('local month and day boundaries account for daylight-saving changes',()=>{
 const old=process.env.TZ;process.env.TZ='America/Los_Angeles';try{
  const fall=monthLayout('2026-11');assert.equal((fall.next-fall.first)/3600000,30*24+1);
  const rows=[{id:'late',startsAt:'2026-11-02T07:30:00.000Z',endsAt:'2026-11-02T08:00:00.000Z'}];assert.equal(dayReservations(rows,'2026-11-01').length,1);assert.equal(dayReservations(rows,'2026-11-02').length,0);
 }finally{if(old===undefined)delete process.env.TZ;else process.env.TZ=old;}
});
