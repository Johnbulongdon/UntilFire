import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "typescript";

async function moduleUrl(path, replacements = []) {
  let source = await readFile(new URL(path, import.meta.url), "utf8");
  for (const [from,to] of replacements) source = source.replace(from,to);
  const js = ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
  return `data:text/javascript;base64,${Buffer.from(js).toString("base64")}`;
}
const parserUrl = await moduleUrl("../lib/prospect-collector.ts");
const {extractPublicContacts,robotsAllow} = await import(parserUrl);
const fetchUrl = await moduleUrl("../lib/prospect-fetch.ts", [['"./prospect-collector"',JSON.stringify(parserUrl)]]);
const {publicContactUrl,isPublicIPv4,collectContacts} = await import(fetchUrl);

test("pairs published Person names with their own email; never guesses a name from an address",()=>{
  const r=extractPublicContacts(`<title>Example FIRE</title><script type="application/ld+json">{"@graph":[{"@type":"Person","name":"Jane Doe","email":"mailto:jane@example.org"}]}</script><a href="mailto:hello@example.org">Email us</a><a href="mailto:jane@example.org">Email Jane Doe</a>`,"https://example.org/");
  assert.equal(r.contacts.length,2);
  assert.equal(r.contacts.find(c=>c.email==="jane@example.org").name,"Jane Doe");
  assert.equal(r.contacts.find(c=>c.email==="hello@example.org").name,"");
  assert.equal(r.contacts[0].sourceUrl,"https://example.org/");
});
test("excludes operational mailboxes, header injection, hidden scripts and unlinked address dumps",()=>{
  const r=extractPublicContacts(`<script>"<a href='mailto:fake@example.org'>Fake Name</a>"</script><!-- <a href="mailto:comment@example.org">Comment</a> --><a href="mailto:legal@example.org">Legal</a><a href="mailto:hello@example.org%0d%0aBcc:bad@example.org">Bad</a> somebody@example.org`,"https://example.org/");
  assert.equal(r.contacts.length,0);
});
test("decodes published entities, strips mailto subject parameters and handles malformed metadata",()=>{
  const r=extractPublicContacts(`<script type="application/ld+json">bad json</script><a href="mailto:ja&#110;e@example.org?subject=Hello">Jane Doe</a><a href="mailto:JANE@example.org">Jane Doe</a>`,"https://example.org/");
  assert.equal(r.contacts.length,1);assert.equal(r.contacts[0].email,"jane@example.org");
});
test("extracts explicitly introduced visible contact email without mining address dumps or guessing names",()=>{
  const r=extractPublicContacts('<p>You can email me at jane@example.org for business inquiries.</p><p>other@example.org</p>',"https://example.org/contact");
  assert.equal(r.contacts.length,1);assert.equal(r.contacts[0].email,"jane@example.org");assert.equal(r.contacts[0].name,"");
});
test("topic matches describe the page; names remain absent when only the author is known",()=>{
  const r=extractPublicContacts(`<h1>Jane Doe: financial independence and budgeting</h1><a href="mailto:hello@example.org">Contact</a>`,"https://example.org/");
  assert.equal(r.contacts[0].name,"");assert.equal(r.contacts[0].topics.length,2);
});
test("allows only same-origin contact discovery and bounds the link list",()=>{
  const r=extractPublicContacts(`<a href="https://other.org/contact">Contact</a><a href="/contact?session=secret">Contact</a><a href="/about">About</a><a href="/about-us">About us</a>`,"https://example.org/");
  assert.deepEqual(r.contactLinks,["https://example.org/contact","https://example.org/about"]);
});
test("rejects loopback/private/metadata/encoded-IP inputs, credentials and custom ports",()=>{
  for(const url of ["http://example.org/","https://127.0.0.1/","https://2130706433/","https://[::1]/","https://name:pass@example.org/","https://example.org:8443/","https://metadata.internal/","https://localhost/"]) assert.throws(()=>publicContactUrl(url));
  assert.equal(publicContactUrl("https://example.org/contact?token=secret#part").href,"https://example.org/contact");
  for(const ip of ["127.0.0.1","10.0.0.1","169.254.169.254","172.16.1.2","192.168.1.1","100.64.0.1","0.0.0.0","198.18.0.1","203.0.113.1","::ffff:127.0.0.1","224.0.0.1"]) assert.equal(isPublicIPv4(ip),false,ip);
  assert.equal(isPublicIPv4("8.8.8.8"),true);
});
test("robots rules handle bot specificity, wildcard paths, escapes and deny ties",()=>{
  assert.equal(robotsAllow("User-agent: *\nDisallow: /",new URL("https://example.org/contact")),false);
  assert.equal(robotsAllow("User-agent: *\nDisallow: /\nUser-agent: UntilFireContactBot\nAllow: /contact",new URL("https://example.org/contact")),true);
  assert.equal(robotsAllow("User-agent: *\nDisallow: /*private$",new URL("https://example.org/a-private")),false);
  assert.equal(robotsAllow("User-agent: *\nAllow: /contact\nDisallow: /contact",new URL("https://example.org/contact")),false);
  assert.equal(robotsAllow("User-agent: *\nDisallow: /%63ontact",new URL("https://example.org/contact")),false);
});
const page=(url,body,status=200,type="text/html",location="")=>({url,status,body,type,location});
test("end-to-end collection deduplicates seeds and email across pages; follows only one contact page",async()=>{
  const calls=[];
  const result=await collectContacts(["https://example.org/","https://example.org/"],async(url)=>{
    calls.push(url.href);
    if(url.pathname==="/robots.txt") return page(url.href,"",404);
    if(url.pathname==="/") return page(url.href,'<a href="/contact">Contact</a><a href="/about">About</a><a href="mailto:jane@example.org">Jane Doe</a>');
    return page(url.href,'<a href="mailto:jane@example.org">Jane Doe</a><a href="mailto:alex@example.org">Alex Smith</a>');
  });
  assert.deepEqual(calls,["https://example.org/robots.txt","https://example.org/","https://example.org/contact"]);
  assert.equal(result.contacts.length,2);assert.equal(result.pages.length,2);
});
test("blocked or unavailable robots fail closed and never fetch a page",async()=>{
  for(const status of [200,403,429,503]) {
    const calls=[];
    const result=await collectContacts(["https://example.org/contact"],async(url)=>{calls.push(url.pathname);return page(url.href,"User-agent: *\nDisallow: /",status,"text/plain");});
    assert.deepEqual(calls,["/robots.txt"]);assert.equal(result.contacts.length,0);assert.equal(result.pages[0].status,"skipped");
  }
});
test("robots canonical-host redirects are bounded and checked before accessing contacts",async()=>{
  const calls=[];
  const result=await collectContacts(["https://www.example.org/"],async(url)=>{
    calls.push(url.href);
    if(url.pathname==="/robots.txt") return url.hostname.startsWith("www.") ? page(url.href,"",301,"text/plain","https://example.org/robots.txt") : page(url.href,"User-agent: *\nDisallow: /",200,"text/plain");
    throw Error("Must not fetch a denied page");
  });
  assert.deepEqual(calls,["https://www.example.org/robots.txt","https://example.org/robots.txt"]);assert.equal(result.contacts.length,0);
  const external=await collectContacts(["https://example.org/"],async(url)=>page(url.href,"",302,"text/plain","https://other.org/robots.txt"));
  assert.match(external.pages[0].detail,/another website/);
});
test("external redirects and noindex pages are skipped, partial batches preserve valid results",async()=>{
  const calls=[];
  const result=await collectContacts(["https://example.org/","https://other.org/"],async(url)=>{
    calls.push(url.href);
    if(url.pathname==="/robots.txt") return page(url.href,"",404);
    if(url.hostname==="example.org") return page(url.href,"",302,"text/html","https://attacker.org/contact");
    return page(url.href,'<a href="mailto:alex@other.org">Alex Smith</a>');
  });
  assert.equal(result.contacts.length,1);assert.ok(!calls.some(u=>u.includes("attacker")));
  const blocked=await collectContacts(["https://example.org/"],async(url)=>url.pathname==="/robots.txt"?page(url.href,"",404):page(url.href,'<meta name="robots" content="noindex"><a href="mailto:jane@example.org">Jane</a>'));
  assert.equal(blocked.contacts.length,0);
  await assert.rejects(collectContacts(Array(4).fill("https://example.org/")),/1–3/);
});

test("real fetch implementation pins DNS, sends no cookies and blocks private/mixed DNS before connecting",async()=>{
  const state=globalThis.__collectorTransportTest={addresses:["8.8.8.8"],calls:0};
  const mockUrl=`data:text/javascript;base64,${Buffer.from(`
    import {EventEmitter} from 'node:events';
    export async function resolve4(){return globalThis.__collectorTransportTest.addresses;}
    export function request(url,options,onResponse){
      const state=globalThis.__collectorTransportTest;state.calls++;state.options=options;state.url=url.href;
      options.lookup(url.hostname,{},(error,address,family)=>{state.lookup={error,address,family};});
      const req=new EventEmitter();req.destroy=(error)=>{if(error)req.emit('error',error);req.emit('close');};
      req.end=()=>{const res=new EventEmitter();res.statusCode=200;res.headers={'content-type':'text/html'};
        onResponse(res);res.emit('data',Buffer.from('<title>Public page</title>'));res.emit('end');req.emit('close');};
      return req;
    }
  `).toString("base64")}`;
  const url=await moduleUrl("../lib/prospect-fetch.ts",[['"./prospect-collector"',JSON.stringify(parserUrl)],['"node:dns/promises"',JSON.stringify(mockUrl)],['"node:https"',JSON.stringify(mockUrl)]]);
  const {fetchPublicPage}=await import(url);
  const page=await fetchPublicPage(new URL("https://example.org/"),Date.now()+1000);
  assert.equal(page.status,200);assert.equal(state.lookup.address,"8.8.8.8");assert.equal(state.options.agent,false);
  assert.equal(state.options.headers.Cookie,undefined);assert.equal(state.options.rejectUnauthorized,undefined);
  assert.equal(state.options.family,4);
  for(const ips of [["127.0.0.1"],["8.8.8.8","10.1.2.3"]]) {
    state.addresses=ips;await assert.rejects(fetchPublicPage(new URL("https://example.org/"),Date.now()+1000),/public addresses/);
  }
  assert.equal(state.calls,1);delete globalThis.__collectorTransportTest;
});

test("collector route authenticates before fetching, bounds bodies and returns no-store results without persistence",async()=>{
  const state=globalThis.__collectorRouteTest={authorized:false,calls:0};
  const mockUrl=`data:text/javascript;base64,${Buffer.from(`
    export const NextResponse={json:(data,options={})=>({data,status:options.status||200,headers:options.headers})};
    export async function requireAdminUser(){return globalThis.__collectorRouteTest.authorized?{user:{id:'test-admin'}}:{error:NextResponse.json({error:'Unauthorized'},{status:401})};}
    export async function lookupProspects(cursor){globalThis.__collectorRouteTest.calls++;return {contacts:[],pages:[],collectedAt:'test',nextCursor:cursor+1};}
  `).toString("base64")}`;
  const url=await moduleUrl("../app/api/admin/cold-email/collect/route.ts",[['"next/server"',JSON.stringify(mockUrl)],['"@/lib/admin-auth"',JSON.stringify(mockUrl)],['"@/lib/prospect-discovery"',JSON.stringify(mockUrl)]]);
  const {POST}=await import(url);
  const req=body=>new Request('https://www.untilfire.com/api/admin/cold-email/collect',{method:'POST',body});
  assert.equal((await POST(req('{"cursor":0}'))).status,401);assert.equal(state.calls,0);
  state.authorized=true;
  assert.equal((await POST(req('x'.repeat(5001)))).status,413);assert.equal(state.calls,0);
  assert.equal((await POST(req('{"cursor":-1}'))).status,400);assert.equal(state.calls,0);
  const response=await POST(req('{"cursor":0}'));
  assert.equal(response.status,200);assert.equal(response.headers['Cache-Control'],'no-store');assert.equal(state.calls,1);
  delete globalThis.__collectorRouteTest;
});
