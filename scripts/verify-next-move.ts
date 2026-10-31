// Home's next move and the website's Today list (D-89): the order of moves, and Today's keys and counted days.
import assert from "node:assert/strict";
import { pickNextMove } from "../lib/next-move.ts";
import { monthCount, quietDayToMark, webTodayItems } from "../lib/today-web.ts";

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

// Today: sorted spends drop out, safe to spend is shown rather than asked (D-108), and a finished day counts once.
const now = new Date(2026, 9, 18, 15);
const row = (id: string, tags: string[] = [], description = "TARGET 1234", usd = 64) => ({ id, date: "2026-10-17", description, usd, category: "shopping", tags, transaction_type: "expense" });
const list = webTodayItems({ rows: [row("1"), row("2", ["need"]), row("3", [], "Trader Joe's"), row("4", [], "TARGET 1234", 9)], bills: [], progress: { done: [], acks: [] }, now });
assert.deepEqual(list.items.map((i) => i.key), ["need:1"], "only a mixed shop of $20 or more is asked about (D-106); no closing item");
assert.equal(webTodayItems({ rows: [row("1")], bills: [], progress: { done: [], acks: [] }, shopRules: { target: {} }, now }).items.length, 0, "an answered shop isn't asked again");
assert.equal(webTodayItems({ rows: [], bills: [], progress: { done: [], acks: [] }, sorted: 12, now }).items[0].key, "sorted");
assert.equal(webTodayItems({ rows: [], bills: [], progress: { done: [], acks: ["sorted"] }, sorted: 12, now }).items.length, 0, "the sorted card shows once");
// A quiet day counts once it is opened, and only once.
assert.equal(quietDayToMark([], 0, now), "2026-10-18", "nothing to answer: today is marked");
assert.equal(quietDayToMark(["2026-10-18"], 0, now), null, "already counted");
assert.equal(quietDayToMark([], 1, now), null, "something still to answer");
assert.deepEqual(monthCount(["2026-09-30", "2026-10-01", "2026-10-17"], now), { done: 2, of: 18 });

console.log("Next move and Today checks passed.");
