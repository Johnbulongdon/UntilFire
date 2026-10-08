/**
 * Spending ranges and "usual": the numbers behind the Transactions charts.
 *
 * Run: npm run test:spend-range
 */
import assert from "node:assert/strict";
import {
  bucketFor, looksLikeCardPayment, netAmount, rangeFor, stepRange, usualForRange, usualToDay,
} from "../lib/spend-range.ts";

let n = 0;
const ok = (name: string, fn: () => void) => { fn(); n++; console.log(`✓ ${name}`); };

ok("ranges are whole months ending with the chosen month", () => {
  assert.deepEqual(rangeFor(3, "2026-09").months, ["2026-07", "2026-08", "2026-09"]);
  assert.equal(rangeFor(3, "2026-09").start, "2026-07-01");
  assert.equal(rangeFor(1, "2026-02").end, "2026-02-28");
  assert.deepEqual(rangeFor(12, "2026-01").months.slice(0, 2), ["2025-02", "2025-03"]);
  assert.equal(rangeFor("ytd", "2026-09").months.length, 9);
});
ok("the arrows move a range by its own length", () => {
  assert.equal(stepRange(3, "2026-09", -1), "2026-06");
  assert.equal(stepRange(12, "2026-09", 1), "2027-09");
  assert.equal(stepRange("ytd", "2026-09", -1), "2025-09");
});
ok("bar size follows the range", () => {
  assert.equal(bucketFor(1), "day");
  assert.equal(bucketFor(3), "week");
  assert.equal(bucketFor(6), "month");
});
ok("refunds come off, never below zero", () => {
  assert.equal(netAmount({ amount: 100, refund_amount: 30 }), 70);
  assert.equal(netAmount({ amount: 100, refund_amount: 150 }), 0);
  assert.equal(netAmount({ amount: 100 }), 100);
});

const spend = [
  // Three past months, each with $100 on the 5th and $300 on the 25th; June also has a $5,000 one-off.
  ...["2026-06", "2026-07", "2026-08"].flatMap((m) => [{ date: `${m}-05`, usd: 100 }, { date: `${m}-25`, usd: 300 }]),
  { date: "2026-06-10", usd: 5000 },
  { date: "2026-09-03", usd: 80 },
];

ok("usual is the median month, so a one-off month does not move it", () => {
  assert.deepEqual(usualToDay(spend, "2026-09", 31), { value: 400, months: 3 });
});
ok("usual to date counts only the same days of past months", () => {
  assert.equal(usualToDay(spend, "2026-09", 18)?.value, 100);
});
ok("fewer than three past months gives no usual", () => {
  assert.equal(usualToDay(spend.filter((s) => s.date >= "2026-07"), "2026-09", 31), null);
});
ok("the current and future months never count toward usual", () => {
  assert.equal(usualToDay([...spend, { date: "2026-10-01", usd: 9999 }], "2026-09", 31)?.months, 3);
});
ok("a range's usual adds whole months and today's partial month", () => {
  assert.equal(usualForRange(spend, rangeFor(3, "2026-09"), "2026-09-18"), 400 + 400 + 100);
});
ok("a bill category compares whole months, so rent paid later in the month is not $0 (D-49)", () => {
  assert.equal(usualForRange(spend, rangeFor(3, "2026-09"), "2026-09-18", true), 400 + 400 + 400);
});

ok("card payments are flagged, ordinary spending is not", () => {
  const e = (description: string) => ({ description, transaction_type: "expense" as const });
  for (const d of ["BILT PAYMENT", "CHASE CARD AUTOPAY", "Payment, thank you", "AMEX EPAYMENT", "CRD PMT 0423", "招商银行信用卡还款"]) {
    assert.equal(looksLikeCardPayment(e(d)), true, d);
  }
  for (const d of ["Whole Foods", "Payment to Alex", "Delta Air Lines", "美团"]) {
    assert.equal(looksLikeCardPayment(e(d)), false, d);
  }
  assert.equal(looksLikeCardPayment({ description: "AUTOPAY", transaction_type: "transfer" }), false);
});

console.log(`Spend range ok: ${n} checks.`);
