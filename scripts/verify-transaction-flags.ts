/**
 * "Worth a look" flags: card payments, duplicates and unusually large rows.
 *
 * Run: npm run test:transaction-flags
 */
import assert from "node:assert/strict";
import { findFlags, type FlagTx, okTag } from "../lib/transaction-flags.ts";

let n = 0;
const ok = (name: string, fn: () => void) => { fn(); n++; console.log(`✓ ${name}`); };
let id = 0;
const tx = (description: string, amount: number, date = "2026-09-10", tags: string[] = []): FlagTx =>
  ({ id: String(++id), date, amount, currency: "USD", transaction_type: "expense", category: "other", description, tags });
const usd = (a: number) => a;

ok("a card bill payment is flagged; a dismissed one is not", () => {
  const a = tx("CHASE CARD AUTOPAY", 900), b = tx("BILT PAYMENT", 1200, "2026-09-11", [okTag("card_payment")]);
  const f = findFlags([a, b], [], usd);
  assert.equal(f.get(a.id), "card_payment");
  assert.equal(f.has(b.id), false);
});
ok("the second of two matching rows on the same day is a possible duplicate", () => {
  const a = tx("Whole Foods #123", 86.2, "2026-09-15"), b = tx("WHOLE FOODS #998", 86.2, "2026-09-15");
  const f = findFlags([a, b], [], usd);
  assert.equal(f.has(a.id), false);
  assert.equal(f.get(b.id), "duplicate");
});
ok("a day apart counts only when a bank and an import overlap", () => {
  const bank = { ...tx("Uber", 18, "2026-09-15"), source: "plaid" }, csv = { ...tx("UBER", 18, "2026-09-16"), source: "csv" };
  assert.equal(findFlags([bank, csv], [], usd).get(csv.id), "duplicate");
  const coffee1 = tx("Blue Bottle", 6.5, "2026-09-15"), coffee2 = tx("Blue Bottle", 6.5, "2026-09-16");
  assert.equal(findFlags([coffee1, coffee2], [], usd).size, 0, "the same coffee two days running is not a duplicate");
});
ok("different amounts are not duplicates", () => {
  assert.equal(findFlags([tx("Uber", 18), tx("Uber", 22)], [], usd).size, 0);
});
ok("large means far above this merchant's usual", () => {
  const history = [tx("Costco", 120, "2026-06-01"), tx("Costco", 140, "2026-07-01"), tx("Costco", 110, "2026-08-01")];
  const big = tx("Costco", 900), normal = tx("Costco", 300);
  const f = findFlags([big, normal], [...history, big, normal], usd);
  assert.equal(f.get(big.id), "large");
  assert.equal(f.has(normal.id), false);
});
ok("a new merchant is large only among the person's top 5% and above $250", () => {
  const history = Array.from({ length: 40 }, (_, i) => tx(`Shop ${String.fromCharCode(65 + (i % 26))}`, 20 + i * 5, "2026-07-01"));
  const huge = tx("Delta Air Lines", 1400), small = tx("New cafe", 240);
  const f = findFlags([huge, small], [...history, huge, small], usd);
  assert.equal(f.get(huge.id), "large");
  assert.equal(f.has(small.id), false);
});
ok("income and transfers are never flagged", () => {
  const t = { ...tx("AUTOPAY", 500), transaction_type: "income" as const };
  assert.equal(findFlags([t], [], usd).size, 0);
});

console.log(`Transaction flags ok: ${n} checks.`);
