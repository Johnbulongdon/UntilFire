// Withdrawal countdown: which Plaid rows count against a savings limit.
import assert from "node:assert/strict";
import { knownWithdrawalLimit, monthStart, parseWithdrawalLimit, pickWithdrawals } from "../lib/savings-limits.ts";

const tx = (over: object) => ({ transaction_id: "t", account_id: "sav", amount: 100, date: "2026-10-03", pending: false, name: "Transfer", ...over });
const rows = pickWithdrawals([
  tx({ transaction_id: "out", merchant_name: "Bilt" }),
  tx({ transaction_id: "in", amount: -500 }),            // deposit: never counts
  tx({ transaction_id: "chk", account_id: "checking" }), // not a limited account
  tx({ transaction_id: "pend", pending: true }),
], new Set(["sav"]), "u1");
assert.deepEqual(rows.map((r) => r.plaid_transaction_id), ["out", "pend"]);
assert.equal(rows[0].description, "Bilt");
assert.equal(rows[1].pending, true);

assert.equal(monthStart("2026-10-15"), "2026-10-01");
assert.equal(knownWithdrawalLimit("JPMorgan Chase Bank"), 6);
assert.equal(knownWithdrawalLimit("Capital One"), null);
assert.equal(parseWithdrawalLimit(""), null);
assert.equal(parseWithdrawalLimit("6"), 6);
assert.equal(parseWithdrawalLimit("0"), null);
console.log("savings withdrawals: ok");

import { withdrawalsLeftLabel } from "../lib/savings-limits.ts";
assert.equal(withdrawalsLeftLabel(6, 2), "4 of 6 withdrawals left this month");
assert.equal(withdrawalsLeftLabel(6, 6), "0 of 6 withdrawals left this month");
assert.equal(withdrawalsLeftLabel(6, 8), "2 over the 6-withdrawal limit this month");
console.log("withdrawals left label: ok");
