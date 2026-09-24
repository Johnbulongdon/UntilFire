#!/usr/bin/env node
/**
 * Account balances in dollars, and how old they are.
 *
 * Every dashboard total used to add connected balances as if they were all
 * dollars — HK$20,000 counted as $20,000. It went unseen only because the
 * multi-currency accounts in use held nothing. These checks pin the
 * conversion, and the refusal to guess when a currency has no rate.
 *
 * Run: npm run test:account-currency
 */
import { accountInUSD, daysSinceSync, STALE_AFTER_DAYS } from "../lib/account-currency.ts";
import { toCashAccounts, resolveEmergencyAccounts, sumBalances } from "../lib/emergency-fund-accounts.ts";
import { measuredEmergencyFund } from "../lib/contribution-ladder.ts";

const checks = [];
const check = (name, ok, detail = "") => checks.push({ name, ok, detail });
// Units of each currency per US dollar — the dashboard's convention.
const RATES = { HKD: 7.8, CNY: 7.1, JPY: 150, EUR: 0.92 };
const acct = (id, name, subtype, balance, ccy, updated = "2026-09-23T10:00:00Z") =>
  ({ id, name, type: "depository", subtype, balance_current: balance, balance_available: balance,
     iso_currency_code: ccy, mask: null, apy: null, updated_at: updated });

// ── Conversion
const hkd = accountInUSD(acct("h", "HKD account", "checking", 20000, "HKD"), RATES);
check("a foreign balance is converted, not counted at face value",
  Math.abs(hkd.balance_current - 20000 / 7.8) < 1e-9, `HK$20,000 → $${hkd.balance_current.toFixed(2)}`);
check("the original is kept for display", hkd.native_balance_current === 20000 && hkd.native_currency === "HKD");
check("the converted object says it is in dollars now", hkd.iso_currency_code === "USD" && hkd.converted);
check("available balance converts too", Math.abs(hkd.balance_available - 20000 / 7.8) < 1e-9);
check("a dollar balance passes through untouched",
  accountInUSD(acct("u", "USD", "checking", 36.48, "USD"), RATES).balance_current === 36.48);
check("a missing currency code is treated as dollars",
  accountInUSD({ ...acct("x", "x", "checking", 50, null) }, RATES).balance_current === 50);
check("lower-case codes still convert",
  Math.abs(accountInUSD(acct("c", "c", "checking", 710, "cny"), RATES).balance_current - 100) < 1e-9);

const krw = accountInUSD(acct("k", "KRW account", "checking", 1_000_000, "KRW"), RATES);
check("a currency with no rate is NOT counted as dollars",
  krw.balance_current === 0 && krw.converted === false,
  "the shared toUSD returns the amount unchanged here — ₩1,000,000 would read as $1,000,000");
check("and its real balance is still kept, so it can be shown", krw.native_balance_current === 1_000_000);
check("a zero or garbage rate is treated as no rate",
  accountInUSD(acct("z", "z", "checking", 100, "HKD"), { HKD: 0 }).converted === false &&
  accountInUSD(acct("z", "z", "checking", 100, "HKD"), { HKD: NaN }).converted === false);
check("a null balance stays null rather than becoming zero",
  accountInUSD({ ...acct("n", "n", "checking", null, "HKD") }, RATES).balance_current === null);

// ── Into the emergency fund and the cash the forecast starts from
{
  const accounts = [
    acct("s", "Savings", "savings", 1543.72, "USD"),
    acct("m", "Main Checking", "checking", 2.82, "USD"),
    acct("h", "HKD account", "checking", 20000, "HKD"),
    acct("k", "KRW account", "checking", 1_000_000, "KRW"),
  ].map((a) => accountInUSD(a, RATES));
  const cash = toCashAccounts(accounts);
  const byId = Object.fromEntries(cash.map((c) => [c.id, c]));
  check("cash accounts carry their currency and original balance",
    byId.h.currency === "HKD" && byId.h.nativeBalance === 20000 && Math.abs(byId.h.balance - 2564.1) < 0.1);
  check("an unconvertible account contributes nothing to a total",
    byId.k.balance === 0 && byId.k.converted === false);

  const fund = measuredEmergencyFund(["s", "m", "h"], { cashAccounts: cash });
  check("ticking checking accounts, including a foreign one, adds their DOLLAR value to the fund",
    Math.abs(fund.balance - (1543.72 + 2.82 + 20000 / 7.8)) < 1e-6, fund.balance.toFixed(2));
  check("with nothing ticked the fund is still savings only",
    measuredEmergencyFund(null, { cashAccounts: cash }).balance === 1543.72);
  const outside = cash.filter((c) => !resolveEmergencyAccounts(cash, ["s", "m"]).some((e) => e.id === c.id));
  check("what is not ticked is what the forecast may offer up — in dollars",
    Math.abs(sumBalances(outside) - 20000 / 7.8) < 1e-6, sumBalances(outside).toFixed(2));
}

// ── How old a balance is
{
  const now = new Date("2026-09-24T12:00:00Z");
  check("a balance from four months ago is flagged as stale",
    daysSinceSync("2026-06-02T08:00:00Z", now) > STALE_AFTER_DAYS, `${daysSinceSync("2026-06-02T08:00:00Z", now)} days`);
  check("yesterday's is not", daysSinceSync("2026-09-23T10:00:00Z", now) <= STALE_AFTER_DAYS);
  check("never synced is unknown, not zero days",
    daysSinceSync(null, now) === null && daysSinceSync("garbage", now) === null);
  check("a timestamp a little in the future does not go negative",
    daysSinceSync("2026-09-25T00:00:00Z", now) === 0);
}

let failed = 0;
for (const c of checks) {
  console.log(`${c.ok ? "✓" : "✗"} ${c.name}${c.detail ? `  — ${c.detail}` : ""}`);
  if (!c.ok) failed++;
}
console.log(failed ? `\nAccount currency verification failed: ${failed} check(s).` : "\nAccount currency verification passed");
process.exit(failed ? 1 : 0);
