#!/usr/bin/env node
import fs from "node:fs";

const source = fs.readFileSync("app/page.tsx", "utf8");

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

check(
  "switching periods preserves the equivalent value",
  /setAmount\(nextPeriod === "yearly" \? Math\.round\(amount \* 12\) : Math\.round\(amount \/ 12\)\)/.test(source)
);

check(
  "yearly savings or spending is converted to monthly before calculations",
  /const monthlyAmount = period === "yearly" \? amount \/ 12 : amount/.test(source) &&
    /mode === "savings" \? monthlyAmount/.test(source) &&
    /mode === "spending" \? monthlyAmount/.test(source)
);

check(
  "input label and suffix respond to selected period",
  /const periodLabel = period === "yearly" \? "Yearly" : "Monthly"/.test(source) &&
    /const periodUnit = period === "yearly" \? "\/year" : "\/month"/.test(source) &&
    /\{periodUnit\}/.test(source)
);

check(
  "yearly slider range scales from monthly range",
  /const inputMax = period === "yearly" \? sliderMax \* 12 : sliderMax/.test(source) &&
    /const inputStep = period === "yearly" \? sliderStep \* 12 : sliderStep/.test(source)
);

const failed = checks.filter((c) => !c.ok);
for (const c of checks) console.log(`${c.ok ? "✓" : "✗"} ${c.name}`);
if (failed.length) {
  console.error(`\nSavings period input checks failed: ${failed.length}/${checks.length}`);
  process.exit(1);
}
console.log("\nSavings period input checks passed.");
