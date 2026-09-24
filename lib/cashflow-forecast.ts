/**
 * A day-by-day forecast of cash, and the most that can safely be contributed.
 *
 * The contribution figure has to be traceable to be trusted. A bare "$34"
 * cannot be checked, so this module builds the ledger behind it — opening
 * balance, every expected payment in and out on its date, the running
 * balance — and the surfaces render that ledger rather than only its answer.
 *
 * What is "safe to contribute" on the contribution date is the LOWEST the
 * balance falls between that date and the next contribution, not the balance
 * on the day. Putting in the day's balance would hand over money needed for a
 * bill due the day after; the low point is what can leave without anything
 * later in the cycle bouncing. Income inside the cycle lifts the balance and
 * bills lower it, in date order, so rent before payday is covered and rent
 * after payday is not double-counted.
 *
 * Dated payments come from the user's Expected list, repeats expanded. The
 * budget's day-to-day spending — groceries, eating out, anything without a
 * date — goes in as one labelled estimate per gap between dated lines,
 * never as invented dated transactions. Without it the balance only ever
 * fell on bill days, so the safe figure overstated what was spare by
 * however much gets spent in between. The estimate is the budget's monthly
 * spending less the repeating bills already listed, so nothing is counted
 * twice. (D-10 in docs/DECISIONS.md.)
 */

import {
  nextContributionDate, parseIsoDate, startOfDay, daysInMonth,
  type ContributionSchedule,
} from "./contribution-schedule.ts";

// One definition of what a repeat can be — the Expected tab's. Type-only, so
// the guard scripts' type stripping erases it and needs no extension.
import { recurrenceToMonthly, type Recurrence } from "./recurring-detect.ts";
export type { Recurrence };

export interface ExpectedItem {
  description: string;
  /** Positive, already in USD. The caller converts; this module does no FX. */
  amountUSD: number;
  type: "income" | "expense";
  /** ISO `YYYY-MM-DD`. For a repeating item, this is its next unpaid occurrence. */
  dueDate: string;
  recurrence: Recurrence;
}

/** A calendar day as `YYYY-MM-DD` in local time. `toISOString()` converts to
 *  UTC first, which is the previous day anywhere east of Greenwich — the bug
 *  that walked monthly bills a day earlier on every roll. */
export function isoDay(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/**
 * The nth occurrence after `anchor`.
 *
 * Months are calendar months anchored to the original day, not 30 days and
 * not chained: the 31st goes to the 30th in April and back to the 31st in
 * May. Chaining would lose the 31st the first time it met a short month and
 * never get it back, and a fixed 30 days walks a bill due on the 1st to the
 * 31st, then the 30th, and on through the calendar.
 */
export function addRecurrence(anchor: Date, r: Recurrence, n = 1): Date {
  const a = startOfDay(anchor);
  switch (r) {
    case "weekly":   return new Date(a.getFullYear(), a.getMonth(), a.getDate() + 7 * n);
    case "biweekly": return new Date(a.getFullYear(), a.getMonth(), a.getDate() + 14 * n);
    case "monthly":   return addMonths(a, n);
    case "quarterly": return addMonths(a, 3 * n);
    case "annual":    return addMonths(a, 12 * n);
    default:          return a;
  }
}

function addMonths(anchor: Date, months: number): Date {
  const target = new Date(anchor.getFullYear(), anchor.getMonth() + months, 1);
  const day = Math.min(anchor.getDate(), daysInMonth(target.getFullYear(), target.getMonth()));
  return new Date(target.getFullYear(), target.getMonth(), day);
}

export interface ForecastEvent {
  iso: string;
  description: string;
  /** Signed: positive in, negative out. */
  amount: number;
  type: "income" | "expense";
  recurring: boolean;
  /** The row's own due date is before today and it has not been ticked off. */
  overdue: boolean;
  /**
   * False for overdue income. A payment that was due and has not been marked
   * received either arrived — so it is already in the balance, or already
   * spent — or it did not, and cannot be relied on. Counting it risks the
   * same money twice, and money to invest must not be overstated. It is still
   * shown, so the ledger says why it is missing rather than silently dropping
   * it. Overdue bills ARE counted: a bill not marked paid is assumed owed.
   */
  counted: boolean;
  /**
   * Day-to-day spending from the budget, not a dated payment. Shown as its
   * own line — covering the days since the previous line — so each row's
   * amount still accounts exactly for the change in the running balance.
   */
  estimate?: { days: number; perDay: number };
}

/**
 * The budget's spending that the Expected list does not account for, per
 * month: groceries, eating out, anything without a date.
 *
 * Only repeating bills count against the budget here. A one-off is an
 * exception to a month, not part of what the monthly budget describes, so
 * subtracting it would shrink the allowance for one surprise and leave it
 * shrunk.
 */
export function monthlyAllowance(budgetMonthlySpending: number, items: ExpectedItem[]): number {
  const listed = items
    .filter((i) => i.type === "expense" && i.recurrence !== "none")
    .reduce((sum, i) => sum + recurrenceToMonthly(i.amountUSD, i.recurrence), 0);
  return Math.max(0, (budgetMonthlySpending || 0) - listed);
}

/** A monthly allowance as a daily rate, over an average month. */
export const perDay = (monthly: number) => (monthly * 12) / 365.25;

/**
 * Every line of one calendar month, for the month view in Expected.
 *
 * This is a budget view, not a forecast, so a repeating item appears on
 * every occurrence in the month — including ones already paid and rolled
 * forward, found by stepping back from the row's current due date. Rent on
 * the 1st is part of September whether or not it has been ticked off.
 */
export interface MonthLine {
  iso: string;
  description: string;
  amount: number;
  type: "income" | "expense";
  recurring: boolean;
  /** Paid already: a ticked one-off, or a repeat's occurrence before its current due date. */
  paid: boolean;
}

export function expandForMonth(
  items: (ExpectedItem & { completed?: boolean })[],
  year: number,
  monthIndex: number,
): MonthLine[] {
  const first = new Date(year, monthIndex, 1).getTime();
  const last = new Date(year, monthIndex, daysInMonth(year, monthIndex)).getTime();
  const lines: MonthLine[] = [];
  for (const item of items) {
    const due = parseIsoDate(item.dueDate);
    if (!due || !Number.isFinite(item.amountUSD) || item.amountUSD <= 0) continue;
    const sign = item.type === "income" ? 1 : -1;
    if (item.recurrence === "none") {
      const t = due.getTime();
      if (t >= first && t <= last) {
        lines.push({ iso: isoDay(due), description: item.description, amount: sign * item.amountUSD,
          type: item.type, recurring: false, paid: !!item.completed });
      }
      continue;
    }
    // Walk back until before the month, then forward through it. Bounded: a
    // weekly item spans at most a few hundred steps even years away.
    let n = 0;
    while (addRecurrence(due, item.recurrence, n).getTime() > first && n > -800) n--;
    for (; n < 800; n++) {
      const occ = addRecurrence(due, item.recurrence, n);
      const t = occ.getTime();
      if (t > last) break;
      if (t < first) continue;
      lines.push({ iso: isoDay(occ), description: item.description, amount: sign * item.amountUSD,
        type: item.type, recurring: true, paid: t < due.getTime() });
    }
  }
  return lines.sort((a, b) => a.iso.localeCompare(b.iso) || (b.amount - a.amount));
}

/**
 * Every occurrence of every item between `from` and `to`, inclusive.
 *
 * A row whose due date has passed contributes one overdue occurrence, dated
 * today — it is the one the user has not ticked off. Earlier missed repeats
 * are not invented on top of it: the row stands for the next unpaid one, and
 * piling up five weeks of an overdue weekly bill would read as five debts.
 */
export function expandExpected(items: ExpectedItem[], from: Date, to: Date): ForecastEvent[] {
  const start = startOfDay(from).getTime();
  const end = startOfDay(to).getTime();
  const events: ForecastEvent[] = [];

  for (const item of items) {
    const due = parseIsoDate(item.dueDate);
    if (!due || !Number.isFinite(item.amountUSD) || item.amountUSD <= 0) continue;
    const sign = item.type === "income" ? 1 : -1;
    const recurring = item.recurrence !== "none";

    if (due.getTime() < start) {
      events.push({
        iso: isoDay(from), description: item.description, amount: sign * item.amountUSD,
        type: item.type, recurring, overdue: true, counted: item.type === "expense",
      });
    }
    if (!recurring) {
      if (due.getTime() >= start && due.getTime() <= end) {
        events.push({
          iso: isoDay(due), description: item.description, amount: sign * item.amountUSD,
          type: item.type, recurring, overdue: false, counted: true,
        });
      }
      continue;
    }
    // Repeats, anchored to the original due date so month-ends hold.
    for (let n = 0; n < 400; n++) {
      const occ = addRecurrence(due, item.recurrence, n);
      const t = occ.getTime();
      if (t > end) break;
      if (t < start) continue;         // before today: covered by the overdue entry
      events.push({
        iso: isoDay(occ), description: item.description, amount: sign * item.amountUSD,
        type: item.type, recurring, overdue: false, counted: true,
      });
    }
  }
  // Income before expenses on the same day, then larger first: salary landing
  // the morning rent is due is the ordinary case, and ordering the other way
  // would show a dip below zero that never happens.
  return events.sort((a, b) =>
    a.iso.localeCompare(b.iso) || (b.amount - a.amount));
}

export interface ForecastDay {
  iso: string;
  events: ForecastEvent[];
  /** Closing balance after this day's counted events. */
  balance: number;
}

export interface CashflowForecast {
  opening: number;
  /** The per-day estimate included, or 0 when none was. */
  dailyAllowance: number;
  /** Days that have at least one event, plus today, in order. */
  days: ForecastDay[];
  contributionIso: string;
  nextCycleIso: string;
  /** Lowest closing balance from the contribution date up to the next one. */
  lowest: { iso: string; balance: number };
  /** Lowest closing balance BEFORE the contribution date, if it goes negative. */
  shortBefore: { iso: string; balance: number } | null;
  /** Max(0, lowest.balance). What can go in without anything later bouncing. */
  safeToContribute: number;
  income: number;
  expenses: number;
  /** Items shown but not counted — overdue income. */
  uncounted: ForecastEvent[];
}

export function buildForecast(
  opening: number,
  items: ExpectedItem[],
  schedule: ContributionSchedule,
  today: Date = new Date(),
  /** Day-to-day spending per day, from the budget. Zero leaves it out. */
  dailyAllowance = 0,
): CashflowForecast {
  const from = startOfDay(today);
  const contribution = nextContributionDate(schedule, from);
  // The next contribution after this one. The day after `contribution` is the
  // earliest the schedule can land again, so asking from there finds it.
  const nextCycle = nextContributionDate(
    schedule,
    new Date(contribution.getFullYear(), contribution.getMonth(), contribution.getDate() + 1),
  );
  // The window runs to the day before the next cycle: that day's income
  // belongs to the next contribution, not this one.
  const windowEnd = new Date(nextCycle.getFullYear(), nextCycle.getMonth(), nextCycle.getDate() - 1);

  const events = expandExpected(items, from, windowEnd);
  const byDay = new Map<string, ForecastEvent[]>();
  for (const e of events) {
    if (!byDay.has(e.iso)) byDay.set(e.iso, []);
    byDay.get(e.iso)!.push(e);
  }

  const contributionIso = isoDay(contribution);
  const todayIso = isoDay(from);
  const windowEndIso = isoDay(windowEnd);
  // With an allowance the balance falls every day, so the low point is
  // usually the window's last day; it needs a line of its own to land on.
  const isos = new Set<string>([todayIso, contributionIso, ...byDay.keys()]);
  if (dailyAllowance > 0) isos.add(windowEndIso);
  const ordered = [...isos].sort();
  const dayNumber = (iso: string) => {
    const [y, m, d] = iso.split("-").map(Number);
    return Math.round(new Date(y, m - 1, d).getTime() / 86400000);
  };

  let balance = opening;
  let income = 0;
  let expenses = 0;
  const days: ForecastDay[] = [];
  let lowest = { iso: contributionIso, balance: Number.POSITIVE_INFINITY };
  let shortBefore: { iso: string; balance: number } | null = null;

  let prevIso = todayIso;
  for (const iso of ordered) {
    const dayEvents = [...(byDay.get(iso) ?? [])];
    // Spending since the previous line lands first: it happened over the
    // days before this one, ahead of this day's own payments.
    const gap = dailyAllowance > 0 ? dayNumber(iso) - dayNumber(prevIso) : 0;
    if (gap > 0) {
      dayEvents.unshift({
        iso, description: "Day-to-day spending", amount: -dailyAllowance * gap,
        type: "expense", recurring: false, overdue: false, counted: true,
        estimate: { days: gap, perDay: dailyAllowance },
      });
    }
    prevIso = iso;
    for (const e of dayEvents) {
      if (!e.counted) continue;
      balance += e.amount;
      if (e.amount > 0) income += e.amount; else expenses -= e.amount;
    }
    days.push({ iso, events: dayEvents, balance });
    if (iso >= contributionIso) {
      if (balance < lowest.balance) lowest = { iso, balance };
    } else if (balance < 0 && (!shortBefore || balance < shortBefore.balance)) {
      shortBefore = { iso, balance };
    }
  }
  if (!Number.isFinite(lowest.balance)) lowest = { iso: contributionIso, balance };

  return {
    opening,
    days,
    dailyAllowance,
    contributionIso,
    nextCycleIso: isoDay(nextCycle),
    lowest,
    shortBefore,
    safeToContribute: Math.max(0, lowest.balance),
    income,
    expenses,
    uncounted: events.filter((e) => !e.counted),
  };
}
