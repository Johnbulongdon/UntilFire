/**
 * The line on Home's "Until payday" card (D-90): the cash balance from the
 * last paycheck to today, worked backwards from today's balance through the
 * money that came and went, then forward to payday stepping down only at the
 * bills still due. It ends on the card's number. Pure, so the website and the
 * phone draw the same line from the same rule.
 */

export interface PaydayRow {
  /** `YYYY-MM-DD`. */
  date: string;
  /** Money out positive, money in negative, USD. */
  out: number;
  category?: string | null;
}

export interface PaydayBill { iso: string; usd: number; description: string; category?: string | null }

export interface PaydayLine {
  /** Days from the start of the line (the last paycheck) to payday. */
  span: number;
  /** Today's index on that axis. */
  today: number;
  startIso: string;
  /** Balance at the end of each day, start to today. */
  past: number[];
  /** The biggest spends since the last paycheck: where the line dips, and by how much. */
  dips: { day: number; usd: number; category: string | null }[];
  /** Bills ahead, by day on the axis, with the balance just before each lands. */
  bills: { day: number; usd: number; before: number; description: string; category: string | null }[];
  /** What is left on payday: the card's number. */
  end: number;
}

const DAY_MS = 86_400_000;
const dayOf = (iso: string) => { const [y, m, d] = iso.split("-").map(Number); return new Date(y, m - 1, d); };
const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const between = (a: Date, b: Date) => Math.round((b.getTime() - a.getTime()) / DAY_MS);

/**
 * The line starts on the last day pay came in: the latest income row in the
 * last 35 days of at least `payMin` (most of a paycheck, not a refund). Without
 * one it starts two weeks back, so a first payday still has some history.
 */
export function paydayLine({ today, cash, paydayIso, bills, rows, payMin }: {
  today: Date;
  cash: number;
  paydayIso: string;
  bills: PaydayBill[];
  rows: PaydayRow[];
  payMin: number;
}): PaydayLine {
  const t = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const todayIso = iso(t);
  const earliest = iso(new Date(t.getTime() - 35 * DAY_MS));
  const pay = rows
    .filter((r) => r.out <= -payMin && r.date >= earliest && r.date <= todayIso)
    .sort((a, b) => b.date.localeCompare(a.date))[0];
  const start = pay ? dayOf(pay.date) : new Date(t.getTime() - 14 * DAY_MS);
  const todayIdx = between(start, t);
  const span = Math.max(todayIdx + 1, between(start, dayOf(paydayIso)));

  // Each day's net out, then walk back from today's balance.
  const net = new Array<number>(todayIdx + 1).fill(0);
  const inWindow = rows.filter((r) => r.date >= iso(start) && r.date <= todayIso);
  for (const r of inWindow) net[between(start, dayOf(r.date))] += r.out;
  const past = new Array<number>(todayIdx + 1).fill(0);
  past[todayIdx] = cash;
  for (let i = todayIdx; i > 0; i--) past[i - 1] = past[i] + net[i];

  // Dips worth a mark: a spend of at least 5% of the line's height and $50, the three biggest.
  const height = Math.max(1, ...past) - Math.min(0, ...past);
  const dips = inWindow
    .filter((r) => r.out >= Math.max(50, height * 0.05) && r.date > iso(start))
    .sort((a, b) => b.out - a.out).slice(0, 3)
    .map((r) => ({ day: between(start, dayOf(r.date)), usd: r.out, category: r.category ?? null }))
    .sort((a, b) => a.day - b.day);

  let bal = cash;
  const ahead = [...bills].sort((a, b) => a.iso.localeCompare(b.iso)).map((b) => {
    const before = bal;
    bal -= b.usd;
    return { day: Math.max(todayIdx, between(start, dayOf(b.iso))), usd: b.usd, before, description: b.description, category: b.category ?? null };
  });
  return { span, today: todayIdx, startIso: iso(start), past, dips, bills: ahead, end: bal };
}
