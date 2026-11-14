/**
 * Payday plan (D-150): when pay lands, one card that gives the cash in the
 * spending accounts a job until the next payday.
 *
 * It adds no new number. Each part is one the app already shows:
 *  - Bills: what Until payday sets aside (bills before the next payday, and
 *    card balances not listed as a bill, D-90).
 *  - Day-to-day: Safe to spend today, times the days to the next payday
 *    (D-137, D-146), so the plan and Home say the same amount a day.
 *  - Steps: the contribution ladder's, in its order (safety pot, debt, goals,
 *    investing). They only take what bills and day-to-day leave, so the plan
 *    never asks for money the first two need.
 *  - Cushion: whatever is still left. It stays in the account.
 * The parts always add up to the cash. The hours line follows D-149: free time
 * is only shown for money kept or added, never as the cost of a purchase.
 */
import { freeHours, freeTimeMore } from "./freedom-progress.ts";
import type { RungKind } from "./contribution-waterfall.ts";

export type PaydayPartKind = "bills" | "everyday" | "step" | "cushion";

export interface PaydayPart {
  kind: PaydayPartKind;
  /** The ladder step, for a "step" part. */
  step?: RungKind;
  label: string;
  amount: number;
}

export interface PaydayPlan {
  /** The pay that came in. */
  pay: number;
  /** Cash in the spending accounts now: what the parts add up to. */
  cash: number;
  nextPaydayIso: string;
  days: number;
  /** Day-to-day per day, when a budget or cash figure gives one. */
  perDay: number | null;
  parts: PaydayPart[];
  /** What goes up the ladder in this plan. */
  toFreedom: number;
  /** Hours of every year the saved or invested part pays for (debt steps add none). */
  hours: number;
  /** Bills and cards the cash does not cover. Zero when it does. */
  short: number;
}

/** A few words per ladder step, the labels Home's next move uses (lib/next-move SPLIT_LABEL). */
export const PAYDAY_STEP_LABEL: Record<RungKind, string> = {
  "emergency-floor": "Safety pot",
  "employer-match": "Employer match",
  "high-interest-debt": "Expensive debt",
  "emergency-target": "Safety pot top-up",
  "goals": "Goals",
  "tax-advantaged": "Tax-sheltered",
  "low-interest-debt": "Loan overpayment",
  "taxable": "Invest",
};

/** Paying a debt down is a good step, but it does not add to the pot that pays for free days. */
const DEBT_STEPS: RungKind[] = ["high-interest-debt", "low-interest-debt"];

const cents = (n: number) => Math.round(n * 100) / 100;

export function paydayPlan(i: {
  /** The pay that came in, USD. */
  pay: number;
  /** Cash in the spending accounts now, USD. */
  cash: number;
  /** Bills due before the next payday. */
  bills: number;
  /** Card balances not already listed as a bill. */
  cards: number;
  /** Days to the next payday. */
  days: number;
  nextPaydayIso: string;
  /** Safe to spend today's bold figure; null when there is none. */
  perDay: number | null;
  /** The ladder's steps that take money, in its order. Empty when nothing is safe to move. */
  steps: { kind: RungKind; amount: number }[];
  /** The freedom number, for the hours line; zero leaves it out. */
  target: number;
}): PaydayPlan | null {
  if (!(i.pay > 0) || !(i.cash > 0) || !(i.days > 0)) return null;
  const owed = Math.max(0, i.bills) + Math.max(0, i.cards);
  const parts: PaydayPart[] = [];
  let left = i.cash;
  const take = (kind: PaydayPartKind, label: string, want: number, step?: RungKind) => {
    const amount = cents(Math.min(Math.max(0, want), left));
    if (amount <= 0) return 0;
    parts.push({ kind, label, amount, ...(step ? { step } : {}) });
    left = cents(left - amount);
    return amount;
  };

  take("bills", i.cards > 0 ? "Bills and cards" : "Bills", owed);
  take("everyday", "Day-to-day", i.perDay == null ? 0 : i.perDay * i.days);
  let toFreedom = 0, toPot = 0;
  for (const s of i.steps) {
    const got = take("step", PAYDAY_STEP_LABEL[s.kind], s.amount, s.kind);
    toFreedom += got;
    if (!DEBT_STEPS.includes(s.kind)) toPot += got;
  }
  take("cushion", "Extra cushion", left);

  return {
    pay: i.pay, cash: i.cash, nextPaydayIso: i.nextPaydayIso, days: i.days, perDay: i.perDay, parts,
    toFreedom: cents(toFreedom),
    hours: i.target > 0 ? freeHours(toPot, i.target) : 0,
    short: cents(Math.max(0, owed - i.cash)),
  };
}

/**
 * "This plan pays for 6 more hours of every year." Days from two days up,
 * minutes under an hour, nothing under a minute. The same words as Home's
 * "Your money already pays for 18 days of every year".
 */
export function paydayReward(hours: number): string | null {
  const more = freeTimeMore(hours);
  return more ? `This plan pays for ${more} of every year.` : null;
}

const DAY_MS = 86_400_000;
const at = (iso: string) => new Date(`${iso}T12:00:00`).getTime();

/**
 * Whether pay has landed, and how much. With a bank linked it is real income
 * from the last three days (the list's day and the two before it: bank rows
 * can arrive a day or two late), at least half the smallest repeating paycheck
 * so a refund or a friend paying you back is not a payday. Without a bank
 * nothing arrives by itself, so the day a paycheck is expected counts. The
 * date is the key, so a pay planned once is not asked about again.
 */
export function payLanded(i: {
  /** The Today list's day, and today. */
  day: string;
  today: string;
  /** Income rows from the last few days. */
  incomes: { date: string; usd: number }[];
  /** Repeating paychecks in Upcoming: the amount, and whether one is expected on `day`. */
  paychecks: { usd: number; dueOnDay: boolean }[];
  bankLinked: boolean;
}): { iso: string; usd: number } | null {
  const amounts = i.paychecks.map((p) => p.usd).filter((n) => n > 0);
  if (amounts.length === 0) return null;
  const min = Math.min(...amounts) * 0.5;
  const from = at(i.day) - 2 * DAY_MS;
  const real = i.incomes.filter((r) => r.usd >= min && at(r.date) >= from && r.date <= i.today);
  if (real.length > 0) {
    const iso = real.map((r) => r.date).sort().at(-1)!;
    return { iso, usd: cents(real.filter((r) => r.date === iso).reduce((s, r) => s + r.usd, 0)) };
  }
  if (i.bankLinked) return null;
  const due = i.paychecks.filter((p) => p.dueOnDay && p.usd > 0);
  return due.length > 0 ? { iso: i.day, usd: cents(due.reduce((s, p) => s + p.usd, 0)) } : null;
}

/** "Dec 15", for "your next payday, Dec 15". */
export function paydayDateLabel(iso: string): string {
  return new Date(`${iso}T12:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
