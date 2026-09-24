#!/usr/bin/env node
import fs from "node:fs";

// The reveal was rebuilt as a 7-step guided flow in app/components/RevealFlow.tsx
// (ea47d24), replacing the scrolling reveal whose projection chart and
// "monthly move" sidebar these checks first guarded. What must still hold is
// the same promise: someone who is already financially free gets an honest
// reveal — no age in the future, no year, no working years, nothing plotted
// against a horizon that does not exist.
const home = fs.readFileSync("app/HomeClient.tsx", "utf8");
const flow = fs.readFileSync("app/components/RevealFlow.tsx", "utf8");

const checks = [];
const check = (name, ok) => checks.push({ name, ok });

check(
  "achieved FIRE is detected from a zero-year result and passed to the reveal",
  /const isAlreadyFire = result\.years === 0;/.test(home) &&
    /<RevealFlow[^]*?isAlreadyFire=\{isAlreadyFire\}/.test(home)
);

check(
  "achieved FIRE shows 'Now' and says the portfolio covers living costs, not a future age or year",
  /\{isAlreadyFire \? "Now" : ageText\}/.test(flow) &&
    /isAlreadyFire \? "Your investments cover your cost of living\." : `in the year \$\{freedomYear\}`/.test(flow)
);

check(
  "life-in-years shows no working years when already free",
  /const working = Math\.max\(0, Math\.min\(100 - lived, yearsToFire \?\? 0\)\);/.test(flow) &&
    /isAlreadyFire\s*\?\s*<>You&apos;ve already bought back/.test(flow)
);

check(
  "chart y-axis includes portfolio values, not only the FIRE target",
  /const allValues = \[\.\.\.data\.basePts, \.\.\.data\.boostedPts, \{ t: 0, value: data\.fireTarget \}\]\.map/.test(home) &&
    /const yMax = Math\.max\(1, \.\.\.allValues\) \* 1\.08;/.test(home)
);

const failed = checks.filter((c) => !c.ok);
for (const c of checks) console.log(`${c.ok ? "✓" : "✗"} ${c.name}`);
if (failed.length) {
  console.error(`\nAchieved FIRE reveal checks failed: ${failed.length}/${checks.length}`);
  process.exit(1);
}
console.log("\nAchieved FIRE reveal checks passed.");
