/**
 * PDF statement import (lib/pdf-statement.ts): text lines from a statement
 * become Date / Description / Amount rows. All rows below are made up.
 *
 * Run: npm run test:pdf-statement
 */
import assert from "node:assert/strict";
import { PDF_STOP_MARKERS, parseStatementLines } from "../lib/pdf-statement.ts";

let n = 0;
const ok = (name: string, fn: () => void) => { fn(); n++; console.log(`✓ ${name}`); };

// Shaped like an ether.fi card statement: signed "$" amounts, a reference ID
// at the end, detail lines below, the year sometimes wrapped to its own line,
// and a "Pending transactions" list that repeats charges already shown.
const cryptoCard = [
  "Card statement",
  "1 Apr 2030 – 30 Sept 2030 · Card ending 0000",
  "Reporting currency",
  "USD",
  "$1.50 $31.30",
  "Date Description Amount (USD) Reference",
  "26 May 2030 Example Software -$20.00 00000000-1111-2222-3333-444444444444",
  "Location: US, Card ending 0000 20.00 USD",
  "13 Aug 2030 Noodle Bar -$4.27 aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
  "Location: Shanghai, CN, Card ending 0000 4.2713 USDC",
  "Original: CNY 28.38",
  "27 Aug 2030 Refund: Noodle Bar +$1.50 aaaaaaaa-bbbb-cccc-dddd-ffffffffffff",
  "20 Sept Corner Shop -$2.25 12345678-abcd-abcd-abcd-1234567890ab",
  "2030 Location: Shanghai, CN, Card ending 0000 2.2512 USDC",
  "30 Sept 2030 Book Store -$4.78 12345678-abcd-abcd-abcd-1234567890ac",
  "Page 1 of 2",
  "Pending transactions",
  "30 Sept 2030 Book Store 4.7800 USDC -$4.78",
];
const untilStop = (lines: string[]) => {
  const cut = lines.findIndex((l) => PDF_STOP_MARKERS.some((p) => p.test(l)));
  return cut < 0 ? lines : lines.slice(0, cut);
};

ok("a signed-amount card statement imports with clean names, right signs and its own currency", () => {
  const { headers, rows } = parseStatementLines(untilStop(cryptoCard));
  assert.deepEqual(headers, ["Date", "Description", "Amount", "Currency"]);
  assert.deepEqual(rows, [
    ["2030-05-26", "Example Software", "-20", "USD"],
    ["2030-08-13", "Noodle Bar", "-4.27", "USD"],
    ["2030-08-27", "Refund: Noodle Bar", "1.5", "USD"],
    ["2030-09-20", "Corner Shop", "-2.25", "USD"],
    ["2030-09-30", "Book Store", "-4.78", "USD"],
  ]);
});

ok("a date whose year wrapped to the next line rolls into the new year after December", () => {
  const { rows } = parseStatementLines([
    "Date Description Amount (USD) Reference",
    "30 Dec 2030 Cafe -$3.00 00000000-1111-2222-3333-444444444444",
    "2 Jan Bakery -$5.00 00000000-1111-2222-3333-444444444445",
    "2031 Location: US, Card ending 0000 5.00 USD",
  ]);
  assert.deepEqual(rows.map((r) => r[0]), ["2030-12-30", "2031-01-02"]);
});

ok("the older card layout (unsigned amounts, CR payments) still reads the same", () => {
  const { headers, rows } = parseStatementLines([
    "STATEMENT DATE 09 JUN 2030",
    "12MAY 13MAY COFFEE HOUSE HONG KONG HK 45.00",
    "15MAY 16MAY PAYMENT - THANK YOU 1,000.00 CR",
    "20MAY 21MAY ONLINE STORE 1,234.50",
  ]);
  assert.deepEqual(headers, ["Date", "Description", "Amount"]);
  assert.deepEqual(rows, [
    ["2030-05-13", "COFFEE HOUSE HONG KONG HK", "45"],
    ["2030-05-21", "ONLINE STORE", "1234.5"],
  ]);
});

console.log(`\n${n} checks passed`);
