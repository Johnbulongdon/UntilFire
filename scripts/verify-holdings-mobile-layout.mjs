#!/usr/bin/env node
import fs from "node:fs";

const source = fs.readFileSync("app/dashboard/page.tsx", "utf8");

const checks = [];
const check = (name, ok) => checks.push({ name, ok });

check(
  "holdings rows use shared CSS class instead of inline fixed desktop columns",
  /className="uf-holdings-grid"/.test(source) &&
    !/gridTemplateColumns:\s*"80px 1fr 80px 90px 100px"/.test(source),
);

check(
  "desktop holdings grid allows the security column to shrink",
  /\.uf-holdings-grid\s*\{[^}]*grid-template-columns:\s*80px minmax\(0, 1fr\) 80px 90px 100px/s.test(source),
);

check(
  "holdings cells truncate instead of creating page-wide overflow",
  /\.uf-holdings-grid > span\s*\{[^}]*min-width:\s*0[^}]*overflow:\s*hidden[^}]*text-overflow:\s*ellipsis[^}]*white-space:\s*nowrap/s.test(source),
);

check(
  "mobile holdings grid drops Security and renders four flexible columns",
  /@media\(max-width:\s*900px\)[\s\S]*\.uf-holdings-grid\s*\{[^}]*grid-template-columns:\s*minmax\(56px, 0\.9fr\) minmax\(58px, 0\.9fr\) minmax\(66px, 1fr\) minmax\(72px, 1fr\)[^}]*gap:\s*6px[^}]*\}[\s\S]*\.uf-holdings-security\s*\{\s*display:\s*none;\s*\}/s.test(source),
);

check(
  "small phones reduce card side padding to protect the price/value columns",
  /@media\(max-width:\s*420px\)\s*\{[^}]*\.uf-card\s*\{[^}]*padding-left:\s*18px;\s*padding-right:\s*18px;/s.test(source),
);

const failed = checks.filter((c) => !c.ok);
for (const c of checks) console.log(`${c.ok ? "✓" : "✗"} ${c.name}`);
if (failed.length) {
  console.error(`\nHoldings mobile layout checks failed: ${failed.length}/${checks.length}`);
  process.exit(1);
}
console.log("\nHoldings mobile layout checks passed.");
