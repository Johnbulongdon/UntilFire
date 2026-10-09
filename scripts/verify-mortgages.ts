/**
 * Mortgages (D-61): older single-mortgage profiles load as one mortgage, each
 * mortgage projects at its own rate, connected ones take their saved terms.
 *
 * Run: npm run test:mortgages
 */
import assert from "node:assert/strict";
import { DEFAULT_MORTGAGE_RATE_PCT, engineMortgages, loadMortgages, payoffYear } from "../lib/mortgages.ts";

let n = 0;
const ok = (name: string, fn: () => void) => { fn(); n++; console.log(`✓ ${name}`); };

ok("an older profile's single mortgage becomes the first entry, at the default rate", () => {
  const m = loadMortgages({ mortgageBalance: 300000, mortgageMonthly: 2000 });
  assert.deepEqual(m, [{ id: "m1", name: "Mortgage", balance: 300000, monthly: 2000 }]);
  assert.equal(engineMortgages(m, [], {})[0].rate, DEFAULT_MORTGAGE_RATE_PCT / 100);
});
ok("no mortgage stays none", () => assert.deepEqual(loadMortgages({}), []));
ok("saved mortgages load as they were, each with its own rate", () => {
  const m = loadMortgages({ mortgages: [{ id: "a", name: "Home", balance: 310000, monthly: 2150, ratePct: 5.875 }, { id: "b", name: "Rental", balance: 198000, monthly: 1420, ratePct: 6.75 }] });
  assert.deepEqual(engineMortgages(m, [], {}).map((x) => x.rate), [0.05875, 0.0675]);
});
ok("connected mortgages replace typed ones and take their saved terms", () => {
  const typed = [{ id: "m1", name: "Mortgage", balance: 300000, monthly: 2000 }];
  const e = engineMortgages(typed, [{ id: "p1", balance: 295000 }, { id: "p2", balance: 90000 }], { p2: { monthly: 800, ratePct: 4 } });
  assert.deepEqual(e, [{ balance: 295000, monthly: 2000, rate: 0.065 }, { balance: 90000, monthly: 800, rate: 0.04 }]);
});
ok("payoff year: paid down at its rate; never when the payment doesn't cover interest", () => {
  const from = new Date(2026, 9, 1);
  assert.equal(payoffYear(310000, 2150, 5.875, from), 2047); // ~251 months
  assert.equal(payoffYear(300000, 1000, 6, from), null);
  assert.ok(payoffYear(300000, 3000, 3, from)! < payoffYear(300000, 3000, 7, from)!, "a lower rate pays off sooner");
});

console.log(`\nMortgage checks passed: ${n}`);
