// Home's next move and the website's Today list (D-89): the order of moves, and Today's keys and counted days.
import assert from "node:assert/strict";
import { pickNextMove } from "../lib/next-move.ts";
import { monthCount, webTodayItems } from "../lib/today-web.ts";

const fmt = (n: number) => `$${Math.round(n)}`;
const base = { categories: [], hasBudget: true, ladder: null, fallback: null, fmt, snoozed: () => false };
const rung = (kind: string, amount: number) => ({ kind, label: kind, amount, filled: false }) as never;

// Over budget wins, the biggest overspend first; small overs are not worth saying.
const over = pickNextMove({ ...base, ladder: [rung("employer-match", 200)],
  categories: [{ key: "a", label: "Dining", budget: 300, spent: 340 }, { key: "b", label: "Shopping", budget: 100, spent: 260 }, { key: "c", label: "Fuel", budget: 100, spent: 110 }] });
assert.equal(over?.key, "over:b");
assert.equal(over?.door, "money");
// Snoozed moves fall through to the next rule.
assert.equal(pickNextMove({ ...base, categories: [{ key: "b", label: "S", budget: 100, spent: 260 }], snoozed: (k) => k === "over:b" }), null);
// No budget comes before the ladder.
assert.equal(pickNextMove({ ...base, hasBudget: false, ladder: [rung("taxable", 100)] })?.key, "budget");
// The ladder's first step taking money, with the split.
const ladder = pickNextMove({ ...base, ladder: [rung("emergency-floor", 0), rung("high-interest-debt", 150), rung("taxable", 50)] });
assert.equal(ladder?.key, "ladder:high-interest-debt");
assert.equal(ladder?.split?.length, 2);
// The what-if fallback only when it moves the date.
assert.equal(pickNextMove({ ...base, fallback: { label: "Spend less", deltaYears: 0 } }), null);
assert.equal(pickNextMove({ ...base, fallback: { label: "Spend less", deltaYears: 0.5 } })?.payoff, "6 months sooner");

// Today: sorted spends drop out, the closing item is always last, and a finished day counts once.
const now = new Date(2026, 9, 18, 15);
const row = (id: string, tags: string[] = [], description = "TARGET 1234", usd = 64) => ({ id, date: "2026-10-17", description, usd, category: "shopping", tags, transaction_type: "expense" });
const list = webTodayItems({ rows: [row("1"), row("2", ["need"]), row("3", [], "Trader Joe's"), row("4", [], "TARGET 1234", 9)], bills: [], progress: { done: [], acks: [] }, perDay: 40, now });
assert.deepEqual(list.items.map((i) => i.key), ["need:1", "day:2026-10-18"], "only a mixed shop of $20 or more is asked about (D-106)");
assert.equal(webTodayItems({ rows: [row("1")], bills: [], progress: { done: [], acks: [] }, perDay: 40, shopRules: { target: {} }, now }).items[0].key, "day:2026-10-18", "an answered shop isn't asked again");
assert.equal(webTodayItems({ rows: [], bills: [], progress: { done: [], acks: [] }, perDay: 40, sorted: 12, now }).items[0].key, "sorted");
assert.equal(webTodayItems({ rows: [], bills: [], progress: { done: [], acks: ["sorted"] }, perDay: 40, sorted: 12, now }).items[0].key, "day:2026-10-18", "the sorted card shows once");
assert.equal(webTodayItems({ rows: [], bills: [], progress: { done: [], acks: ["day:2026-10-18"] }, perDay: 40, now }).items.length, 0);
assert.deepEqual(monthCount(["2026-09-30", "2026-10-01", "2026-10-17"], now), { done: 2, of: 18 });

console.log("Next move and Today checks passed.");
