#!/usr/bin/env node
import fs from "node:fs";

const page = fs.readFileSync("app/page.tsx", "utf8");

const checks = [];
const check = (name, ok) => checks.push({ name, ok });

const revealStart = page.indexOf("function RevealScreen");
const revealEnd = page.indexOf("// -----------------------------------------------------------------------------", revealStart);
const reveal = revealStart >= 0 && revealEnd > revealStart ? page.slice(revealStart, revealEnd) : "";

check("RevealScreen exists", reveal.length > 0);
check(
  "reveal page does not use the old Automate this CTA copy",
  !/Automate this\s*→/.test(reveal),
);
check(
  "reveal page does not use the old Track this CTA copy",
  !/Track this\s*→/.test(reveal),
);
check(
  "reveal page uses Save my plan CTA copy consistently",
  (reveal.match(/Save my plan\s*→/g) || []).length >= 3,
);
check(
  "reveal hero includes a signup CTA near the FIRE number summary",
  /data-gsap="milestone"[\s\S]*className="uf-automate-btn"[\s\S]*Save my plan\s*→/.test(reveal),
);

const failed = checks.filter((c) => !c.ok);
for (const c of checks) console.log(`${c.ok ? "✓" : "✗"} ${c.name}`);
if (failed.length) {
  console.error(`\nReveal Save my plan CTA checks failed: ${failed.length}/${checks.length}`);
  process.exit(1);
}
console.log("\nReveal Save my plan CTA checks passed.");
