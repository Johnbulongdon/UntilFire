import { rewardEligible } from "../lib/reward-month.ts";

const cases: [string, boolean, boolean][] = [
  ["new account, no row", rewardEligible(null, null), true],
  ["free row, never paid", rewardEligible({ status: "inactive", source: "stripe" }, null), true],
  ["already rewarded", rewardEligible(null, "2026-10-01T00:00:00Z"), false],
  ["had a Stripe trial", rewardEligible({ status: "inactive", stripe_subscription_id: "sub_1" }, null), false],
  ["had Apple", rewardEligible({ status: "inactive", apple_original_transaction_id: "200" }, null), false],
  ["Pro now", rewardEligible({ status: "active" }, null), false],
  ["expired reward row", rewardEligible({ status: "inactive", source: "reward" }, null), false],
];
let bad = 0;
for (const [name, got, want] of cases) if (got !== want) { bad++; console.error(`FAIL ${name}: got ${got}`); }
console.log(bad ? `${bad} failed` : `reward-month: ${cases.length} checks passed`);
process.exit(bad ? 1 : 0);
