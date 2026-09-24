#!/usr/bin/env node
/**
 * The day-by-day forecast behind the contribution figure.
 *
 * The figure is only trustworthy if every line of the ledger under it is, so
 * each way a line can go quietly wrong has a check: a monthly repeat that
 * walks through the calendar, a date shifted a day by UTC conversion, income
 * counted twice, a bill the day after the contribution being ignored.
 *
 * Runs twice, in UTC+8 and UTC-7 (see package.json): the date bugs this
 * guards against only exist away from Greenwich.
 *
 * Run: npm run test:cashflow-forecast
 */
import {
  addRecurrence, isoDay, expandExpected, buildForecast,
} from "../lib/cashflow-forecast.ts";

const checks = [];
const check = (name, ok, detail = "") => checks.push({ name, ok, detail });
const d = (y, m, day) => new Date(y, m - 1, day);
const tz = process.env.TZ || "system";

// ── Local dates, never UTC
check(`a local date formats as itself (${tz})`,
  isoDay(d(2026, 10, 28)) === "2026-10-28" && isoDay(d(2026, 1, 1)) === "2026-01-01");
{
  // The bug being fixed: local midnight → toISOString is the previous day in
  // UTC+8. isoDay must not reproduce it.
  const buggy = new Date("2026-09-28T00:00:00"); buggy.setDate(buggy.getDate() + 30);
  check("rolling a monthly bill from the 28th lands on the 28th, not the 27th",
    isoDay(addRecurrence(d(2026, 9, 28), "monthly")) === "2026-10-28",
    `old method gave ${buggy.toISOString().slice(0, 10)} in ${tz}`);
}

// ── Repeats are calendar-anchored
check("monthly is a calendar month, not 30 days",
  isoDay(addRecurrence(d(2026, 1, 1), "monthly", 1)) === "2026-02-01" &&
  isoDay(addRecurrence(d(2026, 1, 1), "monthly", 12)) === "2027-01-01",
  "30-day months walk the 1st to the 31st, then the 30th");
check("the 31st survives short months instead of being lost to them",
  isoDay(addRecurrence(d(2026, 1, 31), "monthly", 1)) === "2026-02-28" &&
  isoDay(addRecurrence(d(2026, 1, 31), "monthly", 2)) === "2026-03-31" &&
  isoDay(addRecurrence(d(2026, 1, 31), "monthly", 3)) === "2026-04-30",
  [1, 2, 3].map((n) => isoDay(addRecurrence(d(2026, 1, 31), "monthly", n))).join(" "));
check("weekly and fortnightly are 7 and 14 days",
  isoDay(addRecurrence(d(2026, 9, 24), "weekly")) === "2026-10-01" &&
  isoDay(addRecurrence(d(2026, 9, 24), "biweekly")) === "2026-10-08");
check("quarterly is three calendar months; yearly keeps a leap day sensible",
  isoDay(addRecurrence(d(2026, 11, 30), "quarterly")) === "2027-02-28" &&
  isoDay(addRecurrence(d(2028, 2, 29), "annual")) === "2029-02-28");

// ── Expanding expected payments
{
  const today = d(2026, 9, 24);
  const to = d(2026, 10, 31);
  const ev = (items) => expandExpected(items, today, to);
  const item = (o) => ({ description: "x", amountUSD: 100, type: "expense", dueDate: "2026-10-05", recurrence: "none", ...o });

  check("a one-off inside the window appears once, signed",
    ev([item()]).length === 1 && ev([item()])[0].amount === -100);
  check("income is positive", ev([item({ type: "income" })])[0].amount === 100);
  check("a monthly repeat appears every month in the window",
    ev([item({ recurrence: "monthly", dueDate: "2026-09-28" })]).map((e) => e.iso).join(",") === "2026-09-28,2026-10-28");
  check("an item after the window does not appear", ev([item({ dueDate: "2026-11-05" })]).length === 0);

  const overdueBill = ev([item({ dueDate: "2026-09-01" })]);
  check("an overdue bill is counted, dated today, and flagged",
    overdueBill.length === 1 && overdueBill[0].iso === "2026-09-24" && overdueBill[0].overdue && overdueBill[0].counted);
  const overdueIncome = ev([item({ type: "income", dueDate: "2026-09-15" })]);
  check("overdue income is shown but NOT counted",
    overdueIncome.length === 1 && overdueIncome[0].overdue && !overdueIncome[0].counted,
    "it either already arrived or cannot be relied on — counting it risks the same money twice");

  const overdueMonthly = ev([item({ recurrence: "monthly", dueDate: "2026-09-01" })]);
  check("an overdue repeat is one overdue entry plus its future occurrences",
    overdueMonthly.map((e) => `${e.iso}${e.overdue ? "!" : ""}`).join(",") === "2026-09-24!,2026-10-01",
    overdueMonthly.map((e) => `${e.iso}${e.overdue ? "!" : ""}`).join(","));
  const overdueWeekly = ev([item({ recurrence: "weekly", dueDate: "2026-09-03" })]);
  check("missed weekly repeats are not piled up as extra debts",
    overdueWeekly.filter((e) => e.overdue).length === 1,
    `${overdueWeekly.filter((e) => e.overdue).length} overdue`);
  check("junk rows are skipped rather than poisoning the sums",
    ev([item({ amountUSD: NaN }), item({ amountUSD: -5 }), item({ dueDate: "soon" })]).length === 0);
  check("same-day income sorts ahead of same-day bills",
    ev([item({ dueDate: "2026-10-01" }), item({ type: "income", amountUSD: 3000, dueDate: "2026-10-01" })])[0].type === "income",
    "the other order shows a dip below zero that never happens");
}

// ── The safe amount is the low point of the cycle, not the day's balance
{
  const today = d(2026, 9, 24);
  const sched = { cadence: "monthly", anchorDay: 15 };            // payday the 15th
  const salary = { description: "Salary", amountUSD: 3000, type: "income", dueDate: "2026-10-15", recurrence: "monthly" };
  const rent = { description: "Rent", amountUSD: 1500, type: "expense", dueDate: "2026-11-01", recurrence: "monthly" };

  const f = buildForecast(100, [salary, rent], sched, today);
  check("contribution on payday, next cycle a month later",
    f.contributionIso === "2026-10-15" && f.nextCycleIso === "2026-11-15");
  check("rent due after payday is held back, not invested",
    f.safeToContribute === 1600 && f.lowest.iso === "2026-11-01",
    `safe ${f.safeToContribute} at ${f.lowest.iso} — 100 + 3000 − 1500`);
  check("so the safe amount is less than the balance on the day",
    f.days.find((x) => x.iso === "2026-10-15").balance === 3100);

  const early = buildForecast(100,
    [salary, { ...rent, dueDate: "2026-10-01" }], sched, today);
  check("rent due before payday that the balance cannot cover is flagged as a shortfall",
    early.shortBefore?.iso === "2026-10-01" && early.shortBefore.balance === -1400,
    JSON.stringify(early.shortBefore));
  // Rent is monthly, so November's falls inside this cycle too:
  // 100 − 1500 (Oct 1) + 3000 (Oct 15) − 1500 (Nov 1) = 100.
  check("the paycheck repays the shortfall AND next month's rent is held back",
    early.safeToContribute === 100 && early.lowest.iso === "2026-11-01",
    `${early.safeToContribute} at ${early.lowest.iso}`);

  check("owing more than will come in contributes nothing, never a negative",
    buildForecast(0, [{ ...rent, dueDate: "2026-10-20" }], sched, today).safeToContribute === 0);
  check("the day's income belongs to its own cycle, not the one before",
    !buildForecast(0, [salary], sched, today).days.some((x) => x.iso === "2026-11-15"));
}

// ── A real account, as it stood when the $34 appeared
{
  // $40.91 across three checking accounts; China Mobile monthly on the 28th;
  // a one-off Salary dated the 15th, never marked received.
  const today = d(2026, 9, 24);
  const items = [
    { description: "China Mobile", amountUSD: 6.88, type: "expense", dueDate: "2026-09-28", recurrence: "monthly" },
    { description: "Salary", amountUSD: 3000, type: "income", dueDate: "2026-09-15", recurrence: "none" },
  ];
  const f = buildForecast(40.91, items, { cadence: "monthly", anchorDay: 1 }, today);
  check("the ledger explains the figure line by line",
    f.days.map((x) => `${x.iso}:${x.balance.toFixed(2)}`).join(" ") ===
    "2026-09-24:40.91 2026-09-28:34.03 2026-10-01:34.03 2026-10-28:27.15",
    f.days.map((x) => `${x.iso}:${x.balance.toFixed(2)}`).join(" "));
  check("October's phone bill now counts, because it falls before the next cycle",
    Math.abs(f.safeToContribute - 27.15) < 0.005, f.safeToContribute.toFixed(2));
  check("the stale Salary is listed as not counted, not silently dropped",
    f.uncounted.length === 1 && f.uncounted[0].description === "Salary");

  // Same account, salary made monthly and payday moved to match it.
  const fixed = buildForecast(40.91,
    [items[0], { ...items[1], recurrence: "monthly" }], { cadence: "monthly", anchorDay: 15 }, today);
  check("recording the salary as monthly and contributing on payday changes the answer",
    Math.abs(fixed.safeToContribute - 3027.15) < 0.005 && fixed.income === 3000,
    `${fixed.safeToContribute.toFixed(2)} — and every dollar of it is on a line of the ledger`);
}

let failed = 0;
for (const c of checks) {
  console.log(`${c.ok ? "✓" : "✗"} ${c.name}${c.detail ? `  — ${c.detail}` : ""}`);
  if (!c.ok) failed++;
}
console.log(failed ? `\nForecast verification failed in ${tz}: ${failed} check(s).` : `\nForecast verification passed in ${tz}`);
process.exit(failed ? 1 : 0);
