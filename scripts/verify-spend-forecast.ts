/**
 * The forecast and budget path built from Upcoming bills.
 *
 * Run: npm run test:spend-forecast
 */
import assert from "node:assert/strict";
import { type Bill, budgetPath, daysOfMonths, everydayRate, forecastPath, isBill, mergeBills, occurrences } from "../lib/spend-forecast.ts";
import { detectRecurring } from "../lib/recurring-detect.ts";

let n = 0;
const ok = (name: string, fn: () => void) => { fn(); n++; console.log(`✓ ${name}`); };
const rent: Bill = { description: "Rent", category: "housing", usd: 1380, due: "2026-11-01", recurrence: "monthly" };
const tx = (date: string, usd: number, description = "Coffee", category = "food") => ({ date, usd, description, category });

ok("rent paid on the 1st is not forecast again; the next one is outside the month", () => {
  const days = daysOfMonths(["2026-10"]);
  const f = forecastPath(days, "2026-10-06", 1380 + 100, [rent], 20);
  assert.equal(f[days.length - 1], 1480 + 20 * 25, "spent so far plus 25 everyday days, no second rent");
});
ok("a bill still due this month steps up on its date", () => {
  const days = daysOfMonths(["2026-10"]);
  const phone: Bill = { description: "China Mobile", category: "utilities", usd: 50, due: "2026-10-20", recurrence: "monthly" };
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

ok("rent nobody listed in Upcoming is spotted in history, so it is not in the everyday rate", () => {
  // The founder's October: BILT PAYMENT for rent every month on varying days, a little everyday spending.
  const months = ["2026-06", "2026-07", "2026-08", "2026-09"];
  const raw = months.flatMap((m, i) => [
    { id: `r${i}`, date: `${m}-${["28", "30", "02", "29"][i]}`, amount: 1380, currency: "USD", description: "BILT PAYMENT", category: "housing", transaction_type: "expense" as const },
    { id: `c${i}`, date: `${m}-12`, amount: 450, currency: "USD", description: "Groceries", category: "food", transaction_type: "expense" as const },
  ]).concat([{ id: "oct", date: "2026-10-02", amount: 1380, currency: "USD", description: "BILT PAYMENT", category: "housing", transaction_type: "expense" as const }]);
  const spotted: Bill[] = detectRecurring(raw, {}).expenses.filter((d) => d.frequency === "monthly")
    .map((d) => ({ description: d.description, category: d.category, usd: d.avgAmountUSD, due: d.nextDueDate, recurrence: "monthly" as const }));
  assert.ok(spotted.some((b) => b.description === "BILT PAYMENT"), "BILT PAYMENT is spotted as a monthly bill");
  const spend = raw.map((r) => ({ date: r.date, usd: r.amount, description: r.description, category: r.category }));
  const rate = everydayRate(spend, spotted, "2026-10")!;
  const f = forecastPath(daysOfMonths(["2026-10"]), "2026-10-06", 1380, spotted, rate).at(-1)!;
  assert.ok(f < 1380 + 450 + 50, `forecast ${Math.round(f)} holds one rent plus about a month of groceries, not two rents`);
});

ok("a monthly bill lands on its day in past months too", () => {
  assert.deepEqual(occurrences(rent, "2026-09-01", "2026-10-31"), ["2026-09-01", "2026-10-01"]);
  const p = budgetPath(["2026-09"], 2930, [rent]);
  assert.equal(Math.round(p[0]), 1380 + Math.round(1550 / 30), "September 1 steps up by rent");
});
ok("weekly, one-off and annual bills land on their own dates", () => {
  const gym: Bill = { description: "Gym", category: "personal_care", usd: 20, due: "2026-10-03", recurrence: "weekly" };
  assert.deepEqual(occurrences(gym, "2026-09-01", "2026-09-30"), ["2026-09-05", "2026-09-12", "2026-09-19", "2026-09-26"]);
  const flight: Bill = { description: "Flight", category: "travel", usd: 600, due: "2026-09-14", recurrence: "none" };
  assert.deepEqual(occurrences(flight, "2026-09-01", "2026-09-30"), ["2026-09-14"]);
  const insurance: Bill = { description: "Insurance", category: "other", usd: 900, due: "2027-03-10", recurrence: "annual" };
  assert.deepEqual(occurrences(insurance, "2026-09-01", "2026-09-30"), []);
  const p = budgetPath(["2026-09"], 3000, [rent, flight]);
  assert.ok(p[13] - p[12] > 600, "the flight steps the budget up on the 14th");
});
ok("listed rent and the bank's BILT PAYMENT are one bill, not two", () => {
  const bilt: Bill = { description: "BILT PAYMENT", category: "housing", usd: 1380, due: "2026-11-02", recurrence: "monthly" };
  assert.equal(mergeBills([rent], [bilt]).length, 1);
});

console.log(`Spend forecast ok: ${n} checks.`);
