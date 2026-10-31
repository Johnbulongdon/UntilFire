/**
 * "Worth a look" flags: card payments, duplicates and unusually large rows.
 *
 * Run: npm run test:transaction-flags
 */
import assert from "node:assert/strict";
import { findFlags, type FlagTx, okTag, walletTwins } from "../lib/transaction-flags.ts";

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
ok("a hand-typed row matches the bank's copy by amount, even under another name", () => {
  const typed = tx("Coffee", 6.5, "2026-09-14"), bank = { ...tx("STARBUCKS #1234", 6.5, "2026-09-16"), source: "plaid" };
  const f = findFlags([typed, bank], [], usd);
  assert.equal(f.get(typed.id), "duplicate", "the typed row is flagged, so confirming keeps the bank's");
  assert.equal(f.has(bank.id), false);
  const later = { ...tx("STARBUCKS #1234", 6.5, "2026-09-20"), source: "plaid" };
  assert.equal(findFlags([tx("Coffee", 6.5, "2026-09-14"), later], [], usd).size, 0, "more than three days apart is a different purchase");
  const two = [tx("Lunch", 12, "2026-09-14"), tx("Parking", 12, "2026-09-15")], one = { ...tx("CHIPOTLE", 12, "2026-09-15"), source: "plaid" };
  assert.equal([...findFlags([...two, one], [], usd).values()].length, 1, "one bank row answers for one typed row");
});
ok("a card line for an Alipay purchase matches the wallet's own row in yuan", () => {
  const fx = (a: number, c: string) => (c === "CNY" ? a / 6.61 : c === "HKD" ? a / 7.8 : a);
  const cny = (description: string, amount: number, date = "2026-09-30"): FlagTx => ({ ...tx(description, amount, date), currency: "CNY", source: "csv" });
  const card = (description: string, amount: number, date = "2026-09-30", currency = "USD"): FlagTx => ({ ...tx(description, amount, date), currency, source: "csv" });
  const taxi = card("Alipay Amap Taxi", 8.35), gaode = cny("高德打车", 55.16);
  const f = findFlags([gaode, taxi], [], fx);
  assert.equal(f.get(taxi.id), "duplicate", "the card copy is flagged");
  assert.equal(f.has(gaode.id), false, "the wallet row, with its time and real name, is kept");
  assert.equal(findFlags([card("Alp Qrcode4019", 0.28), cny("零食有鸣", 1.9)], [], fx).size, 1, "cents rounding on tiny amounts still matches");
  assert.equal(findFlags([card("Claude.ai", 20), cny("美团", 132.2)], [], fx).size, 0, "a card line not paid through a wallet is left alone");
  assert.equal(findFlags([card("Alp Meituan", 3.47), cny("美团", 26)], [], fx).size, 0, "amounts more than 5% apart are different purchases");
  assert.equal(findFlags([card("Alp Meituan", 3.47, "2026-09-20"), cny("美团", 22.9, "2026-09-24")], [], fx).size, 0, "more than two days apart is a different purchase");
  const two = [card("Alp Meituan", 2.21), card("Alipay Meituan", 2.21)], one = cny("美团", 14.6);
  assert.equal(findFlags([...two, one], [], fx).size, 1, "one wallet row answers for one card line");
  const hkd = card("Alipay*Taobao Shanghai CN CNY 59.32 *EXCHANGE RATE: 1.18560", 70.33, "2026-08-10", "HKD");
  assert.equal(findFlags([hkd, cny("淘宝闪购", 59.32, "2026-08-09")], [], fx).get(hkd.id), "duplicate", "a printed yuan amount matches exactly");
  assert.equal(findFlags([hkd, cny("淘宝闪购", 60.5, "2026-08-09")], [], fx).size, 0, "a printed yuan amount that differs is not a match");
});
ok("each card copy knows the wallet row it copies", () => {
  const fx = (a: number, c: string) => (c === "CNY" ? a / 6.61 : a);
  const meal = { ...tx("美团", 22.9, "2026-09-30"), currency: "CNY" }, taxi = { ...tx("高德打车", 55.16, "2026-09-30"), currency: "CNY" };
  const a = tx("Alipay Meituan", 3.47, "2026-09-30"), b = tx("Alipay Amap Taxi", 8.35, "2026-09-30");
  const twins = walletTwins([a, b, meal, taxi], [a, b, meal, taxi], fx);
  assert.equal(twins.get(a.id)?.id, meal.id);
  assert.equal(twins.get(b.id)?.id, taxi.id);
  assert.equal(twins.size, 2);
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
