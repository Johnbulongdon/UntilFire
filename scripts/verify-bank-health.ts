import assert from 'node:assert/strict'
import { bankHealth, bankReconnect } from '../lib/plaid-health-api.ts'
import { bankSummary, parseBankHealth, syncLabel, type BankHealth } from '../mobile/src/lib/bank-health.ts'

const fixtures = [
 {id:'a',user_id:'owner',institution_name:'Mint bank',last_synced_at:'2026-10-30T08:00:00Z',plaid_access_token:'private-a'},
 {id:'b',user_id:'owner',institution_name:'Yellow bank',last_synced_at:null,plaid_access_token:'private-b'},
 {id:'c',user_id:'someone-else',institution_name:'Hidden',last_synced_at:null,plaid_access_token:'NEVER-EXPOSE'},
]
const calls: unknown[] = []
let failDb=false, failAuth=false, failLink=false
function client() {
 return {
  auth: {getUser: async (token: string) => ({ data:{user:token==='valid'&&!failAuth?{id:'owner'}:null},error:failAuth?{}:null })},
  from(table: string) {
   assert.equal(table,'plaid_items','reconnect must never create a subscription/new item')
   let rows=fixtures.slice()
   const query={
    select:()=>query,
    eq:(key:string,value:unknown)=>{calls.push({filter:key,value});rows=rows.filter(r=>r[key as keyof typeof r]===value);return query},
    order:async()=>({data:rows,error:failDb?{}:null}),
    maybeSingle:async()=>({data:rows[0]??null,error:failDb?{}:null}),
   }
   return query
  }
 }
}
const dep={
 admin:client(),
 countries:['US'],iosRedirect:'https://www.untilfire.com/plaid-oauth',
 plaid:{
  itemGet:async (body:{access_token:string})=>{
   calls.push(body)
   if(body.access_token==='private-b') return {data:{item:{error:{error_code:'ITEM_LOGIN_REQUIRED'}}}}
   return {data:{item:{error:null}}}
  },
  linkTokenCreate:async(body:unknown)=>{
   calls.push(body)
   if(failLink) throw new Error('SECRET-RAW-ERROR')
   return {data:{link_token:'safe-link-token'}}
  }
 }
} as unknown as Parameters<typeof bankHealth>[1]
const req=(body?:unknown,token='valid')=>new Request('http://localhost/api/plaid/health',{method:body===undefined?'GET':'POST',headers:token?{Authorization:'Bearer '+token,'Content-Type':'application/json'}:{},...(body===undefined?{}:{body:JSON.stringify(body)})})
for(const token of ['', 'invalid']) {
 calls.length=0
 assert.equal((await bankHealth(req(undefined,token),dep)).status,401)
 assert.equal((await bankReconnect(req({item_id:'a',platform:'android'},token),dep)).status,401)
 assert.equal(calls.length,0)
}
const health=await bankHealth(req(),dep)
assert.equal(health.headers.get('cache-control'),'private, no-store')
const body=await health.json()
assert.equal(body.banks.length,2)
assert.equal(body.banks[0].status,'connected')
assert.equal(body.banks[0].lastSyncedAt,fixtures[0].last_synced_at)
assert.equal(body.banks[1].status,'attention')
assert.equal(body.banks[1].reconnect,true)
assert.ok(!JSON.stringify(body).includes('private-')&&!JSON.stringify(body).includes('NEVER-EXPOSE'))
assert.ok(calls.some((c:any)=>c.filter==='user_id'&&c.value==='owner'))
const original=dep.plaid.itemGet
dep.plaid.itemGet=(async()=>{throw new Error('timeout SECRET')}) as typeof original
const unknown=await (await bankHealth(req(),dep)).json()
assert.ok(unknown.banks.every((b:any)=>b.status==='unknown'&&!b.reconnect),'outage is not Connected or a reconnect demand')
dep.plaid.itemGet=original
failDb=true
assert.equal((await bankHealth(req(),dep)).status,503)
assert.equal((await bankReconnect(req({item_id:'a',platform:'android'}),dep)).status,503)
failDb=false
for(const invalid of [{}, {item_id:4,platform:'android'}, {item_id:'a',platform:'web'}, {item_id:'',platform:'ios'}]) assert.equal((await bankReconnect(req(invalid),dep)).status,400)
calls.length=0
assert.equal((await bankReconnect(req({item_id:'c',platform:'android'}),dep)).status,404)
assert.ok(!calls.some((c:any)=>c.access_token),'another owner never reaches Plaid')
for(const platform of ['android','ios']) {
 calls.length=0
 const result=await bankReconnect(req({item_id:'a',platform}),dep)
 assert.equal(result.status,200)
 assert.deepEqual(await result.json(),{link_token:'safe-link-token'})
 const link=calls.find((c:any)=>c.access_token) as Record<string,any>
 assert.equal(link.access_token,'private-a')
 assert.equal(link.user.client_user_id,'owner')
 assert.equal(link.products,undefined,'update mode must not purchase new products')
 assert.equal(platform==='android'?link.android_package_name:link.redirect_uri,platform==='android'?'com.untilfire.app':dep.iosRedirect)
}
assert.equal((await bankReconnect(req({item_id:'a',platform:'ios'}),{...dep,iosRedirect:undefined})).status,503)
failLink=true
const failed=await bankReconnect(req({item_id:'a',platform:'android'}),dep)
assert.equal(failed.status,503)
assert.ok(!(await failed.text()).includes('SECRET'))
failAuth=true
assert.equal((await bankHealth(req(),dep)).status,401)
const now=Date.parse('2026-11-01T12:00:00Z')
const bank=(id:string,time:string|null,status:BankHealth['status']='connected'):BankHealth=>({id,name:id,lastSyncedAt:time,status,reconnect:false})
assert.equal(syncLabel(null,now),'No successful sync yet')
assert.equal(syncLabel('bad',now),'No successful sync yet')
assert.equal(syncLabel('2027-01-01',now),'No successful sync yet')
assert.equal(syncLabel('2026-11-01T11:59:30Z',now),'Last synced just now')
assert.equal(bankSummary([],now),null)
assert.equal(bankSummary([bank('a','2026-10-30T12:00:00Z'),bank('b','2026-11-01T11:00:00Z')],now),'Oldest bank sync · 2d ago')
assert.equal(bankSummary([bank('a',null)],now),'Bank sync pending')
assert.equal(bankSummary([bank('a',null,'unknown')],now),'Bank status unavailable')
assert.equal(bankSummary([bank('a',null,'attention')],now),'1 bank needs attention')
assert.throws(()=>parseBankHealth({banks:[{status:'connected'}]}))
assert.throws(()=>parseBankHealth({}))
assert.equal(parseBankHealth({banks:[]}).length,0)
console.log('Bank health auth, ownership, honest failures, update-mode repair and oldest-sync checks passed')
