const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const ts=require('typescript');
let userId=null;
const cache=new Map();
function load(file){
 const absolute=path.resolve(file);if(cache.has(absolute))return cache.get(absolute).exports;
 const record={exports:{}};cache.set(absolute,record);
 const js=ts.transpileModule(fs.readFileSync(absolute,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 const localRequire=name=>{
  if(name==='./supabase-admin')return{adminClient:()=>({auth:{getUser:async token=>({data:{user:token==='valid-token'&&userId?{id:userId}:null},error:null})}})};
  if(name.startsWith('@/'))return load(name.replace('@/', '')+'.ts');
  if(name.startsWith('.'))return load(path.resolve(path.dirname(absolute),name)+'.ts');
  return require(name);
 };
 vm.runInThisContext(`(function(require,module,exports){${js}\n})`,{filename:absolute})(localRequire,record,record.exports);
 return record.exports;
}
(async()=>{
 const data=load('lib/accounts-directory.ts');
 const current=data.directoryAccounts(new Date('2026-11-13T12:00:00Z'));
 assert.equal(current.length,8);
 assert.equal(current.filter(p=>p.reward).length,3);
 assert.equal(current.find(p=>p.slug==='interactive-brokers').cashValue,0);
 assert.ok(current.every(p=>['bank','savings','brokerage'].includes(p.kind)));
 for(const p of current){assert.equal(new URL(p.source).protocol,'https:');assert.ok(fs.statSync(`public/providers/directory/${p.logo}.png`).size>0)}
 assert.equal(data.directoryAccounts(new Date('2026-12-13T00:00:00Z')).filter(p=>p.reward).length,0);
 current[0].reward='changed';assert.equal(data.directoryAccounts(new Date('2026-11-13T00:00:00Z'))[0].reward,'Up to $400');
 const {GET}=load('app/api/accounts-directory/route.ts');
 const {NextRequest}=require('next/server');
 let r=await GET(new NextRequest('https://example.test/api/accounts-directory'));
 assert.equal(r.status,401);assert.ok(!(await r.json()).accounts);assert.equal(r.headers.get('cache-control'),'private, no-store');
 r=await GET(new NextRequest('https://example.test/api/accounts-directory',{headers:{authorization:'Bearer invalid-token'}}));assert.equal(r.status,401);
 userId='member-a';r=await GET(new NextRequest('https://example.test/api/accounts-directory',{headers:{authorization:'Bearer valid-token'}}));assert.equal(r.status,200);assert.equal((await r.json()).accounts.length,8);assert.equal(r.headers.get('cache-control'),'private, no-store');
 const client=fs.readFileSync('app/dashboard/AccountsDirectory.tsx','utf8');
 assert.ok(!client.includes('How your invite link and rewards work'));
 assert.ok(!client.includes('DIRECTORY_ACCOUNTS'));
 console.log('Accounts directory: authentication, private caching, review expiry, source/logo integrity and cash/stock separation passed.');
})().catch(e=>{console.error(e);process.exitCode=1});
