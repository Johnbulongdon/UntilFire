/**
 * The transactions CSV from Export your data (D-56): it must open cleanly in
 * a spreadsheet, keep every field, and never let a description run as a formula.
 */
import assert from "node:assert/strict";
import { csvCell, transactionsCsv } from "../lib/export-csv.ts";

let n = 0;
const ok = (name: string, fn: () => void) => { fn(); n++; console.log(`✓ ${name}`); };
const tx = (over: Record<string, unknown>) => ({ id: "a", date: "2026-10-02", transaction_type: "expense", amount: 1380, refund_amount: 0, currency: "USD",
  description: "BILT PAYMENT", category: "housing", sub_category: "Rent", tags: ["need"], notes: null, source: "plaid", ...over });

ok("plain values pass through; commas, quotes and line breaks are quoted", () => {
  assert.equal(csvCell("Rent"), "Rent");
  assert.equal(csvCell("Coffee, beans"), '"Coffee, beans"');
  assert.equal(csvCell('He said "hi"'), '"He said ""hi"""');
  assert.equal(csvCell("line\nbreak"), '"line\nbreak"');
  assert.equal(csvCell(null), "");
});
ok("a description that looks like a formula is neutralised; negative numbers are not", () => {
  assert.equal(csvCell("=HYPERLINK(\"x\")"), "\"'=HYPERLINK(\"\"x\"\")\"");
  assert.equal(csvCell("+1 555"), "'+1 555");
  assert.equal(csvCell("@sum"), "'@sum");
  assert.equal(csvCell(-25.5), "-25.5");
  assert.equal(csvCell("-12"), "-12");
});
ok("one header and one row per transaction, oldest first, with a BOM for Excel", () => {
  const csv = transactionsCsv([tx({ id: "b", date: "2026-10-05", description: "陈玲", currency: "CNY", amount: 3050, tags: [] }), tx({})]);
  assert.ok(csv.startsWith("﻿date,type,amount,refund,currency,description,category,sub_category,tags,notes,source\r\n"));
  const lines = csv.slice(1).trim().split("\r\n");
  assert.equal(lines.length, 3);
  assert.equal(lines[1], "2026-10-02,expense,1380,,USD,BILT PAYMENT,housing,Rent,need,,plaid");
  assert.equal(lines[2], "2026-10-05,expense,3050,,CNY,陈玲,housing,Rent,,,plaid");
});
ok("refunds and several tags are kept", () => {
  const line = transactionsCsv([tx({ refund_amount: 20, tags: ["need", "work"] })]).trim().split("\r\n")[1];
  assert.equal(line, "2026-10-02,expense,1380,20,USD,BILT PAYMENT,housing,Rent,need work,,plaid");
});
console.log(`Data export ok: ${n} checks.`);
