/**
 * Month story (D-151): last month in a few short pages. What you kept, the
 * biggest change against your usual month, what the kept money adds to your
 * free days, and where your free days stand now.
 *
 * It adds no new rule for money:
 *  - Kept is real income received less real spending in that month (transfers
 *    are neither), the figures Income and Cashflow show for the month.
 *  - "Usual" for a category is the median of the six complete months before
 *    it, a month with spending but none in that category counting as $0, and
 *    nothing below three months of history (the phone's typicalBy and the
 *    forecast's window, lib/spend-range).
 *  - Hours are free hours (D-149): only for money kept, and worded as what it
 *    pays for once saved, because money left in a spending account does not
 *    count toward freedom until it is moved (D-95).
 * A month with no income or no spending recorded has no story: without both,
 * "kept" would be a guess.
 */
import { freeHours, freeTimeMore } from "./freedom-progress.ts";
import { addMonths, median, monthOf, MIN_USUAL_MONTHS } from "./spend-range.ts";

export interface StoryRow {
  /** YYYY-MM-DD. */
  date: string;
  /** Positive, USD. Spending is net of refunds. */
  usd: number;
  type: "income" | "expense";
  category: string;
}

export interface MonthStory {
  /** "2026-10". */
  month: string;
  /** "October". */
  monthName: string;
  income: number;
  spent: number;
  /** Income less spending. Negative when more went out than came in. */
  kept: number;
  /** The category that moved most against its usual month; null with too little history or nothing that moved. */
  change: { key: string; amount: number; usual: number; delta: number } | null;
  /** Hours of every year the kept money pays for once saved. Zero when nothing was kept or there is no target. */
  hours: number;
}

/** Usual is compared over this many complete months before the story's month. */
const LOOKBACK = 6;
/** A change smaller than this, or under a tenth of the usual, is noise, not a story. */
const MIN_CHANGE = 20;

/** The month before `now`'s, as "YYYY-MM": the story is always about a finished month. */
export function storyMonth(now: Date = new Date()): string {
  const m = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  return addMonths(m, -1);
}

export const monthNameOf = (month: string) =>
  new Date(Number(month.slice(0, 4)), Number(month.slice(5, 7)) - 1, 1).toLocaleDateString("en-US", { month: "long" });

export function monthStory(i: {
  /** The finished month to tell, "YYYY-MM". */
  month: string;
  /** Income and spending rows, any range; transfers left out by the caller. */
  rows: StoryRow[];
  /** Categories left out of "biggest change": bills and yearly ones, which move by the calendar, not by choice. */
  exclude?: Set<string>;
  /** The freedom number, for the hours page; zero leaves it out. */
  target: number;
}): MonthStory | null {
  let income = 0, spent = 0;
  const now = new Map<string, number>();
  const first = addMonths(i.month, -LOOKBACK);
  const past = new Map<string, Map<string, number>>();
  for (const r of i.rows) {
    if (!(r.usd > 0)) continue;
    const m = monthOf(r.date);
    if (m === i.month) {
      if (r.type === "income") income += r.usd;
      else { spent += r.usd; now.set(r.category, (now.get(r.category) ?? 0) + r.usd); }
    } else if (r.type === "expense" && m < i.month && m >= first) {
      const month = past.get(m) ?? new Map<string, number>();
      past.set(m, month);
      month.set(r.category, (month.get(r.category) ?? 0) + r.usd);
    }
  }
  if (!(income > 0) || !(spent > 0)) return null;

  let change: MonthStory["change"] = null;
  if (past.size >= MIN_USUAL_MONTHS) {
    const months = [...past.values()];
    const keys = new Set([...now.keys(), ...months.flatMap((m) => [...m.keys()])]);
    const moved = [...keys].filter((k) => !i.exclude?.has(k)).map((key) => {
      const usual = median(months.map((m) => m.get(key) ?? 0));
      const amount = now.get(key) ?? 0;
      return { key, amount, usual, delta: amount - usual };
    }).filter((c) => Math.abs(c.delta) >= Math.max(MIN_CHANGE, c.usual * 0.1));
    // A saving leads when there is one; otherwise the biggest rise, said plainly.
    const drops = moved.filter((c) => c.delta < 0).sort((a, b) => a.delta - b.delta);
    const rises = moved.filter((c) => c.delta > 0).sort((a, b) => b.delta - a.delta);
    change = drops[0] ?? rises[0] ?? null;
  }

  const kept = income - spent;
  return {
    month: i.month, monthName: monthNameOf(i.month), income, spent, kept, change,
    hours: kept > 0 && i.target > 0 ? freeHours(kept, i.target) : 0,
  };
}

export type StoryPage = "kept" | "change" | "hours" | "free";

/**
 * The pages a story has, in order. Kept always; the change when something
 * moved; the hours when kept money is worth at least a minute of a year; the
 * free days when there is a freedom number to measure against.
 */
export function storyPages(s: MonthStory, hasFreeDays: boolean): StoryPage[] {
  const pages: StoryPage[] = ["kept"];
  if (s.change) pages.push("change");
  if (freeTimeMore(s.hours)) pages.push("hours");
  if (hasFreeDays) pages.push("free");
  return pages;
}

/** Page one's headline: "You kept $1,180", or the plain fact when more went out than came in. */
export function storyKeptLine(s: MonthStory, fmt: (n: number) => string): string {
  if (s.kept >= 0.5) return `You kept ${fmt(s.kept)}`;
  if (s.kept > -0.5) return "You spent what came in";
  return `You spent ${fmt(-s.kept)} more than came in`;
}

/** Under it: "$4,300 came in. $3,120 went out." */
export function storyFlowLine(s: MonthStory, fmt: (n: number) => string): string {
  return `${fmt(s.income)} came in. ${fmt(s.spent)} went out.`;
}

/** Page two, under the category's name: "$140 less than your usual month". */
export function storyChangeLine(c: NonNullable<MonthStory["change"]>, fmt: (n: number) => string): string {
  return `${fmt(Math.abs(c.delta))} ${c.delta < 0 ? "less" : "more"} than your usual month`;
}

/** What is shared: the days only, never an amount (D-22, D-98). */
export function freeDaysShareText(daysLabel: string): string {
  return `My money already pays for ${daysLabel} of every year. How much of your year is paid for?`;
}

/** Where a share points: the free calculator, tagged so the visit can be counted. */
export const FREE_DAYS_SHARE_URL = "https://www.untilfire.com/?utm_source=share&utm_medium=month_story&utm_campaign=free_days";
