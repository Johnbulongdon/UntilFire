import assert from "node:assert/strict";

import { freeTimeMore } from "../lib/freedom-progress.ts";
import { freeDaysShareText, monthStory, storyChangeLine, storyPages, storyFlowLine, storyKeptLine, storyMonth, type StoryRow } from "../lib/month-story.ts";

const usd = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;
const spend = (month: string, category: string, n: number): StoryRow => ({ date: `${month}-10`, usd: n, type: "expense", category });
const pay = (month: string, n: number): StoryRow => ({ date: `${month}-01`, usd: n, type: "income", category: "salary" });

// The story is always about the month that just finished.
assert.equal(storyMonth(new Date(2026, 10, 12)), "2026-10");
assert.equal(storyMonth(new Date(2027, 0, 3)), "2026-12");

// Six usual months: rent 1500, eating out 400, groceries 500. October: eating out 260, groceries 520.
const history: StoryRow[] = ["2026-04", "2026-05", "2026-06", "2026-07", "2026-08", "2026-09"].flatMap((m) => [
  pay(m, 4_300), spend(m, "housing", 1_500), spend(m, "dining", 400), spend(m, "groceries", 500),
]);
const october: StoryRow[] = [pay("2026-10", 4_300), spend("2026-10", "housing", 1_500), spend("2026-10", "dining", 260), spend("2026-10", "groceries", 520), spend("2026-10", "fun", 840)];
const s = monthStory({ month: "2026-10", rows: [...history, ...october], exclude: new Set(["housing"]), target: 900_000 })!;
assert.equal(s.monthName, "October");
assert.equal(s.income, 4_300);
assert.equal(s.spent, 3_120);
assert.equal(s.kept, 1_180);
assert.equal(storyKeptLine(s, usd), "You kept $1,180");
assert.equal(storyFlowLine(s, usd), "$4,300 came in. $3,120 went out.");
// A saving leads even when a rise is bigger: eating out fell $140, fun rose $840.
assert.deepEqual(s.change, { key: "dining", amount: 260, usual: 400, delta: -140 });
assert.equal(storyChangeLine(s.change!, usd), "$140 less than your usual month");
// $1,180 of $900k is 11.5 hours of a year.
assert.ok(Math.abs(s.hours - 11.49) < 0.01);
assert.equal(freeTimeMore(s.hours), "11 more hours");

// No saving: the biggest rise, said plainly.
const rise = monthStory({ month: "2026-10", rows: [...history, pay("2026-10", 4_300), spend("2026-10", "dining", 400), spend("2026-10", "groceries", 700)], exclude: new Set(["housing"]), target: 900_000 })!;
assert.equal(rise.change!.key, "groceries");
assert.equal(storyChangeLine(rise.change!, usd), "$200 more than your usual month");

// Bills are left out of the change: rent missing from October is not a saving.
const noRent = monthStory({ month: "2026-10", rows: [...history, pay("2026-10", 4_300), spend("2026-10", "dining", 400), spend("2026-10", "groceries", 500)], exclude: new Set(["housing"]), target: 900_000 })!;
assert.equal(noRent.change, null);

// Small moves are noise: $15 on groceries, or under a tenth of the usual.
const quiet = monthStory({ month: "2026-10", rows: [...history, pay("2026-10", 4_300), spend("2026-10", "housing", 1_400), spend("2026-10", "dining", 400), spend("2026-10", "groceries", 515)], target: 900_000 })!;
assert.equal(quiet.change, null);

// A category that is new this month counts against a usual of $0.
const fresh = monthStory({ month: "2026-10", rows: [...history, pay("2026-10", 4_300), spend("2026-10", "dining", 400), spend("2026-10", "groceries", 500), spend("2026-10", "housing", 1_500), spend("2026-10", "travel", 300)], target: 900_000 })!;
assert.deepEqual(fresh.change, { key: "travel", amount: 300, usual: 0, delta: 300 });

// Under three months of history there is no "usual", so no change page; kept still stands.
const young = monthStory({ month: "2026-10", rows: [...history.filter((r) => r.date >= "2026-08"), ...october], target: 900_000 })!;
assert.equal(young.change, null);
assert.equal(young.kept, 1_180);

// Months older than six back are not part of usual.
const old = monthStory({ month: "2026-10", rows: [spend("2026-01", "dining", 5_000), spend("2026-02", "dining", 5_000), spend("2026-03", "dining", 5_000), ...history, ...october], exclude: new Set(["housing"]), target: 900_000 })!;
assert.equal(old.change!.usual, 400);

// More went out than came in: the plain fact, and no hours.
const over = monthStory({ month: "2026-10", rows: [...history, pay("2026-10", 3_000), spend("2026-10", "housing", 1_500), spend("2026-10", "dining", 1_730)], target: 900_000 })!;
assert.equal(over.kept, -230);
assert.equal(storyKeptLine(over, usd), "You spent $230 more than came in");
assert.equal(over.hours, 0);
assert.equal(freeTimeMore(over.hours), null);

// Exactly even.
const even = monthStory({ month: "2026-10", rows: [pay("2026-10", 1_500), spend("2026-10", "housing", 1_500)], target: 900_000 })!;
assert.equal(storyKeptLine(even, usd), "You spent what came in");

// No income or no spending recorded: no story, rather than a guess.
assert.equal(monthStory({ month: "2026-10", rows: [spend("2026-10", "dining", 300)], target: 900_000 }), null);
assert.equal(monthStory({ month: "2026-10", rows: [pay("2026-10", 4_300)], target: 900_000 }), null);
assert.equal(monthStory({ month: "2026-10", rows: history, target: 900_000 }), null);

// No target: the story stands, without hours.
assert.equal(monthStory({ month: "2026-10", rows: october, target: 0 })!.hours, 0);

// The pages: kept always; the others only when they have something to say.
assert.deepEqual(storyPages(s, true), ["kept", "change", "hours", "free"]);
assert.deepEqual(storyPages(over, true), ["kept", "change", "free"]);
assert.deepEqual(storyPages(even, false), ["kept"]);

// The share says days, never money.
assert.equal(freeDaysShareText("18 days"), "My money already pays for 18 days of every year. How much of your year is paid for?");
assert.ok(!/\$/.test(freeDaysShareText("18 days")));

// The shared wording for time added.
assert.equal(freeTimeMore(50), "2 more days");
assert.equal(freeTimeMore(1.9), "1 more hour");
assert.equal(freeTimeMore(0.5), "30 more minutes");
assert.equal(freeTimeMore(0.001), null);

console.log("month story checks passed");
