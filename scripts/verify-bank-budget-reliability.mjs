import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import ts from 'typescript';
const require = createRequire(import.meta.url);
const checks = [];
const check = (name, run) => checks.push({ name, run });
function load(path, modules = {}, expose = '') {
  const mod = { exports: {} };
  const source = ts.transpileModule(readFileSync(path, 'utf8'), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  vm.runInNewContext(source + expose, { module: mod, exports: mod.exports, Date, console: { error() {} }, require: key => key in modules ? modules[key] : require(key) });
  return mod.exports;
}
const { fetchAllPages } = load('lib/supabase-pages.ts');
const { planRefunds } = load('lib/refunds.ts');
function fakeDatabase(options = {}) {
  const calls = [], stored = new Map((options.existing ?? []).map(r => [r.plaid_transaction_id, { ...r }]));
  let cursor = 'old';
  const db = { calls, stored, get cursor() { return cursor; }, from(table) {
    let op = 'read', payload, from = 0, to = 999;
    const filters = [];
    const query = new Proxy({}, { get(_, key) {
      if (key === 'then') return (resolve) => {
        calls.push({ table, op, payload, filters, from, to });
        if (options.fail?.({ table, op, from, filters })) return resolve({ data: null, error: { message: 'simulated failure' } });
        if (table === 'plaid_items') {
          if(op==='read') return resolve({data:null,count:0,error:null});
          cursor = payload.cursor; return resolve({ data: { id: 'item' }, error: null });
        }
        if (table !== 'expenses') return resolve({ data: table === 'user_budget' ? { expenses: {} } : [], error: null });
        const matches = row => filters.every(([method, column, value]) => method === 'in' ? value.includes(row[column]) : method === 'eq' ? row[column] === value : method === 'contains' ? value.every(v => row[column]?.includes(v)) : method === 'gte' ? row[column] >= value : true);
        if (op === 'read') {
          const rows = options.rows ?? [...stored.values()];
          return resolve({ data: rows.filter(matches).slice(from, to + 1), error: null });
        }
        if (op === 'upsert') { for (const r of payload) if (!stored.has(r.plaid_transaction_id)) stored.set(r.plaid_transaction_id, { ...r }); }
        if (op === 'update') for (const [id,r] of stored) if (matches(r)) stored.set(id, { ...r, ...payload });
        if (op === 'delete') for (const [id,r] of stored) if (matches(r)) stored.delete(id);
        return resolve({ data: null, error: null });
      };
      return (...args) => {
        if (['upsert','update','delete'].includes(key)) { op = key; payload = args[0]; }
        if (['eq','in','contains','gte'].includes(key)) filters.push([key,...args]);
        if (key === 'range') [from,to] = args;
        return query;
      };
    }});
    return query;
  }};
  return db;
}
const item = { id: 'item', user_id: 'u', plaid_access_token: 'fake', cursor: 'old' };
const row = (id, extra = {}) => ({ id, plaid_transaction_id: id, user_id: 'u', category: 'food', transaction_type: 'expense', amount: 20, tags: [], ...extra });
function syncModule() {
  return load('lib/plaid-sync.ts', {
    '@/lib/plaid': { mapPlaidTx: (tx,userId) => row(tx.transaction_id, { ...tx, user_id: userId }) },
    '@/lib/plaid-category': { classifyPlaid: () => ({ category: 'food' }) },
    '@/lib/refunds': { planRefunds }, '@/lib/classification-rules': { planTagging: () => [] },
    '@/lib/supabase-pages': { fetchAllPages },
    '@/lib/merchant-rules': { readMerchantRules: () => ({}), planMerchantRules: () => [] },
    '@/lib/savings-limits': {},
  });
}
const { syncPlaidItem, applyRefunds } = syncModule();
const plaid = (change = {}) => ({
  transactionsSync: async () => ({ data: { added: [], modified: [], removed: [], next_cursor: 'next', has_more: false, ...change } }),
  accountsGet: async () => ({ data: { accounts: [] } }),
});
for (const [name,op,change,existing] of [
  ['new transactions','upsert',{ added: [{ transaction_id: 'new', amount: 20 }] },[]],
  ['modified transactions','update',{ modified: [{ transaction_id: 'old-tx', amount: 30 }] },[row('old-tx')]],
  ['removed transactions','delete',{ removed: [{ transaction_id: 'old-tx' }] },[row('old-tx')]],
  ['pending edits','update',{ added: [{ transaction_id: 'posted', pending_transaction_id: 'pending', amount: 20 }] },[row('pending',{ category: 'manual', tags: ['need'] })]],
]) check(`failed ${name} keep the old cursor and reject sync`, async () => {
  const db = fakeDatabase({ existing, fail: q => q.table === 'expenses' && q.op === op });
  await assert.rejects(syncPlaidItem(db,plaid(change),item));
  assert.equal(db.cursor,'old');
  assert.equal(db.calls.filter(c => c.table === 'plaid_items').length,0);
});
check('failed edit-preservation reads stop sync instead of overwriting user edits',async () => {
  const db = fakeDatabase({ fail:q=>q.table==='expenses' && q.op==='read' });
  await assert.rejects(syncPlaidItem(db,plaid({modified:[{transaction_id:'x'}]}),item));
  assert.equal(db.cursor,'old');
  assert.equal(db.calls.filter(c=>c.table==='expenses' && c.op==='update').length,0);
});
check('failed cursor saves reject rather than reporting success',async () => {
  const db=fakeDatabase({fail:q=>q.table==='plaid_items'});
  await assert.rejects(syncPlaidItem(db,plaid(),item)); assert.equal(db.cursor,'old');
});
check('retrying a partially completed sync keeps one copy and preserves manual filing',async () => {
  let broken=true;
  const db=fakeDatabase({existing:[row('edited',{category:'manual',tags:['need']})],fail:q=>broken && q.table==='expenses' && q.op==='update'});
  const change={added:[{transaction_id:'new',amount:20}],modified:[{transaction_id:'edited',amount:30}]};
  await assert.rejects(syncPlaidItem(db,plaid(change),item)); assert.equal(db.cursor,'old');
  broken=false; await syncPlaidItem(db,plaid(change),item);
  assert.equal(db.cursor,'next'); assert.equal(db.stored.size,2);
  assert.equal(db.stored.get('edited').category,'manual'); assert.equal(db.stored.get('edited').tags[0],'need');
});
check('existing-row reads use bounded ID batches and stable pages',async () => {
  const ids=Array.from({length:205},(_,i)=>`t${i}`);
  const db=fakeDatabase({existing:ids.map(id=>row(id))});
  await syncPlaidItem(db,plaid({modified:ids.map(id=>({transaction_id:id,amount:25}))}),item);
  const reads=db.calls.filter(c=>c.table==='expenses' && c.op==='read');
  assert.equal(reads.length,3); assert.ok(reads.every(c=>c.filters.find(f=>f[0]==='in')[2].length<=100));
  assert.equal(db.stored.get('t204').amount,25);
});
check('refund matching reaches purchases beyond the first page',async () => {
  const purchases=Array.from({length:1001},(_,i)=>row(`p${i}`,{description:i===1000?'Shop':'Other',date:'2026-10-01',refund_amount:0,amount:50}));
  const refund=row('refund',{description:'Shop',date:'2026-10-02',transaction_type:'transfer',amount:10,tags:['sys:refund']});
  const db=fakeDatabase({rows:[...purchases,refund],existing:[...purchases,refund]});
  await applyRefunds(db,'u',['refund']);
  assert.equal(db.stored.get('p1000').refund_amount,10);
  assert.ok(db.calls.some(c=>c.table==='expenses' && c.op==='read' && c.from===1000));
});
check('a failed later purchase page never applies refunds from partial history',async()=>{
  const rows=Array.from({length:1001},(_,i)=>row(`p${i}`,{description:'Shop',date:'2026-10-01',refund_amount:0,amount:50}));
  rows.push(row('refund',{description:'Shop',date:'2026-10-02',transaction_type:'transfer',amount:10,tags:['sys:refund']}));
  const db=fakeDatabase({rows,fail:q=>q.table==='expenses'&&q.op==='read'&&q.from===1000});
  await applyRefunds(db,'u',['refund']);
  assert.equal(db.calls.filter(c=>c.table==='expenses'&&c.op==='update').length,0);
});
check('repeated refund IDs across batches are matched only once',async()=>{
  const rows=[row('purchase',{description:'Shop',date:'2026-10-01',refund_amount:0,amount:50}),row('refund',{description:'Shop',date:'2026-10-02',transaction_type:'transfer',amount:10,tags:['sys:refund']})];
  const db=fakeDatabase({rows,existing:rows}); await applyRefunds(db,'u',Array(201).fill('refund'));
  assert.equal(db.stored.get('purchase').refund_amount,10);
});
function profile(options={}) {
  const writes=[];
  let current = 'expenses' in options ? options.expenses : {food:400,_fire_profile:{k401:500}};
  const client={from:()=>({
    select:()=>({eq:()=>({maybeSingle:async()=>{if(options.throwRead) throw Error('network'); return {data:options.missing?null:{expenses:current},error:options.readError?{message:'read failed'}:null};}})}),
    update:payload=>{
      writes.push(payload); if(options.conflict) current={...current,newSetting:'from phone'};
      let matches=true;
      const q={eq:(key,value)=>{if(key==='expenses') matches &&= value===JSON.stringify(current);return q;},is:(key,value)=>{if(key==='expenses') matches &&= current===value;return q;},select:()=>q,maybeSingle:async()=>({data:matches?{user_id:'u'}:null,error:options.writeError?{message:'write failed'}:null})};return q;
    },
  })};
  const { auditSave }=load('app/dashboard/NeedsWantsPanel.tsx',{
    '@/lib/supabase':{supabase:client},'@/lib/supabase-pages':{fetchAllPages},'@/components/ui':{},'@/lib/categories':{},'@/lib/merchant-rules':{},'@/lib/needs':{},
  },'\nmodule.exports.auditSave=saveProfile;');
  return {writes,save:auditSave};
}
for(const condition of ['readError','missing','throwRead']) check(`budget ${condition} prevents every write`,async()=>{
  const p=profile({[condition]:true}); assert.ok(await p.save('u',{categoryNeeds:{food:'want'}})); assert.equal(p.writes.length,0);
});
for(const condition of ['writeError','conflict']) check(`budget ${condition} is reported as failure`,async()=>{
  assert.ok(await profile({[condition]:true}).save('u',{categoryNeeds:{food:'want'}}));
});
check('successful category edits preserve unrelated budget and FIRE fields',async()=>{
  const p=profile(); assert.equal(await p.save('u',{categoryNeeds:{food:'want'}}),null);
  assert.equal(p.writes[0].expenses.food,400); assert.equal(p.writes[0].expenses._fire_profile.k401,500);
  assert.equal(p.writes[0].expenses._fire_profile.categoryNeeds.food,'want');
});
check('a null expenses object saves only when it is still null',async()=>{
  assert.equal(await profile({expenses:null}).save('u',{categoryNeeds:{food:'want'}}),null);
  assert.ok(await profile({expenses:null,conflict:true}).save('u',{categoryNeeds:{food:'want'}}));
});
function firstImport(db) {
  let connectedEvents=0;
  db.auth={getUser:async()=>({data:{user:{id:'u'}},error:null})};
  const bank={...plaid({added:[{transaction_id:'new',amount:20}]}),itemPublicTokenExchange:async()=>({data:{access_token:'fake',item_id:'fake-item'}})};
  const route=load('app/api/plaid/exchange-token/route.ts',{
    'next/server':{NextResponse:{json:(body,opts)=>({body,status:opts?.status??200})}},
    '@/lib/supabase-admin':{adminClient:()=>db},
    '@/lib/plaid':{getPlaidClient:()=>bank,getInstitutionBranding:async()=>({logo:null,color:null}),mapPlaidTx:(tx,userId)=>row(tx.transaction_id,{...tx,user_id:userId})},
    '@/lib/plaid-sync':{applyRefunds},'@/lib/lifecycle':{LIFECYCLE_EVENTS:{BANK_CONNECTED:'connected'},recordEvent:async()=>{connectedEvents++;}},
    '@/lib/currency':{FALLBACK_RATES:{}},'@/lib/setup-steps':{setupFinds:()=>({payday:null,bills:[]})},
  });
  return {run:()=>route.POST({headers:{get:()=> 'Bearer fake'},json:async()=>({public_token:'fake-public',institution_name:'Bank',institution_id:'bank'})}),events:()=>connectedEvents};
}
check('failed first import preserves a retryable connection without claiming completion',async()=>{
  const db=fakeDatabase({fail:q=>q.table==='expenses'&&q.op==='upsert'});
  const first=firstImport(db); const response=await first.run();
  assert.equal(response.status,500); assert.equal(db.cursor,null); assert.equal(first.events(),0);
  assert.equal(db.calls.filter(c=>c.table==='plaid_items'&&c.op==='update').length,0);
});
check('first import only records completion after transactions and cursor are saved',async()=>{
  const db=fakeDatabase();const first=firstImport(db);const response=await first.run();
  assert.equal(response.status,200);assert.equal(db.cursor,'next');assert.equal(first.events(),1);assert.equal(db.stored.size,1);
  const transactionIndex=db.calls.findIndex(c=>c.table==='expenses'&&c.op==='upsert');
  assert.ok(db.calls.findIndex(c=>c.table==='plaid_items'&&c.op==='update')>transactionIndex);
});
check('first import cannot claim success after a failed cursor save',async()=>{
  const db=fakeDatabase({fail:q=>q.table==='plaid_items'&&q.op==='update'});const first=firstImport(db);
  assert.equal((await first.run()).status,500);assert.equal(db.cursor,null);assert.equal(first.events(),0);
});
check('the normal sync can recover a saved connection after a failed first import',async()=>{
  let broken=true;
  const db=fakeDatabase({fail:q=>broken&&q.table==='expenses'&&q.op==='upsert'});
  assert.equal((await firstImport(db).run()).status,500);assert.equal(db.cursor,null);
  broken=false;
  await syncPlaidItem(db,plaid({added:[{transaction_id:'new',amount:20}]}),{...item,cursor:db.cursor});
  assert.equal(db.cursor,'next');assert.equal(db.stored.size,1);
});
let failures=0;
for(const {name,run} of checks) {try{await run();console.log(`✓ ${name}`);}catch(e){failures++;console.error(`✗ ${name}`,e);}}
if(failures) process.exitCode=1;
else console.log(`${checks.length} bank/budget reliability scenarios passed; no real services contacted.`);
