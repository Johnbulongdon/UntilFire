import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import ts from 'typescript';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { TAX_ESTIMATES_AVAILABLE } from '../lib/release-gates.ts';

const require = createRequire(import.meta.url);
function load(file, mocks = {}) {
 const exports = {};
 const source = readFileSync(file,'utf8');
 vm.runInNewContext(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022}}).outputText,
 {exports,Date,Math,require:id=>id in mocks?mocks[id]:require(id)});
 return exports;
}
const Modal=load('app/dashboard/OnboardingModal.tsx').default;
const modal=renderToStaticMarkup(React.createElement(Modal,{defaultCurrency:'USD',onComplete(){},onDismiss(){}}));
assert.ok(modal.includes('Monthly take-home pay'));
assert.ok(!modal.includes('Gross annual')&&!modal.includes('Where do you pay taxes'));
assert.ok(modal.includes('aria-modal="true"'));
const ui={Card:({children})=>React.createElement('div',null,children),Button:()=>null,Icon:()=>null};
const {FreedomCard}=load('app/dashboard/HomeCards.tsx',{'@/components/ui':ui,'@/app/components/Flag':{default:()=>null,flagUri:()=>null}});
const view=yearsAway=>renderToStaticMarkup(React.createElement(FreedomCard,{dateLabel:'October 2026',yearsAway,age:30,onOpen(){}}));
assert.ok(view(0).includes('Target reached today'));
assert.ok(!view(0).includes('In 1 year'));
assert.ok(view(0.5).includes('In 6 months'),'a future sub-year result must not say already reached');
assert.ok(view(1).includes('In 1 year'));
const mobile=load('mobile/src/lib/projection.ts',{'@engine/release-gates.ts':{TAX_ESTIMATES_AVAILABLE},'@/engine':{REAL_RETURN:0.069}});
const input={annualIncome:60000,monthlyExpenses:3000,k401:0,rothIRA:0,taxable:10000,totalDebt:0,mortgageBalance:0,mortgageMonthly:0,growthRate:0.04,withdrawalRate:0.04};
const before=mobile.calcProjection({...input,taxEnabled:false});
const paused=mobile.calcProjection({...input,taxEnabled:true,retirementTaxRate:0.4,rothPct:10});
assert.equal(paused.fireTarget,before.fireTarget);
assert.equal(paused.fireYear,before.fireYear,'native dates ignore paused saved tax settings');
console.log('Replay repair regressions passed: onboarding, reached/future date labels, and native tax-pause projection.');

// Removing the editor must also remove its reads/writes and ignore old hidden cards.
const source=readFileSync('app/dashboard/page.tsx','utf8');
assert.ok(!/persistLayout|useCardSort|CardInventory|dashboard_layout|DashboardRecovery/.test(source));
const layout=load('lib/dashboard-layout.ts');
const HomeSlot=load('app/dashboard/HomeSlot.tsx',{'@/lib/dashboard-layout':layout}).default;
const home=renderToStaticMarkup(React.createElement(React.Fragment,null,...layout.CARDS.map(c=>React.createElement(HomeSlot,{key:c.id,id:c.id},c.label))));
for(const label of ['Freedom date','Your next move','Left this month','Today','At a glance']) assert.ok(home.includes(label));
assert.ok(!home.includes('Drag')&&!home.includes('Remove')&&!home.includes('Add cards'));
assert.ok(!home.includes('Support UntilFire'));
const legacyRoute=readFileSync('mobile/src/app/home-layout.tsx','utf8');
assert.ok(legacyRoute.includes('<Redirect href="/" />'));
assert.ok(!readFileSync('mobile/src/lib/mutations.ts','utf8').includes('saveHomeLayout'));
console.log('Fixed Home regression passed: standard cards, no editor/layout persistence, and retired phone editor route.');
