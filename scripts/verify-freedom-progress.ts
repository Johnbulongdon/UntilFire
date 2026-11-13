import assert from "node:assert/strict";

import { DAYS_IN_YEAR, FREE_DAY_MONTHS, aboutDate, freeDays, freeDaysLabel, freeHours, freeNextLabel, freePaceLabel, freedomProgress, progressPercent } from "../lib/freedom-progress.ts";

const path = [{ year: 2026, value: 46_000 }, { year: 2027, value: 60_000 }, { year: 2028, value: 105_000 }];

// No target, no bar.
assert.equal(freedomProgress(10_000, 0), null);
assert.equal(freedomProgress(Number.NaN, 100_000), null);

// 23% there: next mark is 25%, $4k to go, reached in 2027.
const p = freedomProgress(46_000, 200_000, path)!;
assert.equal(p.share, 0.23);
assert.deepEqual(p.next, { mark: 0.25, toGo: 4_000, year: 2027 });

// Without the path, no year.
assert.equal(freedomProgress(46_000, 200_000)!.next!.year, null);

// Exactly on a mark aims at the next one.
assert.equal(freedomProgress(50_000, 200_000, path)!.next!.mark, 0.5);

// Reached: full, nothing next. Negative pots count as zero.
assert.deepEqual(freedomProgress(250_000, 200_000), { share: 1, next: null });
assert.equal(freedomProgress(-5_000, 200_000)!.share, 0);
assert.equal(freedomProgress(-5_000, 200_000)!.next!.toGo, 50_000);

// Percent: no 0% once something is there, no 100% before it all is.
assert.equal(progressPercent(0), "0%");
assert.equal(progressPercent(0.001), "1%");
assert.equal(progressPercent(0.996), "99%");
assert.equal(progressPercent(1), "100%");

// Free days (D-149): the share as days of a year.
const now = new Date(2026, 10, 12);
// $45k of $900k is 5%: 18 whole days (18.25). Day 19 needs 19/365 of the target.
const fd = freeDays(45_000, 900_000, [45_000, 61_650, 79_000], now)!;
assert.equal(fd.days, 18);
assert.equal(freeDaysLabel(fd), "18 days");
assert.equal(fd.next!.day, 19);
assert.ok(Math.abs(fd.next!.toGo - (900_000 * 19 / 365 - 45_000)) < 1e-6);
// The pot gains $16,650 in the first year, so $1,849 to go takes about 0.111 years: mid-December.
assert.equal(fd.next!.date!.getFullYear(), 2026);
assert.equal(fd.next!.date!.getMonth(), 11);
assert.equal(aboutDate(fd.next!.date!, now).startsWith("about Dec "), true);
// $1,387.50 a month of a $900k target is 13.5 hours.
assert.ok(Math.abs(fd.hoursPerMonth! - 13.505) < 0.01);
assert.equal(freePaceLabel(fd.hoursPerMonth), "You add 13 hours every month");
assert.equal(freePaceLabel(0.4), null);
assert.equal(freePaceLabel(50), "You add 2 days every month");
assert.equal(freePaceLabel(1.5), "You add 1 hour every month");

// Days match the percent's share exactly on a boundary (no float slip to 17).
assert.equal(freeDays(900_000 * 18 / 365, 900_000)!.days, 18);
// Under one day: hours. Nothing yet: 0 days, day 1 next.
const tiny = freeDays(1_000, 900_000)!;
assert.equal(tiny.days, 0);
assert.equal(freeDaysLabel(tiny), "9 hours");
assert.equal(tiny.next!.day, 1);
assert.equal(freeDaysLabel(freeDays(0, 900_000)!), "0 days");
assert.equal(freeDaysLabel(freeDays(900_000 / 365, 900_000)!), "1 day");
// No path, a flat path or one that never gets there: no date, only the amount to go.
assert.equal(freeDays(45_000, 900_000)!.next!.date, null);
assert.equal(freeDays(45_000, 900_000, [45_000, 45_000, 45_000], now)!.next!.date, null);
assert.equal(freeDays(45_000, 900_000, [45_000, 45_000], now)!.hoursPerMonth, null);
// A later year: the date lands inside the stretch that crosses the line.
const slow = freeDays(45_000, 900_000, [45_000, 45_500, 46_000, 48_000], now)!;
assert.equal(slow.next!.date!.getFullYear(), 2029);
assert.equal(aboutDate(slow.next!.date!, now), `about ${slow.next!.date!.toLocaleDateString("en-US", { month: "short", year: "numeric" })}`);
// Never 365 before it is all there; all 365 once it is, with nothing next.
assert.equal(freeDays(899_999, 900_000)!.days, 364);
assert.deepEqual(freeDays(950_000, 900_000), { share: 1, days: 365, hours: 8760, next: null, hoursPerMonth: null });
// A pot in the red counts as zero; no target, nothing to show.
assert.equal(freeDays(-5_000, 900_000)!.days, 0);
assert.equal(freeDays(10_000, 0), null);
assert.equal(freeDays(Number.NaN, 900_000), null);
// The pill: a date when the path gives one, the amount to go when not, the freedom date itself for day 365.
const usd = (n: number) => `$${Math.round(n)}`;
assert.equal(freeNextLabel(fd, usd, "Oct 2052", now), `Next free day: ${aboutDate(fd.next!.date!, now)}`);
assert.equal(freeNextLabel(freeDays(45_000, 900_000)!, usd), "Next free day: $1849 to go");
assert.equal(freeNextLabel(freeDays(899_999, 900_000, [899_999, 950_000], now)!, usd, "Oct 2052", now), "All 365 days: Oct 2052");
assert.equal(freeNextLabel(freeDays(950_000, 900_000)!, usd), "Every day is yours");

// $300 saved toward $900k buys about 3 hours of every year.
assert.equal(Math.round(freeHours(300, 900_000)), 3);
assert.equal(freeHours(300, 0), 0);

// The dots: twelve months that hold every day of the year once, in order.
assert.equal(FREE_DAY_MONTHS.length, 12);
assert.equal(FREE_DAY_MONTHS.reduce((n, m) => n + m.days, 0), DAYS_IN_YEAR);
assert.ok(FREE_DAY_MONTHS.every((m, k) => m.start === FREE_DAY_MONTHS.slice(0, k).reduce((n, x) => n + x.days, 0)));

console.log("Freedom progress checks passed.");
