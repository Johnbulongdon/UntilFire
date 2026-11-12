import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import ts from 'typescript';
async function moduleUrl(path, replacements=[]) {
  let source=await readFile(new URL(path,import.meta.url),'utf8');
  for(const [from,to] of replacements) source=source.replace(from,to);
  return 'data:text/javascript;base64,'+Buffer.from(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText).toString('base64');
}
const parser=await moduleUrl('../lib/prospect-collector.ts');
const transport=await moduleUrl('../lib/prospect-fetch.ts', [['"./prospect-collector"',JSON.stringify(parser)]]);
const discovery=await moduleUrl('../lib/prospect-discovery.ts', [['"./prospect-collector"',JSON.stringify(parser)],['"./prospect-fetch"',JSON.stringify(transport)]]);
const {discoverWebsiteLinks,lookupProspects,DISCOVERY_SOURCES}=await import(discovery);
const page=(url,body,status=200,type='text/html')=>({url:url.href,body,status,type,location:''});
test('discovers relevant outbound sites; removes duplicates, social links, scripts and unsafe URLs',()=>{
  const links=discoverWebsiteLinks(`<a href="https://myfinance.org/post">Money blog</a><a href="https://www.myfinance.org/other">Budget</a><a href="https://youtube.com/a">Money</a><a href="https://127.0.0.1/">Budget</a><a href="https://unrelated.org/">Buy shoes</a><script><a href="https://badfinance.org/">Money</a></script>`,DISCOVERY_SOURCES[0]);
  assert.deepEqual(links,['https://myfinance.org/']);
});
test('one click discovers websites and extracts their published contacts with evidence',async()=>{
  const calls=[];
  const result=await lookupProspects(0,async(url)=>{
    calls.push(url.href);
    if(url.pathname==='/robots.txt') return page(url,'',404);
    if(url.href===DISCOVERY_SOURCES[0]) return page(url,'<a href="https://newfinance.org/">New finance blog</a>');
    if(url.pathname==='/') return page(url,'<title>Budgeting</title><a href="/contact">Contact</a>');
    return page(url,'<a href="mailto:jane@newfinance.org">Jane Doe</a>');
  });
  assert.equal(result.nextCursor,1);assert.equal(result.contacts[0].email,'jane@newfinance.org');
  assert.equal(result.contacts[0].sourceUrl,'https://newfinance.org/contact');
  assert.ok(calls.includes('https://newfinance.org/robots.txt'));
});
test('next batches rotate sources and advance through discovered websites',async()=>{
  const checked=[];
  const mock=async(url)=>{
    if(url.pathname==='/robots.txt') return page(url,'',404);
    if(url.href===DISCOVERY_SOURCES[0]) return page(url,Array.from({length:7},(_,i)=>`<a href="https://finance${i}.org/">Budget blog</a>`).join(''));
    checked.push(url.hostname);return page(url,'No email published');
  };
  await lookupProspects(6,mock);
  assert.deepEqual(checked,['finance3.org','finance4.org','finance5.org']);
});
test('blocked discovery does not read the directory and blocked sites yield an explicit report',async()=>{
  const paths=[];
  const result=await lookupProspects(0,async(url)=>{paths.push(url.pathname);return page(url,'User-agent: *\nDisallow: /',200,'text/plain');});
  assert.ok(paths.every(p=>p==='/robots.txt'));assert.equal(result.contacts.length,0);
  assert.ok(result.pages.every(p=>p.status==='skipped'));
});
test('route filters both saved and suppressed contacts and fails closed on storage errors',async()=>{
  const state=globalThis.__lookupRoute={error:false};
  const mock='data:text/javascript;base64,'+Buffer.from(`
    export const NextResponse={json:(data,options={})=>({data,status:options.status||200})};
    export async function requireAdminUser(){return {user:{id:'admin'},admin:{from:table=>({select:()=>({in:async()=>({error:globalThis.__lookupRoute.error,data:[{email:table==='cold_prospects'?'saved@example.org':'optout@example.org'}]})})})}};}
    export async function lookupProspects(cursor){return {contacts:['saved','optout','fresh'].map(n=>({email:n+'@example.org'})),pages:[],nextCursor:cursor+1};}
  `).toString('base64');
  const route=await moduleUrl('../app/api/admin/cold-email/collect/route.ts',[['"next/server"',JSON.stringify(mock)],['"@/lib/admin-auth"',JSON.stringify(mock)],['"@/lib/prospect-discovery"',JSON.stringify(mock)]]);
  const {POST}=await import(route);
  const req=()=>new Request('https://localhost/api/admin/cold-email/collect',{method:'POST',body:'{"cursor":0}'});
  const result=await POST(req());assert.equal(result.status,200);assert.equal(result.data.skippedCount,2);
  assert.deepEqual(result.data.contacts,[{email:'fresh@example.org'}]);
  state.error=true;assert.equal((await POST(req())).status,503);delete globalThis.__lookupRoute;
});
