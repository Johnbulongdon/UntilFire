#!/usr/bin/env node
/**
 * The shared money rules from the money logic audit, round 2 (Oct 16 2026):
 * how bank rows are classified, refunds, real spending, bill payments, needs,
 * debt rates and household spending. Run: npm run test:money-rules
 */
import assert from "node:assert/strict";
import { classifyPlaid } from "../lib/plaid-category.ts";
import { planRefunds } from "../lib/refunds.ts";
import { spendingAverage, isMortgagePayment } from "../lib/real-spending.ts";
import { matchesBill, billCategorySet } from "../lib/bill-categories.ts";
import { categoryNeed, transactionNeed, budgetNeeds, rowNeed, withRowNeed, EATING_OUT, isMixedShop, asksShop } from "../lib/needs.ts";
import { carriedCards, freedomDebt } from "../lib/freedom-debt.ts";
import { applyAccountShares, readAccountShares, shareOf } from "../lib/account-share.ts";
import { householdSpending } from "../lib/household-spending.ts";
import { freedomCash, safetyPot } from "../lib/freedom-cash.ts";
import { goalMonthly } from "../lib/goal-monthly.ts";

// ── Bank rows ──
assert.equal(classifyPlaid("TRANSFER_OUT", "TRANSFER_OUT_ACCOUNT_TRANSFER", 500).transaction_type, "transfer", "own-account moves are transfers");
assert.equal(classifyPlaid("TRANSFER_OUT", "TRANSFER_OUT_OTHER_TRANSFER_OUT", 1800).transaction_type, "expense", "Zelle rent is spending");
assert.equal(classifyPlaid("TRANSFER_OUT", "TRANSFER_OUT_WITHDRAWAL", 200).sub_category, "Cash", "ATM cash is spending to sort");
assert.equal(classifyPlaid("TRANSFER_IN", "TRANSFER_IN_ACCOUNT_TRANSFER", -500).transaction_type, "transfer", "money from your own savings isn't income");
assert.equal(classifyPlaid("LOAN_PAYMENTS", "LOAN_PAYMENTS_CREDIT_CARD_PAYMENT", 900).transaction_type, "transfer", "card payments are transfers");
assert.deepEqual(classifyPlaid("LOAN_PAYMENTS", "LOAN_PAYMENTS_CAR_PAYMENT", 400).category, "transport", "car loans are spending");
assert.ok(isMortgagePayment({ description: "x", sub_category: classifyPlaid("LOAN_PAYMENTS", "LOAN_PAYMENTS_MORTGAGE_PAYMENT", 2000).sub_category }), "mortgage payments are recognised");
const refund = classifyPlaid("GENERAL_MERCHANDISE", "GENERAL_MERCHANDISE_ONLINE_MARKETPLACES", -40);
assert.equal(refund.transaction_type, "transfer", "a refund is never income");
assert.ok(refund.tags.includes("sys:refund"), "and is marked to apply");
assert.equal(classifyPlaid("INCOME", "INCOME_WAGES", -3000).category, "salary", "wages are pay");
assert.equal(classifyPlaid("HOME_IMPROVEMENT", "", 120).category, "shopping", "Home Depot isn't rent");
assert.equal(classifyPlaid("RENT_AND_UTILITIES", "RENT_AND_UTILITIES_GAS_AND_ELECTRICITY", 90).category, "utilities", "power is utilities");

// ── Refunds ──
const plan = planRefunds([{ id: "r", date: "2026-10-10", amount: 40, description: "Amazon" }],
  [{ id: "old", date: "2026-05-01", amount: 100, refund_amount: 0, description: "Amazon" },
   { id: "p", date: "2026-10-02", amount: 60, refund_amount: 0, description: "Amazon" },
   { id: "x", date: "2026-10-03", amount: 60, refund_amount: 0, description: "Target" }]);
assert.deepEqual(plan, [{ refundId: "r", purchaseId: "p", refundAmount: 40 }], "a refund lands on the latest same-shop purchase within 90 days");
assert.deepEqual(planRefunds([{ id: "r", date: "2026-10-10", amount: 80, description: "Amazon" }], [{ id: "p", date: "2026-10-02", amount: 60, refund_amount: 0, description: "Amazon" }]), [], "never more than the purchase");

// ── Real spending ──
const rows = [
  { date: "2026-06-20", usd: 300 }, // data starts mid-June: a partial month
  { date: "2026-07-05", usd: 3000 }, { date: "2026-08-05", usd: 3000 }, { date: "2026-09-05", usd: 3000 },
  { date: "2026-09-01", usd: 2000, description: "WELLS FARGO HOME MTG" },
  { date: "2026-10-01", usd: 999 }, // this month: not complete
];
const real = spendingAverage(rows, "2026-10", { excludeMortgage: true, firstDate: "2026-06-20" });
assert.equal(real.average, 3000, "a partial first month, the current month and mortgage payments are left out");
assert.equal(real.months, 3);
assert.equal(spendingAverage(rows.slice(1, 3), "2026-10", { excludeMortgage: false }).average, null, "under three months there is no average");

// ── Bills ──
const bills = [{ description: "Spotify", category: "entertainment", recurrence: "monthly", usd: 10.99 }];
assert.ok(matchesBill({ description: "SPOTIFY USA", usd: 11.99, category: "entertainment" }, bills), "a price rise is still the bill");
assert.ok(!matchesBill({ description: "AMC Theatres", usd: 25, category: "entertainment" }, bills), "other spending in the category is everyday");
assert.ok(!billCategorySet([{ description: "Dentist", category: "healthcare", recurrence: "none" }]).has("healthcare"), "a one-off doesn't make a category fixed");

// ── Needs ──
assert.equal(categoryNeed("food"), "need");
assert.equal(categoryNeed("food", { food: "want" }), "want", "a category can be changed");
assert.equal(categoryNeed("food", { food: "need" }, "Takeout & Delivery"), "want", "delivery stays a want when Food is set to need");
assert.equal(categoryNeed("food", { "food/Takeout & Delivery": "need" }, "Takeout & Delivery"), "need", "a sub-category can be changed");
assert.equal(rowNeed(EATING_OUT), "want");
assert.equal(rowNeed(EATING_OUT, withRowNeed(EATING_OUT, "need")), "need", "moving eating out moves all of it");
assert.equal(categoryNeed("food", withRowNeed(EATING_OUT, "need"), "Drinks & Bars"), "need");
assert.ok(isMixedShop("TARGET 00012345 BROOKLYN NY") && isMixedShop("Amazon Mktp US*2K4AB") && isMixedShop("7-ELEVEN 34512"), "mixed shops are found through card noise");
assert.ok(!isMixedShop("Trader Joe's #552") && !isMixedShop("Shell Oil 5744"), "a grocer or a gas station isn't mixed");
assert.ok(asksShop({ description: "TARGET 1234", usd: 64, tags: [] }), "a mixed shop over $20 is asked about");
assert.ok(!asksShop({ description: "TARGET 1234", usd: 12, tags: [] }), "a small one isn't");
assert.ok(!asksShop({ description: "TARGET 1234", usd: 64, tags: [] }, { target: {} }), "once a shop is answered it isn't asked again");
assert.ok(!asksShop({ description: "TARGET 1234", usd: 64, tags: ["want"] }), "an answered purchase isn't asked");
assert.equal(transactionNeed({ category: "shopping", tags: ["need"] }), "need", "a tag on the row wins");
assert.equal(budgetNeeds({ housing: 2000, food: 600, entertainment: 200, _fire_profile: 1 }), 2600);

// ── Cash ──
assert.equal(safetyPot([{ id: "c", type: "depository", subtype: "checking", balance_current: 5000 }], {}, 20000), 20000, "typed savings count while only checking is connected");
assert.equal(freedomCash(20000), 20000, "all safety cash counts toward freedom (D-95)");

// ── Debts ──
const d = freedomDebt({ otherDebt: 10000, cards: [{ name: "Sapphire", balance: 8000 }, { name: "Amex", balance: 1500 }],
  ladderDebts: [{ name: "Sapphire", balance: 8000, ratePct: 24 }, { name: "Car loan", balance: 10000, ratePct: 6 }] });
assert.equal(d.balance, 18000, "a card on the ladder with a rate is carried; a card paid in full isn't");
assert.equal(Math.round(d.rate * 1000) / 10, 14, "the rate is balance-weighted");
assert.equal(freedomDebt({ otherDebt: 5000, cards: [], ladderDebts: [] }).rate, 0.05, "5% when no rate is known");

const today = new Date(2026, 9, 16);
const cards = [{ plaid_account_id: "full", balance: 1200 }, { plaid_account_id: "carry", balance: 8000 }, { plaid_account_id: "new", balance: 300 }];
const charges = [{ plaid_account_id: "full", date: "2026-09-20", usd: 1300 }, { plaid_account_id: "carry", date: "2026-10-01", usd: 900 },
  { plaid_account_id: "full", date: "2026-06-01", usd: 5000 }];
assert.deepEqual(carriedCards(cards, charges, today).map((c) => c.plaid_account_id), ["carry", "new"], "a card that is only its recent charges is paid in full; one with no charges on record is still offered");

// ── Joint accounts ──
const shares = readAccountShares({ joint: 50, mine: 100, bad: "x" });
assert.deepEqual(shares, { joint: 50 }, "only real shares are kept");
assert.equal(shareOf("joint", shares), 0.5);
assert.equal(shareOf("mine", shares), 1, "an account not marked is all yours");
assert.equal(shareOf(null, shares), 1, "a typed row is all yours");
assert.deepEqual(applyAccountShares([{ plaid_account_id: "joint", balance_current: 10000, balance_available: null }], shares)[0],
  { plaid_account_id: "joint", balance_current: 5000, balance_available: null }, "a shared balance counts half");

// ── Households ──
const joint = (user_id, date, amount, description) => ({ user_id, date, amount, refund_amount: 0, currency: "USD", description });
const hh = householdSpending([
  ...["2026-07", "2026-08", "2026-09"].flatMap((m) => [joint("a", `${m}-01`, 2000, "Rent"), joint("b", `${m}-01`, 2000, "Rent"), joint("b", `${m}-10`, 500, "Groceries")]),
], "2026-10", (n) => n);
assert.equal(hh.average, 2500, "joint rent seen by both partners counts once");

// ── Goals ──
assert.equal(goalMonthly({ target_amount: 1200, current_saved: 0, target_date: "2027-10-01" }, new Date(2026, 9, 16)), 100, "a goal needs the rest over the months left");

console.log("Money rules checks passed.");
