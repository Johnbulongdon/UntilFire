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

// Exercise the real save callback with delayed database replies: fast removals
// must persist in order, and an earlier failure must not hide a later success.
const source=readFileSync('app/dashboard/page.tsx','utf8');
const ast=ts.createSourceFile('page.tsx',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
let saveDeclaration;
function visit(node) {
 if(ts.isVariableDeclaration(node)&&node.name.getText(ast)==='persistLayout') saveDeclaration=node.getText(ast);
 ts.forEachChild(node,visit);
}
visit(ast);
assert.ok(saveDeclaration);
const pending=[],writes=[],busy=[],errors=[];
const output={};
vm.runInNewContext(ts.transpileModule(`const ${saveDeclaration}; exports.save = persistLayout;`,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{
 exports:output,useCallback:fn=>fn,userId:'test-user',setLayout(){},
 setSavingLayout:v=>busy.push(v),setLayoutError:e=>errors.push(e),
 saveQueue:{current:Promise.resolve()},saveRevision:{current:0},
 supabase:{from:()=>({update:body=>({eq:()=>{writes.push(body.dashboard_layout);return new Promise(resolve=>pending.push(resolve));}})})}
});
const first=output.save({cards:['first']}),second=output.save({cards:['second']});
await new Promise(setImmediate);
assert.equal(writes.length,1,'only the first write starts before its reply');
pending.shift()({error:new Error('temporary failure')});
await new Promise(setImmediate);
assert.equal(writes.length,2,'the next write runs even if the preceding one fails');
assert.equal(writes[1].cards[0],'second');
assert.ok(!busy.includes(false),'saving stays visible while the newest write is pending');
pending.shift()({error:null});
await Promise.all([first,second]);
assert.equal(busy.at(-1),false);
assert.equal(errors.at(-1),'');
console.log('Layout persistence regression passed: ordered writes and recovery after an earlier failure.');
