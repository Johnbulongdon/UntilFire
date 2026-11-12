import assert from "node:assert/strict";

import { payLanded, paydayPlan, paydayReward } from "../lib/payday-plan.ts";

const sum = (parts: { amount: number }[]) => Math.round(parts.reduce((s, p) => s + p.amount, 0) * 100) / 100;
const base = { pay: 2_400, cash: 2_400, bills: 1_150, cards: 0, days: 14, nextPaydayIso: "2026-11-27", perDay: 46, target: 900_000 };

// The mock's payday: bills, then $46 a day for 14 days, then the ladder's steps, then what is left.
const plan = paydayPlan({ ...base, steps: [{ kind: "emergency-floor", amount: 300 }, { kind: "taxable", amount: 300 }] })!;
assert.deepEqual(plan.parts.map((p) => [p.label, p.amount]), [["Bills", 1_150], ["Day-to-day", 644], ["Safety pot", 300], ["Invest", 300], ["Extra cushion", 6]]);
assert.equal(sum(plan.parts), 2_400);
assert.equal(plan.toFreedom, 600);
assert.equal(plan.short, 0);
// $600 of $900k is 5.84 hours of a year.
assert.ok(Math.abs(plan.hours - 5.84) < 0.01);
assert.equal(paydayReward(plan.hours), "This plan pays for 5 more hours of every year.");

// The parts always add up to the cash, whatever the ladder asks for.
const big = paydayPlan({ ...base, steps: [{ kind: "emergency-floor", amount: 500 }, { kind: "taxable", amount: 5_000 }] })!;
assert.equal(sum(big.parts), 2_400);
// Steps only take what bills and day-to-day leave ($606), in ladder order.
assert.deepEqual(big.parts.slice(2).map((p) => [p.label, p.amount]), [["Safety pot", 500], ["Invest", 106]]);
assert.equal(big.toFreedom, 606);

// Cash already in the account is planned too: the parts add up to the cash, not the paycheck.
const withCash = paydayPlan({ ...base, cash: 2_900, steps: [{ kind: "taxable", amount: 300 }] })!;
assert.equal(sum(withCash.parts), 2_900);
assert.equal(withCash.parts.at(-1)!.label, "Extra cushion");
assert.equal(withCash.parts.at(-1)!.amount, 806);

// Card balances not listed as a bill are set aside with the bills, and the label says so.
const cards = paydayPlan({ ...base, cards: 400, steps: [] })!;
assert.deepEqual([cards.parts[0].label, cards.parts[0].amount], ["Bills and cards", 1_550]);

// Bills bigger than the cash: everything goes to bills, the gap is reported, no step or reward is promised.
const short = paydayPlan({ ...base, cash: 1_000, steps: [{ kind: "taxable", amount: 300 }] })!;
assert.deepEqual(short.parts.map((p) => [p.kind, p.amount]), [["bills", 1_000]]);
assert.equal(short.short, 150);
assert.equal(short.toFreedom, 0);
assert.equal(paydayReward(short.hours), null);

// Nothing safe to move yet: still a plan, with no guilt and no reward line.
const none = paydayPlan({ ...base, steps: [] })!;
assert.deepEqual(none.parts.map((p) => p.kind), ["bills", "everyday", "cushion"]);
assert.equal(paydayReward(none.hours), null);

// Without a per-day figure, nothing is called day-to-day.
assert.deepEqual(paydayPlan({ ...base, perDay: null, steps: [] })!.parts.map((p) => p.kind), ["bills", "cushion"]);

// Paying debt down is a step, but adds no free time; saving does.
const debt = paydayPlan({ ...base, steps: [{ kind: "high-interest-debt", amount: 300 }, { kind: "taxable", amount: 300 }] })!;
assert.equal(debt.toFreedom, 600);
assert.ok(Math.abs(debt.hours - 2.92) < 0.01);

// No pay, no cash or no window: no plan.
assert.equal(paydayPlan({ ...base, pay: 0, steps: [] }), null);
assert.equal(paydayPlan({ ...base, cash: 0, steps: [] }), null);
assert.equal(paydayPlan({ ...base, days: 0, steps: [] }), null);

// The reward line: days, hours, minutes; nothing under a minute.
assert.equal(paydayReward(50), "This plan pays for 2 more days of every year.");
assert.equal(paydayReward(1.9), "This plan pays for 1 more hour of every year.");
assert.equal(paydayReward(0.5), "This plan pays for 30 more minutes of every year.");
assert.equal(paydayReward(1 / 60), "This plan pays for 1 more minute of every year.");
assert.equal(paydayReward(0.001), null);
assert.equal(paydayReward(0), null);

// Pay landing. A real paycheck in the last three days counts, by its own date.
const paychecks = [{ usd: 2_400, dueOnDay: false }];
assert.deepEqual(payLanded({ day: "2026-11-13", today: "2026-11-13", incomes: [{ date: "2026-11-13", usd: 2_400 }], paychecks, bankLinked: true }), { iso: "2026-11-13", usd: 2_400 });
// It arrived a day late: still that payday, so one answer covers it.
assert.deepEqual(payLanded({ day: "2026-11-14", today: "2026-11-14", incomes: [{ date: "2026-11-13", usd: 2_380 }], paychecks, bankLinked: true }), { iso: "2026-11-13", usd: 2_380 });
// Too old, or a refund-sized amount: not a payday.
assert.equal(payLanded({ day: "2026-11-17", today: "2026-11-17", incomes: [{ date: "2026-11-13", usd: 2_400 }], paychecks, bankLinked: true }), null);
assert.equal(payLanded({ day: "2026-11-13", today: "2026-11-13", incomes: [{ date: "2026-11-13", usd: 40 }], paychecks, bankLinked: true }), null);
// Two paychecks on one day are one payday.
assert.deepEqual(payLanded({ day: "2026-11-13", today: "2026-11-13", incomes: [{ date: "2026-11-13", usd: 2_400 }, { date: "2026-11-13", usd: 1_800 }], paychecks: [{ usd: 2_400, dueOnDay: false }, { usd: 1_800, dueOnDay: false }], bankLinked: true }), { iso: "2026-11-13", usd: 4_200 });
// With a bank linked, the expected day alone is not enough: the balance has not moved yet.
assert.equal(payLanded({ day: "2026-11-13", today: "2026-11-13", incomes: [], paychecks: [{ usd: 2_400, dueOnDay: true }], bankLinked: true }), null);
// Without a bank, the expected day counts.
assert.deepEqual(payLanded({ day: "2026-11-13", today: "2026-11-13", incomes: [], paychecks: [{ usd: 2_400, dueOnDay: true }], bankLinked: false }), { iso: "2026-11-13", usd: 2_400 });
// No repeating paycheck in Upcoming: there is no next payday to plan to.
assert.equal(payLanded({ day: "2026-11-13", today: "2026-11-13", incomes: [{ date: "2026-11-13", usd: 2_400 }], paychecks: [], bankLinked: true }), null);

console.log("payday plan checks passed");
