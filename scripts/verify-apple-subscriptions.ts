/**
 * Pro bought through Apple (D-75): what a verified Apple transaction means for
 * the person's subscriptions row, and when an Apple-billed row blocks account
 * deletion. The signature checking itself is Apple's library.
 *
 * Run: npm run test:apple-subscriptions
 */
import assert from "node:assert/strict";
import { appleWillRenew, rowForTransaction } from "../lib/apple-store.ts";

let n = 0;
const ok = (name: string, fn: () => void) => { fn(); n++; console.log(`✓ ${name}`); };
const now = Date.parse("2026-10-13T00:00:00Z");
const tx = { originalTransactionId: "1000", productId: "com.untilfire.pro.monthly", bundleId: "com.untilfire.app", expiresDate: now + 20 * 864e5 };

ok("a live Pro purchase is active Pro until it expires", () => {
  const row = rowForTransaction(tx, null, now)!;
  assert.equal(row.status, "active");
  assert.equal(row.plan, "pro");
  assert.equal(row.current_period_end, new Date(tx.expiresDate).toISOString());
  assert.equal(row.apple_original_transaction_id, "1000");
});
ok("an expired purchase is free", () => {
  const row = rowForTransaction({ ...tx, expiresDate: now - 1000 }, null, now)!;
  assert.equal(row.status, "expired");
  assert.equal(row.plan, "free");
});
ok("a refunded or revoked purchase is free at once", () => {
  const row = rowForTransaction({ ...tx, revocationDate: now - 1000 }, null, now)!;
  assert.equal(row.status, "revoked");
  assert.equal(row.plan, "free");
});
ok("renewal turned off is recorded, Pro stays until the period ends", () => {
  const row = rowForTransaction(tx, { autoRenewStatus: 0 }, now)!;
  assert.equal(row.plan, "pro");
  assert.equal(row.auto_renew, false);
});
ok("other products and other apps are ignored", () => {
  assert.equal(rowForTransaction({ ...tx, productId: "com.other.thing" }, null, now), null);
  assert.equal(rowForTransaction({ ...tx, bundleId: "com.someone.else" }, null, now), null);
});
ok("an Apple row that will renew blocks deletion; one turned off or ended does not", () => {
  assert.equal(appleWillRenew({ source: "apple", status: "active", auto_renew: true }), true);
  assert.equal(appleWillRenew({ source: "apple", status: "active", auto_renew: null }), true);
  assert.equal(appleWillRenew({ source: "apple", status: "active", auto_renew: false }), false);
  assert.equal(appleWillRenew({ source: "apple", status: "expired", auto_renew: true }), false);
  assert.equal(appleWillRenew({ source: "stripe", status: "active", auto_renew: null }), false);
  assert.equal(appleWillRenew(null), false);
});
console.log(`\n${n} checks passed`);
