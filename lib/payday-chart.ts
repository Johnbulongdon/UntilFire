import type { PaydayLine } from './payday-line';

/** Presentation only: actual future bill dates and unchanged cash amounts. */
export function paydayChart(line: PaydayLine) {
  const current = line.past[line.today] ?? line.end;
  const points = [{ day: line.today, balance: current }, ...line.bills.map(b => ({ day: b.day, balance: b.before - b.usd }))];
  const values = points.map(p => p.balance);
  const hi = Math.max(...values, line.end, line.end<0?0:-Infinity), lo = Math.min(...values, line.end);
  const gap = Math.max(1, hi - lo, Math.abs(hi) * .05);
  const top = hi + gap * .16;
  const bottom = line.end < 0 ? Math.min(0,lo) - gap * .16 : lo - gap * .16;
  const span = Math.max(1, line.span - line.today);
  const x = (day: number) => 3 + Math.max(0,Math.min(1,(day-line.today)/span))*94;
  const y = (balance: number) => 6 + (top-balance)/Math.max(1,top-bottom)*82;
  let path = `M${x(line.today)},${y(current)}`;
  for(const b of line.bills) path += ` H${x(b.day)} V${y(b.before-b.usd)}`;
  path += ` H97`;
  return { points, current, hi, lo, x, y, path, zero:y(0), ticks:hi===lo?[hi]:[hi,(hi+lo)/2,lo] };
}

/** Closest event in screen space, including separate bills on the same day. */
export function nearestPaydayPoint(line: PaydayLine, px: number, py: number) {
  const chart=paydayChart(line);
  let best=0, distance=Infinity;
  chart.points.forEach((p,i)=>{const d=(chart.x(p.day)-px)**2+((chart.y(p.balance)-py)*.55)**2;if(d<distance){best=i;distance=d}});
  return best;
}
export function paydayBillKey(b: PaydayLine['bills'][number]) { return `${b.day}|${b.description}|${b.usd}|${b.before}`; }
export function paydayPointIso(line: PaydayLine, day: number) {
  const date = new Date(line.startIso+'T12:00:00Z'); date.setUTCDate(date.getUTCDate()+day);return date.toISOString().slice(0,10);
}
