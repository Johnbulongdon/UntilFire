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
  monthlyAllowance, perDay, expandForMonth, needsAllowance,
} from "../lib/cashflow-forecast.ts";
import { sameMerchant } from "../lib/recurring-detect.ts";

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

// ── A nearly empty checking account and a stale salary row
{
  // The shape behind a small figure nobody could explain: little cash, one
  // small monthly bill, and a one-off salary that was due and never marked
  // received.
  const today = d(2026, 9, 24);
  const items = [
    { description: "Phone", amountUSD: 8, type: "expense", dueDate: "2026-09-28", recurrence: "monthly" },
    { description: "Salary", amountUSD: 4000, type: "income", dueDate: "2026-09-15", recurrence: "none" },
  ];
  const f = buildForecast(60, items, { cadence: "monthly", anchorDay: 1 }, today);
  check("the ledger reproduces the figure line by line",
    f.days.map((x) => `${x.iso}:${x.balance.toFixed(2)}`).join(" ") ===
    "2026-09-24:60.00 2026-09-28:52.00 2026-10-01:52.00 2026-10-28:44.00",
    f.days.map((x) => `${x.iso}:${x.balance.toFixed(2)}`).join(" "));
  check("October's phone bill now counts, because it falls before the next cycle",
    Math.abs(f.safeToContribute - 44) < 0.005, f.safeToContribute.toFixed(2));
  check("the stale Salary is listed as not counted, not silently dropped",
    f.uncounted.length === 1 && f.uncounted[0].description === "Salary");

  // Same account, salary made monthly and payday moved to match it.
  const fixed = buildForecast(60,
    [items[0], { ...items[1], recurrence: "monthly" }], { cadence: "monthly", anchorDay: 15 }, today);
  check("recording the salary as monthly and contributing on payday changes the answer",
    Math.abs(fixed.safeToContribute - 4044) < 0.005 && fixed.income === 4000,
    `${fixed.safeToContribute.toFixed(2)} — and every dollar of it is on a line of the ledger`);
}

// ── Day-to-day spending from the budget
{
  const bills = [
    { description: "Rent", amountUSD: 1500, type: "expense", dueDate: "2026-10-01", recurrence: "monthly" },
    { description: "Gym", amountUSD: 30, type: "expense", dueDate: "2026-10-03", recurrence: "weekly" },
    { description: "Laptop", amountUSD: 900, type: "expense", dueDate: "2026-10-10", recurrence: "none" },
  ];
  const weeklyAsMonthly = 30 * 4.33;
  check("the allowance is the budget less the repeating bills already listed",
    Math.abs(monthlyAllowance(2500, bills) - (2500 - 1500 - weeklyAsMonthly)) < 0.01,
    monthlyAllowance(2500, bills).toFixed(2));
  check("a one-off does not shrink every month's allowance",
    monthlyAllowance(2500, bills) === monthlyAllowance(2500, bills.slice(0, 2)));
  check("listed bills above the budget leave no allowance, never a negative",
    monthlyAllowance(1000, bills) === 0 && monthlyAllowance(undefined, []) === 0);
  check("a monthly allowance becomes an average-month daily rate",
    Math.abs(perDay(365.25) - 12) < 1e-9);

  const today = d(2026, 9, 24);
  const sched = { cadence: "monthly", anchorDay: 15 };
  const items = [
    { description: "Salary", amountUSD: 3000, type: "income", dueDate: "2026-10-15", recurrence: "monthly" },
    { description: "Rent", amountUSD: 1500, type: "expense", dueDate: "2026-11-01", recurrence: "monthly" },
  ];
  const plain = buildForecast(2000, items, sched, today);
  const withSpend = buildForecast(2000, items, sched, today, 20);

  let adds = true;
  let prev = withSpend.opening;
  for (const day of withSpend.days) {
    const moved = day.events.filter((e) => e.counted).reduce((s, e) => s + e.amount, 0);
    if (Math.abs(prev + moved - day.balance) > 1e-6) adds = false;
    prev = day.balance;
  }
  check("every line still accounts exactly for the change in balance", adds,
    "an allowance folded silently into balances would make rows not add up");
  check("the allowance appears as its own labelled lines, with the days they cover",
    withSpend.days.some((x) => x.events.some((e) => e.estimate?.days > 1 && e.description === "Day-to-day spending")));
  check("the low point moves to the end of the cycle, where spending has run longest",
    withSpend.lowest.iso === "2026-11-14", withSpend.lowest.iso);
  check("and the safe figure drops by exactly the spending up to that point",
    Math.abs((plain.safeToContribute - withSpend.safeToContribute) - 20 * 51) < 1e-6,
    `${plain.safeToContribute} → ${withSpend.safeToContribute.toFixed(2)} over 51 days`);
  check("with no allowance the forecast is unchanged", plain.dailyAllowance === 0 &&
    !plain.days.some((x) => x.events.some((e) => e.estimate)));
}

// ── One calendar month, for the month view in Expected
{
  const items = [
    // Rent's row has rolled to November after October was ticked paid.
    { description: "Rent", amountUSD: 1500, type: "expense", dueDate: "2026-11-01", recurrence: "monthly" },
    { description: "Salary", amountUSD: 3000, type: "income", dueDate: "2026-10-15", recurrence: "monthly" },
    { description: "Phone", amountUSD: 8, type: "expense", dueDate: "2026-10-28", recurrence: "monthly" },
    { description: "Weekly shop", amountUSD: 80, type: "expense", dueDate: "2026-10-03", recurrence: "weekly" },
    { description: "Flight", amountUSD: 400, type: "expense", dueDate: "2026-10-20", recurrence: "none", completed: true },
    { description: "Last month's bonus", amountUSD: 500, type: "income", dueDate: "2026-09-30", recurrence: "none" },
  ];
  const oct = expandForMonth(items, 2026, 9);
  check("a repeat already paid and rolled forward still appears in its month",
    oct.some((l) => l.description === "Rent" && l.iso === "2026-10-01" && l.paid),
    "rent on the 1st is part of October whether or not it has been ticked");
  check("the occurrence at the row's current due date is not marked paid",
    oct.find((l) => l.description === "Salary").paid === false);
  check("a weekly item appears every week of the month",
    oct.filter((l) => l.description === "Weekly shop").map((l) => l.iso).join(",") ===
    "2026-10-03,2026-10-10,2026-10-17,2026-10-24,2026-10-31");
  check("a ticked one-off in the month is shown as paid",
    oct.find((l) => l.description === "Flight")?.paid === true);
  check("items from other months stay out", !oct.some((l) => l.description === "Last month's bonus"));
  check("the month is in date order", oct.map((l) => l.iso).join() === [...oct.map((l) => l.iso)].sort().join());
  check("a month-end anchor holds in a short month",
    expandForMonth([{ description: "x", amountUSD: 1, type: "expense", dueDate: "2026-01-31", recurrence: "monthly" }], 2026, 1)[0].iso === "2026-02-28");

  // The month as a budget: dated lines plus the allowance give the same
  // monthly surplus the category budget does, now with dates on it.
  const budgetSpending = 3200;
  const dated = [
    { description: "Rent A", amountUSD: 1400, type: "expense", dueDate: "2026-10-01", recurrence: "monthly" },
    { description: "Rent B", amountUSD: 500, type: "expense", dueDate: "2026-10-07", recurrence: "monthly" },
    { description: "Phone", amountUSD: 8, type: "expense", dueDate: "2026-10-28", recurrence: "monthly" },
    { description: "Salary", amountUSD: 4000, type: "income", dueDate: "2026-10-15", recurrence: "monthly" },
  ];
  const lines = expandForMonth(dated, 2026, 9);
  const out = -lines.filter((l) => l.amount < 0).reduce((s, l) => s + l.amount, 0) + monthlyAllowance(budgetSpending, dated);
  const inc = lines.filter((l) => l.amount > 0).reduce((s, l) => s + l.amount, 0);
  check("dated bills plus the allowance equal the budget's spending — nothing counted twice",
    Math.abs(out - budgetSpending) < 1e-6, out.toFixed(2));
  check("so the month's surplus matches the budget's", Math.abs(inc - out - 800) < 1e-6, (inc - out).toFixed(2));
}

// ── Matching names, in any script
check("a Chinese name matches itself", sameMerchant("中国移动", "中国移动"),
  "the old a–z tokenizer turned it into nothing, so it matched nothing");
check("two different Chinese names do not match", !sameMerchant("中国移动", "中国银行"));
check("a two-character name is kept, with or without a repeated label", sameMerchant("张三(张三)", "张三"));
check("Latin names match as before",
  sameMerchant("Netflix", "NETFLIX.COM") && sameMerchant("Spotify Family", "Spotify UK") && !sameMerchant("Shell", "BP"));
check("accents no longer stop a match", sameMerchant("Café Nero", "CAFE NERO LONDON"));

// ── Day-to-day needs from last month's tagged spending
{
  const CNY = 7.1;
  const t = (description, category, cny) => ({ description, category, amountUSD: cny / CNY });
  // A month shaped like a real one: rent paid as two transfers to a person,
  // a phone bill, and the day-to-day needs the estimate is actually for.
  const august = [
    t("Landlord transfer", "housing", 100), t("Landlord transfer", "housing", 2900),
    t("中国移动", "utilities", 60),
    t("Vet clinic", "pets", 1200), t("Market", "food", 800), t("Pharmacy", "healthcare", 500),
  ];
  const expected = [
    { description: "Rent", amountUSD: 3000 / CNY, type: "expense", dueDate: "2026-10-07", recurrence: "monthly", category: null },
    { description: "中国移动", amountUSD: 8, type: "expense", dueDate: "2026-09-28", recurrence: "monthly", category: "utilities" },
    { description: "Other rent", amountUSD: 1200, type: "expense", dueDate: "2026-10-01", recurrence: "monthly", category: null },
  ];
  const a = needsAllowance(august, expected, 2026, 7);
  const cats = (list) => list.map((x) => x.category).sort().join(",");
  check("the phone bill is recognised by name and left out", a.excluded.some((e) => e.category === "utilities" && e.because.includes("matches")));
  check("rent paid as a split transfer to a person is recognised by its amount",
    a.excluded.some((e) => e.category === "housing" && e.because.includes("same amount as Rent")),
    JSON.stringify(a.excluded.map((e) => [e.category, e.because])));
  check("what is left is the day-to-day needs", cats(a.counted) === "food,healthcare,pets", cats(a.counted));
  check("per day is last month's total over that month's days",
    a.days === 31 && Math.abs(a.perDay - (1200 + 800 + 500) / CNY / 31) < 1e-9,
    `$${a.perDay.toFixed(2)}/day from ${a.monthLabel}`);
  check("a bill with no matching spending claims nothing",
    !a.excluded.some((e) => e.because.includes("Other rent")));

  // The cautious direction when nothing matches: counted, not dropped.
  const unmatched = needsAllowance([t("Landlord transfer", "housing", 3000)], [], 2026, 7);
  check("with nothing on the Expected list to match, a need is counted — never silently dropped",
    unmatched.counted.length === 1 && unmatched.monthly > 0);
  check("a category total far from any bill is not treated as that bill",
    needsAllowance([t("Landlord transfer", "housing", 2000)], expected.slice(0, 1), 2026, 7).counted.length === 1);
  check("a category named on a repeating bill is left out whatever its amount",
    needsAllowance([t("Anything", "utilities", 999)], expected, 2026, 7).counted.length === 0);
  check("one bill claims at most one category",
    needsAllowance([t("A", "housing", 3000), t("B", "pets", 3000)], expected.slice(0, 1), 2026, 7).counted.length === 1);
  check("a one-off on the list matches by name but does not claim a whole category",
    needsAllowance([t("Dentist", "healthcare", 500), t("Pharmacy", "healthcare", 100)],
      [{ description: "Dentist", amountUSD: 70, type: "expense", dueDate: "2026-10-05", recurrence: "none", category: "healthcare" }],
      2026, 7).counted.map((c) => Math.round(c.amount * CNY)).join() === "100");
  check("no tagged needs gives no estimate, rather than an estimate of zero",
    needsAllowance([], expected, 2026, 7) === null);
}

let failed = 0;
for (const c of checks) {
  console.log(`${c.ok ? "✓" : "✗"} ${c.name}${c.detail ? `  — ${c.detail}` : ""}`);
  if (!c.ok) failed++;
}
console.log(failed ? `\nForecast verification failed in ${tz}: ${failed} check(s).` : `\nForecast verification passed in ${tz}`);
process.exit(failed ? 1 : 0);
