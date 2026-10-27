import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import vm from 'node:vm';
import ts from 'typescript';
const require=createRequire(import.meta.url);
function load(path,modules={},globals={},functions){
 let text=readFileSync(path,'utf8');
 if(functions){const tree=ts.createSourceFile(path,text,ts.ScriptTarget.Latest,true);text=tree.statements.filter(n=>ts.isFunctionDeclaration(n)&&functions.includes(n.name?.text)).map(n=>n.getText(tree)).join('\n');}
 const source=ts.transpileModule(text,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;
 const mod={exports:{}};vm.runInNewContext(source,{module:mod,exports:mod.exports,Date,console:{error(){}},require:k=>k in modules?modules[k]:require(k),...globals});return mod.exports;
}
const next={NextResponse:{json:(body,opts)=>({body,status:opts?.status??200})}};
const cases=[];const check=(name,run)=>cases.push({name,run});
const request={headers:{get:()=> 'Bearer fake'},json:async()=>({item_id:'item'})};
function query(result){const q=new Proxy({},{get:(_,k)=>k==='then'?(resolve)=>resolve(result):()=>q});return q;}
for(const scenario of ['read-fail','empty','delete-fail','success'])check('household disconnect '+scenario,async()=>{
 let deletes=0;const admin={from:()=>({select:()=>query({data:scenario==='empty'||scenario==='read-fail'?null:{household_id:'h'},error:scenario==='read-fail'?{message:'offline'}:null}),delete:()=>{deletes++;return query({error:scenario==='delete-fail'?{message:'offline'}:null});}})};
 const route=load('app/api/household/disconnect/route.ts',{'next/server':next,'@/lib/household':{requireUser:async()=>({admin,user:{id:'u'}})}});
 const result=await route.POST(request);assert.equal(result.status,scenario.includes('fail')?500:200);
 assert.equal(deletes,scenario==='read-fail'||scenario==='empty'?0:1);
 if(scenario==='empty')assert.equal(result.body.alreadyDisconnected,true);
});
for(const scenario of ['plaid-fail','delete-fail','success'])check('bank disconnect '+scenario,async()=>{
 let deletes=0;const admin={auth:{getUser:async()=>({data:{user:{id:'u'}},error:null})},from:()=>({select:()=>query({data:{plaid_access_token:'fake',institution_name:'Bank',user_id:'u'},error:null}),delete:()=>{deletes++;return query({error:scenario==='delete-fail'?{message:'offline'}:null});}})};
 const route=load('app/api/plaid/disconnect/route.ts',{'next/server':next,'@/lib/supabase-admin':{adminClient:()=>admin},'@/lib/plaid':{getPlaidClient:()=>({})},'@/lib/plaid-remove':{removePlaidItems:async()=>scenario==='plaid-fail'?{removed:[],failed:[{}]}:{removed:['item'],failed:[]}}});
 const result=await route.DELETE(request);assert.equal(result.status,scenario==='plaid-fail'?502:scenario==='delete-fail'?500:200);assert.equal(deletes,scenario==='plaid-fail'?0:1);
});
function phone(initial,readError=false){
 let state=initial===null?null:structuredClone(initial),inserts=0;
 const db={get state(){return state;},get inserts(){return inserts;},from:()=>({select:()=>({eq:()=>({maybeSingle:async()=>({data:structuredClone(state),error:readError?{message:'offline'}:null})})}),insert:async patch=>{inserts++;if(state)return {error:{code:'23505'}};state=structuredClone(patch);return {error:null};}}),rpc:async(name,args)=>{
  assert.equal(name,'replace_budget_if_unchanged');if(JSON.stringify(state?.expenses??null)!==JSON.stringify(args.p_expected))return {data:false,error:null};state={...state,expenses:structuredClone(args.p_expenses)};return {data:true,error:null};
 }};
 const mutations=load('mobile/src/lib/mutations.ts',{}, {supabase:db},['writeBudget','saveFireProfile','seedFromOnboarding']);return {db,...mutations};
}
check('simultaneous phone saves surface a conflict; retry keeps both changes',async()=>{
 const p=phone({expenses:{food:400,_fire_profile:{cashSavings:100}}});
 const results=await Promise.all([p.saveFireProfile('u',{categoryNeeds:{food:'want'}}),p.saveFireProfile('u',{cityName:'City'})]);
 assert.equal(results.filter(x=>x===null).length,1);assert.ok(results.some(x=>x?.includes('changed')));
 assert.equal(await p.saveFireProfile('u',{cityName:'City'}),null);assert.equal(p.db.state.expenses._fire_profile.categoryNeeds.food,'want');assert.equal(p.db.state.expenses._fire_profile.cityName,'City');
});
check('existing zero-income/zero-savings account is never reseeded',async()=>{
 const initial={income:0,fire_age:45,expenses:{food:400,_fire_profile:{cashSavings:0}}},p=phone(initial);
 assert.equal(await p.seedFromOnboarding('u',{monthlyIncome:5000,monthlySpending:1000,invested:7000,age:25}),false);assert.deepEqual(p.db.state,initial);assert.equal(p.db.inserts,0);
});
check('failed account reads never seed or write anything',async()=>{
 const p=phone(null,true);assert.equal(await p.seedFromOnboarding('u',{monthlyIncome:5000,monthlySpending:1000,invested:7000}),false);assert.equal(p.db.inserts,0);
});
check('a truly missing account receives onboarding once',async()=>{
 const p=phone(null),plan={monthlyIncome:5000,monthlySpending:1000,invested:7000,age:25};assert.equal(await p.seedFromOnboarding('u',plan),true);assert.equal(p.db.state.income,5000);assert.equal(p.db.state.fire_age,25);assert.equal(await p.seedFromOnboarding('u',plan),false);assert.equal(p.db.inserts,1);
});
let failed=0;for(const {name,run}of cases){try{await run();console.log('✓ '+name);}catch(e){failed++;console.error('✗ '+name,e);}}
if(failed)process.exitCode=1;else console.log(`${cases.length} account safety scenarios passed; no live services touched.`);
