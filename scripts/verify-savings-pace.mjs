import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import ts from 'typescript';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
const require = createRequire(import.meta.url);
const load = (path, deps = {}) => {
 const mod = { exports: {} };
 vm.runInNewContext(ts.transpileModule(readFileSync(path, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText,
 { exports: mod.exports, module: mod, require: id => deps[id] ?? require(id) });
 return mod.exports;
};
const engine = load('lib/fire/strategies/traditional.ts', { '../../sp500-history.ts': load('lib/sp500-history.ts') });
const helpers = load('lib/savings-pace.ts', { './fire/strategies/traditional': engine });
const plan = { monthlyIncome: 6000, monthlySavings: 1500, annualCost: 54000, portfolioBalance: 135000, realReturn: 0, cityName: 'Austin', currentAge: 32, defaultCurrency: 'USD', landingSource: 'test' };
const original = helpers.savingsPace(plan, 1500);
assert.equal(original.plan, plan, 'original keeps the exact prior handoff');
for (const amount of [1250, 1750]) {
 const p = helpers.savingsPace(plan, amount);
 assert.equal(p.amount + p.spending, 6000);
 assert.equal(p.plan.annualCost, (6000 - amount) * 12);
 assert.equal(p.result.fireTarget, (6000 - amount) * 12 * 25);
 const expected = (p.result.fireTarget - 135000) / (amount * 12);
 assert.ok(expected > 65 ? p.result.years === null : Math.abs(p.result.years - expected) < 1e-8, 'independent zero-return calculation including the 65-year horizon');
 assert.equal(p.plan.monthlyIncome, 6000);
 assert.equal(p.plan.landingSource, 'test');
}
assert.ok(helpers.savingsPace({ ...plan, realReturn: 0.05 }, 1750).result.years < helpers.savingsPace({ ...plan, realReturn: 0.05 }, 1500).result.years);
assert.ok(helpers.savingsPace({ ...plan, realReturn: 0.05 }, 1250).result.years > helpers.savingsPace({ ...plan, realReturn: 0.05 }, 1500).result.years);
assert.equal(helpers.savingsPace(plan, 0).result.years, null);
assert.equal(helpers.savingsPace(plan, 6000).result.years, 0);
assert.equal(helpers.savingsPace(plan, 9000).amount, 6000);
assert.equal(helpers.savingsPace(plan, -5).amount, 0);
assert.equal(helpers.savingsPace(plan, NaN).amount, 1500);
assert.equal(helpers.paceDate(null, 0), 'Not reached yet');
assert.equal(helpers.paceDate(0, 0), 'Now');
const ui = load('app/components/SavingsPace.tsx', {
 'react': { ...React, useId: () => 'pace', useState: v => [typeof v === 'function' ? v() : v, () => {}] },
 '@/lib/savings-slider': load('lib/savings-slider.ts'),
 '@/app/components/motion/MotionScene': load('app/components/motion/MotionScene.tsx', { '@/lib/browser-motion': load('lib/browser-motion.ts') }),
 '@/app/components/Logo': { default: () => null }, '@/lib/savings-pace': helpers, '@/lib/currency':load('lib/currency.ts'),
});
function walk(node, predicate) {
 if (!node || typeof node !== 'object') return;
 if (predicate(node)) return node;
 for (const child of React.Children.toArray(node.props?.children)) { const found = walk(child, predicate); if (found) return found; }
}
for (const amount of [0, 1250, 1500, 1750, 6000]) {
 let used;
 const tree = ui.default({ prefill: plan, value: amount, onBack: () => {}, onUse: p => { used = p; } });
 const html = renderToStaticMarkup(tree);
 assert.doesNotMatch(html, /NaN|Infinity/);
 const button = walk(tree, n => n.type === 'button' && n.props.className === 'pace-submit');
 assert.equal(button.props.children, amount === 1500 ? 'Use original plan' : 'Use updated plan');
 button.props.onClick();
 assert.equal(used.monthlySavings, amount);
 assert.ok(walk(tree, n => n.type === 'input' && n.props.type === 'range'));
 assert.match(html, /to spend/);
}
console.log('Savings pace: independent projections, fixed income, bounds, original restore and selected handoff pass.');

for(const currency of ['HKD','EUR','JPY']){
 const rate=load('lib/currency.ts').FALLBACK_RATES[currency];let used;
 const tree=ui.default({prefill:{...plan,defaultCurrency:currency},value:1750,onBack:()=>{},onUse:p=>{used=p}});
 const input=walk(tree,n=>n.type==='input'&&n.props.type==='number');
 assert.equal(Number(input.props.value),Math.round(1750*rate),'local input must show converted money');
 walk(tree,n=>n.type==='button'&&n.props.className==='pace-submit').props.onClick();
 assert.ok(Math.abs(used.monthlySavings-1750)<1e-8,'saved plan must stay in USD');
}
console.log('Display currencies round-trip without changing the USD projection.');

const slider=load('lib/savings-slider.ts');
for(const [rate,digits] of [[1,2],[7.8,2],[.92,2],[150,0]]){
 const originalUSD=1500.25,display=Math.round(originalUSD*rate),max=Math.round(4500.25*rate);
 const step=1;
 const right=slider.savingsSliderAmount(display+step,display,max,digits);
 const restored=slider.savingsSliderAmount(right-step,display,max,digits);
 assert.equal(restored,Math.round(display),'Arrow round trip preserves the original display value');
 assert.equal(slider.savingsDisplayUSD(restored,originalUSD,rate),originalUSD,'Restored currency returns exact USD original');
 assert.equal(helpers.savingsPace({...plan,monthlySavings:originalUSD},slider.savingsDisplayUSD(restored,originalUSD,rate)).changed,false);
}
assert.equal(slider.savingsSliderAmount(560.46,500,3000),560);
console.log('Whole-number display and local-currency slider undo preserve the exact original plan.');
