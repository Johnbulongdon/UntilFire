#!/usr/bin/env node
import fs from "node:fs";

const profile = fs.readFileSync("app/dashboard/ProfileTab.tsx", "utf8");

const checks = [];
const check = (name, ok) => checks.push({ name, ok });

const ctaBlockMatch = profile.match(/href=\{`\/fire-type\?source=dashboard-profile[\s\S]*?View freedom date →[\s\S]*?<\/button>\s*<\/div>/);
const ctaBlock = ctaBlockMatch?.[0] ?? "";

check(
  "profile CTA row constrains itself to the card width",
  /maxWidth:\s*"100%"/.test(ctaBlock),
);

check(
  "profile FIRE type CTA can shrink inside narrow mobile cards",
  /flex:\s*"1 1 260px"/.test(ctaBlock) &&
    /minWidth:\s*0/.test(ctaBlock) &&
    /boxSizing:\s*"border-box"/.test(ctaBlock),
);

check(
  "profile FIRE type CTA wraps long result names instead of forcing horizontal overflow",
  /whiteSpace:\s*"normal"/.test(ctaBlock) &&
    /overflowWrap:\s*"anywhere"/.test(ctaBlock),
);

check(
  "profile freedom-date CTA also respects narrow card width",
  /flex:\s*"1 1 180px"/.test(ctaBlock) &&
    (ctaBlock.match(/maxWidth:\s*"100%"/g) || []).length >= 2,
);

check(
  "old overflow-prone inline-block FIRE type CTA is not present",
  !/display:\s*"inline-block"/.test(ctaBlock) &&
    !/whiteSpace:\s*"nowrap"/.test(ctaBlock),
);

const failed = checks.filter((c) => !c.ok);
for (const c of checks) console.log(`${c.ok ? "✓" : "✗"} ${c.name}`);
if (failed.length) {
  console.error(`\nProfile mobile CTA layout checks failed: ${failed.length}/${checks.length}`);
  process.exit(1);
}
console.log("\nProfile mobile CTA layout checks passed.");
