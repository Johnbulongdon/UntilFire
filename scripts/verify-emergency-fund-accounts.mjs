#!/usr/bin/env node
/**
 * Which connected accounts the emergency fund is read from.
 *
 * The figure must never read high — counting a current account or brokerage
 * cash would tell someone their buffer is full when it is not — and it must
 * never silently read zero, which is what an id list does after an item is
 * relinked and every id is reissued.
 *
 * Run: npm run test:emergency-fund-accounts
 */
import {
  isSavingsAccount, toCashAccounts, resolveEmergencyAccounts, sumBalances,
  describeAccounts, normaliseSubtype,
} from "../lib/emergency-fund-accounts.ts";

const checks = [];
const check = (name, ok, detail = "") => checks.push({ name, ok, detail });

const acct = (id, name, type, subtype, balance, apy = null) =>
  ({ id, name, type, subtype, balance_current: balance, mask: id.slice(-4), apy });

// A real-ish set: a Capital One HYSA, a current account, brokerage cash, a CD.
const ACCOUNTS = [
  acct("a1", "Capital One 360 Performance Savings", "depository", "savings", 12400, 3.8),
  acct("a2", "Chase Total Checking", "depository", "checking", 3100),
  acct("a3", "IBKR", "investment", "brokerage", 5000),
  acct("a4", "Ally No Penalty CD", "depository", "cd", 8000, 4.1),
  acct("a5", "Fidelity Cash Management", "depository", "money_market", 2600, 4.9),
];

// ── What counts by default
check("a savings account counts", isSavingsAccount(ACCOUNTS[0]));
check("money market counts, however the institution spells the subtype",
  isSavingsAccount(ACCOUNTS[4]) &&
  isSavingsAccount(acct("x", "x", "depository", "money market", 1)) &&
  isSavingsAccount(acct("x", "x", "depository", "money-market", 1)));
check("a current account does not — it is this month's spending",
  !isSavingsAccount(ACCOUNTS[1]));
check("brokerage cash does not — it is waiting to be invested",
  !isSavingsAccount(ACCOUNTS[2]));
check("a term deposit does not — a locked buffer is not a buffer",
  !isSavingsAccount(ACCOUNTS[3]));
check("subtypes normalise", normaliseSubtype(" Money_Market ") === "money market");

// ── The list offered to the user
const cash = toCashAccounts(ACCOUNTS);
check("only cash accounts are offered, so brokerage never appears",
  cash.length === 4 && !cash.some((a) => a.id === "a3"), cash.map((a) => a.id).join(","));
check("savings are listed first, then the rest, largest first within each",
  cash.map((a) => a.id).join(",") === "a1,a5,a4,a2", cash.map((a) => a.id).join(","));
check("an account keeps its own name, mask and rate",
  cash[0].label === "Capital One 360 Performance Savings" && cash[0].apy === 3.8);

// ── What the fund reads
const byDefault = resolveEmergencyAccounts(cash, null);
check("with no choice made, the fund is the savings accounts",
  sumBalances(byDefault) === 15000, `${sumBalances(byDefault)}`);
check("the current account and the CD are left out of the default",
  !byDefault.some((a) => a.id === "a2" || a.id === "a4"));

const chosen = resolveEmergencyAccounts(cash, ["a1", "a4"]);
check("an explicit choice is honoured, including a CD the user counts anyway",
  sumBalances(chosen) === 20400, `${sumBalances(chosen)}`);

// The case that would otherwise report a buffer of zero: reconnecting an item
// reissues every account id, so the stored list matches nothing.
const relinked = toCashAccounts(ACCOUNTS.map((a) => ({ ...a, id: `new-${a.id}` })));
check("after a relink, a stale id list falls back to savings rather than reading zero",
  sumBalances(resolveEmergencyAccounts(relinked, ["a1", "a4"])) === 15000,
  `${sumBalances(resolveEmergencyAccounts(relinked, ["a1", "a4"]))}`);
check("an empty choice also falls back, rather than reading zero",
  sumBalances(resolveEmergencyAccounts(cash, [])) === 15000);
check("no connected accounts is zero, not a crash",
  sumBalances(resolveEmergencyAccounts([], null)) === 0 &&
  sumBalances(resolveEmergencyAccounts([], ["a1"])) === 0);

// ── How it is described
check("one account is named on its own",
  describeAccounts([cash[0]]) === "Capital One 360 Performance Savings");
check("two are joined with and",
  describeAccounts(byDefault) === "Capital One 360 Performance Savings and Fidelity Cash Management",
  describeAccounts(byDefault));
check("three read as a list",
  describeAccounts(cash.slice(0, 3)).includes(", ") && describeAccounts(cash.slice(0, 3)).includes(" and "));
check("nothing chosen says nothing", describeAccounts([]) === "");

let failed = 0;
for (const c of checks) {
  console.log(`${c.ok ? "✓" : "✗"} ${c.name}${c.detail ? `  — ${c.detail}` : ""}`);
  if (!c.ok) failed++;
}
console.log(failed ? `\nEmergency fund account verification failed: ${failed} check(s).` : "\nEmergency fund account verification passed");
process.exit(failed ? 1 : 0);
