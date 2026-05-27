#!/usr/bin/env node
import fs from "node:fs";

const profile = fs.readFileSync("app/dashboard/ProfileTab.tsx", "utf8");
const dashboard = fs.readFileSync("app/dashboard/page.tsx", "utf8");

const checks = [];
const check = (name, ok) => checks.push({ name, ok });

check(
  "Profile has no separate Location card",
  !/\{\/\*\s*Location\s*\*\/\}/.test(profile) && !/<h3[^>]*>Location<\/h3>/.test(profile),
);

check(
  "Profile keeps one canonical city/location input inside FIRE profile",
  (profile.match(/Retirement target city/g) || []).length === 1 &&
    (profile.match(/Where should freedom be priced\?/g) || []).length === 1,
);

check(
  "old city-only profile state and save action were removed",
  !/citySearch|selectedCity|showCityDropdown|saveCity|jurisdiction|saving\.city|saved\.city/.test(profile),
);

check(
  "canonical city picker still supports typed fallback locations",
  /canUseTypedRetirementCity/.test(profile) &&
    /updateRetirementCity\(retirementCitySearchTrimmed, 0\)/.test(profile) &&
    /We’ll save the city name even if it is not in our estimate list yet\./.test(profile),
);

check(
  "profile city selection updates dashboard city and retirement target together",
  /onRetirementCityChange=\{\(name, col\) => \{ setCityName\(name\); setRetirementCityName\(name\); setRetirementCityCol\(col\); \}\}/.test(dashboard),
);

const failed = checks.filter((c) => !c.ok);
for (const c of checks) console.log(`${c.ok ? "✓" : "✗"} ${c.name}`);
if (failed.length) {
  console.error(`\nProfile single-location checks failed: ${failed.length}/${checks.length}`);
  process.exit(1);
}
console.log("\nProfile single-location checks passed.");
