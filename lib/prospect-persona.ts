import { contactText, decodeContactText, extractPublicContacts, type CollectedContact } from "./prospect-collector";
import { collectContacts, publicContactUrl } from "./prospect-fetch";

export type PersonaEvidence = {
  status: "match" | "review" | "partner";
  interest: string; interestUrl: string; publishedAt: string;
  location: string; age: string; missing: string[];
};
export type PersonaContact = CollectedContact & { account: string; persona: PersonaEvidence };
type Item = { id?: number; by?: string; text?: string; title?: string; time?: number; deleted?: boolean; dead?: boolean };
type Profile = { id?: string; about?: string };
type Search = { hits?: {objectID?: string; author?: string; comment_text?: string}[]; nbPages?: number };
export type ReadPublicApi = (url: URL, deadline: number) => Promise<unknown>;
export const PERSONA_QUERIES = ["my budget", "financial independence", "YNAB", "budget app", "personal finance", "retire early"];

/** Only these public API resources are allowed. User-controlled URLs, redirects,
 * credentials, website links and private HN account email fields are never read. */
export async function readPublicApi(url: URL, deadline: number): Promise<unknown> {
  const allowed = url.origin === "https://hn.algolia.com" && url.pathname === "/api/v1/search_by_date" ||
    url.origin === "https://hacker-news.firebaseio.com" && /^\/v0\/(?:item\/\d+|user\/[a-zA-Z0-9_-]{1,40})\.json$/.test(url.pathname);
  if (!allowed || url.username || url.password) throw new Error("Unsupported public research source.");
  const remaining = Math.min(5000, deadline - Date.now());
  if (remaining <= 0) throw new Error("Lookup time limit reached.");
  const response = await fetch(url, {redirect:"error", credentials:"omit", cache:"no-store", signal:AbortSignal.timeout(remaining), headers:{Accept:"application/json"}});
  if (!response.ok) throw new Error(`Public research source unavailable (HTTP ${response.status}).`);
  const reader = response.body?.getReader();
  if (!reader) throw new Error("Public source returned no content.");
  let bytes = 0, raw = "";
  const decoder = new TextDecoder();
  while (true) {
    const {done, value} = await reader.read(); if (done) break;
    bytes += value.byteLength;
    if (bytes > 512_000) { await reader.cancel(); throw new Error("Public source exceeded the lookup size limit."); }
    raw += decoder.decode(value,{stream:true});
  }
  return JSON.parse(raw + decoder.decode());
}

function selfStatement(html: string): string {
  // Quoted speech is not the account owner's own statement.
  const text = contactText(html.replace(/<blockquote\b[^>]*>[\s\S]*?<\/blockquote>/gi, ""));
  const sentences = text.split(/(?<=[.!?])\s+|\n/);
  return sentences.find(s => /\b(?:I|I'm|I've|my|we|our)\b/i.test(s) &&
    /\b(?:want|need|trying|learning|use|using|used|struggl\w*|plan|hope|hate|hated|prefer|my budget|my savings)\b/i.test(s) &&
    /\b(?:budget(?:ing)?|financial independence|early retirement|retir(?:e|ing) early|savings? goals?|saving money|personal finance|cash flow|track spending|YNAB)\b/i.test(s) &&
    !/^[>"“]|\b(?:my|our) (?:friend|customer|client|colleague|wife|husband|partner|child|son|daughter|parents|company|team|app|product|customers|clients|newsletter|course)|(?:I|we) (?:built|launched|sell|offer)|sponsored|I (?:don't|do not) (?:want|need)/i.test(s))?.slice(0,350) ?? "";
}

export function assessPersona(account: string, item: Item, profile: Profile, now = Date.now()): PersonaContact | null {
  if (item.by !== account || profile.id !== account || item.deleted || item.dead || !item.id || !item.time) return null;
  if (item.time * 1000 > now || now - item.time * 1000 > 365 * 86400_000) return null;
  const interest = selfStatement(item.text || "");
  if (!interest) return null;
  const bio = contactText(profile.about || "");
  const profileUrl = `https://news.ycombinator.com/user?id=${encodeURIComponent(account)}`;
  const name = bio.match(/\b(?:[Mm]y name is|[Nn]ame:|I am|I['’]m) ([A-Z][\p{L}'’-]+ [A-Z][\p{L}'’-]+)\b/u)?.[1] || "";
  const visibleAddresses = [...new Set(bio.match(/[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9.-]+\.[a-z]{2,}/gi) || [])];
  const published = visibleAddresses.length === 1 ? extractPublicContacts(`<a href="mailto:${encodeURIComponent(visibleAddresses[0])}">Email</a>`,profileUrl).contacts : [];
  const address = published.length === 1 ? published[0].email : "";
  const email = /^(?:hello|contact|info|admin|team|sales|press|office)@/i.test(address) ? "" : address;
  // Require an explicit personal location, not a reference to U.S. taxes or a job.
  const location = bio.match(/\b(?:I live in|I am based in|I'm based in|based in|location:)\s+(?:the )?(?:United States|USA|U\.S\.(?:A\.)?|(?:Austin|Dallas|Houston),? (?:TX|Texas)|(?:San Francisco|Los Angeles|San Diego),? (?:CA|California)|New York,? (?:NY|USA)|Seattle,? (?:WA|Washington)|Boston,? (?:MA|Massachusetts)|Chicago,? (?:IL|Illinois))\b/i)?.[0] || "";
  const postAge = contactText(item.text || "").match(/\b(?:I am|I['’]m)\s*(\d{1,2})\s*(?:years? old|yo|year-old)\b/i);
  if (postAge && (Number(postAge[1]) < 18 || Number(postAge[1]) >= 40)) return null;
  const ageMatch = bio.match(/\b(?:I am|I'm|age:)\s*(\d{1,2})(?:\s*(?:years? old|yo|year-old))?\b/i);
  const ageNumber = ageMatch ? Number(ageMatch[1]) : null;
  // Under-18 self-descriptions are excluded, never offered for review.
  if (ageNumber !== null && (ageNumber < 18 || ageNumber >= 40)) return null;
  const age = ageNumber !== null && ageNumber <= 39 ? ageMatch![0] : "";
  const partner = /\b(?:financial (?:coach|advisor|adviser|planner)|finance (?:blogger|creator)|newsletter (?:author|publisher)|I (?:built|founded|run) (?:a |an |the )?(?:budget|finance|FIRE)|founder of .*?(?:budget|finance))\b/i.test(bio) || /\b(?:I|we) (?:built|created|launched|founded).{0,100}\b(?:app|tool|product|platform)|\b(?:my|our) (?:budgeting app|finance app)/i.test(contactText(item.text || ""));
  const missing = [!name && "Published full name", !email && "Published contact email", !location && "Explicit U.S. location", !age && "Young-adult evidence"].filter((v): v is string => !!v);
  const interestUrl = `https://news.ycombinator.com/item?id=${item.id}`;
  return {account,email,name,nameEvidence:name ? "public profile" : "not published",sourceUrl:profileUrl,pageTitle:`Public profile: ${account}`,
    evidence:email ? "Contact email explicitly published on the same account's public profile." : "No contact email published on this profile.",topics:["Personal budgeting / FIRE interest"],
    persona:{status:partner ? "partner" : missing.length ? "review" : "match",interest,interestUrl,publishedAt:new Date(item.time * 1000).toISOString(),location,age,missing}};
}

export function personalWebsite(about: string): string | null {
  const visible = about.replace(/<(script|style|noscript)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, "");
  for (const link of visible.matchAll(/<a\b[^>]*href\s*=\s*["']([^"']+)["'][^>]*>([\s\S]*?)<\/a\s*>/gi)) {
    const before = contactText(visible.slice(Math.max(0,link.index-80),link.index));
    if (!/(?:my (?:personal )?(?:website|homepage|blog|site)|personal website)\s*[:—-]?\s*$/i.test(before) &&
      !/^(?:my (?:personal )?(?:website|homepage|blog|site)|personal website)$/i.test(contactText(link[2]))) continue;
    try {return publicContactUrl(decodeContactText(link[1])).href;} catch { /* Skip unsafe links. */ }
  }
  return null;
}

export async function lookupPersonaProspects(cursor = 0, read: ReadPublicApi = readPublicApi, collect = collectContacts) {
  const deadline = Date.now() + 22_000;
  const query = PERSONA_QUERIES[cursor % PERSONA_QUERIES.length];
  const page = Math.floor(cursor / PERSONA_QUERIES.length) % 40;
  const searchUrl = new URL("https://hn.algolia.com/api/v1/search_by_date");
  searchUrl.search = new URLSearchParams({query,tags:"comment",hitsPerPage:"30",page:String(page),numericFilters:`created_at_i>${Math.floor(Date.now()/1000)-365*86400}`}).toString();
  const pages: {url:string;status:"scanned"|"skipped";detail:string}[] = [];
  const contacts: PersonaContact[] = [], partners: PersonaContact[] = [];
  let linkedSites = 0;
  try {
    const result = await read(searchUrl,deadline) as Search;
    if (!result || !Array.isArray(result.hits)) throw new Error("Public search returned an unexpected result.");
    const authors = new Set<string>();
    const hits = result.hits.filter(h => {
      if (h?.comment_text && !selfStatement(h.comment_text)) return false;
      if (!h || !/^[a-zA-Z0-9_-]{1,40}$/.test(h.author || "") || !/^\d+$/.test(h.objectID || "") || authors.has(h.author!)) return false;
      authors.add(h.author!);return true;
    }).slice(0,12);
    pages.push({url:`https://hn.algolia.com/?q=${encodeURIComponent(query)}`,status:"scanned",detail:`Researching ${hits.length} public accounts from recent discussions.`});
    for (let i = 0; i < hits.length && Date.now() < deadline - 1000; i += 3) {
      await Promise.all(hits.slice(i,i+3).map(async hit => {
        const account = hit.author!;
        const profileUrl = `https://news.ycombinator.com/user?id=${encodeURIComponent(account)}`;
        try {
          const [item,profile] = await Promise.all([
            read(new URL(`https://hacker-news.firebaseio.com/v0/item/${hit.objectID}.json`),deadline),
            read(new URL(`https://hacker-news.firebaseio.com/v0/user/${encodeURIComponent(account)}.json`),deadline),
          ]);
          if (!item || !profile) return;
          const candidate = assessPersona(account,item as Item,profile as Profile);
          if (!candidate) return;
          const ownSite = candidate.persona.status !== "partner" && (!candidate.name || !candidate.email) ? personalWebsite((profile as Profile).about || "") : null;
          if (ownSite && linkedSites < 2 && Date.now() < deadline - 4000) {
            linkedSites++;
            const website = await collect([ownSite], undefined, deadline);
            pages.push(...website.pages);
            const paired = website.contacts.filter(c => c.name && (!candidate.email || c.email === candidate.email) && (!candidate.name || c.name === candidate.name));
            if (paired.length === 1 && !/^(?:hello|contact|info|admin|team|sales|press|office)@/i.test(paired[0].email)) {
              Object.assign(candidate,{name:paired[0].name,email:paired[0].email,sourceUrl:paired[0].sourceUrl,nameEvidence:paired[0].nameEvidence,evidence:"Published name/email pair on the personal website explicitly linked by this account."});
              candidate.persona.missing = candidate.persona.missing.filter(m => m !== "Published full name" && m !== "Published contact email");
              candidate.persona.status = candidate.persona.missing.length ? "review" : "match";
            }
          }
          (candidate.persona.status === "partner" ? partners : contacts).push(candidate);
        } catch (error) { pages.push({url:profileUrl,status:"skipped",detail:error instanceof Error ? error.message : "Profile unavailable."}); }
      }));
    }
  } catch (error) { pages.push({url:searchUrl.href,status:"skipped",detail:error instanceof Error ? error.message : "Research unavailable."}); }
  const seen = new Set<string>();
  const unique = contacts.filter(c => {const key=c.email || c.account;if(seen.has(key))return false;seen.add(key);return true;});
  return {contacts:unique,partners,pages,collectedAt:new Date().toISOString(),nextCursor:cursor+1,audience:"users" as const};
}
