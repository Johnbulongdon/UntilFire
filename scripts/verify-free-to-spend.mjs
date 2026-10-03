#!/usr/bin/env node
/**
 * Free to spend until payday.
 *
 * The number tells someone whether they can buy something without touching
 * rent, so each way it can be quietly wrong has a check: the wrong payday
 * for weekly or two-weekly pay, a bill on payday counted twice, an overdue
 * bill forgotten, savings or a credit card counted as spendable cash.
 *
 * Runs in UTC+8 and UTC-7 (see package.json): date bugs hide near Greenwich.
 *
 * Run: npm run test:free-to-spend
 */
import { freeToSpend, nextPayday, isCounted } from "../lib/free-to-spend.ts";

const checks = [];
const check = (name, ok, detail = "") => checks.push({ name, ok, detail });
const d = (y, m, day) => new Date(y, m - 1, day);
const tz = process.env.TZ || "system";

const checking = { id: "chk", name: "Everyday", type: "depository", subtype: "checking", balanceUSD: 2400 };
const savings = { id: "sav", name: "Savings", type: "depository", subtype: "savings", balanceUSD: 9000 };
const visa = { id: "visa", name: "Visa", type: "credit", subtype: "credit card", balanceUSD: 640 };
const pay = (dueDate, recurrence, amountUSD = 2000) => ({ description: "Paycheck", amountUSD, type: "income", dueDate, recurrence });
const bill = (description, dueDate, amountUSD, recurrence = "monthly") => ({ description, amountUSD, type: "expense", dueDate, recurrence });
const bills = [bill("Rent", "2026-10-01", 1450), bill("Car loan", "2026-10-05", 320), bill("Visa", "2026-10-08", 200)];
const budget = [
  { key: "groceries", label: "Groceries", budget: 450, left: 180 },
  { key: "eating", label: "Eating out", budget: 200, left: 60 },
  { key: "fun", label: "Fun", budget: 250, left: 172 },
];

// ── Payday, for every pay schedule
{
  const today = d(2026, 10, 1);
  check(`weekly pay: payday is the next one, not today (${tz})`,
    nextPayday([pay("2026-10-01", "weekly")], today).iso === "2026-10-08");
  check("every two weeks: the next occurrence from an older anchor",
    nextPayday([pay("2026-09-18", "biweekly")], today).iso === "2026-10-02");
  check("monthly pay on the 10th",
    nextPayday([pay("2026-09-10", "monthly")], today).iso === "2026-10-10");
  check("two paychecks: the sooner one ends the window",
    nextPayday([pay("2026-10-15", "monthly"), pay("2026-10-03", "biweekly", 800)], today).iso === "2026-10-03");
  const none = nextPayday([], today);
  check("no paycheck: the end of the month, labelled as such", none.iso === "2026-10-31" && none.source === "month-end");
  check("no paycheck on the last day: the end of next month", nextPayday([], d(2026, 10, 31)).iso === "2026-11-30");
  check("a one-off income is not a payday", nextPayday([pay("2026-10-05", "none")], today).source === "month-end");
}

// ── The worked example: $2,400, three bills before Friday 10th
const r = freeToSpend({ today: d(2026, 10, 1), accounts: [checking, savings, visa], expected: [pay("2026-09-10", "monthly"), ...bills], budget });
check("cash side: balance less the bills before payday", r.cash.free === 430 && r.cash.bills.length === 3, JSON.stringify(r.cash?.free));
check("budget side: sum of what is left", r.budget.left === 412);
check("the lower side wins and says which", r.free === 412 && r.limitedBy === "budget");
check("nine days to Friday the 10th, $45 a day", r.days === 9 && r.perDay === 45, `${r.days} ${r.perDay}`);
check("the tightest category is named", r.budget.tightest.key === "eating");
check("the credit card is context, not cash", r.cards.length === 1 && r.cards[0].owedUSD === 640 && r.cash.balance === 2400);

// ── What counts as cash
check("savings off by default, on when toggled", !isCounted(savings) && isCounted(savings, { sav: true }));
check("checking on by default, off when toggled", isCounted(checking) && !isCounted(checking, { chk: false }));
check("a credit card never counts, even toggled on", !isCounted(visa, { visa: true }));

// ── Bills at the edges of the window
{
  const onPayday = freeToSpend({ today: d(2026, 10, 1), accounts: [checking], expected: [pay("2026-10-10", "monthly"), bill("Gym", "2026-10-10", 50)] });
  check("a bill due on payday is left out (pay lands first)", onPayday.cash.free === 2400);
  const overdue = freeToSpend({ today: d(2026, 10, 1), accounts: [checking], expected: [pay("2026-10-10", "monthly"), bill("Phone", "2026-09-28", 60)] });
  check("an overdue bill not ticked off still counts", overdue.cash.free === 2340);
  const weekly = freeToSpend({ today: d(2026, 10, 1), accounts: [checking], expected: [pay("2026-10-03", "weekly"), ...bills] });
  check("weekly pay: only bills before Saturday count", weekly.cash.free === 950 && weekly.days === 2, `${weekly.cash.free} ${weekly.days}`);
}

// ── Missing data
{
  const noBank = freeToSpend({ today: d(2026, 10, 1), accounts: [], expected: bills, budget });
  check("no bank linked: the budget alone", noBank.cash === null && noBank.free === 412 && noBank.limitedBy === "budget");
  const noBudget = freeToSpend({ today: d(2026, 10, 1), accounts: [checking], expected: [pay("2026-10-10", "monthly"), ...bills] });
  check("no budget: the cash alone", noBudget.budget === null && noBudget.limitedBy === "cash" && noBudget.free === 430);
  check("neither: nothing to show", freeToSpend({ today: d(2026, 10, 1), accounts: [], expected: [] }) === null);
  const short = freeToSpend({ today: d(2026, 10, 1), accounts: [{ ...checking, balanceUSD: 1500 }], expected: [pay("2026-10-10", "monthly"), ...bills] });
  check("bills over the balance: negative, and no per-day figure", short.free === -470 && short.perDay === 0);
}

const failed = checks.filter((c) => !c.ok);
for (const c of checks) console.log(`${c.ok ? "✓" : "✗"} ${c.name}${c.ok || !c.detail ? "" : ` (${c.detail})`}`);
console.log(`\n${checks.length - failed.length}/${checks.length} checks passed`);
if (failed.length) process.exit(1);
