import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import * as cash from '../lib/freedom-cash.ts';
import {coastYear} from '../lib/life-changes.ts';
import {freedomDebt} from '../lib/freedom-debt.ts';
import {TAX_ESTIMATES_AVAILABLE} from '../lib/release-gates.ts';

const source=readFileSync('app/dashboard/page.tsx','utf8');
const ast=ts.createSourceFile('page.tsx',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
const names=['calcProjection','projectionInputs','effectiveBalances','effectiveDebts','isRetirementInvestmentAccount','isBrokerageInvestmentAccount','normalizePlaidSubtype'];
let code=readFileSync('lib/fire/retirement-location.ts','utf8').replace(/^export /gm,'');
ast.forEachChild(n=>{if(ts.isFunctionDeclaration(n)&&names.includes(n.name?.text))code+='\n'+n.getText(ast)});
const web={};
vm.runInNewContext(ts.transpileModule(code+'\nexports.run=calcProjection;exports.inputs=projectionInputs;', {compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{exports:web,...cash,freedomDebt,TAX_ESTIMATES_AVAILABLE,REAL_RETURN:.069,Date,Math});
function load(file,mocks){const exports={};vm.runInNewContext(ts.transpileModule(readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{exports,Math,Date,require:id=>{assert.ok(id in mocks,id);return mocks[id]}});return exports;}
const mobile=load('mobile/src/lib/projection.ts',{'@engine/freedom-cash.ts':cash,'@engine/release-gates.ts':{TAX_ESTIMATES_AVAILABLE},'@/engine':{REAL_RETURN:.069}});
const native=load('mobile/src/state/freedom.ts',{'react':{},'@/engine':{CITIES:[],engineMortgages:()=>[],freedomDebt,retirementLocationMonthlySpend:()=>undefined,moveBeforeFreedomChange:()=>null},'@engine/freedom-cash.ts':cash,'@/lib/balances':{isMortgageAccount:()=>false},'@/lib/budget-split':{spendingBasis:d=>({monthly:Object.values(d.budget).reduce((a,b)=>a+b,0)})},'@/lib/projection':mobile,'@/state/account':{},'@/state/plan':{}});
const base={annualIncome:12000,monthlyExpenses:1000,k401:0,rothIRA:0,taxable:20000,cashSavings:10000,totalDebt:0,mortgageBalance:0,mortgageMonthly:0,growthRate:.1,years:2};
const savings=(balance,apy=null)=>({id:'s',name:'Savings',type:'depository',subtype:'savings',balance_current:balance,apy});
const checking={id:'c',type:'depository',subtype:'checking',balance_current:9000,apy:10};
assert.equal(cash.retirementCash([checking],{},1000).cashSavings,1000,'checking never replaces separate typed savings');
assert.equal(cash.retirementCash([savings(0)],{},1000).cashSavings,0,'zero linked savings replace manual cash');
assert.equal(cash.retirementCash([savings(4000)],{s:true},0).cashSavings,0,'cash explicitly used for spending stays out');
assert.equal(cash.retirementCash([checking,savings(4000)],{},9999).cashSavings,4000,'linked savings replace, not add');
assert.equal(cash.retirementCash([checking],{c:false},0).cashSavings,9000,'role overrides are shared');
const weighted=cash.retirementCash([savings(10000,4),{...savings(10000),id:'s2'}],{},0);
assert.ok(Math.abs(weighted.cashGrowthRate-(1.02/1.03-1))<1e-12,'missing APY receives zero interest, weighted by cash');
assert.equal(cash.retirementCash([],{},1000).cashGrowthRate,cash.DEFAULT_CASH_GROWTH);
for(const run of [web.run,mobile.calcProjection]){
 const p=run(base);
 assert.equal(p.data[0].Investable,30000);
 assert.equal(p.data[1].Cash,Math.round(10000/1.03),'unknown APY loses purchasing power');
 assert.equal(p.data[1].Taxable,22000,'investments retain selected equity return');
 const known=run({...base,...cash.retirementCash([savings(10000,4)],{},0)});
 assert.equal(known.data[1].Cash,Math.round(10000*1.04/1.03));
 const moved=run({...base,taxable:10000,cashSavings:20000});
 assert.equal(moved.data[0].Investable,p.data[0].Investable,'transfer creates no instant wealth');
 assert.equal(moved.fireTarget,p.fireTarget,'target is spending-based');
 const spent=run({...base,change:{startYear:0,endYear:1,annualIncome:0}});
 assert.equal(spent.data[1].Cash,0,'cash can fund a shortfall, never also stays permanently reserved');
 assert.equal(spent.data[1].Taxable,19800,'cash is drawn before investments');
 const heavy=run({...base,cashSavings:300000,taxable:0,years:30});
 assert.equal(heavy.fireYear,null,'cash-only money below target never compounds at equity return');
 const added=run({...base,annualIncome:48000,years:50,cashSavings:0});
 const safer=run({...base,annualIncome:48000,years:50,cashSavings:10000});
 assert.ok(safer.fireYear<=added.fireYear,'additional safety cash cannot delay this same plan');
}
assert.ok(Math.abs(cash.bridgeRequired(100,2,100,0,0,.1)-200)<1e-5,'cash bridge cannot borrow equity growth');
assert.ok(Math.abs(cash.bridgeRequired(100,2,0,100,0,.1)-(100+100/1.1))<1e-5);
assert.ok(Math.abs(cash.bridgeRequired(100,1.5,100,0,0,.1)-150)<1e-5);
for(const apy of [null,0,4])for(const age of [0,30,58]){
 const b={...base,...cash.retirementCash([savings(10000,apy)],{},0),years:50,currentAge:age,accessAge:59.5};
 assert.equal(JSON.stringify(web.run(b)),JSON.stringify(mobile.calcProjection(b)),'web/native full projection parity');
}
const args={income:1000,expenses:{housing:1000},k401:0,rothIRA:0,taxable:20000,cashSavings:1234,totalDebt:0,mortgageBalance:0,mortgageMonthly:0,growthRate:.1,withdrawalRate:.04,plaidAccounts:[checking,savings(4000,4)],retirementCityCol:0,lifestyleMultiplier:1,taxEnabled:false,retirementTaxRate:0,rothPct:0,safetyNeeds:1000};
const input=web.inputs(args);
assert.equal(input.cashSavings,4000,'web adapter includes savings below six-month threshold');
const data={income:1000,budget:{housing:1000},age:null,profile:{plan:{},growthRate:.1,withdrawalRate:.04,mortgageMonthly:0,mortgageTerms:{},retirementCityCol:0,lifestyleMultiplier:1},typed:{cashSavings:1234,mortgages:[]},balances:{k401:0,rothIRA:0,taxable:20000,cashSavings:13000},plaidAccounts:args.plaidAccounts,spendToggles:{},debts:{otherDebt:0,mortgage:0,cards:0}};
for(const accounts of [[],[checking],[savings(0)],[checking,savings(4000,4)]]){
 const w=web.inputs({...args,plaidAccounts:accounts});const n=native.inputsFor({...data,plaidAccounts:accounts});
 assert.equal(n.cashSavings,w.cashSavings,'raw typed/linked/zero account adapter parity');
 assert.equal(n.cashGrowthRate,w.cashGrowthRate,'cash return adapter parity');
}
console.log('Safety cash: account roles, APY/inflation, transfers, spending-based targets, cash withdrawals, cash-heavy paths, bridge timing and web/phone parity passed.');

assert.equal(coastYear([100000],1000000,.1,30,60,[100000],0),null,'cash cannot reach Coast at stock returns');
assert.equal(coastYear([100000],1000000,.1,30,60,[0],0),0,'investments can still reach Coast');
