#!/usr/bin/env node
/**
 * The contribution maths, checked against the spreadsheet it replaces.
 *
 * The fixtures below are real rows from the sheet, with the figures it
 * displayed. They are the reason to trust the port: if lib/contribution.ts
 * ever stops reproducing them, it has stopped doing what the user's own
 * process does. The sheet shows whole dollars, so each leg is compared to
 * within $1.
 *
 * Run: npm run test:contribution-plan
 */
import { planContribution, bandFor, statusFor, targetsSumTo100 } from "../lib/contribution.ts";

const checks = [];
const check = (name, ok, detail = "") => checks.push({ name, ok, detail });

const pct = (o) => Object.entries(o).map(([symbol, targetPct]) => ({ symbol, targetPct }));
const val = (o) => Object.entries(o).map(([symbol, value]) => ({ symbol, value }));

// ── Sheet fixtures. normaliseToBudget is off so these compare against the
//    sheet's own un-normalised numbers.
const SHEET = [
  {
    name: "tab 1, December — a portfolio that is all BTC and gold",
    targets: { VTI: 0.26, VXUS: 0.34, AVDV: 0.20, BTC: 0.12, ETH: 0.03, IAUM: 0.05 },
    holdings: { VTI: 0, VXUS: 0, AVDV: 0, BTC: 697, ETH: 23, IAUM: 238 },
    budget: 100,
    expect: { VTI: 33, VXUS: 46, AVDV: 24, BTC: 5, ETH: 3, IAUM: 4 },
  },
  {
    name: "tab 1, February — mild drift",
    targets: { VTI: 0.26, VXUS: 0.34, AVDV: 0.20, BTC: 0.12, ETH: 0.03, IAUM: 0.05 },
    holdings: { VTI: 676, VXUS: 1060, AVDV: 592, BTC: 1054, ETH: 92, IAUM: 164 },
    budget: 100,
    expect: { VTI: 28, VXUS: 36, AVDV: 21, BTC: 10, ETH: 3, IAUM: 5 },
  },
  {
    name: "tab 2, January — a different portfolio and a $1,800 budget",
    targets: { SP500: 0.45, QQQ: 0.20, BTC: 0.25, ETH: 0.05, GOLD: 0.05 },
    holdings: { SP500: 1502, QQQ: 712, BTC: 1102, ETH: 116, GOLD: 322 },
    budget: 1800,
    expect: { SP500: 850, QQQ: 364, BTC: 430, ETH: 92, GOLD: 87 },
  },
  {
    name: "tab 2, February — drift closing as contributions land",
    targets: { SP500: 0.45, QQQ: 0.20, BTC: 0.25, ETH: 0.05, GOLD: 0.05 },
    holdings: { SP500: 2352, QQQ: 1076, BTC: 1532, ETH: 208, GOLD: 409 },
    budget: 1800,
    expect: { SP500: 833, QQQ: 363, BTC: 439, ETH: 91, GOLD: 88 },
  },
];

for (const row of SHEET) {
  const plan = planContribution(pct(row.targets), val(row.holdings), row.budget, { normaliseToBudget: false });
  const off = plan.assets
    .map((a) => ({ symbol: a.symbol, got: a.adjusted, want: row.expect[a.symbol] }))
    .filter((r) => Math.abs(r.got - r.want) > 1);
  check(
    row.name,
    off.length === 0,
    off.map((r) => `${r.symbol}: got $${r.got.toFixed(2)}, sheet says $${r.want}`).join("; "),
  );
}

// ── The two places the app deliberately departs from the sheet ──────────
{
  const row = SHEET[0];
  const raw = planContribution(pct(row.targets), val(row.holdings), row.budget, { normaliseToBudget: false });
  const norm = planContribution(pct(row.targets), val(row.holdings), row.budget);
  check(
    "the sheet asks for more than the budget — $114 of instructions on $100",
    raw.total > row.budget + 10,
    `raw total $${raw.total.toFixed(2)} on a $${row.budget} budget`,
  );
  check(
    "normalising spends exactly the budget",
    Math.abs(norm.total - row.budget) < 1e-6,
    `$${norm.total.toFixed(2)}`,
  );
  // Same scale factor on every leg means the tilt survives normalising.
  const ratios = norm.assets.map((a, i) => a.adjusted / raw.assets[i].adjusted);
  check(
    "normalising preserves the tilt — every leg scales by the same factor",
    Math.max(...ratios) - Math.min(...ratios) < 1e-9,
  );
}

// ── The 5/25 band ───────────────────────────────────────────────────────
{
  const big = bandFor(0.45);
  check("a 45% target uses the absolute rule: 40–50%",
    Math.abs(big.lowPct - 0.40) < 1e-9 && Math.abs(big.highPct - 0.50) < 1e-9,
    `${(big.lowPct * 100).toFixed(2)}–${(big.highPct * 100).toFixed(2)}%`);

  const small = bandFor(0.03);
  check("a 3% target uses the relative rule: 2.25–3.75%, not the unusable −2–8%",
    Math.abs(small.lowPct - 0.0225) < 1e-9 && Math.abs(small.highPct - 0.0375) < 1e-9,
    `${(small.lowPct * 100).toFixed(2)}–${(small.highPct * 100).toFixed(2)}%`);

  const cross = bandFor(0.20);
  check("the two rules meet exactly at a 20% target",
    Math.abs(cross.lowPct - 0.15) < 1e-9 && Math.abs(cross.highPct - 0.25) < 1e-9);

  check("no band can reach below zero", [0.005, 0.01, 0.03, 0.2, 0.9].every((t) => bandFor(t).lowPct >= 0));

  check("a small asset can actually be flagged as under target",
    statusFor(0.015, bandFor(0.03)) === "under");
  check("a flat 5pp band could not have flagged it",
    0.015 >= 0.03 - 0.05);
}

// ── Guards against nonsense input ───────────────────────────────────────
{
  const targets = pct({ VTI: 0.6, VXUS: 0.4 });
  const empty = planContribution(targets, [], 500);
  check("an empty portfolio contributes the plain split, with no drift to correct",
    Math.abs(empty.assets[0].adjusted - 300) < 1e-6 && Math.abs(empty.assets[1].adjusted - 200) < 1e-6,
    empty.assets.map((a) => `${a.symbol} $${a.adjusted.toFixed(0)}`).join(", "));

  const wild = planContribution(pct({ A: 0.5, B: 0.5 }), val({ A: 0, B: 100000 }), 100);
  check("an asset far over target is never given a negative contribution",
    wild.assets.every((a) => a.adjusted >= 0),
    wild.assets.map((a) => `${a.symbol} $${a.adjusted.toFixed(2)}`).join(", "));

  const weekly = planContribution(targets, [], 434.8, { frequency: "weekly" });
  check("weekly divides by 4.35, not 4 — a month is not four weeks",
    Math.abs(weekly.perPeriod - 100) < 0.5, `$${weekly.perPeriod.toFixed(2)}/week`);

  check("targets that do not sum to 100% are rejected",
    !targetsSumTo100(pct({ A: 0.5, B: 0.4 })) && targetsSumTo100(targets));
}

let failed = 0;
for (const c of checks) {
  console.log(`${c.ok ? "✓" : "✗"} ${c.name}${c.detail ? `  — ${c.detail}` : ""}`);
  if (!c.ok) failed++;
}
console.log(failed ? `\nContribution plan verification failed: ${failed} check(s) failed.` : "\nContribution plan verification passed");
process.exit(failed ? 1 : 0);
