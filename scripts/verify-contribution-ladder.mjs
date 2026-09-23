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
  buildLadderView, ladderViewFromPlan, measuredEmergencyFund, measuredExpenses,
  EMERGENCY_FLOOR_MONTHS, EMERGENCY_TARGET_MONTHS,
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
  check("a zero budget places nothing",
    ladderViewFromPlan({ ...bare, budget: 0 }, FACTS).next === null);
}

let failed = 0;
for (const c of checks) {
  console.log(`${c.ok ? "✓" : "✗"} ${c.name}${c.detail ? `  — ${c.detail}` : ""}`);
  if (!c.ok) failed++;
}
console.log(failed ? `\nLadder view verification failed: ${failed} check(s).` : "\nLadder view verification passed");
process.exit(failed ? 1 : 0);
