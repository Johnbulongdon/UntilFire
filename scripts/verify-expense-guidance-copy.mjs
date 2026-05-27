#!/usr/bin/env node
import fs from "node:fs";

const source = fs.readFileSync("app/components/landing/CityScreen.tsx", "utf8");

const checks = [];
const check = (name, ok) => checks.push({ name, ok });

check(
  "custom monthly expense prompt uses plain question wording",
  /About how much do you spend each month\?/i.test(source)
);

check(
  "expense guidance says a rough average is fine",
  /rough (monthly )?average is fine/i.test(source) || /rough estimate is fine/i.test(source)
);

const requiredExamples = ["housing", "food", "transport", "bills", "subscriptions", "insurance", "debt payments", "everyday spending"];
for (const example of requiredExamples) {
  check(`expense guidance includes ${example}`, source.toLowerCase().includes(example));
}

check(
  "expense guidance does not ask for too much precision",
  /don.{0,12}t worry about being exact/i.test(source)
);

const failed = checks.filter((c) => !c.ok);
for (const c of checks) console.log(`${c.ok ? "✓" : "✗"} ${c.name}`);
if (failed.length) {
  console.error(`\nExpense guidance copy checks failed: ${failed.length}/${checks.length}`);
  process.exit(1);
}
console.log("\nExpense guidance copy checks passed.");
