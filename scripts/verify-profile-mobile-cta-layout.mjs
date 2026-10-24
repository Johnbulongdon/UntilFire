#!/usr/bin/env node
import fs from "node:fs";

const profile = fs.readFileSync("app/dashboard/ProfileTab.tsx", "utf8");

const checks = [];
const check = (name, ok) => checks.push({ name, ok });

// Profile's FIRE type and freedom-date entries are rows since D-48. Rows keep
// a long FIRE type name inside the phone width: MoneyRow's grid tracks are
// minmax(0, 1fr), so the name truncates instead of widening the page.
const cards = fs.readFileSync("app/dashboard/MoneyCards.tsx", "utf8");

check(
  "profile FIRE type entry still links to the quiz with its source and result",
  /\/fire-type\?source=dashboard-profile\$\{fireTypeResult \? `&type=\$\{fireTypeResult\.code\}`/.test(profile),
);

check(
  "profile FIRE type entry is a MoneyRow, not a fixed-width button",
  /<MoneyRow[^>]*name="FIRE type"/.test(profile),
);

check(
  "profile still offers the way to the freedom date's assumptions",
  /name="Planning assumptions"[\s\S]{0,240}onTabChange\("fire-calculator"\)/.test(profile),
);

check(
  "MoneyRow tracks let long names shrink inside narrow phones",
  (cards.match(/gridTemplateColumns: "minmax\(0, 1fr\)"/g) || []).length >= 3,
);

check(
  "old overflow-prone inline-block FIRE type CTA is not present",
  !/display:\s*"inline-block"[^}]*whiteSpace:\s*"nowrap"/.test(profile),
);

const failed = checks.filter((c) => !c.ok);
for (const c of checks) console.log(`${c.ok ? "✓" : "✗"} ${c.name}`);
if (failed.length) {
  console.error(`\nProfile mobile CTA layout checks failed: ${failed.length}/${checks.length}`);
  process.exit(1);
}
console.log("\nProfile mobile CTA layout checks passed.");
