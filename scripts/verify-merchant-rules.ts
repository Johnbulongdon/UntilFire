/**
 * Merchant rules applied at bank sync.
 *
 * Run: npm run test:merchant-rules
 */
import assert from "node:assert/strict";
import { merchantKey } from "../lib/merchant-memory.ts";
import { planMerchantRules, readMerchantRules } from "../lib/merchant-rules.ts";

let n = 0;
const ok = (name: string, fn: () => void) => { fn(); n++; console.log(`✓ ${name}`); };
const rules = readMerchantRules({
  [merchantKey("Starbucks")]: { category: "food", sub_category: "Coffee", need: "want" },
  broken: { category: "", need: "maybe" },
});
const row = (description: string, transaction_type = "expense") => ({ plaid_transaction_id: description, description, transaction_type });

ok("a bank row from a ruled merchant is filed, whatever the store number", () => {
  const [r] = planMerchantRules([row("STARBUCKS #1234")], rules);
  assert.deepEqual(r, { plaid_transaction_id: "STARBUCKS #1234", category: "food", sub_category: "Coffee", need: "want" });
});
ok("other merchants and income are left alone", () => {
  assert.equal(planMerchantRules([row("Blue Bottle"), row("Starbucks", "income")], rules).length, 0);
});
ok("malformed stored rules are dropped", () => {
  assert.equal(Object.keys(rules).length, 1);
  assert.deepEqual(readMerchantRules(["x"]), {});
});

console.log(`Merchant rules ok: ${n} checks.`);
