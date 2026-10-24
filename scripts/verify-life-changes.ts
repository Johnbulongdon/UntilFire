/**
 * Compare's life changes (D-69): templates start from your own numbers, and
 * each change becomes the engine's dated changes exactly as described.
 */
import assert from "node:assert/strict";
import { newChange, toEngine, versionToEngine, summary, coastYear, resolveAndRun, TEMPLATES, type LifeChangeItem, type EngineChange } from "../lib/life-changes.ts";

const ctx = { thisYear: 2026, currentAge: 28, takeHomeMonthly: 7800, spendMonthly: 5000 };
const money = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;
let n = 0;
const check = (ok: boolean, msg: string) => { assert.ok(ok, msg); n++; };

// Every template makes a change the engine can run, starting in the future.
for (const t of TEMPLATES) {
  const c = newChange(t.kind, ctx, "x");
  check(c.from > ctx.thisYear && Array.isArray(toEngine(c, ctx)), `${t.kind} starts ahead and maps`);
  check(summary(c, ctx, money).length > 0, `${t.kind} has a summary`);
}
// Work less: your own take-home, not a fixed share; pension contributions follow pay, or stop.
const four: LifeChangeItem = { ...newChange("work-less", ctx, "w"), monthly: 7020, from: 2033 };
const [w] = toEngine(four, ctx);
check(w.startYear === 7 && w.annualIncome === 7020 * 12 && Math.abs(w.workShare! - 0.9) < 1e-9, "four days at 90% pay is 90%, as typed");
check(toEngine({ ...four, pension: "stop" }, ctx)[0].workShare === 0, "pension contributions can stop");
// A break of 18 months: a year off, then half a year.
const brk = toEngine({ ...newChange("break", ctx, "b"), count: 18, from: 2028 }, ctx);
check(brk.length === 2 && brk[0].workShare === 0 && brk[0].endYear === 3 && brk[1].workShare === 0.5, "18 months off is a year, then half");
// College: per year, per child, only in its years.
const [col] = toEngine({ ...newChange("college", ctx, "c"), amount: 30000, count: 2, from: 2042, to: 2046 }, ctx);
check(col.addSpend === 60000 && col.startYear === 16 && col.endYear === 20, "two children's college for four years");
// A home: the down payment once, the extra monthly cost for good.
const home = toEngine(newChange("home", ctx, "h"), ctx);
check(home[0].once === -60000 && home[1].addSpend === 9600 && home[1].endYear === undefined, "down payment once, then monthly");
// One-offs keep their sign; off counts nothing.
check(toEngine(newChange("windfall", ctx, "g"), ctx)[0].once! > 0 && toEngine(newChange("cost", ctx, "k"), ctx)[0].once! < 0, "windfall in, cost out");
check(toEngine({ ...newChange("side", ctx, "s"), on: false }, ctx).length === 0, "a change turned off counts nothing");
// Custom: a signed monthly amount.
check(toEngine({ ...newChange("custom", ctx, "u"), monthly: -500 }, ctx)[0].addSpend === 6000, "custom −$500 a month is a cost");
// A year already passed starts now, and an end never comes before the start.
const late = toEngine({ ...newChange("side", ctx, "l"), from: 2020, to: 2020 }, ctx)[0];
check(late.startYear === 0 && late.endYear === 1, "past years clamp to now");
// A version is all its changes together.
check(versionToEngine({ id: "v", name: "v", savedAt: 0, changes: [four, newChange("cost", ctx, "k")] }, ctx).length === 2, "a version flattens its changes");
// Without an age, the year shows instead.
check(summary(four, { ...ctx, currentAge: 0 }, money).includes("2033") && summary(four, ctx, money).includes("age 35"), "age when known, year when not");

// Coast: $100k at 28 grows 7% to $1M at 62 (34 years ≈ 9.97x): not yet; $110k is.
check(coastYear([100000], 1e6, 0.07, 28, 62) === null && coastYear([100000, 110000], 1e6, 0.07, 28, 62) === 1, "coast is when growth alone gets there");
check(coastYear([5e6], 1e6, 0.07, 0, 62) === null, "no age, no coast");
// Milestones: a fake engine, free in 21 years, a year later for every two years of working less before it.
const fake = (changes: EngineChange[]) => {
  let free = 21;
  for (let i = 0; i < 6; i++) {
    const less = changes.filter((c) => (c.workShare ?? 1) < 1).reduce((t, c) => t + Math.max(0, Math.min(c.endYear ?? 99, free) - c.startYear), 0);
    free = 21 + Math.floor(less / 2);
  }
  return { fireYear: free, invested: Array.from({ length: 40 }, (_, y) => y * 50000), target: 2e6 };
};
const mctx = { ...ctx, growth: 0.07, retireAge: 59.5 };
const untilFree: LifeChangeItem = { ...four, from: 2033, toAt: "free" };
const r = resolveAndRun([untilFree], mctx, fake);
check(Math.abs((r.result.fireYear ?? 0) - 35) <= 1 && Math.abs(r.items[0].to! - (2026 + r.result.fireYear!)) <= 1, `"until free" ends at the freedom it moves (free in ${r.result.fireYear}, ends ${r.items[0].to})`);
const fromCoast = resolveAndRun([{ ...newChange("side", ctx, "s"), fromAt: "coast" }], mctx, fake);
check(fromCoast.items[0].from === 2026 + (coastYear(fake([]).invested, 2e6, 0.07, 28, 59.5) ?? -1), "a change from Coast starts the year Coast arrives");
const never = resolveAndRun([{ ...newChange("side", ctx, "s"), fromAt: "free" }], mctx, () => ({ fireYear: null, invested: [0], target: 1 }));
check(never.items[0].on === false, "a start at a freedom that never comes never starts");
check(resolveAndRun([four], mctx, fake).items[0] === four, "fixed years pass through untouched");
check(summary(untilFree, ctx, money).includes("until free"), "the summary says until free");

console.log(`Life change checks passed: ${n}`);
