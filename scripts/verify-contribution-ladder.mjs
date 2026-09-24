#!/usr/bin/env node
/**
 * The ladder as both surfaces see it.
 *
 * The Contributions page edits this; the Home card reports it. A Home card
 * naming a different step from the page it links to is worse than no card at
 * all, which is why the derivation is one function and this checks it.
 *
 * Run: npm run test:contribution-ladder
 */
import {
  buildLadderView, dayToDayAllowance, ladderViewFromPlan, measuredEmergencyFund, measuredExpenses,
  planBudgetOverride, EMERGENCY_FLOOR_MONTHS, EMERGENCY_TARGET_MONTHS,
} from "../lib/contribution-ladder.ts";
import { toCashAccounts } from "../lib/emergency-fund-accounts.ts";
import { ladderToStored, EMPTY_LADDER } from "../lib/contribution.ts";

const checks = [];
const check = (name, ok, detail = "") => checks.push({ name, ok, detail });

const ACCOUNTS = toCashAccounts([
  { id: "a1", name: "Capital One Savings", type: "depository", subtype: "savings", balance_current: 12400, mask: "4821", apy: 3.8 },
  { id: "a2", name: "Chase Checking", type: "depository", subtype: "checking", balance_current: 3100, mask: "0917", apy: null },
  { id: "a3", name: "IBKR", type: "investment", subtype: "brokerage", balance_current: 5000, mask: "2210", apy: null },
]);
const FACTS = { cashAccounts: ACCOUNTS, manualCashSavings: 2000, lastMonthNeeds: 1340, averageNeeds: 1180, realReturn: 0.055 };
const stored = (over = {}) => ladderToStored({ ...EMPTY_LADDER, ...over });

// ── The measured inputs
check("the emergency fund reads savings, not every account",
  measuredEmergencyFund(null, FACTS).balance === 12400, `${measuredEmergencyFund(null, FACTS).balance}`);
check("with nothing connected it falls back to the profile figure",
  measuredEmergencyFund(null, { ...FACTS, cashAccounts: [] }).balance === 2000);
check("expenses follow the month the user picked",
  measuredExpenses("last-month", FACTS) === 1340 && measuredExpenses("average", FACTS) === 1180);

// ── A buffer that is already full sends everything to the allocation
{
  const view = buildLadderView(stored(), 1800, FACTS);
  check("a full buffer means the whole budget invests",
    view.investable === 1800 && view.next.kind === "taxable",
    `${view.investable} to ${view.next?.kind}`);
  check("investing is reported as the next step, not as nothing to do",
    view.next.amount === 1800);
  check("the floor and target follow the expenses in force",
    view.efFloor === 1340 * EMERGENCY_FLOOR_MONTHS && view.efTarget === 1340 * EMERGENCY_TARGET_MONTHS,
    `${view.efFloor} / ${view.efTarget}`);
}

// ── An expensive debt outranks everything below it
{
  const view = buildLadderView(stored({
    debts: [{ id: "d", name: "Visa", balance: "4200", ratePct: "22.9" }],
  }), 1800, FACTS);
  check("expensive debt takes the budget before investing",
    view.next.kind === "high-interest-debt" && view.next.amount === 1800,
    `${view.next?.kind} ${view.next?.amount}`);
  check("nothing reaches the allocation while that debt stands", view.investable === 0);
  check("the debt is named in the step, so the card can say which one",
    view.next.label.includes("Visa"), view.next.label);
}

// ── The threshold follows the user's own growth assumption
{
  const car = [{ id: "d", name: "Car loan", balance: "9000", ratePct: "6" }];
  const atFiveAndAHalf = buildLadderView(stored({ debts: car }), 1800, FACTS);
  const atSeven = buildLadderView(stored({ debts: car }), 1800, { ...FACTS, realReturn: 0.07 });
  check("a 6% loan is expensive against a 5.5% assumption",
    atFiveAndAHalf.next.kind === "high-interest-debt", atFiveAndAHalf.next?.kind);
  check("and cheap against a 7% one",
    atSeven.next.kind === "taxable", atSeven.next?.kind);
}

// ── An empty buffer comes first
{
  // The floor is 1340 × 1.5 = 2010, so a 3000 budget fills it and has some
  // left; a 1800 budget does not reach it at all.
  const roomy = buildLadderView(stored({ efOverride: "0" }), 3000, FACTS);
  check("with no buffer at all, the floor is the first step",
    roomy.next.kind === "emergency-floor", roomy.next?.kind);
  check("the floor takes what it needs and no more",
    Math.round(roomy.next.amount) === Math.round(1340 * EMERGENCY_FLOOR_MONTHS),
    `${roomy.next?.amount}`);
  check("what is left carries on down the ladder",
    roomy.waterfall.fills.filter((f) => f.amount > 0).length > 1 &&
    Math.round(roomy.waterfall.fills.filter((f) => f.amount > 0).reduce((s, f) => s + f.amount, 0)) === 3000);

  const tight = buildLadderView(stored({ efOverride: "0" }), 1800, FACTS);
  check("a budget smaller than the floor goes entirely to the floor",
    tight.next.amount === 1800 && tight.investable === 0, `${tight.next?.amount}`);
  check("and that rung does not claim to be filled",
    tight.next.filled === false);
}

// ── Overrides win over what was measured, which is what the page shows
{
  const view = buildLadderView(stored({ efOverride: "500", expensesOverride: "2000", thresholdOverride: "9" }), 1000, FACTS);
  check("an overridden fund and expenses are what the ladder uses",
    view.efBalance === 500 && view.expenses === 2000 && view.thresholdPct === 9,
    `${view.efBalance} / ${view.expenses} / ${view.thresholdPct}`);
  check("and a custom expenses figure is marked as one", view.expensesAreCustom);
}

// ── From a stored plan, which is how the Home card reads it
{
  check("no plan means no card", ladderViewFromPlan(null, FACTS) === null);
  const bare = { targets: [], holdings: [], budget: 1800, frequency: "monthly" };
  check("a plan with a budget but no ladder still has an answer",
    ladderViewFromPlan(bare, FACTS)?.next?.kind === "taxable");
  check("a plan and the page agree, given the same inputs",
    ladderViewFromPlan({ ...bare, ladder: stored({ monthlyMatch: "250" }) }, FACTS).next.kind ===
    buildLadderView(stored({ monthlyMatch: "250" }), 1800, FACTS).next.kind);
  // A plan that never had an amount set now follows real cash rather than
  // placing nothing — that is the point of the change. Nothing is placed only
  // when there is genuinely no money.
  check("a plan with no amount set follows the cash instead of placing nothing",
    ladderViewFromPlan({ ...bare, budget: 0 }, FACTS)?.budget === 3100,
    `${ladderViewFromPlan({ ...bare, budget: 0 }, FACTS)?.budget}`);
  check("with no cash and no amount set, nothing is placed",
    ladderViewFromPlan({ ...bare, budget: 0 },
      { ...FACTS, cashAccounts: [], manualCashSavings: 0 })?.next === null);
}

// ── The amount now follows real cash unless the user fixed it ───────────
{
  const today = new Date(2026, 2, 20);           // 20 March
  const facts = {
    ...FACTS,
    today,
    // Capital One savings is the emergency fund; Chase checking is not, so
    // only the checking balance is contributable.
    expectedItems: [{ description: "Bills", amountUSD: 2400, type: "expense", dueDate: "2026-03-22", recurrence: "none" }],
  };
  const sched = { cadence: "monthly", anchorDay: 25 };

  const live = buildLadderView(stored(), null, facts, sched);
  check("the contribution is cash outside the emergency fund, less what is due",
    live.available.cash === 3100 && live.available.committed === 2400 && live.budget === 700,
    `${live.available.cash} - ${live.available.committed} = ${live.budget}`);
  check("the emergency fund is not offered up for investing",
    !live.available.cash || live.available.cash === 3100,
    "12,400 of savings must not appear in the contributable figure");
  check("the countdown comes with it", live.available.daysUntil === 5, `${live.available.daysUntil}`);
  check("and the ladder allocates that amount, not a typed one",
    Math.round(live.waterfall.fills.reduce((s, f) => s + f.amount, 0)) === 700);

  // A bill due three days AFTER the contribution still has to be paid from
  // this cycle's money. An earlier version ignored it — which is precisely
  // the case where investing everything on the day bounces the bill.
  const later = buildLadderView(stored(), null,
    { ...facts, expectedItems: [{ description: "Bills", amountUSD: 2400, type: "expense", dueDate: "2026-03-28", recurrence: "none" }] }, sched);
  check("a bill falling just after the contribution date is still held back",
    later.budget === 700, `${later.budget} — was 3100 before the forecast`);
  const nextCycle = buildLadderView(stored(), null,
    { ...facts, expectedItems: [{ description: "Bills", amountUSD: 2400, type: "expense", dueDate: "2026-04-26", recurrence: "none" }] }, sched);
  check("a bill in the NEXT cycle does not reduce this one",
    nextCycle.budget === 3100, `${nextCycle.budget}`);
  const withPay = buildLadderView(stored(), null,
    { ...facts, expectedItems: [
      { description: "Bills", amountUSD: 2400, type: "expense", dueDate: "2026-03-22", recurrence: "none" },
      { description: "Salary", amountUSD: 4000, type: "income", dueDate: "2026-03-25", recurrence: "none" },
    ] }, sched);
  check("income on contribution day adds to what can go in",
    withPay.budget === 4700 && withPay.available.income === 4000, `${withPay.budget}`);

  // The dangerous case, restated at this level.
  const blind = buildLadderView(stored(), null, { ...facts, expectedItems: [] }, sched);
  check("with no bills on record the whole balance looks free, and is flagged",
    blind.budget === 3100 && blind.available.hasExpectedData === false);

  const fixed = buildLadderView(stored(), 500, facts, sched);
  check("a fixed amount wins over what is free",
    fixed.budget === 500 && fixed.budgetIsCustom === true);
  check("and a live amount is not marked as custom", live.budgetIsCustom === false);

  check("owing more than you hold contributes nothing rather than a negative",
    buildLadderView(stored(), null,
      { ...facts, expectedItems: [{ description: "Bills", amountUSD: 9000, type: "expense", dueDate: "2026-03-22", recurrence: "none" }] }, sched).budget === 0);
}

// ── Plans written before any of this still open ─────────────────────────
{
  const legacy = { targets: [], holdings: [], budget: 1500, frequency: "monthly" };
  check("a legacy hand-typed budget is kept as an override, not discarded",
    planBudgetOverride(legacy) === 1500,
    "a number someone chose should stay on screen where they can clear it");
  check("an explicit null override means follow the cash",
    planBudgetOverride({ ...legacy, budgetOverride: null }) === null);
  check("an explicit override wins over the legacy field",
    planBudgetOverride({ ...legacy, budgetOverride: 700 }) === 700);
  check("a legacy plan with no budget at all follows the cash",
    planBudgetOverride({ ...legacy, budget: 0 }) === null);
  check("a plan with no schedule gets the default rather than crashing",
    ladderViewFromPlan(legacy, { ...FACTS, today: new Date(2026, 2, 20) })?.available.nextDate != null);
}

// ── Day-to-day spending: last month's needs, not the whole budget
{
  const today = new Date(2026, 8, 24);           // 24 September
  const sched = { cadence: "monthly", anchorDay: 15 };
  const bills = [
    { description: "Rent", amountUSD: 1200, type: "expense", dueDate: "2026-10-01", recurrence: "monthly", category: "housing" },
  ];
  const lastMonthSpending = {
    year: 2026, monthIndex: 7,                     // August, 31 days
    needs: [
      { description: "Rent transfer", category: "housing", amountUSD: 1200 },
      { description: "Groceries", category: "food", amountUSD: 310 },
    ],
    wants: 400, untagged: 900,                     // a trip, say — not a daily cost
  };
  const facts = { ...FACTS, today, expectedItems: bills, budgetMonthlySpending: 3000, lastMonthSpending };

  const basis = dayToDayAllowance(facts, bills);
  check("the estimate comes from last month's needs when they are tagged",
    basis?.kind === "needs" && Math.abs(basis.perDay - 310 / 31) < 1e-9,
    `${basis?.kind} $${basis?.perDay.toFixed(2)}/day`);
  check("wants and untagged spending are reported, not counted",
    basis?.kind === "needs" && basis.wants === 400 && basis.untagged === 900 && basis.monthly === 310);
  const view = buildLadderView(stored(), null, facts, sched);
  check("the forecast uses the same daily figure the ledger explains",
    view.available.allowanceBasis?.kind === "needs" &&
    Math.abs(view.available.forecast.dailyAllowance - 310 / 31) < 1e-9);

  const noTags = dayToDayAllowance({ ...facts, lastMonthSpending: { ...lastMonthSpending, needs: [] } }, bills);
  check("with no tagged needs it falls back to the budget less repeating bills",
    noTags?.kind === "budget" && noTags.monthly === 1800, `${noTags?.kind} ${noTags?.monthly}`);
  check("with neither, there is no estimate rather than a made-up one",
    dayToDayAllowance({ ...FACTS, today }, bills) === null);
}

// ── The stored exclusions reach the forecast (D-14)
{
  const today = new Date(2026, 8, 24);
  const facts = {
    ...FACTS, today, expectedItems: [], budgetMonthlySpending: 3000,
    lastMonthSpending: { year: 2026, monthIndex: 7, wants: 0, untagged: 0, needs: [
      { description: "Market", category: "food", amountUSD: 310 },
      { description: "Flight", category: "travel", amountUSD: 620 },
    ] },
  };
  const sched = { cadence: "monthly", anchorDay: 15 };
  const plain = buildLadderView(stored(), null, facts, sched);
  const left = buildLadderView(stored({ allowanceExclusions: [{ category: "travel", scope: "month", month: "2026-08" }] }), null, facts, sched);
  check("leaving travel out lowers the daily rate the forecast subtracts",
    Math.abs(plain.available.forecast.dailyAllowance - 930 / 31) < 1e-9 &&
    Math.abs(left.available.forecast.dailyAllowance - 310 / 31) < 1e-9,
    `${plain.available.forecast.dailyAllowance.toFixed(2)} → ${left.available.forecast.dailyAllowance.toFixed(2)} a day`);
  check("and so more is safe to contribute", left.available.free >= plain.available.free);
  const home = ladderViewFromPlan({ targets: [], holdings: [], budget: 0, frequency: "monthly",
    ladder: stored({ allowanceExclusions: [{ category: "travel", scope: "always" }] }), contribution: sched }, facts);
  check("the Home card reads the same choice from the saved plan",
    Math.abs(home.available.forecast.dailyAllowance - 310 / 31) < 1e-9);
}

let failed = 0;
for (const c of checks) {
  console.log(`${c.ok ? "✓" : "✗"} ${c.name}${c.detail ? `  — ${c.detail}` : ""}`);
  if (!c.ok) failed++;
}
console.log(failed ? `\nLadder view verification failed: ${failed} check(s).` : "\nLadder view verification passed");
process.exit(failed ? 1 : 0);
