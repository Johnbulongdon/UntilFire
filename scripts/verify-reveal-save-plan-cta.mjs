import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import ts from 'typescript';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

const require = createRequire(import.meta.url);
// The reveal's own lib imports, loaded from source rather than stubbed.
const loadTs = (path, deps = {}) => {
  const mod = { exports: {} };
  vm.runInNewContext(ts.transpileModule(readFileSync(path, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText, { exports: mod.exports, module: mod, require: (id) => deps[id] ?? require(id) });
  return mod.exports;
};
const fireNumber = loadTs('lib/fire-number.ts', { './sp500-history.ts': loadTs('lib/sp500-history.ts') });
const yearCubes = loadTs('components/ui/YearCubes.tsx');
// Exercise the real final-step component/callback without the video or animation.
let selectedOverride = null;
let selectedSaved;
const exports = {};
vm.runInNewContext(ts.transpileModule(readFileSync('app/components/RevealFlow.tsx', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
}).outputText, {
  exports,
  require: (id) => id === 'react' ? {
    ...React, useEffect: () => {}, useMemo: (fn) => fn(), useRef: (value) => ({ current: value }),
    useState: (value) => [value === 1 ? 7 : value === null ? selectedOverride : typeof value === 'function' ? value() : value, () => {}],
  } : id === '@/components/ui/YearCubes' ? yearCubes : id === '@/app/components/Logo' ? { default: () => React.createElement('img', { src: '/logo/horizon-color.svg', alt: 'UntilFire' }) } : id === '@/app/components/PercentileTrack' ? { default: () => null } : id === 'next/dynamic' ? { default: () => () => null } : id === '@/app/components/SavingsPace' ? { default: () => null } : id === '@/lib/journey' ? { saveCalculatorPrefill: p => { selectedSaved = p; } } : id === '@/lib/fire-number' ? fireNumber
    // The save step's backdrop and sign-up card (D-96), stubbed: their own checks live elsewhere.
    : id === '@/app/components/auth/HomeBackdrop' ? { default: () => null }
    : id === '@/app/components/auth/SignInCard' ? { default: (p) => React.createElement('signin-card', { 'data-verb': p.verb, onClick: p.onStart }) }
    // The Freedom age share button (D-98), stubbed: test:freedom-share covers it.
    : id === '@/app/components/ShareFreedomYear' ? { default: () => null }
    : require(id),
});
const props = {
  freedomAge: 52, freedomYear: 2048, yearsToFire: 22, planningAge: 30,
  ageWasAssumed: false, returnPct: fireNumber.DEFAULT_RETURN_PCT, isAlreadyFire: false, fireTarget: 1200000, pctThere: 0,
  savingsRatePct: 20, usBaselineRate: 5, fireBenchmarkRate: 25,
  expatHome: { name: 'Austin', lat: 30, lng: -97 }, expatBaseAge: 52, expatCities: [],
  formatCompact: (n) => `$${n}`, onAdjust: () => {}, onShare: () => {},
};
function findButton(node, label) {
  if (!node || typeof node !== 'object') return;
  if (node.type === 'button' && String(node.props.children).includes(label)) return node;
  for (const child of React.Children.toArray(node.props?.children)) {
    const match = findButton(child, label);
    if (match) return match;
  }
}
function findCard(node) {
  if (!node || typeof node !== 'object') return;
  if (node.props?.verb) return node;
  for (const child of React.Children.toArray(node.props?.children)) {
    const match = findCard(child);
    if (match) return match;
  }
}
// The save step is the sign-up card itself (D-96): starting sign-up keeps the result.
for (const yearsToFire of [22, 0]) {
  let kept = 0;
  const tree = exports.default({ ...props, yearsToFire, prefill: {}, onKeepResult: () => { kept++; }, onSave: () => { throw new Error('the save step does not leave for /login'); } });
  const html = renderToStaticMarkup(tree);
  assert.match(html, /is just your starting point/);
  assert.match(html, /data-verb="Save"/);
  assert.doesNotMatch(html, /EXPLORE SCENARIOS|Save \$500|future 5% raise|sabbatical/);
  for (const label of ['Back to results', 'Adjust inputs', 'Share result']) assert.ok(findButton(tree, label), label);
  findCard(tree).props.onStart();
  assert.equal(kept, 1);
}
{
  let saves = 0;
  const tree = exports.default({ ...props, yearsToFire: null, prefill: {}, onKeepResult: () => {}, onSave: () => { saves++; } });
  const html = renderToStaticMarkup(tree);
  assert.match(html, /Save my starting point/);
  findButton(tree, 'Save my starting point').props.onClick();
  assert.equal(saves, 1);
  assert.match(html, /Not reached under these assumptions/);
  assert.doesNotMatch(html, /2048|Infinity|NaN|Free years|Share result/);
  assert.ok(findButton(tree, 'Adjust inputs'));
}
console.log('Starting-point save and unreachable-result rendering checks passed.');
// Verify the real save handler carries entered numbers through the browser handoff.
const home = readFileSync('app/HomeClient.tsx', 'utf8');
const ast = ts.createSourceFile('HomeClient.tsx', home, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
let handler;
function visit(node) {
  if (ts.isFunctionDeclaration(node) && node.name?.text === 'RevealScreen') {
    function find(child) {
      if (ts.isVariableStatement(child) && ['prefill', 'keepResult', 'onSave'].includes(child.declarationList.declarations[0].name.getText(ast))) handler = (handler ?? '') + child.getText(ast) + '\n';
      ts.forEachChild(child, find);
    }
    find(node);
  }
  ts.forEachChild(node, visit);
}
visit(ast);
assert.ok(handler, 'Starting-point save handler exists');
for (const retireYear of [2048, null]) {
  let saved;
  let destination;
  // The handler records which CTA was used before saving (eb53299), so the
  // sandbox provides the analytics call and checks what it was given.
  const tracked = [];
  const scope = {
    trackRevealCtaClicked: (props) => { tracked.push(JSON.parse(JSON.stringify(props))); },
    exports: {}, Math, Date, takeHome: 60000, savings: 1000,
    city: { name: 'Austin', col: 48000 }, stateKey: 'TX',
    result: { fireTarget: 1200000, retireYear }, planningAge: 30,
    // An age the visitor gave, or none: the assumed 30 is never saved as theirs.
    currentAge: retireYear ? 34 : undefined,
    portfolioBalance: 25000, landingSource: 'beta', currency: 'USD', marketReturn: 0.05,
    saveCalculatorPrefill: (value) => { saved = JSON.parse(JSON.stringify(value)); },
    router: { push: (path) => { destination = path; } },
  };
  vm.runInNewContext(ts.transpileModule(`${handler}\nexports.save = onSave;`, {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText, scope);
  scope.exports.save('reveal_save_step');
  assert.deepEqual(tracked, [{ placement: 'reveal_save_step', landingSource: 'beta' }], 'the save click is tracked once, with its placement');
  assert.equal(saved.monthlyIncome, 5000);
  assert.equal(saved.monthlySavings, 1000);
  assert.equal(saved.monthlySpendEstimate, 4000);
  assert.equal(saved.portfolioBalance, 25000);
  assert.equal(saved.retireYear, retireYear ?? undefined);
  assert.equal(saved.realReturn, 0.05, 'the growth the result was shown at carries into the dashboard');
  assert.equal(saved.currentAge, retireYear ? 34 : undefined, 'only an age the visitor entered is saved, never the assumed 30');
  assert.equal(destination, '/login');
}
console.log('Starting-point handoff preserves entered finances and omits unreached dates.');

// Chosen pace overrides the original handoff immediately before sign-in starts.
selectedOverride = { monthlyIncome: 6000, monthlySavings: 1750, monthlySpendEstimate: 4250, annualCost: 51000, retireYear: 2045, portfolioBalance: 135000, realReturn: 0.069 };
let originalKept = false;
const selectedTree = exports.default({ ...props, prefill: { monthlySavings: 1500 }, onKeepResult: () => { originalKept = true; }, onSave: () => {} });
assert.match(renderToStaticMarkup(selectedTree), /2045/);
findCard(selectedTree).props.onStart();
assert.ok(originalKept);
assert.equal(selectedSaved.monthlySavings, 1750);
assert.equal(selectedSaved.monthlySpendEstimate, 4250);
assert.equal(selectedSaved.annualCost, 51000);
assert.equal(selectedSaved.retireYear, 2045);
assert.equal(selectedSaved.portfolioBalance, 135000);
assert.ok(selectedSaved.generatedAt);
console.log('Selected savings pace reaches the actual sign-in handoff.');