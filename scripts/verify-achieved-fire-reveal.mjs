#!/usr/bin/env node
import fs from "node:fs";

const source = fs.readFileSync("app/page.tsx", "utf8");

const checks = [];
const check = (name, ok) => checks.push({ name, ok });

check(
  "achieved FIRE chart uses a real projection horizon instead of plotting 10+ years against a 1-year axis",
  /const projectionYears = result\.years > 0 \? result\.years : 10;/.test(source) &&
    /basePts: buildPts\(annualBase, projectionYears\)/.test(source)
);

check(
  "achieved FIRE chart x-axis is based on the same horizon as generated points",
  /const maxYears = Math\.max\(projectionYears, boostedProjectionYears, 1\);/.test(source)
);

check(
  "chart y-axis includes portfolio values, not only the FIRE target",
  /const allValues = \[\.\.\.data\.basePts, \.\.\.data\.boostedPts, \{ t: 0, value: data\.fireTarget \}\]\.map/.test(source) &&
    /const yMax = Math\.max\(1, \.\.\.allValues\) \* 1\.08;/.test(source)
);

check(
  "achieved FIRE hides the monthly move sidebar without leaving an empty grid column",
  /className="uf-chart-move-grid" style=\{isAlreadyFire \? \{ gridTemplateColumns: "1fr" \} : undefined\}/.test(source)
);

const failed = checks.filter((c) => !c.ok);
for (const c of checks) console.log(`${c.ok ? "✓" : "✗"} ${c.name}`);
if (failed.length) {
  console.error(`\nAchieved FIRE reveal checks failed: ${failed.length}/${checks.length}`);
  process.exit(1);
}
console.log("\nAchieved FIRE reveal checks passed.");
