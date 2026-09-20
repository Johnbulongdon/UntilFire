#!/usr/bin/env node
import fs from "node:fs";

/**
 * One canonical retirement-location input, and it lives with the plan.
 *
 * The invariant this has always protected is that a user can set where their
 * freedom gets priced in exactly ONE place. Two pickers drift, and a user who
 * edits the wrong one silently gets the other one's answer.
 *
 * What changed on 18 Sep 2026 is only WHERE that one place is. The picker used
 * to sit in Profile, which put an input that models the future inside account
 * settings — app-structure rule 2 — and the app had grown two "Edit in
 * Profile →" buttons to work around it. It now lives in FireAssumptionsCard,
 * rendered by Plan → Freedom Date.
 */

const assumptions = fs.readFileSync("app/dashboard/FireAssumptionsCard.tsx", "utf8");
const profile = fs.readFileSync("app/dashboard/ProfileTab.tsx", "utf8");
const dashboard = fs.readFileSync("app/dashboard/page.tsx", "utf8");

const checks = [];
const check = (name, ok) => checks.push({ name, ok });

const count = (s, re) => (s.match(re) || []).length;
const CITY_LABEL = /Retirement target city/g;
const CITY_PLACEHOLDER = /Where should freedom be priced\?/g;

check(
  "exactly one retirement-location input exists across the dashboard",
  count(assumptions, CITY_LABEL) + count(profile, CITY_LABEL) + count(dashboard, CITY_LABEL) === 1 &&
    count(assumptions, CITY_PLACEHOLDER) + count(profile, CITY_PLACEHOLDER) + count(dashboard, CITY_PLACEHOLDER) === 1,
);

check(
  "it lives with the plan, not in account settings",
  count(assumptions, CITY_LABEL) === 1 && count(profile, CITY_LABEL) === 0,
);

check(
  "Profile keeps no planning assumptions — age, lifestyle or tax home",
  !/Current age|Lifestyle target|Tax home/.test(profile),
);

check(
  "old city-only profile state and save action stayed removed",
  !/citySearch|selectedCity|showCityDropdown|saveCity|jurisdiction|saving\.city|saved\.city/.test(profile),
);

check(
  "the picker still supports typed fallback locations",
  /canUseTyped/.test(assumptions) &&
    /pickCity\(trimmed, 0\)/.test(assumptions) &&
    /We&apos;ll save the city name even if it is not in our estimate list yet\./.test(assumptions),
);

check(
  "city selection still updates dashboard city and retirement target together",
  /onRetirementCityChange=\{\(name, col\) => \{ setCityName\(name\); setRetirementCityName\(name\); setRetirementCityCol\(col\); \}\}/.test(dashboard),
);

check(
  "Plan no longer needs an 'Edit in Profile' escape hatch",
  !/Edit in Profile/.test(dashboard),
);

check(
  "the setup checklist sends 'Set your city' where the city input actually is",
  /\{ label: "Set your city"[\s\S]{0,200}?onTabChange\?\.\("fire-calculator"\)/.test(dashboard),
);

const failed = checks.filter((c) => !c.ok);
for (const c of checks) console.log(`${c.ok ? "✓" : "✗"} ${c.name}`);
if (failed.length) {
  console.error(`\nSingle-location checks failed: ${failed.length}/${checks.length}`);
  process.exit(1);
}
console.log("\nSingle-location checks passed.");
