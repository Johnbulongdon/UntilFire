#!/usr/bin/env node
/**
 * Plan shows the freedom date beside the assumptions that move it, and it is
 * the same date Home shows. Choosing a different growth rate used to change
 * nothing visible on Plan, because the date only appeared on Home.
 *
 * The dashboard needs a signed-in session to render, so this lifts the real
 * functions out of app/dashboard/page.tsx and runs them.
 *
 * Run: npm run test:plan-freedom-date
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

const file = 'app/dashboard/page.tsx';
const source = readFileSync(file, 'utf8');
const ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const pick = (name) => {
  let text;
  ast.forEachChild((node) => { if (ts.isFunctionDeclaration(node) && node.name?.text === name) text = node.getText(ast); });
  assert.ok(text, `${name} exists in ${file}`);
  return text;
};
const code = ['calcProjection', 'freedomProjection', 'projectionInputs', 'effectiveBalances', 'effectiveDebts', 'isRetirementInvestmentAccount', 'isBrokerageInvestmentAccount', 'normalizePlaidSubtype', 'exactFreedomDateFrom', 'PlanFreedomDate'].map(pick).join('\n')
  + '\nexports.freedomProjection = freedomProjection; exports.calcProjection = calcProjection; exports.PlanFreedomDate = PlanFreedomDate; exports.effectiveBalances = effectiveBalances; exports.effectiveDebts = effectiveDebts;';
const exports = {};
vm.runInNewContext(ts.transpileModule(code, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React, target: ts.ScriptTarget.ES2020 } }).outputText,
  { exports, Math, Date, Object, React, REAL_RETURN: 0.069 });
const { freedomProjection, calcProjection, PlanFreedomDate, effectiveBalances, effectiveDebts } = exports;

// A person: $8k/month take-home, $5k spending, $60k invested, $10k in a linked bank account.
const base = {
  income: 8000, expenses: { housing: 2500, food: 1000, other: 1500, _fire_profile: 0 }, k401: 40000, rothIRA: 10000, taxable: 10000,
  cashSavings: 0, totalDebt: 0, mortgageBalance: 0, mortgageMonthly: 0, withdrawalRate: 0.04,
  plaidAccounts: [{ type: 'depository', balance_current: 10000 }, { type: 'credit', balance_current: 3000 }],
  retirementCityCol: 0, lifestyleMultiplier: 1, monthlyWorkCosts: undefined, taxEnabled: false, retirementTaxRate: 0, rothPct: 0,
};
const at = (growthRate) => freedomProjection({ ...base, growthRate });

// Same numbers Home computed before (its inputs, written out as Home had them).
const home = calcProjection({ annualIncome: 96000, monthlyExpenses: 5000, k401: 40000, rothIRA: 10000, taxable: 10000, cashSavings: 10000, totalDebt: 0, mortgageBalance: 0, mortgageMonthly: 0, growthRate: 0.069, withdrawalRate: 0.04, targetMonthlyExpenses: undefined, taxEnabled: false, retirementTaxRate: 0, rothPct: 0 });
assert.equal(at(0.069).fireYear, home.fireYear, 'Plan and Home get the same freedom year');
assert.equal(at(0.069).fireTarget, home.fireTarget, 'and the same target');

// Debt is paid out of savings, not on top of investing all of them (D-32).
// $36k a year saved, $20k of debt: $10.8k goes to the debt, $25.2k is invested.
const withDebt = calcProjection({ annualIncome: 96000, monthlyExpenses: 5000, k401: 40000, rothIRA: 10000, taxable: 10000, cashSavings: 10000, totalDebt: 20000, mortgageBalance: 0, mortgageMonthly: 0, growthRate: 0.069, withdrawalRate: 0.04 });
assert.equal(withDebt.data[1]['Contributions'], 70000 + 36000 - 10800, 'year one invests savings less the debt payment');
assert.ok(withDebt.data[10]['Investable'] < home.data[10]['Investable'] - 20000, 'paying the debt leaves less invested ten years on');
assert.equal(withDebt.firstYearInvested, 36000 - 10800, "Plan's tools are told the savings actually invested, after debt");

// Plan's tools take the freedom date's own numbers (D-33).
assert.match(source, /<PurchaseImpactPanel\s+currentSavings=\{planFacts\.invested\}\s+monthlyContribution=\{planFacts\.monthlySavings\}\s+fireTarget=\{planFacts\.fireTarget\}/, 'purchase impact uses the freedom date numbers');
assert.match(source, /<TaxProfileCard[\s\S]{0,120}monthlyExpenses=\{planFacts\.retirementMonthly\}/, 'the tax card works on the retirement target');
// Explore in Plan (D-58, replacing Expat FIRE) takes the freedom date's balances, savings, growth and target multiple.
assert.match(source, /saved: planFacts\.invested, monthlySaving: planFacts\.monthlySavings[\s\S]{0,120}realReturn: growthRate, targetMultiple: lifestyleMultiplier \* planFacts\.targetPerDollar/, 'Explore uses the freedom date numbers and target multiple');
assert.match(source, /<ExploreClient appPlan=\{explorePlan\}/, 'Plan → Explore gets the plan numbers');
const taxed = calcProjection({ annualIncome: 96000, monthlyExpenses: 5000, k401: 0, rothIRA: 0, taxable: 0, cashSavings: 0, totalDebt: 0, mortgageBalance: 0, mortgageMonthly: 0, growthRate: 0.069, withdrawalRate: 0.04, taxEnabled: true, retirementTaxRate: 0.2, rothPct: 0 });
assert.equal(Math.round(taxed.fireTarget / 60000 * 1000) / 1000, 31.25, 'target per dollar of spending is 1 ÷ 4% × the tax gross-up (Explore multiplies city costs by it)');

// A connected account replaces the typed balance of the same kind (D-32).
const typedAndLinked = effectiveBalances({ k401: 40000, rothIRA: 10000, taxable: 10000, cashSavings: 5000,
  plaidAccounts: [{ type: 'investment', subtype: '401k', balance_current: 52000 }, { type: 'depository', balance_current: 8000 }, { type: 'credit', balance_current: 900 }] });
assert.deepEqual({ ...typedAndLinked }, { k401: 52000, rothIRA: 0, taxable: 10000, cashSavings: 8000 }, 'linked 401(k) replaces 401(k) and Roth; bank replaces cash; taxable stays typed');
const both = freedomProjection({ ...base, plaidAccounts: [{ type: 'investment', subtype: 'brokerage', balance_current: 10000 }, { type: 'depository', balance_current: 10000 }], growthRate: 0.069 });
assert.equal(both.fireYear, home.fireYear, 'a linked brokerage account holding the typed $10k is not counted twice');

// Debts by the same rule as balances (D-35).
const debts = effectiveDebts({ totalDebt: 12000, mortgageBalance: 300000, plaidAccounts: [
  { type: 'loan', subtype: 'student', balance_current: 15000 }, { type: 'loan', subtype: 'mortgage', balance_current: 295000 },
  { type: 'credit', subtype: 'credit card', balance_current: 1800 }, { type: 'depository', balance_current: 5000 }] });
assert.deepEqual({ ...debts }, { otherDebt: 15000, mortgage: 295000, cards: 1800 }, 'linked loans replace typed debt and mortgage; cards are counted on their own');
assert.deepEqual({ ...effectiveDebts({ totalDebt: 12000, mortgageBalance: 0, plaidAccounts: [] }) }, { otherDebt: 12000, mortgage: 0, cards: 0 }, 'nothing linked: typed figures stand');
const linkedLoan = freedomProjection({ ...base, totalDebt: 20000, plaidAccounts: [...base.plaidAccounts, { type: 'loan', subtype: 'auto', balance_current: 20000 }], growthRate: 0.069 });
const typedLoan = freedomProjection({ ...base, totalDebt: 20000, growthRate: 0.069 });
assert.equal(linkedLoan.data[1]['Contributions'], typedLoan.data[1]['Contributions'], 'a typed loan that is also linked is paid once, not twice');

// The growth choice moves the date, in the right direction.
const d5 = at(0.05).exactDate, d69 = at(0.069).exactDate, d81 = at(0.081).exactDate;
assert.ok(d5 && d69 && d81, 'all three reach freedom');
assert.ok(d5 > d69 && d69 > d81, 'lower growth, later date');
const yearsLater = (d5 - d69) / (365.25 * 864e5);
assert.ok(yearsLater > 1, `5% is years later than 6.9% (${yearsLater.toFixed(2)})`);

// Plan's summary shows the date and says what the choice changed.
const html = (props) => renderToStaticMarkup(React.createElement(PlanFreedomDate, props));
const withDelta = html({ date: d5, fireAge: 30, years: 20, growthPct: 5, deltaYears: yearsLater });
assert.match(withDelta, /Your freedom date/);
assert.match(withDelta, new RegExp(d5.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })));
assert.match(withDelta, /years <!-- -->later|years later/);
assert.match(withDelta, /6\.9% default/);
assert.doesNotMatch(html({ date: d69, fireAge: 30, years: 20, growthPct: 6.9, deltaYears: 0 }), /default\./, 'no comparison at the default');
assert.match(html({ date: null, fireAge: 30, years: null, growthPct: 6.9, deltaYears: null }), /Not reached/);

// Wiring: Plan shows it above the assumptions, and Home uses the same function.
assert.match(source, /<PlanFreedomDate[\s\S]{0,3000}<FireAssumptionsCard\s+freedomDateLabel=/, 'Plan shows the date (then what moves it, D-42) above the assumptions card, and the card repeats it by the growth picker');
assert.match(source, /useMemo\(\(\) => freedomProjection\(\{\s*income, expenses,/, 'Home computes its date with freedomProjection');
assert.doesNotMatch(source, /Assumptions live in Profile/, 'stale copy is gone');
assert.match(readFileSync('app/dashboard/FireAssumptionsCard.tsx', 'utf8'), /your freedom date is \{freedomDateLabel\}/, 'the card says the date under the growth picker');

// D-59: plan settings. A person at 28 with $190k invested, saving $50k a year from $125k.
const person = { annualIncome: 125000, monthlyExpenses: 75000 / 12, k401: 85000, rothIRA: 7500, taxable: 97000, cashSavings: 0,
  totalDebt: 0, mortgageBalance: 0, mortgageMonthly: 0, growthRate: 0.05, withdrawalRate: 0.04 };
const p0 = calcProjection(person);
assert.equal(p0.bridge, null, 'without an access age there is no bridge');
assert.equal(p0.totalYear, p0.fireYear, 'without an access age, free when the total reaches the target');
// Spending once free is the goal: the target is that spending over the withdrawal rate.
const goal = calcProjection({ ...person, retirementAnnualSpend: 112500 });
assert.equal(goal.fireTarget, 112500 / 0.04);
assert.ok(goal.fireYear > p0.fireYear, 'spending more once free is later');
// Employer money and pay growth only bring the date closer.
const employer = calcProjection({ ...person, retirementAnnualSpend: 112500, employerAnnual: 20000 });
assert.ok(employer.fireYear < goal.fireYear, 'employer money brings the date closer');
assert.equal(employer.firstYearInvested, goal.firstYearInvested + 20000, 'employer money counts as saved');
const raises = calcProjection({ ...person, retirementAnnualSpend: 112500, payGrowth: 0.02 });
assert.ok(raises.fireYear <= goal.fireYear, 'saved raises never push the date out');
// Access age: free only once the money reachable before the pension opens lasts until it does.
const locked = { ...person, k401: 400000, rothIRA: 0, taxable: 0, retirementAnnualSpend: 60000, currentAge: 30 };
const noAge = calcProjection(locked), withAge = calcProjection({ ...locked, accessAge: 59.5 });
assert.equal(withAge.totalYear, noAge.fireYear, 'the total reaches the target in the same year');
assert.ok(withAge.fireYear === null || withAge.fireYear > noAge.fireYear, 'with most money locked, freedom waits for the bridge');
const bridgeAtTotal = calcProjection({ ...locked, accessAge: 59.5, years: noAge.fireYear });
assert.ok(bridgeAtTotal.bridge && bridgeAtTotal.bridge.reachable < bridgeAtTotal.bridge.needed, 'the bridge says it is short');
const late = calcProjection({ ...locked, currentAge: 58, accessAge: 59.5 });
assert.ok(late.fireYear !== null && late.fireYear >= noAge.fireYear, 'near the access age the bridge is short and soon over');
// Mortgage interest uses your rate.
const m = (rate) => calcProjection({ ...person, mortgageBalance: 300000, mortgageMonthly: 2000, mortgageRate: rate }).data[5]['Debt'];
assert.ok(m(0.03) > m(0.07), 'a lower rate pays the mortgage down faster');

// Your own split: saving from take-home goes tax-free first, the rest taxable; none to the 401(k) when a pension is set.
const own = calcProjection({ ...person, pensionAnnual: 24500, taxFreeAnnual: 7500 }), y1 = own.data[1];
const takeHomeSaving = person.annualIncome - person.monthlyExpenses * 12;
assert.equal(Math.round(y1['401(k)'] - person.k401 * 1.05), 24500, 'only the pension reaches the 401(k)');
assert.equal(Math.round(y1['Roth IRA'] - person.rothIRA * 1.05), 7500, 'the tax-free account gets its amount');
assert.equal(Math.round(y1['Taxable'] - person.taxable * 1.05), takeHomeSaving - 7500, 'the rest is taxable');
// Reachable money: taxable, cash and Roth paid in; the bridge passes with it in taxable, fails with it locked.
const bridged = (o) => calcProjection({ ...person, k401: 85000, retirementAnnualSpend: 112500, currentAge: 28, accessAge: 59.5, ...o });
assert.ok(bridged({ pensionAnnual: 24500, taxFreeAnnual: 7500 }).fireYear <= bridged({}).fireYear, 'saving into reachable accounts never delays the bridge');

// D-61: mortgages, each at its own rate; one paid off frees its payment for saving.
const twoLoans = { ...person, monthlyExpenses: 40000 / 12, mortgages: [{ balance: 20000, monthly: 1000, rate: 0.04 }, { balance: 300000, monthly: 2000, rate: 0.07 }] };
const oneMerged = { ...person, monthlyExpenses: 40000 / 12, mortgageBalance: 320000, mortgageMonthly: 3000, mortgageRate: 0.065 };
const tl = calcProjection(twoLoans), om = calcProjection(oneMerged);
assert.equal(tl.data[0]['Debt'], -320000, 'every mortgage is owed');
assert.ok(tl.data[3]['Debt'] > om.data[3]['Debt'] || tl.fireYear <= om.fireYear, 'paying off the small loan frees its payment');
assert.ok(tl.firstYearInvested === om.firstYearInvested, 'year one saves the same: both pay $3,000 a month');
const freed = calcProjection({ ...twoLoans, years: 4 }).data;
assert.ok(freed[3]['Investable'] > calcProjection({ ...oneMerged, years: 4 }).data[3]['Investable'], 'once the small loan is gone its $1,000 a month is invested');
const rateMatters = (r) => calcProjection({ ...person, mortgages: [{ balance: 300000, monthly: 2000, rate: r }] }).data[10]['Debt'];
assert.ok(rateMatters(0.03) > rateMatters(0.07), 'each mortgage is paid down at its own rate');

if (process.env.SHOW) for (const g of [0.05, 0.069, 0.081]) console.log(g, at(g).exactDate.toISOString().slice(0, 7));
console.log('Plan freedom date checks passed.');
