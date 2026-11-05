import assert from "node:assert/strict";
import { extraPayMonths } from "../lib/pay-months.ts";
const pay = (dueDate: string, recurrence: "biweekly" | "weekly" | "monthly") => ({ description: "Payroll", amountUSD: 3250, type: "income" as const, dueDate, recurrence });
// Paid every 2 weeks from Nov 1 2026: Nov 1, 15, 29 is a 3-payday month.
const a = extraPayMonths([pay("2026-11-15", "biweekly")], new Date(2026, 10, 5));
assert.equal(a[0].month, "2026-11"); assert.equal(a[0].extraDate, "2026-11-29"); assert.equal(a[0].paydays, 3);
assert.deepEqual(a.map((m) => m.month), ["2026-11", "2027-05", "2027-10"]);
// Monthly pay never has an extra payday; expenses are ignored.
assert.equal(extraPayMonths([pay("2026-11-15", "monthly")], new Date(2026, 10, 5)).length, 0);
assert.equal(extraPayMonths([{ ...pay("2026-11-15", "biweekly"), type: "expense" as const }], new Date(2026, 10, 5)).length, 0);
// Weekly: months with 5 paydays.
assert.ok(extraPayMonths([pay("2026-11-06", "weekly")], new Date(2026, 10, 5)).every((m) => m.paydays === 5));
console.log("pay months: 5 checks passed");
