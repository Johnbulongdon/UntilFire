/**
 * The forecast and budget path built from Upcoming bills.
 *
 * Run: npm run test:spend-forecast
 */
import assert from "node:assert/strict";
import { type Bill, billsByCategory, typicalForRange, typicalMonth, billsOverBudget, dueByCategory, rateSoFar, budgetPath, daysOfMonths, everydayRate, forecastPath, guessBillCategory, isBill, markPaid, mergeBills, occurrences, presumePaid, settleBill, unlinkedBillPayments } from "../lib/spend-forecast.ts";
import { detectRecurring } from "../lib/recurring-detect.ts";

let n = 0;
const ok = (name: string, fn: () => void) => { fn(); n++; console.log(`✓ ${name}`); };
const rent: Bill = { description: "Rent", category: "housing", usd: 1380, due: "2026-11-01", recurrence: "monthly" };
const tx = (date: string, usd: number, description = "Coffee", category = "food") => ({ date, usd, description, category });

ok("rent paid on the 1st is not forecast again; the next one is outside the month", () => {
  const days = daysOfMonths(["2026-10"]);
  const f = forecastPath(days, "2026-10-06", 1380 + 100, [rent], 20);
  assert.equal(f[days.length - 1], 1480 + 20 * 25, "spent so far plus 25 everyday days, no second rent");
});
ok("a bill still due this month steps up on its date", () => {
  const days = daysOfMonths(["2026-10"]);
  const phone: Bill = { description: "China Mobile", category: "utilities", usd: 50, due: "2026-10-20", recurrence: "monthly" };
  const f = forecastPath(days, "2026-10-06", 1480, [rent, phone], 0);
  assert.equal(f[18], 1480, "the 19th, before the bill");
  assert.equal(f[19], 1530, "the 20th, the bill");
});
ok("everyday rate leaves the listed bills out", () => {
  const spend = ["2026-07", "2026-08", "2026-09"].flatMap((m) => [tx(`${m}-28`, 1380, "RENT PAYMENT", "housing"), tx(`${m}-10`, 620)]);
  const r = everydayRate(spend, [rent], "2026-10")!;
  assert.ok(Math.abs(r - 620 / 31) < 0.6, `rate ${r} should be about $20 a day, rent excluded`);
  assert.equal(isBill(tx("2026-09-28", 1380, "Rent payment Sept", "other"), [rent]), true);
});
ok("fewer than three past months is not enough for a usual rate, the same as Past months", () => {
  assert.equal(everydayRate([tx("2026-08-10", 300), tx("2026-09-10", 300)], [], "2026-10"), null);
});
ok("without a usual rate, the fallback leaves this month's rent out", () => {
  const sirui: Bill = { id: "a", description: "Sirui Rent", category: null, usd: 1500, due: "2026-11-01", recurrence: "monthly" };
  const r = rateSoFar([tx("2026-10-02", 1500, "BILT PAYMENT", "housing"), tx("2026-10-03", 40)], [sirui], "2026-10-04", 4);
  assert.equal(r, 10, "$40 of everyday spending over 4 days, not $1,540");
});
ok("bills still owed this month count against their category, paid ones do not", () => {
  const john: Bill = { id: "b", description: "John Rent", category: null, usd: 432, due: "2026-10-07", recurrence: "monthly" };
  const sirui: Bill = { id: "a", description: "Sirui Rent", category: null, usd: 1500, due: "2026-11-01", recurrence: "monthly" };
  assert.deepEqual(dueByCategory([john, sirui], "2026-10-31"), { housing: 432 });
});
ok("listed repeating bills set what a category usually costs, after a move too (D-52)", () => {
  const sirui: Bill = { id: "a", description: "Sirui Rent", category: "housing", usd: 1500, due: "2026-11-01", recurrence: "monthly" };
  const john: Bill = { id: "b", description: "John Rent", category: "housing", usd: 432, due: "2026-10-07", recurrence: "monthly" };
  const once: Bill = { id: "c", description: "Movers", category: "housing", usd: 900, due: "2026-10-12", recurrence: "none" };
  const spotted: Bill = { description: "Gym", category: "health", usd: 40, due: "2026-10-03", recurrence: "monthly" };
  assert.deepEqual(billsByCategory([sirui, john, once, spotted], ["2026-10"]), { housing: 1932 }, "both rents, not the one-off or a spotted bill");
  assert.deepEqual(billsByCategory([sirui], ["2026-08", "2026-09", "2026-10"]), { housing: 4500 }, "one rent per month in the range");
  assert.deepEqual(billsByCategory([{ ...sirui, recurrence: "yearly" }], ["2026-10"]), {}, "a yearly bill not due this month adds nothing");
});
ok("after a move, a typical housing month counts from the first listed rent paid (D-52)", () => {
  const sirui: Bill = { id: "a", description: "Sirui Rent", category: "housing", usd: 1380, due: "2026-11-01", recurrence: "monthly", merchant: "BILT PAYMENT" };
  const john: Bill = { id: "b", description: "John Rent", category: "housing", usd: 435, due: "2026-10-07", recurrence: "monthly", merchant: "陈玲(陈玲)" };
  const h = (date: string, usd: number, description: string) => tx(date, usd, description, "housing");
  const history = [h("2026-05-08", 225, "玲(*玲)"), h("2026-06-11", 239, "Rent abroad"), h("2026-07-17", 239, "快乐是福"),
    h("2026-08-16", 429, "陈玲(陈玲)"), h("2026-08-20", 7, "Detergent"), h("2026-09-01", 1380, "BILT PAYMENT"), h("2026-09-08", 429, "陈玲(陈玲)")];
  assert.deepEqual(typicalMonth(history, [sirui, john], "2026-10"), { low: 1815, mid: 1815, high: 1822 },
    "today's rents, plus August's detergent; a June payment named Rent counts at today's rents, never at its own old amount");
  assert.deepEqual(typicalMonth(history.slice(0, 3), [sirui, john], "2026-10"), { low: 1815, mid: 1815, high: 1815 }, "no rent paid yet: the listed bills alone");
  assert.deepEqual(typicalForRange(history, [sirui, john], ["2026-10"], "2026-10-08", true)?.mid, 1815, "the current month is compared whole");
});
ok("without listed bills, the band is past months with the single highest and lowest dropped", () => {
  const food = [["2026-04", 380], ["2026-05", 520], ["2026-06", 450], ["2026-07", 690], ["2026-08", 1400], ["2026-09", 60]].map(([m, v]) => tx(`${m}-05`, v as number));
  assert.deepEqual(typicalMonth(food, [], "2026-10"), { low: 380, mid: 485, high: 690 });
  assert.equal(typicalMonth(food.slice(0, 2), [], "2026-10"), null, "two months is not enough history");
});
ok("the budget path puts rent on its day and spreads the rest evenly", () => {
  const p = budgetPath(["2026-10"], 2930, [rent]);
  assert.equal(Math.round(p[0]), 1380 + 50, "day 1: rent plus one day of the remaining $1,550 over 31 days");
  assert.equal(Math.round(p[30]), 2930, "ends at the budget");
});
ok("bills larger than the budget are drawn at full size, and the overrun is reported", () => {
  const p = budgetPath(["2026-10"], 1000, [rent]);
  assert.equal(Math.round(p[0]), 1380, "rent on its day, not shrunk to fit");
  assert.equal(Math.round(p[30]), 1380, "no everyday budget left");
  assert.equal(billsOverBudget(["2026-10"], 1000, [rent]), 380);
  assert.equal(billsOverBudget(["2026-10"], 2930, [rent]), 0);
});

ok("rent nobody listed in Upcoming is spotted in history, so it is not in the everyday rate", () => {
  // The founder's October: BILT PAYMENT for rent every month on varying days, a little everyday spending.
  const months = ["2026-06", "2026-07", "2026-08", "2026-09"];
  const raw = months.flatMap((m, i) => [
    { id: `r${i}`, date: `${m}-${["28", "30", "02", "29"][i]}`, amount: 1380, currency: "USD", description: "BILT PAYMENT", category: "housing", transaction_type: "expense" as const },
    { id: `c${i}`, date: `${m}-12`, amount: 450, currency: "USD", description: "Groceries", category: "food", transaction_type: "expense" as const },
  ]).concat([{ id: "oct", date: "2026-10-02", amount: 1380, currency: "USD", description: "BILT PAYMENT", category: "housing", transaction_type: "expense" as const }]);
  const spotted: Bill[] = detectRecurring(raw, {}).expenses.filter((d) => d.frequency === "monthly")
    .map((d) => ({ description: d.description, category: d.category, usd: d.avgAmountUSD, due: d.nextDueDate, recurrence: "monthly" as const }));
  assert.ok(spotted.some((b) => b.description === "BILT PAYMENT"), "BILT PAYMENT is spotted as a monthly bill");
  const spend = raw.map((r) => ({ date: r.date, usd: r.amount, description: r.description, category: r.category }));
  const rate = everydayRate(spend, spotted, "2026-10")!;
  const f = forecastPath(daysOfMonths(["2026-10"]), "2026-10-06", 1380, spotted, rate).at(-1)!;
  assert.ok(f < 1380 + 450 + 50, `forecast ${Math.round(f)} holds one rent plus about a month of groceries, not two rents`);
});

ok("a monthly bill lands on its day in past months too", () => {
  assert.deepEqual(occurrences(rent, "2026-09-01", "2026-10-31"), ["2026-09-01", "2026-10-01"]);
  const p = budgetPath(["2026-09"], 2930, [rent]);
  assert.equal(Math.round(p[0]), 1380 + Math.round(1550 / 30), "September 1 steps up by rent");
});
ok("weekly, one-off and annual bills land on their own dates", () => {
  const gym: Bill = { description: "Gym", category: "personal_care", usd: 20, due: "2026-10-03", recurrence: "weekly" };
  assert.deepEqual(occurrences(gym, "2026-09-01", "2026-09-30"), ["2026-09-05", "2026-09-12", "2026-09-19", "2026-09-26"]);
  const flight: Bill = { description: "Flight", category: "travel", usd: 600, due: "2026-09-14", recurrence: "none" };
  assert.deepEqual(occurrences(flight, "2026-09-01", "2026-09-30"), ["2026-09-14"]);
  const insurance: Bill = { description: "Insurance", category: "other", usd: 900, due: "2027-03-10", recurrence: "annual" };
  assert.deepEqual(occurrences(insurance, "2026-09-01", "2026-09-30"), []);
  const p = budgetPath(["2026-09"], 3000, [rent, flight]);
  assert.ok(p[13] - p[12] > 600, "the flight steps the budget up on the 14th");
});
ok("listed rent and the bank's BILT PAYMENT are one bill, not two", () => {
  const bilt: Bill = { description: "BILT PAYMENT", category: "housing", usd: 1380, due: "2026-11-02", recurrence: "monthly" };
  assert.equal(mergeBills([rent], [bilt]).length, 1);
});

ok("the founder's October: $1,500 Rent listed without a category, BILT PAYMENT $1,380 spotted", () => {
  const listed: Bill = { id: "e1", description: "Rent", category: null, usd: 1500, due: "2026-10-01", recurrence: "monthly" };
  const bilt: Bill = { description: "BILT PAYMENT", category: "housing", usd: 1380, due: "2026-10-30", recurrence: "monthly" };
  const bills = mergeBills([listed], [bilt]);
  assert.equal(bills.length, 1, "one rent, not two");
  const p = budgetPath(["2026-10"], 2255, bills);
  assert.equal(Math.round(p[1]), 1500 + Math.round(2 * 755 / 31), "Oct 2 holds the full $1,500 rent, not $1,113");
});
ok("a bill's category is guessed from its name when it has none", () => {
  assert.equal(guessBillCategory("Rent"), "housing");
  assert.equal(guessBillCategory("China Mobile"), "utilities");
  assert.equal(guessBillCategory("Birthday dinner"), null);
});
ok("a payment that looks like a listed bill is asked about once, then linked by name", () => {
  const listed: Bill = { id: "e1", description: "Rent", category: "housing", usd: 1500, due: "2026-11-01", recurrence: "monthly" };
  const t = { id: "t1", date: "2026-10-02", usd: 1380, description: "BILT PAYMENT", category: "housing" };
  const far = { ...t, id: "t2", date: "2026-10-15" }, other = { ...t, id: "t3", category: "food" };
  const asks = unlinkedBillPayments([t, far, other], [listed], () => false);
  assert.deepEqual([...asks.keys()], ["t1"], "only the one near rent day, in housing, close in amount");
  assert.equal(unlinkedBillPayments([t], [{ ...listed, merchant: "BILT PAYMENT" }], () => false).size, 0, "linked: no question");
  assert.equal(unlinkedBillPayments([t], [listed], () => true).size, 0, "said no: no question");
  assert.equal(isBill(t, [{ ...listed, merchant: "BILT PAYMENT" }]), true, "linked payments leave the everyday rate");
});

ok("a linked bill settles itself when its payment arrives", () => {
  const rent: Bill = { id: "e1", description: "Rent", category: "housing", usd: 1500, due: "2026-10-01", recurrence: "monthly", merchant: "BILT PAYMENT" };
  const t = { id: "t1", date: "2026-10-02", usd: 1380, description: "BILT PAYMENT", category: "housing" };
  assert.deepEqual(settleBill(rent, [t], "x"), { due_date: "2026-11-01" }, "a monthly bill moves to next month");
  assert.equal(settleBill({ ...rent, due: "2026-11-01" }, [t], "x"), null, "once moved, the same payment does not settle it again");
  assert.equal(settleBill({ ...rent, merchant: null }, [t], "x"), null, "not linked: left to the person");
  assert.equal(settleBill(rent, [{ ...t, date: "2026-10-20", usd: 900 }], "x"), null, "far from the date and the amount: not this bill");
  assert.deepEqual(settleBill(rent, [{ ...t, date: "2026-10-20" }], "x"), { due_date: "2026-11-01" }, "paid late at the usual amount still counts");
  assert.deepEqual(settleBill({ ...rent, recurrence: "none" }, [t], "now"), { completed_at: "now" }, "a one-off is completed");
});
ok("a bill behind by two months catches up to the next unpaid date", () => {
  const rent: Bill = { id: "e1", description: "Sirui Rent", category: null, usd: 1500, due: "2026-09-01", recurrence: "monthly", merchant: "BILT PAYMENT" };
  const paid = [{ id: "s", date: "2026-09-01", usd: 1380, description: "BILT PAYMENT", category: "housing" }, { id: "o", date: "2026-10-02", usd: 1380, description: "BILT PAYMENT", category: "housing" }];
  assert.deepEqual(settleBill(rent, paid, "x"), { due_date: "2026-11-01" });
});
ok("a bill paid early this month is not forecast again on its date", () => {
  const phone: Bill = { description: "China Mobile", category: "utilities", usd: 50, due: "2026-11-20", recurrence: "monthly" };
  const f = forecastPath(daysOfMonths(["2026-10"]), "2026-10-07", 100, [phone], 0);
  assert.equal(f.at(-1), 100, "paid on the 5th, so its due date moved to November; October 20 is not added");
});
ok("rent paid under another name leaves the everyday rate: the founder's two rents", () => {
  const sirui: Bill = { id: "a", description: "Sirui Rent", category: null, usd: 1500, due: "2026-10-01", recurrence: "monthly" };
  const john: Bill = { id: "b", description: "John Rent", category: null, usd: 432, due: "2026-10-07", recurrence: "monthly" };
  const spend = [
    tx("2026-07-16", 425, "陈玲(陈玲)", "housing"), tx("2026-07-10", 600, "Groceries"),
    tx("2026-08-16", 425, "陈玲(陈玲)", "housing"), tx("2026-08-10", 600, "Groceries"), tx("2026-08-20", 60, "IKEA lamp", "housing"),
    tx("2026-09-01", 1380, "BILT PAYMENT", "housing"), tx("2026-09-08", 425, "陈玲(陈玲)", "housing"), tx("2026-09-10", 600, "Groceries"),
  ];
  const r = everydayRate(spend, [sirui, john], "2026-10")!;
  const want = 600 / 30; // the middle of July 600/31, August 660/31 (lamp in, rent out), September 600/30
  assert.ok(Math.abs(r - want) < 0.01, `rate ${r.toFixed(2)} should be ${want.toFixed(2)}: both rents out, the lamp in`);
});

ok("an unconfirmed rent payment counts as paying the bill, without writing anything (D-49)", () => {
  // The founder's October: Sirui Rent $1,500 due Oct 1, unlinked; BILT paid $1,380 on Oct 2 (8% apart).
  const sirui: Bill = { id: "s", description: "Sirui Rent", category: "housing", usd: 1500, due: "2026-10-01", recurrence: "monthly" };
  const john: Bill = { id: "j", description: "John Rent", category: "housing", usd: 435, due: "2026-10-07", recurrence: "monthly" };
  const paid = { id: "t1", date: "2026-10-02", usd: 1380, description: "BILT PAYMENT", category: "housing" };
  const asks = unlinkedBillPayments([paid], [sirui, john], () => false);
  assert.equal(asks.get("t1")?.id, "s", "the BILT payment is asked about as Sirui Rent");
  const counted = presumePaid([sirui, john], asks);
  assert.equal(counted.find((b) => b.id === "s")?.due, "2026-11-01", "Sirui Rent counts from November");
  assert.equal(counted.find((b) => b.id === "j")?.due, "2026-10-07", "John Rent is still due");
  assert.deepEqual(dueByCategory(counted, "2026-10-31"), { housing: 435 }, "October still owes only John Rent, not a second $1,500");
  assert.equal(sirui.due, "2026-10-01", "the listed bill itself is untouched");
  const declined = unlinkedBillPayments([paid], [sirui, john], () => true);
  assert.equal(presumePaid([sirui, john], declined).find((b) => b.id === "s")?.due, "2026-10-01", "a 'no' brings the bill back");
});
ok("a presumed-paid one-off leaves the list", () => {
  const once: Bill = { id: "o", description: "Deposit", category: "housing", usd: 500, due: "2026-10-03", recurrence: "none" };
  assert.equal(presumePaid([once], new Map([["t", once]])).length, 0);
});

console.log(`Spend forecast ok: ${n} checks.`);
