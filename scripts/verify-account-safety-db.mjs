import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
const db=new PGlite();
const U='00000000-0000-0000-0000-000000000001', V='00000000-0000-0000-0000-000000000002';
const P='00000000-0000-0000-0000-000000000010', R='00000000-0000-0000-0000-000000000020';
await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
 CREATE SCHEMA auth;
 CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
 GRANT USAGE ON SCHEMA auth TO authenticated;
 CREATE TABLE public.expenses(id uuid PRIMARY KEY,user_id uuid NOT NULL,date date NOT NULL,amount numeric(12,2) NOT NULL,currency text,description text NOT NULL,transaction_type text NOT NULL,tags text[],refund_amount numeric(12,2) NOT NULL DEFAULT 0 CHECK(refund_amount>=0 AND refund_amount<=amount));
 CREATE TABLE public.user_budget(user_id uuid PRIMARY KEY,expenses jsonb,fire_assets numeric DEFAULT 0,updated_at timestamptz);
 ALTER TABLE public.user_budget ENABLE ROW LEVEL SECURITY;
 CREATE POLICY own_budget ON public.user_budget TO authenticated USING(user_id=auth.uid()) WITH CHECK(user_id=auth.uid());
 GRANT SELECT,UPDATE ON public.user_budget TO authenticated;
 GRANT SELECT,UPDATE ON public.expenses TO service_role;`);
await db.exec(readFileSync('supabase/migrations/20261027050202_atomic_imported_refunds.sql','utf8'));
const run=async(sql,args=[])=> (await db.query(sql,args)).rows;
async function reset(extra='') {
 await db.exec(`RESET ROLE; DELETE FROM expenses;
 INSERT INTO expenses VALUES('${P}','${U}','2026-10-01',100,'USD','Shop','expense','{}',0),('${R}','${U}','2026-10-02',20,'USD','shop','transfer','{sys:refund,own-tag}',0); ${extra}`);
}
async function apply(user=U,id=R){return (await run('SELECT public.apply_imported_refund($1,$2) AS applied',[user,id]))[0].applied;}
let count=0;
async function check(name,fn){await fn();count++;console.log('✓ '+name);}
try {
 await check('a refund and its marker commit together; repeat calls do nothing',async()=>{
  await reset();assert.equal(await apply(),true);assert.equal(await apply(),false);
  const rows=await run('SELECT id,refund_amount,tags FROM expenses ORDER BY id');assert.equal(Number(rows[0].refund_amount),20);assert.ok(rows[1].tags.includes('sys:refund-applied'));assert.ok(rows[1].tags.includes('own-tag'));assert.ok(!rows[1].tags.includes('sys:refund'));
 });
 for(const target of [P,R]) await check(`failure updating ${target===P?'purchase':'marker'} rolls back BOTH records`,async()=>{
  await reset();await db.exec(`CREATE OR REPLACE FUNCTION fail_refund_test() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.id='${target}'::uuid THEN RAISE EXCEPTION 'injected failure'; END IF; RETURN NEW; END $$; CREATE TRIGGER fail_refund BEFORE UPDATE ON expenses FOR EACH ROW EXECUTE FUNCTION fail_refund_test();`);
  await assert.rejects(apply(),/injected failure/);const rows=await run('SELECT id,refund_amount,tags FROM expenses ORDER BY id');assert.equal(Number(rows[0].refund_amount),0);assert.ok(rows[1].tags.includes('sys:refund'));
  await db.exec('DROP TRIGGER fail_refund ON expenses');assert.equal(await apply(),true);assert.equal(await apply(),false);
 });
 await check('refunds never match another owner or currency',async()=>{
  await reset(`UPDATE expenses SET currency='EUR' WHERE id='${P}';`);assert.equal(await apply(),false);
  await reset(`UPDATE expenses SET user_id='${V}' WHERE id='${P}';`);assert.equal(await apply(),false);assert.equal(await apply(V),false);
 });
 await check('pending or oversized refunds remain unapplied',async()=>{
  await reset(`UPDATE expenses SET tags='{sys:refund,sys:pending}' WHERE id='${R}';`);assert.equal(await apply(),false);
  await reset(`UPDATE expenses SET refund_amount=90 WHERE id='${P}';`);assert.equal(await apply(),false);
 });
 await check('matching is not limited to an API first page',async()=>{
  await reset();await db.exec(`INSERT INTO expenses SELECT ('10000000-0000-0000-0000-'||lpad(i::text,12,'0'))::uuid,'${U}','2026-10-01',100,'USD','Other','expense','{}',0 FROM generate_series(1,1200) i;`);assert.equal(await apply(),true);
 });
 await check('repeat queued requests cannot count the same refund twice',async()=>{
  await reset();const results=await Promise.all([apply(),apply(),apply()]);assert.equal(results.filter(Boolean).length,1);assert.equal(Number((await run('SELECT refund_amount FROM expenses WHERE id=$1',[P]))[0].refund_amount),20);
 });
 await check('untrusted roles cannot invoke the server refund operation',async()=>{
  for(const role of ['anon','authenticated']){await db.exec(`SET ROLE ${role}`);await assert.rejects(apply(),/permission denied/);await db.exec('RESET ROLE');}
  await reset();await db.exec('SET ROLE service_role');assert.equal(await apply(),true);await db.exec('RESET ROLE');
 });
 await check('budget compare-and-set rejects stale state and cannot write another owner',async()=>{
  await db.exec(`INSERT INTO user_budget(user_id,expenses) VALUES('${U}','{"food":400}'),('${V}','{"food":900}'); SELECT set_config('request.jwt.claim.sub','${U}',false); SET ROLE authenticated;`);
  const replace=async(expected,next)=> (await run('SELECT replace_budget_if_unchanged($1::jsonb,$2::jsonb) AS saved',[JSON.stringify(expected),JSON.stringify(next)]))[0].saved;
  assert.equal(await replace({food:400},{food:400,city:'A'}),true);assert.equal(await replace({food:400},{food:400,need:'want'}),false);assert.equal(await replace({food:900},{food:1}),false);
  await db.exec('RESET ROLE');const other=await run('SELECT expenses FROM user_budget WHERE user_id=$1',[V]);assert.equal(other[0].expenses.food,900);
 });
 console.log(`${count} real PostgreSQL/WASM transaction and permission scenarios passed. No live database touched.`);
} finally {await db.close();}
