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
const code = ['calcProjection', 'freedomProjection', 'exactFreedomDateFrom', 'PlanFreedomDate'].map(pick).join('\n')
  + '\nexports.freedomProjection = freedomProjection; exports.calcProjection = calcProjection; exports.PlanFreedomDate = PlanFreedomDate;';
const exports = {};
vm.runInNewContext(ts.transpileModule(code, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React, target: ts.ScriptTarget.ES2020 } }).outputText,
  { exports, Math, Date, Object, React, REAL_RETURN: 0.069 });
const { freedomProjection, calcProjection, PlanFreedomDate } = exports;

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
assert.match(source, /<PlanFreedomDate[\s\S]{0,600}<FireAssumptionsCard\s+freedomDateLabel=/, 'Plan shows the date above the assumptions card, and the card repeats it by the growth picker');
assert.match(source, /useMemo\(\(\) => freedomProjection\(\{\s*income, expenses,/, 'Home computes its date with freedomProjection');
assert.doesNotMatch(source, /Assumptions live in Profile/, 'stale copy is gone');
assert.match(readFileSync('app/dashboard/FireAssumptionsCard.tsx', 'utf8'), /your freedom date is \{freedomDateLabel\}/, 'the card says the date under the growth picker');

if (process.env.SHOW) for (const g of [0.05, 0.069, 0.081]) console.log(g, at(g).exactDate.toISOString().slice(0, 7));
console.log('Plan freedom date checks passed.');
