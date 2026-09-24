/**
 * The ladder, worked out from a saved plan and what the accounts say.
 *
 * Two surfaces need this answer: the Contributions page, where it is edited,
 * and the Home card, which only reports it. They must agree — a Home card
 * naming a different step from the page it links to is worse than no card —
 * so the derivation lives here once rather than being written out twice.
 *
 * Everything this needs arrives as arguments. It reads no storage and holds
 * no state, which is what lets the same call run inside a component and
 * inside a test.
 */

import type { ExpenseSource, StoredLadder, StoredPlan } from "./contribution.ts";
import {
  buildLadder, fillWaterfall, DEFAULT_THRESHOLD_PCT,
  type Debt, type RungFill, type WaterfallResult,
} from "./contribution-waterfall.ts";
import {
  resolveEmergencyAccounts, sumBalances, type CashAccount,
} from "./emergency-fund-accounts.ts";
import {
  daysUntil, DEFAULT_SCHEDULE, nextContributionDate, type ContributionSchedule,
} from "./contribution-schedule.ts";
import {
  buildForecast, monthlyAllowance, needsAllowance, perDay,
  type AllowanceExclusion, type CashflowForecast, type ExpectedItem, type NeedTransaction, type NeedsAllowance,
} from "./cashflow-forecast.ts";

/** The same floor and target the Home safety runway uses. */
export const EMERGENCY_FLOOR_MONTHS = 1.5;
export const EMERGENCY_TARGET_MONTHS = 6;

/** What the app knows without being told: balances, spending, assumptions. */
export interface AccountFacts {
  cashAccounts: CashAccount[];
  /** Cash typed into the profile, for someone with nothing connected. */
  manualCashSavings?: number;
  lastMonthNeeds?: number;
  averageNeeds?: number;
  /** Real return as a fraction: 0.055, not 5.5. */
  realReturn?: number;
  /** Expected payments in and out, in USD, with their dates and repeats —
   *  the user's own Money → Expected list. */
  expectedItems?: ExpectedItem[];
  /** The budget's total monthly spending — compared against the Expected
   *  list, never spread into the forecast as invented dated lines. */
  budgetMonthlySpending?: number;
  /** Last complete month's spending by tag, in USD. Needs drive the
   *  day-to-day estimate; wants and untagged are reported, not counted. */
  lastMonthSpending?: {
    year: number;
    monthIndex: number;
    needs: NeedTransaction[];
    wants: number;
    untagged: number;
  };
  /** Injectable for tests; the surfaces leave it out and get the real clock. */
  today?: Date;
}

export interface LadderView {
  /** What the emergency fund is, and where it was read from. */
  efBalance: number;
  efAccounts: CashAccount[];
  efFloor: number;
  efTarget: number;
  /** Monthly needs in force, and whether the user set it by hand. */
  expenses: number;
  expensesAreCustom: boolean;
  /** The rate above which debt beats investing. */
  thresholdPct: number;
  waterfall: WaterfallResult;
  /** Every rung before the investment one that is taking money this month. */
  takes: RungFill[];
  /** The one to act on: the first rung taking money. Null when nothing is. */
  next: RungFill | null;
  /** What reaches the allocation. */
  investable: number;
  /** When the next contribution lands, and what is safe to put in. */
  available: AvailableToContribute;
  /** The amount the ladder allocated, and whether the user fixed it by hand
   *  rather than letting it follow what is actually free. */
  budget: number;
  budgetIsCustom: boolean;
}

export interface AvailableToContribute {
  nextDate: Date;
  daysUntil: number;
  /** Cash in accounts that are not the emergency fund — the ledger's opening. */
  cash: number;
  /** The accounts that cash is in, so the opening line can name them. */
  cashAccounts: CashAccount[];
  /** Counted income and bills across the cycle. */
  income: number;
  committed: number;
  /** The lowest the balance falls before the next contribution; never negative. */
  free: number;
  /** False when no expected payments are recorded at all, so nothing was
   *  subtracted and the figure is only today's balance. */
  hasExpectedData: boolean;
  /** Every line behind the figure. */
  forecast: CashflowForecast;
  /** Where the day-to-day estimate came from, so the ledger can say. */
  allowanceBasis: AllowanceBasis | null;
}

export type AllowanceBasis =
  | ({ kind: "needs"; wants: number; untagged: number } & NeedsAllowance)
  | { kind: "budget"; monthly: number; perDay: number };

/**
 * The day-to-day spending estimate, and what it rests on (D-11).
 *
 * Last complete month's need-tagged spending, less needs already dated on
 * the Expected list, per day of that month. What someone actually spent on
 * needs is a better forecast than what they budgeted, which includes wants;
 * and a month with a trip in it is not a month of daily costs. When there is
 * no tagged history to go on, the budget-based estimate stands in, labelled
 * as such.
 */
export function dayToDayAllowance(
  facts: AccountFacts, items: ExpectedItem[], exclusions: AllowanceExclusion[] = [],
): AllowanceBasis | null {
  const last = facts.lastMonthSpending;
  const fromNeeds = last ? needsAllowance(last.needs, items, last.year, last.monthIndex, exclusions) : null;
  if (fromNeeds && last) return { kind: "needs", wants: last.wants, untagged: last.untagged, ...fromNeeds };
  const monthly = monthlyAllowance(facts.budgetMonthlySpending ?? 0, items);
  return monthly > 0 ? { kind: "budget", monthly, perDay: perDay(monthly) } : null;
}

/** What the emergency fund field shows, before any override. */
export function measuredEmergencyFund(
  efAccountIds: string[] | null, facts: AccountFacts,
): { balance: number; accounts: CashAccount[] } {
  const accounts = resolveEmergencyAccounts(facts.cashAccounts, efAccountIds);
  return {
    balance: facts.cashAccounts.length > 0 ? sumBalances(accounts) : (facts.manualCashSavings ?? 0),
    accounts,
  };
}

/** What the expenses field shows, before any override. */
export function measuredExpenses(source: ExpenseSource, facts: AccountFacts): number {
  return (source === "average" ? facts.averageNeeds : facts.lastMonthNeeds) ?? 0;
}

/**
 * The ladder as numbers. Takes the stored shape rather than the typed one so
 * there is one input format: the page converts its fields with
 * `ladderToStored`, and the Home card reads the stored plan directly.
 */
export function buildLadderView(
  ladder: StoredLadder,
  budgetOverride: number | null,
  facts: AccountFacts,
  schedule: ContributionSchedule = DEFAULT_SCHEDULE,
): LadderView {
  const measuredEf = measuredEmergencyFund(ladder.efAccountIds, facts);
  const efBalance = ladder.efOverride ?? measuredEf.balance;

  /* What is free to contribute: cash in the accounts that are NOT the
     emergency fund, less anything due before the next contribution date.
     Excluding the buffer is what stops this proposing that someone invest
     the money they are keeping precisely so they do not have to. */
  const efIds = new Set(measuredEf.accounts.map((a) => a.id));
  const contributable = facts.cashAccounts.filter((a) => !efIds.has(a.id));
  const today = facts.today ?? new Date();
  const items = facts.expectedItems ?? [];
  const allowanceBasis = dayToDayAllowance(facts, items, ladder.allowanceExclusions ?? []);
  const forecast = buildForecast(sumBalances(contributable), items, schedule, today, allowanceBasis?.perDay ?? 0);
  const nextDate = nextContributionDate(schedule, today);
  const available: AvailableToContribute = {
    nextDate,
    daysUntil: daysUntil(nextDate, today),
    cash: forecast.opening,
    cashAccounts: contributable,
    income: forecast.income,
    committed: forecast.expenses,
    free: forecast.safeToContribute,
    hasExpectedData: items.length > 0,
    forecast,
    allowanceBasis,
  };
  const budget = budgetOverride ?? available.free;

  const expenses = ladder.expensesOverride ?? measuredExpenses(ladder.expenseSource, facts);
  const efFloor = expenses * EMERGENCY_FLOOR_MONTHS;
  const efTarget = expenses * EMERGENCY_TARGET_MONTHS;

  const accountThresholdPct = facts.realReturn != null
    ? +(facts.realReturn * 100).toFixed(2)
    : DEFAULT_THRESHOLD_PCT;
  const thresholdPct = ladder.thresholdOverride ?? accountThresholdPct;

  const debts: Debt[] = ladder.debts.map((d) => ({
    name: d.name, balance: d.balance, ratePct: d.ratePct,
  }));

  const waterfall = fillWaterfall(buildLadder({
    emergencyGapToFloor: Math.max(0, efFloor - efBalance),
    emergencyGapToTarget: Math.max(0, efTarget - efBalance),
    monthlyMatch: ladder.monthlyMatch,
    debts,
    highInterestThresholdPct: thresholdPct || DEFAULT_THRESHOLD_PCT,
    taxAdvantagedRoom: ladder.taxRoom,
    lowInterestExtra: ladder.lowInterestExtra,
    disabled: ladder.disabled,
  }), budget);

  const takes = waterfall.fills.filter((f) => f.kind !== "taxable" && f.amount > 0);
  // Investing is a real answer: with no buffer to fill and nothing owed, the
  // next step IS the allocation, and a card that said "nothing to do" would
  // be wrong. Null is reserved for having no money to place at all.
  const next = takes[0] ?? waterfall.fills.find((f) => f.kind === "taxable" && f.amount > 0) ?? null;

  return {
    efBalance,
    efAccounts: measuredEf.accounts,
    efFloor,
    efTarget,
    expenses,
    expensesAreCustom: ladder.expensesOverride !== null,
    thresholdPct,
    waterfall,
    takes,
    next,
    investable: waterfall.toInvest,
    available,
    budget,
    budgetIsCustom: budgetOverride !== null,
  };
}

/** The same view, from a plan as it comes out of storage. A plan with a
 *  budget but no ladder yet still has an answer, so the ladder is defaulted
 *  rather than the whole thing refused. */
export function ladderViewFromPlan(plan: StoredPlan | null, facts: AccountFacts): LadderView | null {
  if (!plan) return null;
  return buildLadderView(
    plan.ladder ?? EMPTY_STORED_LADDER,
    planBudgetOverride(plan),
    facts,
    plan.contribution ?? DEFAULT_SCHEDULE,
  );
}

/**
 * The fixed amount, if there is one.
 *
 * Plans written before the amount could follow real cash carry it in
 * `budget`, which was always hand-typed. Reading that as an override rather
 * than discarding it keeps a number someone chose on screen, as something
 * they can see and clear, instead of silently replacing it.
 */
export function planBudgetOverride(plan: StoredPlan): number | null {
  if (plan.budgetOverride !== undefined) return plan.budgetOverride;
  return plan.budget > 0 ? plan.budget : null;
}

const EMPTY_STORED_LADDER: StoredLadder = {
  efOverride: null, expensesOverride: null, thresholdOverride: null,
  efAccountIds: null, expenseSource: "last-month",
  monthlyMatch: 0, taxRoom: 0, lowInterestExtra: 0, debts: [], disabled: [],
};
