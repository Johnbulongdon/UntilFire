#!/usr/bin/env node
import fs from "node:fs";

const source = fs.readFileSync("app/dashboard/TransactionsTab.tsx", "utf8");
const dashboard = fs.readFileSync("app/dashboard/page.tsx", "utf8");

const checks = [];
const check = (name, ok) => checks.push({ name, ok });

const bottomNavMatch = dashboard.match(/\.uf-mobile-bottom-nav\s*\{[^}]*z-index:\s*(\d+)/s);
const bottomNavZ = bottomNavMatch ? Number(bottomNavMatch[1]) : 0;
const drawerZMatches = [...source.matchAll(/\.cf-mobile-drawer\s*\{[^}]*z-index:\s*(\d+)/gs)].map((m) => Number(m[1]));
const maxDrawerZ = drawerZMatches.length ? Math.max(...drawerZMatches) : 0;

check("dashboard mobile bottom nav z-index is discoverable", bottomNavZ > 0);
check("cashflow mobile drawer is layered above dashboard bottom nav", maxDrawerZ > bottomNavZ);
check("cashflow quick form footer stays sticky on mobile", /\.cf-quick-form-footer\s*\{[^}]*position:\s*sticky[^}]*bottom:\s*0/s.test(source));
check("cashflow form has extra mobile bottom breathing room", /\.cf-quick-form-body\s*\{[^}]*padding-bottom:\s*(?:calc\([^)]*(?:80|96|112|120)px|(?:80|96|112|120)px)/s.test(source));

const failed = checks.filter((c) => !c.ok);
for (const c of checks) console.log(`${c.ok ? "✓" : "✗"} ${c.name}`);
if (failed.length) {
  console.error(`\nCashflow mobile save reachability checks failed: ${failed.length}/${checks.length}`);
  process.exit(1);
}
console.log("\nCashflow mobile save reachability checks passed.");
