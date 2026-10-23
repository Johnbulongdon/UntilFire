/**
 * "Get set up": the five things that make the freedom date and Until payday
 * your own, in the order they matter. Each step is read from data the person
 * already has; nobody ticks a box by hand.
 *
 *  - income: the date starts from it. The calculator usually fills it, so most
 *    people start one step in, which is the point (a head start is finished
 *    about twice as often, Nunes & Drèze 2006).
 *  - bank: real spending and the cash Until payday counts. Retirement or
 *    investment balances typed in by hand count too: Plaid doesn't reach
 *    everyone (Hong Kong, mainland China). Typed cash doesn't, because the
 *    calculator and phone onboarding seed their savings answer as cash, and
 *    that answer alone would tick the step for everyone.
 *  - payday: a repeating paycheck in Calendar, so Until payday has an end.
 *  - bills: at least one repeating bill in Calendar, so Until payday sets it aside.
 *  - budget: any category other than "other". The calculator and phone
 *    onboarding put their one spending estimate in "other", which is a guess,
 *    not a budget.
 *
 * Shared by the website (SetupChecklist) and the phone (Home), so both tick
 * the same steps from the same data.
 */

import { detectRecurring, sameMerchant, toRecurrence, type RawTx, type Recurrence } from "./recurring-detect.ts";

export type SetupStepId = "income" | "bank" | "payday" | "bills" | "budget";

export const SETUP_ORDER: SetupStepId[] = ["income", "bank", "payday", "bills", "budget"];

export const SETUP_LABEL: Record<SetupStepId, string> = {
  income: "Your income",
  bank: "Link your bank",
  payday: "Add your payday",
  bills: "Add your bills",
  budget: "Set a budget",
};

/** The button on an unfinished step. */
export const SETUP_CTA: Record<SetupStepId, string> = {
  income: "Add", bank: "Link", payday: "Add", bills: "Add", budget: "Set",
};

export interface SetupFacts {
  /** Monthly take-home, in any currency; only whether it is above zero matters. */
  income: number;
  bankLinked: boolean;
  /** Retirement and investment balances typed in by hand (401k, IRA, taxable), not cash. */
  typedInvestments: number;
  /** Calendar (expected_payments), as "income"/"expense" with its repeat. */
  expected: { type: string; recurrence: string | null | undefined }[];
  /** The budget by category. Keys starting with "_" are stored settings, not categories. */
  budget: Record<string, unknown>;
}

export interface SetupStep { id: SetupStepId; done: boolean }

const repeats = (r: string | null | undefined) => !!r && r !== "none";

export function setupSteps(f: SetupFacts): SetupStep[] {
  const done: Record<SetupStepId, boolean> = {
    income: f.income > 0,
    bank: f.bankLinked || f.typedInvestments > 0,
    payday: f.expected.some((e) => e.type === "income" && repeats(e.recurrence)),
    bills: f.expected.some((e) => e.type === "expense" && repeats(e.recurrence)),
    budget: Object.entries(f.budget).some(([k, v]) => !k.startsWith("_") && k !== "other" && typeof v === "number" && v > 0),
  };
  return SETUP_ORDER.map((id) => ({ id, done: done[id] }));
}

/** A repeating payment found in the bank, offered for one-tap confirm. */
export interface SetupFind {
  key: string;
  description: string;
  amountUSD: number;
  /** YYYY-MM-DD, the next date after today. */
  nextDueDate: string;
  recurrence: Recurrence;
  category: string;
}

const PAY_CADENCE = new Set(["weekly", "biweekly", "monthly"]);
const BILL_CADENCE = new Set(["monthly", "quarterly", "annual"]);

/**
 * Paycheck and bills spotted in transactions that Calendar doesn't list yet.
 * Payday is the largest steady income on a weekly to monthly rhythm; bills are
 * up to five steady monthly, quarterly or annual payments, largest first.
 * detectRecurring already drops anything whose amount swings more than 20%,
 * so a varying shop never shows as a bill.
 */
export function setupFinds(txns: RawTx[], listed: { description: string | null | undefined }[], rates: Record<string, number>): { payday: SetupFind | null; bills: SetupFind[] } {
  const found = detectRecurring(txns, rates);
  const known = (d: string) => listed.some((l) => !!l.description && sameMerchant(l.description, d));
  const toFind = (d: (typeof found.expenses)[number]): SetupFind => ({
    key: d.key, description: d.description, amountUSD: Math.round(Math.abs(d.avgAmountUSD) * 100) / 100,
    nextDueDate: d.nextDueDate, recurrence: toRecurrence(d.frequency) as Recurrence, category: d.category,
  });
  const payday = found.income.find((d) => PAY_CADENCE.has(d.frequency) && d.avgAmountUSD > 0 && !known(d.description));
  const bills = found.expenses.filter((d) => BILL_CADENCE.has(d.frequency) && !known(d.description)).slice(0, 5);
  return { payday: payday ? toFind(payday) : null, bills: bills.map(toFind) };
}

/** What the checklist remembers between visits: which steps were done, and the freedom year then. */
export interface SetupSnapshot { done: SetupStepId[]; year: number | null }

export type SetupMoment =
  | { kind: "date"; from: number; to: number }
  | { kind: "payday" };

/**
 * The payoff to show when a step has just been finished. Income, bank and
 * budget move the freedom date; payday and bills don't, they sharpen Until
 * payday, so those say that instead. Nothing on a first visit (no snapshot),
 * and nothing when no step is newly done.
 */
export function setupMoment(prev: SetupSnapshot | null, done: SetupStepId[], year: number | null): SetupMoment | null {
  if (!prev) return null;
  const newly = done.filter((id) => !prev.done.includes(id));
  if (newly.length === 0) return null;
  if (year != null && prev.year != null && year !== prev.year) return { kind: "date", from: prev.year, to: year };
  if (newly.includes("payday") || newly.includes("bills")) return { kind: "payday" };
  return null;
}

/** Storage keys, the same on both platforms. */
export const SETUP_SNAPSHOT_KEY = "uf_setup_snapshot_v1";
export const SETUP_FINISHED_KEY = "uf_setup_finished_v1";
export const SETUP_FOLDED_KEY = "uf_setup_folded_v1";
