#!/usr/bin/env node
/**
 * When the next contribution lands, and what is free by then.
 *
 * Date arithmetic fails quietly and in ways nobody notices until a specific
 * month: an anchor on the 31st in February, a contribution due today reading
 * as overdue, an ISO date parsed as UTC and landing a day early for anyone
 * west of Greenwich. Each of those is one check below.
 *
 * Run: npm run test:contribution-schedule
 */
import {
  nextContributionDate, daysUntil, parseIsoDate,
  countdownLabel, daysInMonth, startOfDay,
} from "../lib/contribution-schedule.ts";

const checks = [];
const check = (name, ok, detail = "") => checks.push({ name, ok, detail });
const d = (y, m, day) => new Date(y, m - 1, day);
const iso = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

// ── Monthly
check("a monthly anchor later this month is this month",
  iso(nextContributionDate({ cadence: "monthly", anchorDay: 25 }, d(2026, 3, 10))) === "2026-03-25",
  iso(nextContributionDate({ cadence: "monthly", anchorDay: 25 }, d(2026, 3, 10))));
check("once past, it rolls to next month",
  iso(nextContributionDate({ cadence: "monthly", anchorDay: 5 }, d(2026, 3, 10))) === "2026-04-05");
check("payday today is due today, not in a month",
  iso(nextContributionDate({ cadence: "monthly", anchorDay: 10 }, d(2026, 3, 10))) === "2026-03-10",
  "someone opening the app on payday should be told to act now");
check("it rolls across a year boundary",
  iso(nextContributionDate({ cadence: "monthly", anchorDay: 5 }, d(2026, 12, 20))) === "2027-01-05");

// The month-end case, which is the one that breaks in production in February.
check("the 31st in a 30-day month is the 30th",
  iso(nextContributionDate({ cadence: "monthly", anchorDay: 31 }, d(2026, 4, 15))) === "2026-04-30",
  iso(nextContributionDate({ cadence: "monthly", anchorDay: 31 }, d(2026, 4, 15))));
check("the 31st in February is the last day of February, not March",
  iso(nextContributionDate({ cadence: "monthly", anchorDay: 31 }, d(2026, 2, 10))) === "2026-02-28",
  iso(nextContributionDate({ cadence: "monthly", anchorDay: 31 }, d(2026, 2, 10))));
check("and a leap February gets the 29th",
  iso(nextContributionDate({ cadence: "monthly", anchorDay: 31 }, d(2028, 2, 10))) === "2028-02-29" &&
  daysInMonth(2028, 1) === 29);
check("an out-of-range anchor is clamped, not crashed",
  iso(nextContributionDate({ cadence: "monthly", anchorDay: 99 }, d(2026, 3, 10))) === "2026-03-31" &&
  iso(nextContributionDate({ cadence: "monthly", anchorDay: 0 }, d(2026, 3, 10))) === "2026-04-01");

// ── Weekly
check("a weekly anchor later this week is this week",
  iso(nextContributionDate({ cadence: "weekly", anchorDay: 5 }, d(2026, 3, 11))) === "2026-03-13",
  `${iso(d(2026, 3, 11))} is a ${d(2026, 3, 11).getDay()}`);
// 2026-03-11 is a Wednesday; the next Monday is five days on.
check("once past, it rolls into next week",
  iso(nextContributionDate({ cadence: "weekly", anchorDay: 1 }, d(2026, 3, 11))) === "2026-03-16",
  iso(nextContributionDate({ cadence: "weekly", anchorDay: 1 }, d(2026, 3, 11))));
check("payday today is due today, weekly too",
  daysUntil(nextContributionDate({ cadence: "weekly", anchorDay: d(2026, 3, 11).getDay() }, d(2026, 3, 11)), d(2026, 3, 11)) === 0);
check("a weekly anchor is never more than 6 days out",
  [0, 1, 2, 3, 4, 5, 6].every((day) =>
    [0, 1, 2, 3, 4, 5, 6].every((offset) => {
      const from = d(2026, 3, 8 + offset);
      const n = daysUntil(nextContributionDate({ cadence: "weekly", anchorDay: day }, from), from);
      return n >= 0 && n <= 6;
    })));

// ── Counting days
check("today is zero days away", daysUntil(d(2026, 3, 10), d(2026, 3, 10)) === 0);
check("tomorrow is one", daysUntil(d(2026, 3, 11), d(2026, 3, 10)) === 1);
check("the countdown reads in words",
  countdownLabel(0) === "today" && countdownLabel(1) === "tomorrow" && countdownLabel(5) === "in 5 days");
check("a day count survives a daylight-saving boundary",
  daysUntil(d(2026, 3, 30), d(2026, 3, 27)) === 3,
  "23- and 25-hour days must not round to 2 or 4");

// ── Dates out of the database
check("an ISO date is read as a local day, not UTC midnight",
  iso(parseIsoDate("2026-03-10")) === "2026-03-10",
  "new Date(iso) would be the 9th for anyone west of Greenwich");
check("a timestamp is accepted, a junk string is not",
  iso(parseIsoDate("2026-03-10T14:30:00Z")) === "2026-03-10" &&
  parseIsoDate("soon") === null && parseIsoDate("") === null && parseIsoDate(null) === null);

// What is free to contribute is tested in verify-cashflow-forecast.mjs, which
// covers income, repeats and the bill that falls the day after contributing.

check("startOfDay drops the time so two instants on one day compare equal",
  startOfDay(new Date(2026, 2, 10, 23, 59)).getTime() === startOfDay(new Date(2026, 2, 10, 0, 1)).getTime());

let failed = 0;
for (const c of checks) {
  console.log(`${c.ok ? "✓" : "✗"} ${c.name}${c.detail ? `  — ${c.detail}` : ""}`);
  if (!c.ok) failed++;
}
console.log(failed ? `\nSchedule verification failed: ${failed} check(s).` : "\nSchedule verification passed");
process.exit(failed ? 1 : 0);
