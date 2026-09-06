import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import ts from 'typescript';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

const require = createRequire(import.meta.url);
// Exercise the real final-step component/callback without the video or animation.
const exports = {};
vm.runInNewContext(ts.transpileModule(readFileSync('app/components/RevealFlow.tsx', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
}).outputText, {
  exports,
  require: (id) => id === 'react' ? {
    ...React, useEffect: () => {}, useMemo: (fn) => fn(), useRef: (value) => ({ current: value }),
    useState: (value) => [value === 1 ? 7 : typeof value === 'function' ? value() : value, () => {}],
  } : id === 'next/dynamic' ? { default: () => () => null } : require(id),
});
const props = {
  freedomAge: 52, freedomYear: 2048, yearsToFire: 22, planningAge: 30,
  ageWasAssumed: false, isAlreadyFire: false, fireTarget: 1200000, pctThere: 0,
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
for (const yearsToFire of [22, 0, null]) {
  let saves = 0;
  const tree = exports.default({ ...props, yearsToFire, onSave: () => { saves++; } });
  const html = renderToStaticMarkup(tree);
  assert.match(html, /Save my starting point/);
  assert.doesNotMatch(html, /EXPLORE SCENARIOS|Save \$500|future 5% raise|sabbatical/);
  const button = findButton(tree, 'Save my starting point');
  assert.ok(button);
  button.props.onClick();
  assert.equal(saves, 1);
  if (yearsToFire === null) {
    assert.match(html, /Not reached under these assumptions/);
    assert.doesNotMatch(html, /2048|Infinity|NaN|Free years|Share result/);
    assert.ok(findButton(tree, 'Adjust inputs'));
  }
}
console.log('Starting-point save and unreachable-result rendering checks passed.');
// Verify the real save handler carries entered numbers through the browser handoff.
const home = readFileSync('app/HomeClient.tsx', 'utf8');
const ast = ts.createSourceFile('HomeClient.tsx', home, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
let handler;
function visit(node) {
  if (ts.isFunctionDeclaration(node) && node.name?.text === 'RevealScreen') {
    function find(child) {
      if (ts.isVariableDeclaration(child) && child.name.getText(ast) === 'onSave') handler = child.initializer.getText(ast);
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
  const scope = {
    exports: {}, Math, Date, takeHome: 60000, savings: 1000,
    city: { name: 'Austin', col: 48000 }, stateKey: 'TX',
    result: { fireTarget: 1200000, retireYear }, planningAge: 30,
    portfolioBalance: 25000, landingSource: 'beta', currency: 'USD',
    saveCalculatorPrefill: (value) => { saved = JSON.parse(JSON.stringify(value)); },
    router: { push: (path) => { destination = path; } },
  };
  vm.runInNewContext(ts.transpileModule(`exports.save = ${handler};`, {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText, scope);
  scope.exports.save();
  assert.equal(saved.monthlyIncome, 5000);
  assert.equal(saved.monthlySavings, 1000);
  assert.equal(saved.monthlySpendEstimate, 4000);
  assert.equal(saved.portfolioBalance, 25000);
  assert.equal(saved.retireYear, retireYear ?? undefined);
  assert.equal(destination, '/login');
}
console.log('Starting-point handoff preserves entered finances and omits unreached dates.');
