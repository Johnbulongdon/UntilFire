import assert from 'node:assert/strict';
import { paydaySpending, paydayRemainder } from '../lib/payday-spending.ts';
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
console.log('13 payday estimate guards passed');
