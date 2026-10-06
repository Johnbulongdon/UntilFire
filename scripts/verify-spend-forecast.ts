/**
 * The forecast and budget path built from Upcoming bills.
 *
 * Run: npm run test:spend-forecast
 */
import assert from "node:assert/strict";
import { type Bill, budgetPath, daysOfMonths, everydayRate, forecastPath, isBill } from "../lib/spend-forecast.ts";

let n = 0;
const ok = (name: string, fn: () => void) => { fn(); n++; console.log(`✓ ${name}`); };
const rent: Bill = { description: "Rent", category: "housing", usd: 1380, due: "2026-11-01", monthly: true };
const tx = (date: string, usd: number, description = "Coffee", category = "food") => ({ date, usd, description, category });

ok("rent paid on the 1st is not forecast again; the next one is outside the month", () => {
  const days = daysOfMonths(["2026-10"]);
  const f = forecastPath(days, "2026-10-06", 1380 + 100, [rent], 20);
  assert.equal(f[days.length - 1], 1480 + 20 * 25, "spent so far plus 25 everyday days, no second rent");
});
ok("a bill still due this month steps up on its date", () => {
  const days = daysOfMonths(["2026-10"]);
  const phone: Bill = { description: "China Mobile", category: "utilities", usd: 50, due: "2026-10-20", monthly: true };
  const f = forecastPath(days, "2026-10-06", 1480, [rent, phone], 0);
  assert.equal(f[18], 1480, "the 19th, before the bill");
  assert.equal(f[19], 1530, "the 20th, the bill");
});
ok("everyday rate leaves the listed bills out", () => {
  const spend = ["2026-08", "2026-09"].flatMap((m) => [tx(`${m}-28`, 1380, "RENT PAYMENT", "housing"), tx(`${m}-10`, 620)]);
  const r = everydayRate(spend, [rent], "2026-10")!;
  assert.ok(Math.abs(r - 620 / 30.5) < 0.6, `rate ${r} should be about $20 a day, rent excluded`);
  assert.equal(isBill(tx("2026-09-28", 1380, "Rent payment Sept", "other"), [rent]), true);
});
ok("one past month is not enough for a usual rate", () => {
  assert.equal(everydayRate([tx("2026-09-10", 300)], [], "2026-10"), null);
});
ok("the budget path puts rent on its day and spreads the rest evenly", () => {
  const p = budgetPath(["2026-10"], 2930, [rent]);
  assert.equal(Math.round(p[0]), 1380 + 50, "day 1: rent plus one day of the remaining $1,550 over 31 days");
  assert.equal(Math.round(p[30]), 2930, "ends at the budget");
});
ok("bills larger than the budget are capped so the line ends at the budget", () => {
  const p = budgetPath(["2026-10"], 1000, [rent]);
  assert.equal(Math.round(p[30]), 1000);
});

console.log(`Spend forecast ok: ${n} checks.`);
