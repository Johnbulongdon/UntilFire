#!/usr/bin/env node
/**
 * The ladder. Run: npm run test:contribution-waterfall
 */
import {
  buildLadder, fillWaterfall, splitDebts, DEFAULT_THRESHOLD_PCT,
} from "../lib/contribution-waterfall.ts";

const checks = [];
const check = (name, ok, detail = "") => checks.push({ name, ok, detail });
const money = (n) => (Number.isFinite(n) ? `$${n.toFixed(0)}` : "unlimited");

const BASE = {
  emergencyGapToFloor: 0,
  emergencyGapToTarget: 0,
  monthlyMatch: 0,
  debts: [],
  highInterestThresholdPct: DEFAULT_THRESHOLD_PCT,
  taxAdvantagedRoom: 0,
  lowInterestExtra: 0,
};
const run = (over, budget) => {
  const r = fillWaterfall(buildLadder({ ...BASE, ...over }), budget);
  return { r, got: (kind) => r.fills.find((f) => f.kind === kind)?.amount ?? 0 };
};

// ── Order ───────────────────────────────────────────────────────────────
{
  const order = buildLadder(BASE).map((x) => x.kind);
  check("the ladder runs floor, match, expensive debt, target, sheltered, cheap debt, taxable",
    order.join(" > ") === "emergency-floor > employer-match > high-interest-debt > emergency-target > tax-advantaged > low-interest-debt > taxable",
    order.join(" > "));
  check("taxable is last and bottomless — it is what catches the remainder",
    buildLadder(BASE).at(-1).capacity === Infinity);
}

// ── The floor comes before the debt, and the target comes after ─────────
{
  const { got } = run({ emergencyGapToFloor: 800, emergencyGapToTarget: 5000,
                        debts: [{ name: "Card", balance: 4000, ratePct: 22 }] }, 1000);
  check("with no buffer, the floor is filled before any debt payment",
    got("emergency-floor") === 800 && got("high-interest-debt") === 200,
    `floor ${money(got("emergency-floor"))}, debt ${money(got("high-interest-debt"))}`);
  check("the rest of the emergency fund waits behind the expensive debt",
    got("emergency-target") === 0);
}
{
  // Floor already met; the target must not re-charge for it.
  const { got } = run({ emergencyGapToFloor: 0, emergencyGapToTarget: 3000 }, 1000);
  check("once the floor is met the target takes over",
    got("emergency-target") === 1000, money(got("emergency-target")));
}
{
  // gapToTarget includes gapToFloor, so the target rung must net it off or
  // the same shortfall is charged for twice.
  const { r, got } = run({ emergencyGapToFloor: 1000, emergencyGapToTarget: 6000 }, 10000);
  check("the floor is not charged for twice via the target",
    got("emergency-floor") + got("emergency-target") === 6000,
    `${money(got("emergency-floor"))} + ${money(got("emergency-target"))} = ${money(got("emergency-floor") + got("emergency-target"))}, target total is $6000`);
  check("and what is left over still reaches the investments",
    r.toInvest === 4000, money(r.toInvest));
}

// ── The match outranks even expensive debt ──────────────────────────────
{
  const { got } = run({ monthlyMatch: 300, debts: [{ name: "Card", balance: 9000, ratePct: 24 }] }, 500);
  check("the employer match is taken before a 24% card",
    got("employer-match") === 300 && got("high-interest-debt") === 200,
    `match ${money(got("employer-match"))}, card ${money(got("high-interest-debt"))}`);
}

// ── The threshold is a number, not a category ───────────────────────────
{
  const debts = [
    { name: "Card", balance: 3000, ratePct: 22 },
    { name: "Car", balance: 8000, ratePct: 6 },
    { name: "Mortgage", balance: 300000, ratePct: 3 },
  ];
  const at7 = splitDebts(debts, 7);
  check("at a 7% threshold only the card is expensive",
    at7.high.length === 1 && at7.high[0].name === "Card", at7.high.map((d) => d.name).join(","));
  const at4 = splitDebts(debts, 4);
  check("moving the threshold to 4% makes the car expensive too",
    at4.high.length === 2, at4.high.map((d) => d.name).join(","));
  check("a debt with no balance left is not a rung",
    splitDebts([{ name: "Paid off", balance: 0, ratePct: 30 }], 7).high.length === 0);
}

// ── Cheap debt is a monthly amount, not a balance ───────────────────────
{
  const { r, got } = run({ lowInterestExtra: 200 }, 1000);
  check("cheap debt takes the monthly extra you set, not its balance",
    got("low-interest-debt") === 200, money(got("low-interest-debt")));
  check("so investing below it still gets the rest, rather than starving forever",
    r.toInvest === 800, money(r.toInvest));
  check("and it is off entirely when the extra is zero",
    !buildLadder(BASE).find((x) => x.kind === "low-interest-debt").enabled);
}

// ── Switching a rung off, and running out of money ──────────────────────
{
  const { got } = run({ monthlyMatch: 300, disabled: ["employer-match"] }, 1000);
  check("a rung switched off is skipped, and the money flows past it",
    got("employer-match") === 0, money(got("employer-match")));

  const { r } = run({ emergencyGapToFloor: 5000 }, 400);
  check("a budget smaller than the first rung goes entirely to that rung",
    r.fills[0].amount === 400 && r.toInvest === 0, money(r.fills[0].amount));
  check("and nothing is reported as left over",
    r.leftover === 0);

  const zero = run({}, 0);
  check("a zero budget allocates nothing rather than dividing by it",
    zero.r.fills.every((f) => f.amount === 0) && zero.r.toInvest === 0);
}

// ── Everything clear: it all reaches the split ──────────────────────────
{
  const { r } = run({}, 1500);
  check("with nothing owed and the buffer full, the whole contribution invests",
    r.toInvest === 1500, money(r.toInvest));
  check("a filled rung says so, an unfilled one does not",
    run({ emergencyGapToFloor: 100 }, 1000).r.fills[0].filled === true
      && run({ emergencyGapToFloor: 9000 }, 1000).r.fills[0].filled === false);
}

let failed = 0;
for (const c of checks) {
  console.log(`${c.ok ? "✓" : "✗"} ${c.name}${c.detail ? `  — ${c.detail}` : ""}`);
  if (!c.ok) failed++;
}
console.log(failed ? `\nWaterfall verification failed: ${failed} check(s) failed.` : "\nWaterfall verification passed");
process.exit(failed ? 1 : 0);
