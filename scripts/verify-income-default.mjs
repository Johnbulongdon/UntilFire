#!/usr/bin/env node
import fs from "node:fs";

const source = fs.readFileSync("app/page.tsx", "utf8");

const checks = [];
const check = (name, ok) => checks.push({ name, ok });

check(
  "income mode defaults to monthly take-home",
  /const \[mode, setMode\] = useState<IncomeMode>\("takehome"\)/.test(source)
);

check(
  "monthly take-home is the first visible income option",
  /const INCOME_MODES[\s\S]*?\[\s*\{ key: "takehome", label: "Monthly take-home"/.test(source)
);

check(
  "income intro explains the default in plain language",
  /Start with the monthly amount that lands in your bank/.test(source)
);

check(
  "take-home input label asks for monthly take-home pay",
  /Monthly take-home pay \(\{currency\}\)/.test(source)
);

check(
  "take-home input reassures estimates are fine",
  /estimate is fine/.test(source) || /rough estimate is fine/.test(source)
);

check(
  "reveal treats onboarding income as already post-tax take-home",
  /const takeHome = income;/.test(source) && !/calcTakeHome\(income, stateKey\)/.test(source)
);

const failed = checks.filter((c) => !c.ok);
for (const c of checks) console.log(`${c.ok ? "✓" : "✗"} ${c.name}`);
if (failed.length) {
  console.error(`\nIncome default checks failed: ${failed.length}/${checks.length}`);
  process.exit(1);
}
console.log("\nIncome default checks passed.");
