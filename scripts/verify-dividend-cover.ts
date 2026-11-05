/**
 * The Home Dividends tile: dividends a month against repeating bills.
 *
 * Run: npm run test:dividend-cover
 */
import assert from "node:assert/strict";
import { dividendCover, isDividend } from "../lib/dividend-cover.ts";

let n = 0;
const ok = (name: string, fn: () => void) => { fn(); n++; console.log(`✓ ${name}`); };
const div = (date: string, usd: number) => ({ date, usd, transaction_type: "income", category: "investment", sub_category: "Dividends" });
const rent = { usd: 1500, recurrence: "monthly" as const };

ok("Plaid dividends and named investment income count; interest and wages do not", () => {
  assert.ok(isDividend(div("2026-10-01", 10)));
  assert.ok(isDividend({ date: "2026-10-01", usd: 5, transaction_type: "income", category: "investment", description: "VANGUARD DIVIDEND" }));
  assert.ok(!isDividend({ date: "2026-10-01", usd: 5, transaction_type: "income", category: "investment", sub_category: "Interest earned" }));
  assert.ok(!isDividend({ date: "2026-10-01", usd: 5, transaction_type: "expense", sub_category: "Dividends" }));
});

ok("a year of quarterly payouts averages over 12 months", () => {
  const t = [div("2025-12-15", 300), div("2026-03-15", 300), div("2026-06-15", 300), div("2026-09-15", 300)];
  const c = dividendCover(t, [rent], "2026-11-05")!;
  assert.equal(c.monthly, 100);
  assert.equal(c.bills, 1500);
  assert.equal(Math.round(c.pct * 10) / 10, 6.7);
});

ok("a new account divides by at least 3 months", () => {
  const c = dividendCover([div("2026-10-20", 300)], [rent], "2026-11-05")!;
  assert.equal(c.monthly, 100);
});

ok("payouts older than 12 months are left out", () => {
  assert.equal(dividendCover([div("2025-10-15", 300)], [rent], "2026-11-05"), null);
});

ok("no dividends or no repeating bills hides the tile", () => {
  assert.equal(dividendCover([], [rent], "2026-11-05"), null);
  assert.equal(dividendCover([div("2026-10-01", 50)], [{ usd: 900, recurrence: "none" }], "2026-11-05"), null);
});

ok("bills count at their monthly cost", () => {
  const c = dividendCover([div("2026-09-01", 300)], [rent, { usd: 1200, recurrence: "annual" }], "2026-11-05")!;
  assert.equal(c.bills, 1600);
});

console.log(`\n${n} dividend cover checks passed`);
