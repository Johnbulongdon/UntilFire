#!/usr/bin/env node
import fs from "node:fs";

// Since D-50 the city step no longer asks for monthly spending: the savings
// step already takes spending, and its answer replaces any city average. The
// city step only has to say plainly that skipping, or a city we don't list,
// falls back to the user's own spending.
const source = fs.readFileSync("app/components/landing/CityScreen.tsx", "utf8");
const home = fs.readFileSync("app/HomeClient.tsx", "utf8");

const checks = [];
const check = (name, ok) => checks.push({ name, ok });

check(
  "city step says skipping uses your own spending",
  /Skip it and we use your own spending/.test(source)
);

check(
  "an unlisted city falls back to your own spending",
  /Not in our list yet\. We&apos;ll use your own spending instead\./.test(source) &&
    /col: 0, stateKey: "custom", isCustom: true/.test(source)
);

check(
  "the savings step lets people answer with spending",
  /I know my spending/.test(home)
);

check(
  "spending from the savings step replaces any city average",
  /col: Math\.max\(0, monthlyExpenses \* 12\)/.test(home)
);

const failed = checks.filter((c) => !c.ok);
for (const c of checks) console.log(`${c.ok ? "✓" : "✗"} ${c.name}`);
if (failed.length) {
  console.error(`\nExpense guidance copy checks failed: ${failed.length}/${checks.length}`);
  process.exit(1);
}
console.log("\nExpense guidance copy checks passed.");
