/**
 * Home's one next move (D-89): the first rule that matches the person's own
 * money, in a fixed order, so the card says the most useful thing and never a
 * generic one when a specific one exists.
 *
 *   1. A category over its budget this month  → Money
 *   2. No budget at all                       → Money
 *   3. The contribution ladder's first step   → Plan (emergency fund floor,
 *      employer match, expensive debt, emergency target, goals, sheltered
 *      accounts, a cheap loan, then investing — lib/contribution-waterfall)
 *   4. The what-if that moves the date most   → Plan (the old fallback)
 *
 * Pure: the dashboard passes everything in. A move the person put off with
 * "Not now" is skipped for a week (isSnoozed), and the next rule shows.
 */

import type { RungFill, RungKind } from "./contribution-waterfall.ts";

export type MoveDoor = "money" | "plan";

export interface NextMove {
  /** Stable per move, for "Not now". */
  key: string;
  title: string;
  /** What it is worth, short: "$140 back on plan", "1 year sooner". */
  payoff: string | null;
  door: MoveDoor;
  /** The dashboard tab the button opens. */
  tab: "cashflow" | "contributions" | "fire-calculator";
  button: string;
  /** This month's split, when the move comes from the ladder. */
  split?: { label: string; amount: number }[];
}

export interface NextMoveInputs {
  /** Per category this month, in display money: budget and spent. */
  categories: { key: string; label: string; budget: number; spent: number }[];
  hasBudget: boolean;
  /** The ladder's steps taking money this month, first one to act on. */
  ladder: RungFill[] | null;
  /** The best of the what-if scenarios, as the old card showed it. */
  fallback: { label: string; deltaYears: number } | null;
  fmt: (n: number) => string;
  snoozed: (key: string) => boolean;
}

/** Over by enough to be worth saying: $25 and a tenth of the budget. */
const MIN_OVER = 25;

const LADDER_TITLE: Record<RungKind, (amount: string) => string> = {
  "emergency-floor": (a) => `Put ${a} into your safety pot`,
  "employer-match": (a) => `Put ${a} in to get your full employer match`,
  "high-interest-debt": (a) => `Pay ${a} extra on your most expensive debt`,
  "emergency-target": (a) => `Top up your safety pot with ${a}`,
  "goals": (a) => `Put ${a} towards your goals`,
  "tax-advantaged": (a) => `Put ${a} into your tax-sheltered accounts`,
  "low-interest-debt": (a) => `Overpay your loan by ${a}`,
  "taxable": (a) => `Invest ${a} this month`,
};

/** A few words per step for the split under the bar: the ladder's own labels repeat ("Emergency fund — …" twice). */
const SPLIT_LABEL: Record<RungKind, string> = {
  "emergency-floor": "Safety pot",
  "employer-match": "Employer match",
  "high-interest-debt": "Expensive debt",
  "emergency-target": "Safety pot top-up",
  "goals": "Goals",
  "tax-advantaged": "Tax-sheltered",
  "low-interest-debt": "Loan overpayment",
  "taxable": "Invest",
};

const LADDER_PAYOFF: Partial<Record<RungKind, string>> = {
  "emergency-floor": "A buffer before anything else",
  "employer-match": "Free money from your employer",
  "high-interest-debt": "The best return you can get",
  "goals": "Your goals land on time",
};

export function pickNextMove(i: NextMoveInputs): NextMove | null {
  const over = i.categories
    .filter((c) => c.budget > 0 && c.spent - c.budget >= Math.max(MIN_OVER, c.budget * 0.1))
    .sort((a, b) => (b.spent - b.budget) - (a.spent - a.budget));
  for (const c of over) {
    const key = `over:${c.key}`;
    if (i.snoozed(key)) continue;
    return {
      key, door: "money", tab: "cashflow", button: "See where it went",
      title: `${c.label} is ${i.fmt(c.spent - c.budget)} over. Hold off until the 1st.`,
      payoff: `${i.fmt(c.budget)} budget`,
    };
  }

  if (!i.hasBudget && !i.snoozed("budget")) {
    return {
      key: "budget", door: "money", tab: "cashflow", button: "Set a budget",
      title: "Set a monthly budget so you know what's left",
      payoff: "Takes 2 minutes",
    };
  }

  const steps = (i.ladder ?? []).filter((f) => f.amount > 0);
  const first = steps[0];
  if (first && !i.snoozed(`ladder:${first.kind}`)) {
    return {
      key: `ladder:${first.kind}`, door: "plan", tab: "contributions", button: "Open your plan",
      title: LADDER_TITLE[first.kind](i.fmt(first.amount)),
      payoff: LADDER_PAYOFF[first.kind] ?? null,
      split: steps.map((f) => ({ label: SPLIT_LABEL[f.kind], amount: f.amount })),
    };
  }

  if (i.fallback && i.fallback.deltaYears > 0 && !i.snoozed("whatif")) {
    const d = i.fallback.deltaYears;
    return {
      key: "whatif", door: "plan", tab: "fire-calculator", button: "Try it",
      title: i.fallback.label,
      payoff: d >= 1.5 ? `${Math.round(d)} years sooner` : `${Math.max(1, Math.round(d * 12))} months sooner`,
    };
  }
  return null;
}

const SNOOZE_DAYS = 7;
const snoozeKey = (key: string) => `uf_move_snooze_${key}`;

export function isSnoozed(key: string, now = Date.now()): boolean {
  try {
    const until = Number(window.localStorage.getItem(snoozeKey(key)));
    return Number.isFinite(until) && until > now;
  } catch {
    return false;
  }
}

export function snooze(key: string, now = Date.now()) {
  try {
    window.localStorage.setItem(snoozeKey(key), String(now + SNOOZE_DAYS * 86_400_000));
  } catch { /* private mode: the move shows again, which is harmless */ }
}
