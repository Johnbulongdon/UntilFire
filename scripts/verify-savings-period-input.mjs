#!/usr/bin/env node
import fs from "node:fs";

// The onboarding flow moved into app/HomeClient.tsx with the homepage's
// server/client split (15d5a49); read both so the checks follow the code.
const source = ["app/page.tsx", "app/HomeClient.tsx"]
  .map((file) => fs.readFileSync(file, "utf8"))
  .join("\n");

const checks = [];
const check = (name, ok) => checks.push({ name, ok });

check(
  "savings screen tracks monthly vs yearly entry period",
  /type SavingsPeriod = "monthly" \| "yearly"/.test(source) &&
    /const \[period, setPeriod\] = useState<SavingsPeriod>\("monthly"\)/.test(source)
);

check(
  "copy tells users they can enter monthly or yearly savings/spending",
  /monthly or yearly savings or spending/.test(source) ||
    /monthly or yearly savings\/spending/.test(source)
);

check(
  "UI exposes monthly and yearly period buttons",
  /onClick=\{\(\) => handlePeriodChange\("monthly"\)\}/.test(source) &&
    /Monthly/.test(source) &&
    /onClick=\{\(\) => handlePeriodChange\("yearly"\)\}/.test(source) &&
    /Yearly/.test(source)
);

// Since b2344b8 ("Cap savings at income") the amount is capped at income in
// savings mode, so the conversion works on the capped figure and the result is
// capped again for the new period. The equivalence is what must hold.
check(
  "switching periods preserves the equivalent value",
  /Math\.round\(nextPeriod === "yearly" \? (?:amount|boundedAmount) \* 12 : (?:amount|boundedAmount) \/ 12\)/.test(source) &&
    /setPeriod\(nextPeriod\)/.test(source)
);

check(
  "yearly savings or spending is converted to monthly before calculations",
  /const monthlyAmount = period === "yearly" \? (amount|boundedAmount) \/ 12 : \1\b/.test(source) &&
    /mode === "savings" \? monthlyAmount/.test(source) &&
    /mode === "spending" \? monthlyAmount/.test(source)
);

check(
  "input label and suffix respond to selected period",
  /const periodLabel = period === "yearly" \? "Yearly" : "Monthly"/.test(source) &&
    /const periodUnit = period === "yearly" \? "\/year" : "\/month"/.test(source) &&
    /\{periodUnit\}/.test(source)
);

// Spending scales the slider by 12; savings is bounded by income, which scales
// by 12 itself. The step is whole currency units in both periods since
// b2344b8 ("Keep savings and spending inputs in whole currency units").
check(
  "yearly slider range scales from monthly range",
  /period === "yearly" \? sliderMax \* 12 : sliderMax/.test(source) &&
    /const incomeLimit = Math\.floor\(period === "yearly" \? monthlyLocal \* 12 : monthlyLocal\)/.test(source) &&
    /const inputMax = mode === "savings" \? incomeLimit : /.test(source)
);
check(
  "savings can never exceed income, in either period",
  /const boundedAmount = mode === "savings" \? Math\.min\(amount, incomeLimit\) : amount/.test(source)
);

const failed = checks.filter((c) => !c.ok);
for (const c of checks) console.log(`${c.ok ? "✓" : "✗"} ${c.name}`);
if (failed.length) {
  console.error(`\nSavings period input checks failed: ${failed.length}/${checks.length}`);
  process.exit(1);
}
console.log("\nSavings period input checks passed.");
