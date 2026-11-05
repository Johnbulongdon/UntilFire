import assert from 'node:assert/strict';
import { paydaySpending, paydayRemainder, recentRate, safeToSpendToday } from '../lib/payday-spending.ts';
const close=(a,b)=>assert.ok(Math.abs(a-b)<.000001,`${a} != ${b}`);
const bill={description:'Rent',category:'housing',usd:1500,due:'2026-11-03',recurrence:'monthly'};
const base={today:new Date(2026,10,1),days:14,rows:[],bills:[bill],monthlyBudget:2150,budget:{housing:1500,food:650}};
close(paydaySpending(base).amount,650/30*14);
close(paydaySpending({...base,monthlyBudget:650,budget:{food:650}}).amount,650/30*14); // bill absent from budget must not erase groceries
close(paydayRemainder(1997,650),1347);
close(paydayRemainder(1997,650,100),1247);
close(paydayRemainder(200,650),-450);
assert.equal(paydayRemainder(1997,null),null);
assert.equal(paydayRemainder(1997,-1),null);
assert.equal(paydayRemainder(1997,NaN),null);
assert.equal(paydayRemainder(1997,650,-50),null);
assert.equal(paydaySpending({...base,monthlyBudget:null,budget:undefined}),null);
close(paydaySpending({...base,monthlyBudget:0,budget:{housing:1500}}).amount,0); // known zero differs from missing
const rows=[8,9,10].flatMap(m=>[{date:`2026-${String(m).padStart(2,'0')}-03`,usd:1500,description:'Rent',category:'housing'},{date:`2026-${String(m).padStart(2,'0')}-10`,usd:new Date(2026,m,0).getDate()*20,description:'Food',category:'food'}]);
const history=paydaySpending({...base,rows});
assert.equal(history.source,'history');close(history.amount,280); // rent excluded from the historical rate
const cross=paydaySpending({...base,today:new Date(2026,9,31),days:2});close(cross.amount,650/31+650/30);
// D-129: the last 30 days, without the trip, the vet bill or the rent.
const day=(d)=>`2026-10-${String(d).padStart(2,'0')}`;
const recent=[{date:'2026-08-01',usd:40,description:'Old',category:'food'},
  ...Array.from({length:30},(_,i)=>({date:day(i+2),usd:12,description:'Lunch',category:'food'})),
  {date:day(5),usd:900,description:'Flights',category:'travel'},{date:day(9),usd:155,description:'Vet',category:'pets'},
  {date:day(11),usd:1500,description:'Rent',category:'housing'}];
close(recentRate(recent,[bill],new Date(2026,10,1)),12);
close(paydaySpending({...base,rows:recent}).amount,12*14);
assert.equal(recentRate(recent.slice(1),[bill],new Date(2026,10,1)),null); // under 30 days of history
assert.equal(recentRate(recent.slice(0,6),[bill],new Date(2026,10,1)),null); // too few payments
// Safe to spend today: the stricter of payday cash and the month's budget.
assert.equal(safeToSpendToday({payday:{remaining:2116,days:10},budget:{left:855,daysLeft:26}}),33); // matches Budget's "about $33 a day"
assert.equal(safeToSpendToday({payday:{remaining:300,days:10},budget:{left:855,daysLeft:26}}),30);
assert.equal(safeToSpendToday({payday:{remaining:2116,days:10},budget:null}),212);
assert.equal(safeToSpendToday({payday:null,budget:{left:-40,daysLeft:26}}),0);
assert.equal(safeToSpendToday({payday:{remaining:null,days:10},budget:null}),null);
console.log('22 payday estimate guards passed');
