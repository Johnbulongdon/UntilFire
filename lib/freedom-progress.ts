/**
 * "How far you've come" (goal gradient): the freedom number is often 15+
 * years away, too far to feel. So Home shows the share already there and the
 * next quarter mark, which is always close enough to chase.
 *
 * `invested` and `target` are the freedom date's own numbers (the pot that
 * counts, the FIRE target), in one currency. `path` is the same projection
 * year by year, to say when the next mark is reached; without it, no year.
 * Shared by the website (FreedomCard) and the phone (Home hero).
 */

export const PROGRESS_MARKS = [0.25, 0.5, 0.75, 1] as const;

export interface FreedomProgress {
  /** 0 to 1. */
  share: number;
  /** The next mark ahead, null once the target is reached. */
  next: { mark: number; toGo: number; year: number | null } | null;
}

export function freedomProgress(invested: number, target: number, path: { year: number; value: number }[] = []): FreedomProgress | null {
  if (!(target > 0) || !Number.isFinite(invested)) return null;
  const share = Math.min(1, Math.max(0, invested / target));
  const mark = PROGRESS_MARKS.find((m) => share < m);
  if (mark == null) return { share, next: null };
  const at = path.find((p) => p.value >= target * mark);
  return { share, next: { mark, toGo: target * mark - Math.max(0, invested), year: at ? at.year : null } };
}

/** "23%": whole percent, but never 100% before it is all there, nor 0% once something is. */
export function progressPercent(share: number): string {
  const pct = share >= 1 ? 100 : share > 0 ? Math.min(99, Math.max(1, Math.round(share * 100))) : 0;
  return `${pct}%`;
}

/**
 * Free days (D-149): the same share, said as days of a year. With 5% of the
 * freedom number saved, the money already pays for 18 days of every year
 * (5% of 365). The next whole day is weeks away, not decades, so there is
 * always a win close by. It is the share in another unit, never a new number.
 *
 * `path` is the projection year by year: path[0] is today, path[k] the pot k
 * years from now (same currency and real/nominal basis as `target`). The next
 * day's date is read off that line, so it moves with the freedom date.
 */

export const DAYS_IN_YEAR = 365;
const HOURS_IN_YEAR = DAYS_IN_YEAR * 24;
const EPS = 1e-9;

export interface FreeDays {
  /** 0 to 1, the same share as freedomProgress. */
  share: number;
  /** Whole days of a year already paid for, 0 to 365; 365 only once the target is there. */
  days: number;
  /** Whole hours already paid for, shown while `days` is still 0. */
  hours: number;
  /** The next whole day, null once all 365 are there. `date` is null when the path never gets there. */
  next: { day: number; toGo: number; date: Date | null } | null;
  /** Hours of a year the pot adds in a month on the current path, null without a rising path. */
  hoursPerMonth: number | null;
}

/**
 * The year as twelve small months, for the free days dots: each month is its
 * own block with seven dots a row, like a calendar, so a row reads as a week
 * and the filled part reads as "January, then some of February". `start` is
 * the month's first day counted from 0. A plain 365-day year: the dots are a
 * share of a year, not dates on a calendar.
 */
export const FREE_DAY_MONTHS: { name: string; start: number; days: number }[] = (() => {
  const lengths: [string, number][] = [["Jan", 31], ["Feb", 28], ["Mar", 31], ["Apr", 30], ["May", 31], ["Jun", 30], ["Jul", 31], ["Aug", 31], ["Sep", 30], ["Oct", 31], ["Nov", 30], ["Dec", 31]];
  let start = 0;
  return lengths.map(([name, days]) => { const m = { name, start, days }; start += days; return m; });
})();

/** Hours of a year that `amount` pays for, e.g. $300 of a $900k target is about 3 hours. */
export function freeHours(amount: number, target: number): number {
  if (!(target > 0) || !Number.isFinite(amount)) return 0;
  return (amount / target) * HOURS_IN_YEAR;
}

export function freeDays(invested: number, target: number, path: number[] = [], now: Date = new Date()): FreeDays | null {
  if (!(target > 0) || !Number.isFinite(invested)) return null;
  const pot = Math.max(0, invested);
  const share = Math.min(1, pot / target);
  if (share >= 1) return { share, days: DAYS_IN_YEAR, hours: HOURS_IN_YEAR, next: null, hoursPerMonth: null };
  const days = Math.min(DAYS_IN_YEAR - 1, Math.floor(share * DAYS_IN_YEAR + EPS));
  const hours = Math.floor(share * HOURS_IN_YEAR + EPS);
  const need = (target * (days + 1)) / DAYS_IN_YEAR;

  // The line from today through each yearly point; the first stretch that crosses `need` gives the date.
  const line = [pot, ...path.slice(1).filter((v) => Number.isFinite(v))];
  let date: Date | null = null;
  for (let k = 1; k < line.length; k++) {
    if (line[k] < need) continue;
    const rise = line[k] - line[k - 1];
    const yearsOut = k - 1 + (rise > 0 ? Math.min(1, Math.max(0, (need - line[k - 1]) / rise)) : 0);
    date = new Date(now.getTime() + yearsOut * 365.25 * 864e5);
    break;
  }
  const firstYear = line.length > 1 ? line[1] - line[0] : 0;
  const hoursPerMonth = firstYear > 0 ? freeHours(firstYear / 12, target) : null;
  return { share, days, hours, next: { day: days + 1, toGo: need - pot, date }, hoursPerMonth };
}

/** "18 days", "1 day", "9 hours": days once there is a whole one, hours before that. */
export function freeDaysLabel(f: FreeDays): string {
  if (f.days >= 1) return `${f.days} ${f.days === 1 ? "day" : "days"}`;
  if (f.hours >= 1) return `${f.hours} ${f.hours === 1 ? "hour" : "hours"}`;
  return "0 days";
}

/** "about Jan 14" inside ten months, "about Mar 2028" further out. */
export function aboutDate(date: Date, now: Date = new Date()): string {
  const near = date.getTime() - now.getTime() < 300 * 864e5;
  return `about ${date.toLocaleDateString("en-US", near ? { month: "short", day: "numeric" } : { month: "short", year: "numeric" })}`;
}

/**
 * What an amount adds to free days, in words: "6 more hours", "2 more days"
 * from two days up, "30 more minutes" under an hour, null under a minute.
 * Used wherever kept or saved money is shown as time (payday plan, month story).
 */
export function freeTimeMore(hours: number): string | null {
  const minutes = Math.floor(hours * 60);
  if (!(minutes >= 1)) return null;
  const say = (n: number, unit: string) => `${n} more ${unit}${n === 1 ? "" : "s"}`;
  if (hours >= 48) return say(Math.floor(hours / 24), "day");
  if (hours >= 1) return say(Math.floor(hours), "hour");
  return say(minutes, "minute");
}

/** "You add 11 hours every month", "You add 2 days every month"; null under an hour, where it would only read as noise. */
export function freePaceLabel(hoursPerMonth: number | null): string | null {
  if (hoursPerMonth == null || hoursPerMonth < 1) return null;
  if (hoursPerMonth >= 48) { const d = Math.floor(hoursPerMonth / 24); return `You add ${d} days every month`; }
  const h = Math.floor(hoursPerMonth);
  return `You add ${h} ${h === 1 ? "hour" : "hours"} every month`;
}

/**
 * The pill under the dots: "Next free day: about Jan 14", or the amount to go
 * when the path gives no date. The last day is the freedom date itself, so it
 * takes that label instead of a second, slightly different estimate. Plain
 * words on purpose: "Day 19 · about Jan 14" was not understood (John, 12 Nov).
 */
export function freeNextLabel(f: FreeDays, fmt: (n: number) => string, freedomLabel?: string | null, now: Date = new Date()): string {
  if (!f.next) return "Every day is yours";
  if (f.next.day === DAYS_IN_YEAR && freedomLabel) return `All 365 days: ${freedomLabel}`;
  return `Next free day: ${f.next.date ? aboutDate(f.next.date, now) : `${fmt(f.next.toGo)} to go`}`;
}
