/**
 * Account deletion blockers: a renewing Pro subscription or a connected bank
 * stops deletion until the person undoes it; a cancelled-at-period-end
 * subscription does not.
 *
 * Run: npm run test:account-deletion
 */
import assert from "node:assert/strict";
import { blockerMessage, hasBlockers, willRenew } from "../lib/account-deletion.ts";

let n = 0;
const ok = (name: string, fn: () => void) => { fn(); n++; console.log(`✓ ${name}`); };
const row = { plan: "pro", status: "active", stripe_subscription_id: "sub_1" };

ok("no subscription never blocks", () => {
  assert.equal(willRenew(null, null), false);
  assert.equal(willRenew({ plan: "free", status: null, stripe_subscription_id: null }, null), false);
});
ok("an active subscription that will renew blocks", () => assert.equal(willRenew(row, { status: "active", cancel_at_period_end: false }), true));
ok("a trial that will convert blocks", () => assert.equal(willRenew(row, { status: "trialing", cancel_at_period_end: false }), true));
ok("cancelled at period end does not block, though the row still says active", () => assert.equal(willRenew(row, { status: "active", cancel_at_period_end: true }), false));
ok("a subscription Stripe has ended does not block", () => assert.equal(willRenew(row, { status: "canceled", cancel_at_period_end: false }), false));
ok("when Stripe can't be asked, an active row blocks", () => assert.equal(willRenew(row, null), true));
ok("when Stripe can't be asked, an ended row does not", () => assert.equal(willRenew({ plan: "free", status: "canceled", stripe_subscription_id: "sub_1" }, null), false));
ok("message names each step", () => {
  assert.equal(hasBlockers({ subscription: false, banks: [] }), false);
  assert.equal(blockerMessage({ subscription: true, banks: [] }), "Before deleting your account, cancel your Pro subscription.");
  assert.equal(blockerMessage({ subscription: false, banks: ["Chase"] }), "Before deleting your account, disconnect Chase.");
  assert.equal(blockerMessage({ subscription: true, banks: ["Chase", "Ally"] }), "Before deleting your account, cancel your Pro subscription and disconnect your 2 connected banks.");
});
console.log(`\n${n} checks passed`);
