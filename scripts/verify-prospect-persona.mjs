import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import ts from 'typescript';
async function moduleUrl(path,replacements=[]) {
  let source=await readFile(new URL(path,import.meta.url),'utf8');
  for(const [from,to] of replacements) source=source.replace(from,to);
  return 'data:text/javascript;base64,'+Buffer.from(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText).toString('base64');
}
const parser=await moduleUrl('../lib/prospect-collector.ts');
const transport=await moduleUrl('../lib/prospect-fetch.ts', [['"./prospect-collector"',JSON.stringify(parser)]]);
const personaUrl=await moduleUrl('../lib/prospect-persona.ts', [['"./prospect-collector"',JSON.stringify(parser)],['"./prospect-fetch"',JSON.stringify(transport)]]);
const {assessPersona,lookupPersonaProspects,readPublicApi,personalWebsite}=await import(personaUrl);
const now=Date.now();
const item={id:123,by:'jane',text:'I am learning about financial independence and want help budgeting.',time:Math.floor(now/1000)-100};
const profile={id:'jane',about:"My name is Jane Doe. I'm 28 years old. I live in Austin, TX. Email me at jane@example.org."};
test('matches only same-account published identity, interest, U.S. location and young-adult evidence',()=>{
  const result=assessPersona('jane',item,profile,now);
  assert.equal(result.persona.status,'match');assert.equal(result.name,'Jane Doe');assert.equal(result.email,'jane@example.org');
  assert.deepEqual(result.persona.missing,[]);assert.equal(result.persona.interestUrl,'https://news.ycombinator.com/item?id=123');
});
test('does not turn a topic, other person, repost or quoted passage into personal interest',()=>{
  for(const text of ['Budgeting is a popular topic.','My friend wants financial independence.','<blockquote>I need help budgeting.</blockquote> Interesting.', 'I built a budgeting app for my customers.']) {
    // Statements about another person must not qualify the author.
    assert.equal(assessPersona('jane',{...item,text},profile,now),null,text);
  }
});
test('missing identity and geography remain research-only; never derive a name from username or email',()=>{
  const result=assessPersona('jane',item,{id:'jane',about:'I work with US customers. Contact me at jane.doe@example.org.'},now);
  assert.equal(result.name,'');assert.equal(result.persona.location,'');assert.equal(result.persona.age,'');assert.equal(result.persona.status,'review');
});
test('excludes minors, deleted posts, mismatched identities, future and stale posts',()=>{
  for(const age of ['17','42']) assert.equal(assessPersona('jane',item,{...profile,about:profile.about.replace('28',age)},now),null);
  assert.equal(assessPersona('jane',{...item,text: "I'm 16 years old and I need help budgeting."},{id:'jane',about:''},now),null);
  for(const patch of [{deleted:true},{dead:true},{by:'other'},{time:1},{time:Math.floor(now/1000)+100}]) assert.equal(assessPersona('jane',{...item,...patch},profile,now),null);
  assert.equal(assessPersona('jane',item,{...profile,id:'other'},now),null);
});
test('finance sellers are separated from potential users; role inboxes and ambiguous emails are withheld',()=>{
  const partner=assessPersona('jane',item,{...profile,about:profile.about+' I am a financial coach.'},now);
  assert.equal(partner.persona.status,'partner');
  assert.equal(assessPersona('jane',item,{...profile,about:profile.about.replace('jane@','info@')},now).email,'');
  assert.equal(assessPersona('jane',item,{...profile,about:profile.about+' Email me at second@example.org.'},now).email,'');
});
test('one-click research verifies live item authors, bounds accounts, separates partners and rotates queries',async()=>{
  const calls=[];
  const read=async(url)=>{
    calls.push(url.href);
    if(url.hostname==='hn.algolia.com') return {hits:[{objectID:'123',author:'jane'},{objectID:'124',author:'jane'},{objectID:'125',author:'coach'},{objectID:'126',author:'spoof'},{objectID:'127',author:'../../private'}]};
    if(url.pathname.includes('/item/')) {const id=Number(url.pathname.match(/\d+/g).at(-1));return {...item,id,by:id===125?'coach':id===126?'other':'jane'};}
    const id=url.pathname.split('/').at(-1).replace('.json','');return {...profile,id,about:profile.about+(id==='coach'?' I am a financial coach.':'')};
  };
  const result=await lookupPersonaProspects(1,read);
  assert.equal(result.contacts.length,1);assert.equal(result.partners.length,1);assert.equal(result.nextCursor,2);
  assert.equal(new URL(calls[0]).searchParams.get('query'),'financial independence');
  assert.equal(calls.filter(u=>u.includes('/user/')).length,3);assert.ok(!calls.some(u=>u.includes('private')));
});
test('public source failures are visible and never fall back to publisher contacts',async()=>{
  const result=await lookupPersonaProspects(0,async()=>{throw Error('Source unavailable');});
  assert.equal(result.contacts.length,0);assert.equal(result.pages[0].status,'skipped');assert.equal(result.nextCursor,1);
});
test('only explicit personal-site links can enrich a profile; company and arbitrary links are ignored',async()=>{
  assert.equal(personalWebsite('<a href="https://company.org/">Company</a>'),null);
  assert.equal(personalWebsite('My website: <a href="https://127.0.0.1/">site</a>'),null);
  assert.equal(personalWebsite('My personal website: <a href="https://janesite.org/">Jane</a>'),'https://janesite.org/');
  const result=await lookupPersonaProspects(0,async url=>{
    if(url.hostname==='hn.algolia.com')return {hits:[{objectID:'123',author:'jane'}]};
    if(url.pathname.includes('/item/'))return item;
    return {id:'jane',about:'My personal website: <a href="https://janesite.org/">Jane</a>'};
  },async sources=>{
    assert.deepEqual(sources,['https://janesite.org/']);
    return {contacts:[{email:'jane@example.org',name:'Jane Doe',sourceUrl:'https://janesite.org/about',nameEvidence:'person metadata'}],pages:[]};
  });
  assert.equal(result.contacts[0].name,'Jane Doe');assert.equal(result.contacts[0].email,'jane@example.org');
  assert.equal(result.contacts[0].persona.status,'review');assert.ok(result.contacts[0].persona.missing.includes('Explicit U.S. location'));
});
test('API transport rejects arbitrary hosts, credentials, unsupported paths and expired deadlines',async()=>{
  for(const url of ['https://127.0.0.1/','https://hn.algolia.com/admin','https://attacker.org/api/v1/search_by_date','https://name:pass@hn.algolia.com/api/v1/search_by_date','https://hacker-news.firebaseio.com/v0/user/../config.json']) await assert.rejects(readPublicApi(new URL(url),now+1000),/Unsupported/);
  await assert.rejects(readPublicApi(new URL('https://hn.algolia.com/api/v1/search_by_date'),1),/time limit/);
});
test('API transport omits credentials, refuses redirects, bounds response bytes and surfaces provider errors',async()=>{
  const original=globalThis.fetch;
  const url=new URL('https://hn.algolia.com/api/v1/search_by_date');
  try {
    globalThis.fetch=async(_url,options)=>{assert.equal(options.redirect,'error');assert.equal(options.credentials,'omit');assert.equal(options.cache,'no-store');return new Response('{"hits":[]}');};
    assert.deepEqual(await readPublicApi(url,Date.now()+1000),{hits:[]});
    globalThis.fetch=async()=>new Response('x'.repeat(512001));
    await assert.rejects(readPublicApi(url,Date.now()+1000),/size limit/);
    globalThis.fetch=async()=>new Response('',{status:429});
    await assert.rejects(readPublicApi(url,Date.now()+1000),/429/);
  } finally {globalThis.fetch=original;}
});
