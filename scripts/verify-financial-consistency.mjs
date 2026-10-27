import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import * as currency from '../lib/account-currency.ts';
import * as cash from '../lib/freedom-cash.ts';
import * as shares from '../lib/account-share.ts';
import * as needs from '../lib/needs.ts';
import * as spending from '../lib/household-spending.ts';
import { freedomDebt } from '../lib/freedom-debt.ts';
import * as pages from '../lib/supabase-pages.ts';

const tests=[];
const check=(name,fn)=>tests.push({name,fn});
const load=(file,mocks={},names)=>{
 let code=readFileSync(file,'utf8');
 if(names){const ast=ts.createSourceFile(file,code,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);code=ast.statements.filter(n=>ts.isFunctionDeclaration(n)&&names.includes(n.name?.text)).map(n=>n.getText(ast)).join('\n')+'\n'+names.map(n=>'exports.'+n+'='+n+';').join('\n');}
 const exports={};vm.runInNewContext(ts.transpileModule(code,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports,Date,Math,console,connectedBalance:currency.connectedBalance,connectedDebt:currency.connectedDebt,...cash,...shares,require:id=>{if(!(id in mocks))throw Error('Unexpected import '+id);return mocks[id]}});return exports;
};
const balances=load('mobile/src/lib/balances.ts',{'@/engine':{...cash,...shares},'@engine/account-currency.ts':currency});
const web=load('app/dashboard/page.tsx',{},['normalizePlaidSubtype','isRetirementInvestmentAccount','isBrokerageInvestmentAccount','effectiveBalances','effectiveDebts','calcProjection','exactFreedomDateFrom']);
const mobile=load('mobile/src/lib/projection.ts',{'@/engine':{REAL_RETURN:.069},'@engine/release-gates.ts':{TAX_ESTIMATES_AVAILABLE:false},'@engine/freedom-cash.ts':cash});
// Extracted engine globals (release gate and default return) are injected through a tiny prefix below.
const webEngine=(()=>{let source=readFileSync('app/dashboard/page.tsx','utf8');const ast=ts.createSourceFile('page.tsx',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);const names=['calcProjection','exactFreedomDateFrom'];source=ast.statements.filter(n=>ts.isFunctionDeclaration(n)&&names.includes(n.name?.text)).map(n=>n.getText(ast)).join('\n');const exports={};vm.runInNewContext(ts.transpileModule('const REAL_RETURN=.069,TAX_ESTIMATES_AVAILABLE=false;'+source+'\nexports.calcProjection=calcProjection;exports.exactFreedomDateFrom=exactFreedomDateFrom;',{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{exports,...cash,Date,Math});return exports;})();
for(const [label,mod] of [['web',web],['phone',balances]]){
 check(label+' connected zero replaces typed investments',()=>assert.equal(mod.effectiveBalances({k401:1000,rothIRA:500,taxable:5000,cashSavings:2000,plaidAccounts:[{type:'investment',subtype:'brokerage',balance_current:0},{type:'investment',subtype:'ira',balance_current:0}]}).taxable,0));
 check(label+' connected zero retirement replaces both typed buckets',()=>{const b=mod.effectiveBalances({k401:1000,rothIRA:500,taxable:5000,cashSavings:2000,plaidAccounts:[{type:'investment',subtype:'ira',balance_current:0}]});assert.equal(b.k401+b.rothIRA,0)});
 check(label+' missing account retains typed balance',()=>assert.equal(mod.effectiveBalances({k401:0,rothIRA:0,taxable:5000,cashSavings:0,plaidAccounts:[]}).taxable,5000));
 check(label+' zero linked loan stays paid off',()=>assert.equal(mod.effectiveDebts({totalDebt:5000,mortgageBalance:0,plaidAccounts:[{type:'loan',subtype:'student',balance_current:0}]}).otherDebt,0));
}
const base={annualIncome:24000,monthlyExpenses:2000,k401:1000000,rothIRA:0,taxable:0,cashSavings:0,totalDebt:0,mortgageBalance:0,mortgageMonthly:0,growthRate:0,currentAge:59,accessAge:60,years:2};
for(const [label,engine] of [['web',webEngine],['phone',mobile]]){
 check(label+' locked pension date waits for access',()=>{const r=engine.calcProjection(base);assert.equal(r.fireYear,1);const d=engine.exactFreedomDateFrom(r.data,r.fireYear,r.fireTarget);assert.ok((d-Date.now())/864e5>364)});
 check(label+' fractional crossing still respects pension bridge',()=>{const r=engine.calcProjection({...base,k401:590000,growthRate:.1});assert.equal(r.fireYear,1);assert.ok((engine.exactFreedomDateFrom(r.data,r.fireYear,r.fireTarget)-Date.now())/864e5>364)});
 check(label+' accessible funded plan is free today',()=>{const r=engine.calcProjection({...base,k401:0,taxable:1000000});assert.ok(Math.abs(engine.exactFreedomDateFrom(r.data,r.fireYear,r.fireTarget)-Date.now())<1000)});
 check(label+' unloaded zero inputs have no date',()=>{const r=engine.calcProjection({...base,k401:0,monthlyExpenses:0,annualIncome:0});assert.equal(r.fireYear,null)});
}
check('mixed unknown loan and rated card use all balances',()=>{const r=freedomDebt({otherDebt:10000,cards:[{name:'Card',balance:8000}],ladderDebts:[{name:'Card',balance:8000,ratePct:24}]});assert.equal(r.balance,18000);assert.ok(Math.abs(r.rate-(500+1920)/18000)<1e-12)});
check('known zero percent loan remains zero',()=>assert.equal(freedomDebt({otherDebt:10000,loans:[{name:'Loan',balance:10000}],cards:[],ladderDebts:[{name:'Loan',balance:10000,ratePct:0}]}).rate,0));
check('stale ladder balances do not weight current debts',()=>assert.ok(Math.abs(freedomDebt({otherDebt:10000,loans:[{name:'Loan',balance:10000}],cards:[{name:'Card',balance:1000}],ladderDebts:[{name:'Loan',balance:50000,ratePct:6},{name:'Card',balance:8000,ratePct:24},{name:'Old debt',balance:100000,ratePct:99}]}).rate-840/11000)<1e-12));
const months=['2026-07','2026-08','2026-09'];
const row=(u,m,account='independent-'+u)=>({user_id:u,date:m+'-01',amount:100,refund_amount:0,currency:'USD',description:'Shop',plaid_account_id:account});
const all=months.flatMap(m=>[row('a',m),row('b',m)]);
const options={memberIds:['a','b'],confirmedLinks:[]};
check('independent identical purchases both count',()=>assert.equal(spending.householdSpending(all,'2026-10',n=>n,options).average,200));
check('missing partner history rejects household average',()=>assert.equal(spending.householdSpending(all.filter(r=>r.user_id==='a'),'2026-10',n=>n,options).average,null));
check('insufficient partner history rejects household average',()=>assert.equal(spending.householdSpending(all.filter(r=>r.user_id==='a'||!r.date.startsWith('2026-07')),'2026-10',n=>n,options).average,null));
check('confirmed joint purchases count once',()=>assert.equal(spending.householdSpending(all,'2026-10',n=>n,{...options,confirmedLinks:[{a:'independent-a',b:'independent-b'}]}).average,100));
check('repeated identical joint purchases retain multiplicity',()=>assert.equal(spending.householdSpending([...all,...all.filter(r=>r.user_id==='a')],'2026-10',n=>n,{...options,confirmedLinks:[{a:'independent-a',b:'independent-b'}]}).average,200));

const household=load('lib/household.ts',{'node:crypto':{},'./supabase-admin':{},'./currency':{FALLBACK_RATES:{USD:1,HKD:7.8}},'./supabase-pages':pages,'./household-spending':spending,'./account-currency':currency,'./connected-balances':balances,'./freedom-cash':cash,'./household-budget':{},'./household-projection':{}});
function admin(opts={}){
 const calls=[];return{calls,auth:{admin:{getUserById:async id=>({data:{user:{email:id+'@example.test'}}})}},from(table){const filters=[];let selection='';const q=new Proxy({},{get:(_,key)=>key==='then'?(resolve)=>{calls.push({table,selection});const id=filters.find(f=>f[1]==='user_id')?.[2];let data=[];if(table==='household_members')data=id?{household_id:'h'}:[{user_id:'a'},{user_id:'b'}];if(table==='plaid_accounts')data=opts.accounts??[];if(table==='profiles')data={display_name:id,free_to_spend_accounts:{}};if(table==='scenario_assumptions')data={monthly_income:1000,taxable:9000,budget_categories:{food:100}};if(table==='user_budget')data={income:5000,fire_age:40,fire_assets:500,expenses:{food:1500,_fire_profile:{k401:0,taxable:0,cashSavings:0}}};if(table==='shared_account_links')data=opts.links??[];resolve({data,error:opts.fail===table?{message:'read failed'}:null})}:(...args)=>{if(key==='select')selection=args[0];if(['eq','in'].includes(key))filters.push([key,...args]);return q;}});return q;}};
}
check('household current budget replaces stale scenario',async()=>{const db=admin();const r=await household.householdPosition(db,'a',{USD:1,HKD:7.8});assert.equal(r.combined.monthlyIncome,10000);assert.equal(r.combined.monthlyExpenses,3000);assert.equal(r.combined.portfolio,0);assert.ok(!db.calls.some(q=>q.table==='scenario_assumptions'))});
check('household foreign investments convert before sum',async()=>{const db=admin({accounts:[{id:'f',plaid_account_id:'f',user_id:'a',type:'investment',subtype:'brokerage',balance_current:7800,iso_currency_code:'HKD'}]});const r=await household.householdPosition(db,'a',{USD:1,HKD:7.8});assert.equal(r.combined.portfolio,1000);assert.ok(db.calls.some(q=>q.table==='plaid_accounts'&&q.selection.includes('iso_currency_code')))});
check('household account read failure cannot become zero',async()=>assert.rejects(()=>household.householdPosition(admin({fail:'plaid_accounts'}),'a',{USD:1}),/read failed/));

// Execute the actual mobile needs function with deterministic surrounding services.
const money=readFileSync('mobile/src/lib/money-data.ts','utf8').replace(/\r\n/g,'\n');
const start=money.indexOf('export function monthlyNeeds('),end=money.indexOf('\n}\n',start)+3;
const nativeNeeds={};vm.runInNewContext(ts.transpileModule('const thisMonth=()=>"2026-10",monthOf=(d:string)=>d.slice(0,7),needOf=()=>"need",spentUSD=(t:any)=>t.amount,needOverrides=()=>({});'+money.slice(start,end),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{exports:nativeNeeds,...needs,...shares});
const ownRows=months.map(m=>({...row('a',m,'joint'),transaction_type:'expense',category:'housing',amount:2000}));
check('phone needs use personal account share',()=>assert.equal(nativeNeeds.monthlyNeeds({},ownRows,'2026-10',{joint:50}).needs,1000));
// Inspect the web needs memo through the TypeScript AST and run its actual callback.
const source=readFileSync('app/dashboard/page.tsx','utf8');const tree=ts.createSourceFile('page.tsx',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);let callback;
function visit(n){if(ts.isVariableDeclaration(n)&&n.name.getText(tree)==='needsByMonth')callback=n.initializer.arguments[0].getText(tree);ts.forEachChild(n,visit)}visit(tree);
check('web needs use personal account share',()=>{const exports={};const FixedDate=class extends Date{constructor(...args){super(...(args.length?args:["2026-10-27T12:00:00Z"]))}};vm.runInNewContext(ts.transpileModule('exports.run='+callback,{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{exports,Date:FixedDate,recentTransactions:ownRows,rates:{},categoryNeeds:{},accountShares:{joint:50},...shares,...needs,toUSD:n=>n,netAmt:t=>t.amount});assert.equal(exports.run()[0][1],1000)});

check('unknown connected balances never resurrect typed funds',()=>{for(const amount of [null,NaN,Infinity])assert.equal(balances.effectiveBalances({k401:0,rothIRA:0,taxable:5000,cashSavings:0,plaidAccounts:[{type:'investment',subtype:'brokerage',balance_current:amount}]}).taxable,0)});
check('failed FX is excluded from connected totals',()=>assert.equal(currency.connectedBalance([{balance_current:999,converted:false}],()=>true),0));
check('negative valid brokerage is not replaced by typed money',()=>assert.equal(balances.effectiveBalances({k401:0,rothIRA:0,taxable:5000,cashSavings:0,plaidAccounts:[{type:'investment',subtype:'brokerage',balance_current:-50}]}).taxable,-50));
check('cash-only household does not earn equity returns',async()=>{
 const history=load('lib/sp500-history.ts');const fire=load('lib/fire/strategies/traditional.ts',{'../../sp500-history.ts':history});
 const route=load('app/api/household/summary/route.ts',{'next/server':{NextResponse:{json:(data)=>({data})}},'@/lib/household':{requireUser:async()=>({admin:{},user:{id:'a'}}),householdPosition:async()=>({members:[],combined:{monthlySavings:0,annualExpenses:24000,portfolio:300000,cashSavings:300000,cashGrowthRate:1/1.03-1}})},'@/lib/fire':fire,'@/lib/household-projection':load('lib/household-projection.ts',{'./fire':fire})});
 const response=await route.GET({});assert.equal(response.data.household.years,null);
});


check('household missing exchange rate fails explicitly',async()=>assert.rejects(()=>household.householdPosition(admin({accounts:[{id:'f',plaid_account_id:'f',user_id:'a',type:'investment',subtype:'brokerage',balance_current:100,iso_currency_code:'ZZZ'}]}),'a',{USD:1}),/exchange rate/));
check('household confirmed foreign account is subtracted in dollars once',async()=>{const accounts=['a','b'].map(u=>({id:u,plaid_account_id:u,user_id:u,type:'investment',subtype:'brokerage',balance_current:7800,iso_currency_code:'HKD'}));const r=await household.householdPosition(admin({accounts,links:[{plaid_account_id_a:'a',plaid_account_id_b:'b',status:'confirmed'}]}),'a',{HKD:7.8});assert.equal(r.combined.portfolio,1000);assert.equal(r.dedupedBalance,1000)});
check('household safety cash is included once, checking is excluded',async()=>{const accounts=['a','b'].flatMap(u=>[{id:'s'+u,plaid_account_id:'s'+u,user_id:u,type:'depository',subtype:'savings',balance_current:1000,iso_currency_code:'USD',apy:4},{id:'c'+u,plaid_account_id:'c'+u,user_id:u,type:'depository',subtype:'checking',balance_current:5000,iso_currency_code:'USD'}]);const r=await household.householdPosition(admin({accounts,links:[{plaid_account_id_a:'sa',plaid_account_id_b:'sb',status:'confirmed'}]}),'a',{USD:1});assert.equal(r.combined.portfolio,1000);assert.equal(r.combined.cashSavings,1000);assert.ok(Math.abs(r.combined.cashGrowthRate-(1.04/1.03-1))<1e-12)});

check('card overpayment never cancels another card liability',()=>{for(const mod of [web,balances])assert.equal(mod.effectiveDebts({totalDebt:0,mortgageBalance:0,plaidAccounts:[{type:'credit',subtype:'credit card',balance_current:1000},{type:'credit',subtype:'credit card',balance_current:-500}]}).cards,1000)});
check('unknown connected loan is not assumed paid off',()=>{for(const mod of [web,balances])assert.equal(mod.effectiveDebts({totalDebt:5000,mortgageBalance:0,plaidAccounts:[{type:'loan',subtype:'student',balance_current:null}]}).otherDebt,5000)});
let failures=0;for(const t of tests){try{await t.fn();console.log('PASS '+t.name)}catch(e){failures++;console.error('FAIL '+t.name+': '+e.message)}}
console.log((tests.length-failures)+'/'+tests.length+' financial consistency checks passed');if(failures)process.exitCode=1;
