/**
 * "Get set up": which steps count as done, what the bank offers to confirm,
 * and which payoff shows when a step is finished.
 *
 * Run: npm run test:setup-steps
 */
import assert from "node:assert/strict";
import { setupFinds, setupMoment, setupSteps, type SetupFacts } from "../lib/setup-steps.ts";

let n = 0;
const ok = (name: string, fn: () => void) => { fn(); n++; console.log(`✓ ${name}`); };
const base: SetupFacts = { income: 0, bankLinked: false, typedInvestments: 0, expected: [], budget: {} };
const doneIds = (f: Partial<SetupFacts>) => setupSteps({ ...base, ...f }).filter((s) => s.done).map((s) => s.id);

ok("nothing filled in is nothing done, in the fixed order", () => {
  assert.deepEqual(setupSteps(base).map((s) => s.id), ["income", "bank", "payday", "bills", "budget"]);
  assert.deepEqual(doneIds({}), []);
});
ok("income counts once above zero", () => {
  assert.deepEqual(doneIds({ income: 4200 }), ["income"]);
});
ok("typed investments count as the bank step, for people Plaid can't reach", () => {
  assert.deepEqual(doneIds({ typedInvestments: 15000 }), ["bank"]);
  assert.deepEqual(doneIds({ bankLinked: true }), ["bank"]);
});
ok("payday and bills need a repeating item; a one-off doesn't count", () => {
  assert.deepEqual(doneIds({ expected: [{ type: "income", recurrence: "none" }, { type: "expense", recurrence: null }] }), []);
  assert.deepEqual(doneIds({ expected: [{ type: "income", recurrence: "biweekly" }] }), ["payday"]);
  assert.deepEqual(doneIds({ expected: [{ type: "expense", recurrence: "monthly" }] }), ["bills"]);
});
ok("the calculator's one estimate in Other is not a budget; a real category is", () => {
  assert.deepEqual(doneIds({ budget: { other: 3000, housing: 0 } }), []);
  assert.deepEqual(doneIds({ budget: { other: 3000, food: 400 } }), ["budget"]);
  assert.deepEqual(doneIds({ budget: { _budget_local: { food: 5 } } as Record<string, unknown> }), []);
});

const day = (offsetDays: number) => {
  const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() + offsetDays);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const tx = (description: string, amount: number, date: string, type: "expense" | "income" = "expense") =>
  ({ id: `${description}-${date}`, date, amount, currency: "USD", description, category: type === "income" ? "salary" : "housing", transaction_type: type });
const months = (description: string, amount: number, type: "expense" | "income" = "expense") =>
  [-75, -45, -15].map((o) => tx(description, amount, day(o), type));

ok("finds the paycheck and steady bills, skips swinging amounts and ones already listed", () => {
  const txns = [
    ...[-56, -42, -28, -14].map((o) => tx("ACME PAYROLL", 2310, day(o), "income")),
    ...months("Rent", 1450), ...months("Phone", 45), ...months("Gym", 40),
    tx("Amazon", 20, day(-75)), tx("Amazon", 90, day(-45)), tx("Amazon", 5, day(-15)),
  ];
  const { payday, bills } = setupFinds(txns, [{ description: "Gym membership" }], {});
  assert.equal(payday?.description, "ACME PAYROLL");
  assert.equal(payday?.recurrence, "biweekly");
  assert.deepEqual(bills.map((b) => b.description), ["Rent", "Phone"]);
  assert.equal(bills[0].recurrence, "monthly");
});
ok("no bank history finds nothing", () => {
  assert.deepEqual(setupFinds([], [], {}), { payday: null, bills: [] });
});

ok("the payoff: the date when it moved, Until payday for payday or bills, nothing on a first visit", () => {
  assert.equal(setupMoment(null, ["income", "bank"], 2041), null);
  assert.deepEqual(setupMoment({ done: ["income"], year: 2043 }, ["income", "bank"], 2041), { kind: "date", from: 2043, to: 2041 });
  assert.deepEqual(setupMoment({ done: ["income", "bank"], year: 2041 }, ["income", "bank", "payday"], 2041), { kind: "payday" });
  assert.equal(setupMoment({ done: ["income"], year: 2041 }, ["income", "budget"], 2041), null, "budget that didn't move the date says nothing");
  assert.equal(setupMoment({ done: ["income", "bank"], year: 2043 }, ["income", "bank"], 2041), null, "a move with no step finished isn't this card's to explain");
});

console.log(`\n${n} setup-step checks passed`);
