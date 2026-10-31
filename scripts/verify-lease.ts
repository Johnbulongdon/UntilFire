/**
 * The lease on the Rent bill: who is offered one, the notice deadline, and
 * when Today asks "Stay or move?".
 *
 * Run: npm run test:lease
 */
import assert from "node:assert/strict";
import { isRent, isRentOrMortgage, leaseAsk, leaseProgress, noticeDeadline, daysUntil, rentAfterRenewal } from "../lib/lease.ts";
import { classifyPlaid } from "../lib/plaid-category.ts";
import { webTodayItems } from "../lib/today-web.ts";

let n = 0;
const ok = (name: string, fn: () => void) => { fn(); n++; console.log(`✓ ${name}`); };
const lease = { ends_on: "2027-03-31" };

ok("only Housing › Rent offers a lease; Mortgage and the old combined tag don't", () => {
  assert.equal(isRent({ category: "housing", sub_category: "Rent" }), true);
  assert.equal(isRent({ category: "housing", sub_category: "Mortgage" }), false);
  assert.equal(isRent({ category: "housing", sub_category: "Rent/Mortgage" }), false);
  assert.equal(isRent({ category: "food", sub_category: "Rent" }), false);
  assert.equal(isRentOrMortgage({ category: "housing", sub_category: "Rent/Mortgage" }), true);
});
ok("the notice deadline is the end date less 60 days by default", () => {
  assert.equal(noticeDeadline(lease), "2027-01-30");
  assert.equal(noticeDeadline({ ...lease, notice_days: 30 }), "2027-03-01");
  assert.equal(daysUntil("2027-01-30", "2026-10-17"), 105);
});
ok("Today asks 30 days before the deadline, not earlier and not after", () => {
  assert.equal(leaseAsk(lease, "2026-12-30"), null, "31 days out");
  assert.equal(leaseAsk(lease, "2026-12-31"), "first");
  assert.equal(leaseAsk(lease, "2027-01-30"), "last", "deadline day, unanswered");
  assert.equal(leaseAsk(lease, "2027-01-31"), null, "deadline passed");
});
ok("an answer stops the asking, except 'not sure', which is asked once more in the last week", () => {
  assert.equal(leaseAsk({ ...lease, decision: "renew" }, "2027-01-28"), null);
  assert.equal(leaseAsk({ ...lease, decision: "unsure" }, "2027-01-10"), null);
  assert.equal(leaseAsk({ ...lease, decision: "unsure" }, "2027-01-23"), "last");
});
ok("rent after renewal uses the expected rise, or stays the same when unknown", () => {
  assert.equal(rentAfterRenewal(1850, 5), 1943);
  assert.equal(rentAfterRenewal(1850, null), 1850);
});
ok("lease progress runs 0 to 1 over the assumed year", () => {
  assert.equal(leaseProgress(lease, "2026-03-31"), 0);
  assert.equal(leaseProgress(lease, "2027-04-01"), 1);
  assert.ok(Math.abs(leaseProgress(lease, "2026-10-17") - 0.55) < 0.01);
});
ok("Plaid rent arrives tagged Rent, a mortgage as Mortgage", () => {
  assert.equal(classifyPlaid("RENT_AND_UTILITIES", "RENT_AND_UTILITIES_RENT", 1850).sub_category, "Rent");
  assert.equal(classifyPlaid("LOAN_PAYMENTS", "LOAN_PAYMENTS_MORTGAGE_PAYMENT", 1850).sub_category, "Mortgage");
  assert.equal(classifyPlaid("RENT_AND_UTILITIES", "RENT_AND_UTILITIES_GAS_AND_ELECTRICITY", 1850).category, "utilities");
});

ok("the website's Today strip asks the lease and the old tag first, with the phone's keys", () => {
  const at = new Date("2027-01-10T15:00:00");
  const base = { rows: [], bills: [], now: at };
  const leases = [{ id: "b1", ends_on: "2027-03-31", notice_days: null, decision: null }];
  const { items } = webTodayItems({ ...base, progress: { done: [], acks: [] }, leases, oldRentTag: true });
  assert.deepEqual(items.map((i) => i.key), ["lease:b1:2027-03-31:first", "renttag"]);
  const answered = webTodayItems({ ...base, progress: { done: [], acks: ["lease:b1:2027-03-31:first", "renttag"] }, leases, oldRentTag: true });
  assert.deepEqual(answered.items, [], "answered: nothing left, so the day counts on opening (D-108)");
  const renewed = webTodayItems({ ...base, progress: { done: [], acks: [] }, leases: [{ ...leases[0], decision: "renew" as const }] });
  assert.deepEqual(renewed.items, []);
});

console.log(`\n${n} lease checks passed`);
