/**
 * Transaction time is optional, which is exactly what makes it dangerous:
 * every failure produces a plausible-looking wrong time rather than an error.
 */
import assert from "node:assert/strict";
import {
  isPlaceholderTime, plaidOccurredAt, timeFromCell, combineDateAndTime,
  timeInputValue, formatTime,
} from "../lib/transaction-time.ts";

// Plaid says these fields "may contain default time values (such as 00:00:00)".
assert.ok(isPlaceholderTime("2026-09-19T00:00:00Z"));
assert.ok(isPlaceholderTime("2026-09-19T00:00Z"));
assert.ok(isPlaceholderTime("2026-09-19T00:00:00+00:00"));
assert.ok(!isPlaceholderTime("2026-09-19T00:01:00Z"));
assert.ok(!isPlaceholderTime("2026-09-19T14:32:00Z"));

// authorized_datetime wins: it is when the person paid, not when it posted.
assert.equal(
  plaidOccurredAt("2026-09-19T14:32:00Z", "2026-09-21T09:00:00Z"),
  new Date("2026-09-19T14:32:00Z").toISOString(),
);
// Falls back to datetime when there is no authorized one.
assert.equal(plaidOccurredAt(null, "2026-09-21T09:00:00Z"), new Date("2026-09-21T09:00:00Z").toISOString());
// A placeholder in the preferred field does not block a real one behind it.
assert.equal(plaidOccurredAt("2026-09-19T00:00:00Z", "2026-09-21T09:15:00Z"), new Date("2026-09-21T09:15:00Z").toISOString());
// Nothing usable -> null, never a fabricated midnight.
assert.equal(plaidOccurredAt(null, null), null);
assert.equal(plaidOccurredAt("2026-09-19T00:00:00Z", "2026-09-21T00:00:00Z"), null);
assert.equal(plaidOccurredAt("not a date", null), null);
assert.equal(plaidOccurredAt("", ""), null);

// Times hiding in a spreadsheet's date column.
assert.equal(timeFromCell("2026-09-19 14:32:05"), "14:32", "WeChat/bank style");
assert.equal(timeFromCell("2026-09-19T14:32"), "14:32");
assert.equal(timeFromCell("19/09/2026 2:05 PM"), "14:05", "12-hour with meridiem");
assert.equal(timeFromCell("19/09/2026 12:30 AM"), "00:30", "12am is hour zero");
assert.equal(timeFromCell("19/09/2026 12:30 PM"), "12:30", "12pm stays noon");
assert.equal(timeFromCell("2026-09-19"), null, "a date-only cell has no time");
assert.equal(timeFromCell("2026-09-19 00:00:00"), null, "midnight in a date-only export is not a time");
assert.equal(timeFromCell(""), null);
assert.equal(timeFromCell(null), null);
assert.equal(timeFromCell("99:99"), null, "an impossible time is not a time");
assert.equal(timeFromCell("2026-09-19 25:00"), null);

// A typed time means that time where the person typing it lives.
const combined = combineDateAndTime("2026-09-19", "14:30");
assert.ok(combined, "a date plus a time is an instant");
assert.equal(timeInputValue(combined), "14:30", "and it round-trips for them");
assert.equal(combineDateAndTime("2026-09-19", null), null, "no time, no instant");
assert.equal(combineDateAndTime("", "14:30"), null);
assert.equal(combineDateAndTime("2026-09-19", "nonsense"), null);

// Display never invents anything.
assert.equal(formatTime(null), null);
assert.equal(formatTime("not a date"), null);
assert.equal(timeInputValue(null), "");
assert.equal(timeInputValue("not a date"), "");
assert.ok(formatTime(combined, "en-GB")?.includes("14:30"), "renders in the reader's locale");

console.log("Transaction time ok: placeholders rejected, authorized_datetime preferred, cell times recovered, round trip stable.");
