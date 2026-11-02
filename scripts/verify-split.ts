/**
 * Split a payment between people (D-135): the share math and Today's pay-back checks.
 *
 * Run: npm run test:split
 */
import assert from "node:assert/strict";
import { owedFor, paybackAsks, splitChecks, splitPatch, type SplitRow } from "../lib/split.ts";
import { webTodayItems, type TodayRow } from "../lib/today-web.ts";

let n = 0;
const ok = (name: string, fn: () => void) => { fn(); n++; console.log(`✓ ${name}`); };

ok("by people: everyone pays the same, the others' share is left out", () => {
  assert.equal(owedFor(120, { people: 3 }), 80);
  assert.equal(owedFor(100, { people: 3 }), 66.67);
});
ok("by a typed share: the rest is left out, never below 0 or above what was paid", () => {
  assert.equal(owedFor(120, { share: 55 }), 65);
  assert.equal(owedFor(120, { share: 200 }), 0);
  assert.equal(owedFor(120, { share: -5 }), 120);
});
ok("a split rides on top of a real refund, and undoing keeps the refund", () => {
  const p = splitPatch({ amount: 120, refund_amount: 20, split_owed: 0 }, owedFor(100, { people: 2 }), 2);
  assert.deepEqual(p, { refund_amount: 70, split_owed: 50, split_count: 2, split_state: "waiting" });
  const undo = splitPatch({ amount: 120, refund_amount: 70, split_owed: 50, split_state: "waiting" }, 0, null);
  assert.deepEqual(undo, { refund_amount: 20, split_owed: 0, split_count: null, split_state: null });
});
ok("changing a split keeps its state", () => {
  assert.equal(splitPatch({ amount: 90, refund_amount: 60, split_owed: 60, split_state: "paid" }, 45, 2).split_state, "paid");
});

const split = (id: string, date: string, owedUsd: number, state: SplitRow["state"] = "waiting"): SplitRow => ({ id, date, description: "Dinner", owedUsd, state });
const money = (id: string, date: string, usd: number, description = "VENMO FROM SAM", transaction_type = "income"): TodayRow =>
  ({ id, date, description, usd, category: "other_income", tags: [], transaction_type });

ok("Venmo money in after a split asks if it is a pay-back", () => {
  const asks = paybackAsks([money("m1", "2026-11-02", 40)], [split("s1", "2026-10-31", 80)], new Set());
  assert.equal(asks.length, 1);
  assert.equal(asks[0].split.id, "s1");
});
ok("pay, salary, money bigger than the split, before it or long after are not asked", () => {
  const s = [split("s1", "2026-10-31", 80)];
  assert.equal(paybackAsks([money("m1", "2026-11-02", 3000, "ACME PAYROLL")], s, new Set()).length, 0);
  assert.equal(paybackAsks([money("m1", "2026-11-02", 200)], s, new Set()).length, 0);
  assert.equal(paybackAsks([money("m1", "2026-10-30", 40)], s, new Set()).length, 0);
  assert.equal(paybackAsks([money("m1", "2027-01-30", 40)], s, new Set()).length, 0);
  assert.equal(paybackAsks([money("m1", "2026-11-02", 40)], s, new Set(["payback:m1"])).length, 0);
  assert.equal(paybackAsks([money("m1", "2026-11-02", 40)], [split("s1", "2026-10-31", 80, "cash")], new Set()).length, 0);
});
ok("a split still waiting after 30 days is checked once; paid ones are not", () => {
  const s = [split("old", "2026-09-20", 80), split("new", "2026-10-25", 80), split("paid", "2026-09-01", 80, "paid")];
  assert.deepEqual(splitChecks(s, "2026-11-02", new Set()).map((c) => c.split.id), ["old"]);
  assert.equal(splitChecks(s, "2026-11-02", new Set(["splitcheck:old"])).length, 0);
});
ok("Today lists both kinds", () => {
  const now = new Date("2026-11-02T15:00:00");
  const { items } = webTodayItems({ rows: [money("m1", "2026-11-02", 40)], bills: [], progress: { done: [], acks: [] },
    splits: [split("s1", "2026-10-31", 80), split("old", "2026-09-20", 50)], now });
  assert.deepEqual(items.map((i) => i.kind), ["payback", "splitcheck"]);
});

console.log(`\n${n} split checks passed`);
