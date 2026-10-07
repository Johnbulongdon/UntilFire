/**
 * Where a period's spending is heading, and how the budget is laid out over
 * it, using the bills the person has listed in Upcoming (D-31).
 *
 * The first version shaped both from past months. That counted rent twice
 * for anyone whose rent moved: past months paid it on the 30th, this month on
 * the 1st, so "so far" already held it and "the rest of a typical month"
 * held it again. Bills have dates; the person told us them in Upcoming. So:
 *
 *   forecast    = spent so far
 *               + bills still due before the end of the period
 *               + everyday spending for the days left, at the usual daily rate
 *   budget path = each bill on its due day, the rest of the budget spread
 *                 evenly across the days of the month
 *
 * "Everyday" is spending that is not one of the listed bills, so a bill is
 * never in both the dated part and the daily rate.
 */
import { addRecurrence, isoDay } from "./cashflow-forecast.ts";
import { type Recurrence, sameMerchant } from "./recurring-detect.ts";
import { addMonths, daysInMonth, median, monthOf } from "./spend-range.ts";

export type Bill = {
  description: string | null;
  category: string | null;
  /** One payment, USD. */
  usd: number;
  due: string; // YYYY-MM-DD: the next date it is due, or the one date of a one-off
  recurrence: Recurrence; // "none" for a one-off
  /** The Upcoming row it came from, when it was listed. */
  id?: string;
  /** How the bank names it, once the person has confirmed a payment is this bill ("BILT PAYMENT" for "Rent"). */
  merchant?: string | null;
};

/**
 * A category for a bill listed without one, from words in its name. Upcoming
 * rows saved before the form asked for a category have none, and a bill with
 * neither a category nor the bank's name for it cannot be matched to its
 * payment: "Rent" at $1,500 and the bank's "BILT PAYMENT" at $1,380 were
 * counted as two bills. Only common, unambiguous bill words; otherwise null.
 */
const BILL_WORDS: [string, RegExp][] = [
  ["housing", /\b(rent|mortgage|lease|landlord|hoa|bilt|property tax)\b/i],
  ["utilities", /\b(electric(ity)?|power|water|internet|wi-?fi|broadband|phone|mobile|cell|comcast|xfinity|verizon|at&t|t-mobile)\b/i],
  ["subscriptions", /\b(netflix|spotify|hulu|disney|youtube|icloud|subscription|membership)\b/i],
  ["education", /\b(tuition|school)\b/i],
];
export function guessBillCategory(description: string | null): string | null {
  return BILL_WORDS.find(([, re]) => re.test(description ?? ""))?.[0] ?? null;
}
/** A bill's category, or the one its name suggests; null when neither says. */
export const billCategory = (b: Pick<Bill, "category" | "description">) => b.category || guessBillCategory(b.description);
const namesMatch = (b: Bill, name: string) =>
  (!!b.description && sameMerchant(b.description, name)) || (!!b.merchant && sameMerchant(b.merchant, name));

/**
 * Every date a bill falls on between `from` and `to` (inclusive): stepping
 * back and forward from its due date by its recurrence, so a monthly rent
 * whose next due date is Nov 1 also lands on Sep 1 and Oct 1. A one-off is
 * just its own date.
 */
export function occurrences(b: Bill, from: string, to: string): string[] {
  const [y, m, d] = b.due.split("-").map(Number);
  const anchor = new Date(y, m - 1, d);
  if (b.recurrence === "none") return b.due >= from && b.due <= to ? [b.due] : [];
  const out: string[] = [];
  for (let n = -60; n <= 60; n++) {
    const iso = isoDay(addRecurrence(anchor, b.recurrence, n));
    if (iso > to) break;
    if (iso >= from) out.push(iso);
  }
  return out;
}
export type DayAmount = { date: string; usd: number; category: string; description: string };

/** Whether a transaction is one of the listed bills: same merchant (or the bank's confirmed name), or the bill's category when it has no name. */
export function isBill(t: Pick<DayAmount, "description" | "category">, bills: Bill[]): boolean {
  return bills.some((b) => (b.description || b.merchant ? namesMatch(b, t.description ?? "") : !!b.category && b.category === t.category));
}

/**
 * What a month's spending came to without its bills. A payment is a bill
 * when its name matches one, or, for each date a bill falls on in that
 * month, the payment in the bill's category closest to its amount (within
 * 10%). Names alone missed rent paid to a person ("陈玲" for "John Rent") or
 * through a card ("BILT PAYMENT" for "Sirui Rent"), so past rent sat in the
 * daily rate and the forecast counted it twice (D-31).
 */
export function nonBillTotal(rows: DayAmount[], bills: Bill[], month: string): number {
  const billed = new Set(rows.filter((r) => isBill(r, bills)));
  for (const b of bills) {
    const cat = billCategory(b);
    if (!cat || rows.some((r) => namesMatch(b, r.description ?? ""))) continue;
    const due = occurrences(b, `${month}-01`, `${month}-${String(daysInMonth(month)).padStart(2, "0")}`).length;
    for (let i = 0; i < due; i++) {
      const near = rows.filter((r) => !billed.has(r) && r.category === cat && Math.abs(r.usd - b.usd) <= 0.1 * Math.max(r.usd, b.usd))
        .sort((x, y) => Math.abs(x.usd - b.usd) - Math.abs(y.usd - b.usd))[0];
      if (near) billed.add(near);
    }
  }
  return rows.reduce((sum, r) => sum + (billed.has(r) ? 0 : r.usd), 0);
}

/** How many past months "usual" looks at, and how many it needs; the Past months line uses the same (D-31). */
export const USUAL_LOOKBACK = 6;
const MIN_MONTHS = 3;

/**
 * Usual everyday spending per day: the median, over the last six complete
 * months, of non-bill spending divided by that month's days. Null with
 * fewer than three months, the same rule as the Past months line.
 */
export function everydayRate(spend: DayAmount[], bills: Bill[], currentMonth: string, lookback = USUAL_LOOKBACK): number | null {
  const first = addMonths(currentMonth, -lookback);
  const byMonth = new Map<string, DayAmount[]>();
  for (const s of spend) {
    const m = monthOf(s.date);
    if (m < currentMonth && m >= first) byMonth.set(m, [...(byMonth.get(m) ?? []), s]);
  }
  const rates = [...byMonth].map(([m, rows]) => nonBillTotal(rows, bills, m) / daysInMonth(m));
  return rates.length >= MIN_MONTHS ? median(rates) : null;
}

/**
 * The daily rate when there is no usual yet: this month's spending so far
 * without its bills, per day elapsed. Including them projected a new user's
 * rent across every remaining day ($1,500 on the 2nd became $23,000).
 */
export function rateSoFar(spend: DayAmount[], bills: Bill[], today: string, elapsed: number): number {
  const m = monthOf(today);
  return nonBillTotal(spend.filter((s) => monthOf(s.date) === m && s.date <= today), bills, m) / Math.max(1, elapsed);
}

/**
 * Listed bills still owed this month, per category (their own or guessed):
 * every date from the bill's stored due date (earlier ones are paid; an
 * overdue one is still owed) to the end of the month. "Left" on a category
 * subtracts these, the same as Free to spend does.
 */
export function dueByCategory(bills: Bill[], monthEnd: string): Record<string, number> {
  const out: Record<string, number> = {};
  for (const b of bills) {
    const cat = billCategory(b);
    if (!b.id || !cat) continue;
    const n = occurrences(b, b.due, monthEnd).length;
    if (n) out[cat] = (out[cat] ?? 0) + n * b.usd;
  }
  return out;
}

/** Every day of the months, in order. */
export const daysOfMonths = (months: string[]) =>
  months.flatMap((m) => Array.from({ length: daysInMonth(m) }, (_, i) => `${m}-${String(i + 1).padStart(2, "0")}`));

/**
 * Cumulative budget through each day: every bill steps up on the date it
 * falls in that month (whatever its recurrence, one-offs included), and what
 * is left of the monthly budget accrues evenly. Bills are drawn at their real
 * size even when they add up to more than the budget; shrinking them to fit
 * hid the problem and put $1,113 where $1,500 of rent was due (see
 * billsOverBudget, which the chart shows instead).
 */
export function budgetPath(months: string[], budgetMonth: number, bills: Bill[]): number[] {
  const out: number[] = [];
  let run = 0;
  for (const m of months) {
    const n = daysInMonth(m), hits = billHits(m, bills);
    const everyday = Math.max(0, budgetMonth - hits.reduce((s, h) => s + h.usd, 0)) / n;
    for (let d = 1; d <= n; d++) {
      const iso = `${m}-${String(d).padStart(2, "0")}`;
      run += everyday + hits.filter((h) => h.date === iso).reduce((s, h) => s + h.usd, 0);
      out.push(run);
    }
  }
  return out;
}
function billHits(m: string, bills: Bill[]) {
  const first = `${m}-01`, last = `${m}-${String(daysInMonth(m)).padStart(2, "0")}`;
  return bills.flatMap((b) => occurrences(b, first, last).map((date) => ({ date, usd: b.usd })));
}

/** How far the bills in these months run past the monthly budget, summed; 0 when they fit. */
export function billsOverBudget(months: string[], budgetMonth: number, bills: Bill[]): number {
  return months.reduce((s, m) => s + Math.max(0, billHits(m, bills).reduce((t, h) => t + h.usd, 0) - budgetMonth), 0);
}

/**
 * The forecast from today to the last day: what is already spent, plus each
 * bill still due on its date, plus everyday spending at `rate` per day.
 * Returns values for days after today only (NaN before), for drawing.
 */
export function forecastPath(days: string[], today: string, spentSoFar: number, bills: Bill[], rate: number): number[] {
  const end = days[days.length - 1];
  // A bill's stored due date is its next unpaid one: dates before it are paid, so they are not forecast again.
  const due = bills.flatMap((b) => occurrences(b, today, end).filter((d) => d > today && d >= b.due).map((date) => ({ date, usd: b.usd })));
  let run = spentSoFar;
  return days.map((d) => {
    if (d < today) return NaN;
    if (d === today) return spentSoFar;
    run += rate + due.filter((h) => h.date === d).reduce((s, h) => s + h.usd, 0);
    return run;
  });
}

/**
 * Bills from Upcoming plus repeating payments spotted in the history, without
 * counting one twice: a spotted payment is dropped when a listed one has the
 * same merchant, or the same category and an amount within 10% (Upcoming
 * says "Rent", the bank says "BILT PAYMENT").
 */
export function mergeBills(listed: Bill[], spotted: Bill[]): Bill[] {
  const dup = (s: Bill) => listed.some((b) =>
    (!!s.description && namesMatch(b, s.description))
    || (!!billCategory(b) && billCategory(b) === s.category && Math.abs(b.usd - s.usd) <= 0.1 * Math.max(b.usd, s.usd)));
  return [...listed, ...spotted.filter((s) => !dup(s))];
}

/**
 * Payments that look like a listed bill but are not yet linked to it, to ask
 * once: "Is BILT PAYMENT your Rent?" (D-31). A candidate is an expense in the
 * bill's category, within 10% of its amount and 5 days of a date it falls on.
 * A bill already linked to this merchant, a name match, or a payment the
 * person said is not this bill (`declined`) is not asked about.
 */
export type BillTx = { id: string; date: string; usd: number; description: string; category: string | null };
export function unlinkedBillPayments(txs: BillTx[], listed: Bill[], declined: (t: BillTx) => boolean): Map<string, Bill> {
  const out = new Map<string, Bill>();
  for (const b of listed) {
    const cat = billCategory(b);
    if (!b.id || !cat) continue;
    for (const t of txs) {
      if (out.has(t.id) || t.category !== cat || declined(t) || namesMatch(b, t.description)) continue;
      if (listed.some((o) => o.merchant && sameMerchant(o.merchant, t.description))) continue;
      if (Math.abs(t.usd - b.usd) > 0.1 * Math.max(t.usd, b.usd)) continue;
      const near = occurrences(b, shiftDay(t.date, -5), shiftDay(t.date, 5));
      if (near.length) out.set(t.id, b);
    }
  }
  return out;
}
const shiftDay = (iso: string, n: number) => {
  const [y, m, d] = iso.split("-").map(Number);
  return isoDay(new Date(y, m - 1, d + n));
};

/**
 * The payment for a linked bill's current due date: a payment under the
 * bank's confirmed name, in that due date's period, and either within 5 days
 * of the date or within 15% of the amount. Periods sit back to back, from a
 * few days before one due date to the same point before the next (10 days
 * for monthly and longer, a third of the gap for shorter repeats), so rent
 * paid early or weeks late still counts, and no payment counts for two dates.
 */
export function paymentFor(b: Bill, txs: BillTx[]): BillTx | undefined {
  if (!b.merchant) return undefined;
  const [y, m, d] = b.due.split("-").map(Number), due = new Date(y, m - 1, d);
  let from = shiftDay(b.due, -15), to = shiftDay(b.due, 16); // a one-off: two weeks either side
  if (b.recurrence !== "none") {
    const next = isoDay(addRecurrence(due, b.recurrence));
    const lead = Math.min(10, Math.round((Date.parse(next) - Date.parse(b.due)) / 86_400_000 / 3));
    from = shiftDay(b.due, -lead); to = shiftDay(next, -lead);
  }
  const near = (t: BillTx) => t.date >= shiftDay(b.due, -5) && t.date <= shiftDay(b.due, 5);
  return txs.find((t) => t.date >= from && t.date < to && sameMerchant(b.merchant!, t.description)
    && (near(t) || Math.abs(t.usd - b.usd) <= 0.15 * Math.max(t.usd, b.usd)));
}

/**
 * Settles a linked bill against its payments (D-31): a repeat moves past
 * every due date that has its payment, a paid one-off is completed. Null
 * when nothing is paid. Catches up several periods at once, so a bill linked
 * in October that was paid in September and October lands on November.
 */
export function settleBill(b: Bill & { completed?: boolean }, txs: BillTx[], nowIso: string): { due_date: string } | { completed_at: string } | null {
  if (!b.id || b.completed) return null;
  let cur: Bill = b, patch: ReturnType<typeof markPaid> | null = null;
  for (let i = 0; i < 36 && paymentFor(cur, txs); i++) {
    patch = markPaid(cur, nowIso);
    if (!("due_date" in patch)) break;
    cur = { ...cur, due: patch.due_date };
  }
  return patch;
}

/** The Upcoming update that marks a bill's current due date paid: a repeat moves to its next date, a one-off is completed. */
export function markPaid(b: Pick<Bill, "due" | "recurrence">, nowIso: string): { due_date: string } | { completed_at: string } {
  if (b.recurrence === "none") return { completed_at: nowIso };
  const [y, m, d] = b.due.split("-").map(Number);
  return { due_date: isoDay(addRecurrence(new Date(y, m - 1, d), b.recurrence)) };
}
