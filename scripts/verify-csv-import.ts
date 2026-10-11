/**
 * CSV import (lib/csv-import.ts): a bank export becomes the same transactions
 * on the website and in the iOS app.
 *
 * Run: npm run test:csv-import
 */
import assert from "node:assert/strict";
import { autoDetectColumns, buildTransactions, isLikelyDuplicate, parseAmount, parseCSV, parseDate } from "../lib/csv-import.ts";

let n = 0;
const ok = (name: string, fn: () => void) => { fn(); n++; console.log(`✓ ${name}`); };

const bank = '\uFEFFDate,Description,Amount\n01/15/2026,"STARBUCKS, NYC",-5.40\n2026-01-16,Payroll ACME,3200.00\n01/17/2026,Transfer to savings,-500\n,blank date,1\n';
ok("a quoted comma stays in the description, and a BOM doesn't break the header", () => {
  const { headers, rows } = parseCSV(bank);
  assert.deepEqual(headers, ["Date", "Description", "Amount"]);
  assert.equal(rows[0][1], "STARBUCKS, NYC");
});
ok("columns are found by name", () => {
  const c = autoDetectColumns(["Posted Date", "Payee", "Amount", "Currency"]);
  assert.equal(c.date, "Posted Date"); assert.equal(c.description, "Payee"); assert.equal(c.amount, "Amount"); assert.equal(c.currency, "Currency");
});
ok("dates and amounts in common bank formats", () => {
  assert.equal(parseDate("1/5/2026"), "2026-01-05");
  assert.equal(parseDate("2026-05-29 15:14:49"), "2026-05-29");
  assert.equal(parseAmount("(1,234.50)"), -1234.5);
  assert.equal(parseAmount("$12"), 12);
});
ok("signs make spending and income; transfers stay transfers; unusable rows are skipped", () => {
  const { headers, rows } = parseCSV(bank);
  const t = buildTransactions(headers, rows, autoDetectColumns(headers), { flipSigns: false, importCurrency: "USD" });
  assert.equal(t.length, 3);
  assert.deepEqual(t.map((x) => x.transaction_type), ["expense", "income", "transfer"]);
  assert.equal(t[0].category, "food"); assert.equal(t[1].category, "salary"); assert.equal(t[0].amount, 5.4);
});
ok("a card export that lists spending as positive can be flipped", () => {
  const { headers, rows } = parseCSV("Date,Description,Amount\n2026-01-02,Netflix,15.99\n");
  const [t] = buildTransactions(headers, rows, autoDetectColumns(headers), { flipSigns: true, importCurrency: "USD" });
  assert.equal(t.transaction_type, "expense"); assert.equal(t.category, "subscriptions");
});
ok("WeChat's type column decides income and spending", () => {
  const { headers, rows } = parseCSV("微信支付账单\n交易时间,交易对方,收/支,金额(元)\n2026-05-29 15:14:49,便利店,支出,¥12.50\n");
  const [t] = buildTransactions(headers, rows, autoDetectColumns(headers), { flipSigns: false, importCurrency: "CNY" });
  assert.equal(t.transaction_type, "expense"); assert.equal(t.amount, 12.5); assert.equal(t.currency, "CNY"); assert.ok(t.occurred_at);
});
ok("duplicates: same currency, within 2 cents and two days", () => {
  const a = { date: "2026-01-15", amount: 5.4, currency: "USD" };
  assert.equal(isLikelyDuplicate(a, { date: "2026-01-17", amount: 5.41, currency: "USD" }), true);
  assert.equal(isLikelyDuplicate(a, { date: "2026-01-18", amount: 5.4, currency: "USD" }), false);
  assert.equal(isLikelyDuplicate(a, { date: "2026-01-15", amount: 5.4, currency: "EUR" }), false);
});
console.log(`\n${n} checks passed`);
