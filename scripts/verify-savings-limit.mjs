import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import ts from 'typescript';
import React from 'react';
const require = createRequire(import.meta.url);
const source = readFileSync('app/HomeClient.tsx', 'utf8');
const ast = ts.createSourceFile('HomeClient.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const component = ast.statements.find(n => ts.isFunctionDeclaration(n) && n.name?.text === 'SavingsScreen');
const js = ts.transpileModule(component.getText(ast), { compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS } }).outputText;
for (const currency of ['USD', 'EUR']) {
  let state = [], cursor = 0, saved;
  const context = vm.createContext({ exports: {}, require, getCurrencySymbol: () => '$', FALLBACK_RATES: { EUR: 0.9 },
    useState(initial) { const i=cursor++; if (!(i in state)) state[i]=initial; return [state[i], v => {state[i]=v;}]; } });
  vm.runInContext(js, context);
  const render = () => { cursor=0; return context.SavingsScreen({income:12000,currency,onNext:(...v)=>saved=v,onBack:()=>{}}); };
  function all(node) { if(!node || typeof node!=='object') return []; return [node,...React.Children.toArray(node.props?.children).flatMap(all)]; }
  const input = () => all(render()).find(n=>n.type==='input' && n.props.type==='number');
  const click = label => all(render()).find(n=>n.type==='button' && String(n.props.children).includes(label)).props.onClick();
  const limit = currency==='EUR'?900:1000;
  assert.equal(input().props.value, limit, 'Default cannot exceed income');
  const slider = () => all(render()).find(n=>n.type==='input' && n.props.type==='range');
  assert.equal(slider().props.step, 1);
  slider().props.onChange({target:{value:'289.194915254237'}});
  assert.equal(input().props.value,289,'Slider amounts are whole numbers');
  input().props.onChange({target:{value:'289.7'}});
  assert.equal(input().props.value,290,'Typed amounts are rounded');
  click('Yearly'); input().props.onChange({target:{value:'3500'}}); click('Monthly');
  assert.equal(input().props.value,292,'Period conversion rounds the displayed amount');
  input().props.onChange({target:{value:'999999'}});
  assert.equal(input().props.value, limit, 'Typed savings are capped');
  click('Yearly'); assert.equal(input().props.max,limit*12);
  input().props.onChange({target:{value:'999999'}});
  click('Continue'); assert.ok(saved[0]<=1000); assert.equal(saved[1],0);
  click('Monthly'); assert.equal(input().props.value,limit);
  click('I know my spending'); input().props.onChange({target:{value:String(limit*2)}});
  click('Continue'); assert.equal(saved[0],0, 'Overspending produces zero saved');
  assert.ok(saved[1]>1000, 'Spending may exceed income');
  click('I know my savings'); assert.equal(input().props.value,limit);
  input().props.onChange({target:{value:'-10'}}); click('Continue'); assert.equal(saved[0],0);
}
console.log('Savings limits passed: default, typed values, monthly/yearly, currency, mode switches, and handoff.');
