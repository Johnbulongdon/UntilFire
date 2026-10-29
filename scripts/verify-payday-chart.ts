import assert from 'node:assert/strict';
import { paydayChart, nearestPaydayPoint, paydayPointIso } from '../lib/payday-chart.ts';
import type { PaydayLine } from '../lib/payday-line.ts';
const line:PaydayLine={span:30,today:16,startIso:'2026-10-16',past:Array(17).fill(2400),dips:[],bills:[{day:18,usd:25,before:2400,description:'Phone',category:'phone'},{day:18,usd:18,before:2375,description:'Streaming',category:'stream'},{day:18,usd:15,before:2357,description:'Music',category:'music'},{day:19,usd:40,before:2342,description:'Internet',category:'internet'},{day:19,usd:12,before:2302,description:'Cloud',category:'cloud'},{day:20,usd:55,before:2290,description:'Electricity',category:'power'},{day:26,usd:250,before:2235,description:'Insurance',category:'insurance'}],end:1985};
const before=JSON.stringify(line),chart=paydayChart(line);
assert.equal(chart.points.length,8);
assert.equal(chart.points.at(-1)?.balance,1985);
chart.points.forEach((p,i)=>assert.equal(nearestPaydayPoint(line,chart.x(p.day),chart.y(p.balance)),i));
assert.ok(chart.x(26)-chart.x(19)>chart.x(19)-chart.x(18), "Calendar gaps retain their relative spacing");
assert.equal(paydayPointIso(line,18),'2026-11-03');
assert.equal(paydayPointIso({...line,startIso:'2026-12-20'},18),'2027-01-07');
assert.equal(JSON.stringify(line),before);
for(const scenario of [{...line,bills:[],end:2400},{...line,past:[],bills:[],end:0},{...line,past:Array(17).fill(-100),bills:[{day:18,usd:400,before:-100,description:'Rent',category:'housing'}],end:-500}]){const c=paydayChart(scenario);assert.ok(!/NaN|Infinity/.test(c.path));assert.ok(c.points.every(p=>Number.isFinite(c.y(p.balance))));if(scenario.end<0)assert.ok(c.zero>=0&&c.zero<=100);}
console.log('Payday chart: every same-day bill, exact balances/dates, empty/zero/short states and immutable data passed.');

