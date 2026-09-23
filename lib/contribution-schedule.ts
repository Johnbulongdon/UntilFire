/**
 * When the next contribution lands, and how much will be free by then.
 *
 * There are two clocks in this feature and they are not the same one.
 *
 *   Contribution cadence — when money arrives in the investment account.
 *                          Set by payday.
 *   Buy-in cadence       — how often that money is then invested.
 *                          Set by strategy. This is the DCA one, and it
 *                          lives in `Frequency` / PERIODS_PER_MONTH.
 *
 * Paid monthly but dollar-cost-averaging weekly is an ordinary arrangement,
 * and it means money sits as cash in the brokerage between the two — which is
 * exactly the `CUR:USD` row the holdings import already shows. Modelling one
 * cadence could not describe that, so there are two.
 *
 * All dates here are local calendar days with no time component. Money lands
 * on a date, not at an instant, and mixing the two is how a contribution due
 * "today" reads as yesterday for anyone east of UTC.
 */

export type ContributionCadence = "monthly" | "weekly";

export interface ContributionSchedule {
  cadence: ContributionCadence;
  /** Monthly: day of month, 1–31. Weekly: day of week, 0 (Sun) – 6 (Sat). */
  anchorDay: number;
}

export const DEFAULT_SCHEDULE: ContributionSchedule = { cadence: "monthly", anchorDay: 1 };

const DAY_MS = 24 * 60 * 60 * 1000;

/** Midnight local, so two dates can be compared as calendar days. */
export function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function daysInMonth(year: number, monthIndex: number): number {
  return new Date(year, monthIndex + 1, 0).getDate();
}

/**
 * The next date money arrives, counting today as due if it is the day.
 *
 * Today counts because someone opening the app on payday should be told to
 * act now, not told to wait a month. The countdown then reads zero, which is
 * the honest answer.
 *
 * A monthly anchor past the end of a short month lands on that month's last
 * day: the 31st in February is the 28th, not the 3rd of March. Rent and
 * salary behave the same way, so the schedule should too.
 */
export function nextContributionDate(
  schedule: ContributionSchedule,
  from: Date = new Date(),
): Date {
  const today = startOfDay(from);

  if (schedule.cadence === "weekly") {
    const want = ((Math.round(schedule.anchorDay) % 7) + 7) % 7;
    const ahead = (want - today.getDay() + 7) % 7;      // 0 when today is the day
    return new Date(today.getFullYear(), today.getMonth(), today.getDate() + ahead);
  }

  const want = Math.min(Math.max(Math.round(schedule.anchorDay), 1), 31);
  const dayThisMonth = Math.min(want, daysInMonth(today.getFullYear(), today.getMonth()));
  if (dayThisMonth >= today.getDate()) {
    return new Date(today.getFullYear(), today.getMonth(), dayThisMonth);
  }
  const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);
  return new Date(
    nextMonth.getFullYear(),
    nextMonth.getMonth(),
    Math.min(want, daysInMonth(nextMonth.getFullYear(), nextMonth.getMonth())),
  );
}

/** Whole days from `from` to `date`. Zero means today. */
export function daysUntil(date: Date, from: Date = new Date()): number {
  return Math.round((startOfDay(date).getTime() - startOfDay(from).getTime()) / DAY_MS);
}

export interface ExpectedOutgoing {
  /** Already converted to USD by the caller — this module does no FX. */
  amountUSD: number;
  /** ISO date, `YYYY-MM-DD`. */
  dueDate: string;
}

/**
 * What is already spoken for between now and the next contribution.
 *
 * Inclusive of the contribution date itself: a bill due the same day is money
 * that is not available to invest that morning. Overdue rows count too — an
 * unpaid bill is still owed, which is the rule the dashboard's committed
 * total already follows.
 */
export function expectedBefore(
  outgoings: ExpectedOutgoing[],
  nextDate: Date,
  from: Date = new Date(),
): number {
  const end = startOfDay(nextDate).getTime();
  return outgoings.reduce((sum, o) => {
    const due = parseIsoDate(o.dueDate);
    if (!due) return sum;
    return due.getTime() <= end ? sum + (Number.isFinite(o.amountUSD) ? o.amountUSD : 0) : sum;
  }, 0);
}

/** `YYYY-MM-DD` as a local calendar day. `new Date(iso)` would read it as UTC
 *  midnight, which is the previous day for anyone west of Greenwich. */
export function parseIsoDate(iso: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso ?? "").trim());
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return Number.isNaN(d.getTime()) ? null : d;
}

export interface AvailableToContribute {
  nextDate: Date;
  daysUntil: number;
  /** Cash in accounts that are not the emergency fund. */
  cash: number;
  /** Already committed before the next contribution date. */
  committed: number;
  /** What is genuinely free to contribute. Never negative. */
  free: number;
  /**
   * False when there are no expected payments recorded at all.
   *
   * This matters more than it looks. With nothing recorded, `committed` is
   * zero and `free` equals the whole balance — so the figure reads high, and
   * high is the dangerous direction: it is the difference between "invest
   * your surplus" and "invest your rent". The surfaces show the subtraction
   * rather than the answer alone, and say when there was nothing to subtract.
   */
  hasExpectedData: boolean;
}

export function availableToContribute(
  cash: number,
  outgoings: ExpectedOutgoing[],
  schedule: ContributionSchedule,
  from: Date = new Date(),
): AvailableToContribute {
  const nextDate = nextContributionDate(schedule, from);
  const committed = expectedBefore(outgoings, nextDate, from);
  return {
    nextDate,
    daysUntil: daysUntil(nextDate, from),
    cash,
    committed,
    free: Math.max(0, cash - committed),
    hasExpectedData: outgoings.length > 0,
  };
}

/** "in 5 days", "today", "tomorrow" — the countdown, in words. */
export function countdownLabel(days: number): string {
  if (days <= 0) return "today";
  if (days === 1) return "tomorrow";
  return `in ${days} days`;
}
