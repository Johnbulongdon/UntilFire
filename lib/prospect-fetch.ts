import { resolve4 } from "node:dns/promises";
import { request } from "node:https";
import { isIP } from "node:net";
import { extractPublicContacts, robotsAllow, type CollectedContact } from "./prospect-collector";

export function publicContactUrl(input: string): URL {
  const url = new URL(input);
  if (url.protocol !== "https:" || url.username || url.password || (url.port && url.port !== "443") ||
      isIP(url.hostname) || !url.hostname.includes(".") || /(?:^|\.)(?:localhost|local|internal|test|invalid|example|onion)$/.test(url.hostname))
    throw new Error("Use a public HTTPS website with no login details or custom port.");
  // Source discovery needs page paths only, never account/session query strings.
  url.hash = "";
  url.search = "";
  return url;
}
export function isPublicIPv4(address: string): boolean {
  if (isIP(address) !== 4) return false;
  const [a,b,c] = address.split(".").map(Number);
  return !(a === 0 || a === 10 || a === 127 || a >= 224 ||
    (a === 100 && b >= 64 && b <= 127) || (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) || (a === 192 && (b === 0 || b === 168 || (b === 88 && c === 99))) ||
    (a === 198 && (b === 18 || b === 19 || (b === 51 && c === 100))) ||
    (a === 203 && b === 0 && c === 113));
}
type Page = {url: string; status: number; body: string; type: string; location: string};
const sameSite = (a: URL, b: URL) => a.hostname.replace(/^www\./, "") === b.hostname.replace(/^www\./, "");

/** Resolve and pin a public IPv4 for each request. HTTPS still validates the
 * original hostname. No cookies, auth, proxy environment or automatic redirects. */
export async function fetchPublicPage(input: URL, deadline: number): Promise<Page> {
  const url = publicContactUrl(input.href);
  const ms = Math.min(4000, deadline - Date.now());
  if (ms <= 0) throw new Error("Collection time limit reached. Try a smaller batch.");
  const addresses = await new Promise<string[]>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("Website DNS timed out.")), Math.min(ms, 1500));
    resolve4(url.hostname).then(resolve, () => reject(new Error("Website has no usable public IPv4 address."))).finally(() => clearTimeout(timer));
  });
  if (!addresses.length || addresses.some(ip => !isPublicIPv4(ip))) throw new Error("Website does not resolve exclusively to public addresses.");
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let size = 0;
    const req = request(url, {
      method:"GET", agent:false, family:4,
      lookup: (_host, _options, callback) => callback(null, addresses[0], 4),
      headers: {"User-Agent":"UntilFireContactBot/1.0 (+https://www.untilfire.com)",Accept:"text/html,application/xhtml+xml,text/plain;q=0.8","Accept-Encoding":"identity"},
    }, res => {
      res.on("error", reject);
      res.on("data", (chunk: Buffer) => {
        size += chunk.length;
        if (size > 512_000) {req.destroy(new Error("Page exceeds the collection size limit."));return;}
        chunks.push(chunk);
      });
      res.on("end", () => resolve({url:url.href,status:res.statusCode || 0,body:Buffer.concat(chunks).toString("utf8"),
        type:String(res.headers["content-type"] || ""),location:String(res.headers.location || "")}));
    });
    const timer = setTimeout(() => req.destroy(new Error("Website request timed out.")), Math.max(1, Math.min(ms, deadline - Date.now())));
    req.on("close", () => clearTimeout(timer));
    req.on("error", reject);
    req.end();
  });
}

export type CollectionResult = {
  contacts: CollectedContact[];
  pages: {url:string; status:"scanned" | "skipped"; detail:string}[];
  collectedAt: string;
};
type FetchPage = typeof fetchPublicPage;
export async function collectContacts(sources: string[], fetchPage: FetchPage = fetchPublicPage, deadline = Date.now() + 22_000): Promise<CollectionResult> {
  if (!sources.length || sources.length > 3) throw new Error("Collect from 1–3 website URLs per batch.");
  const seeds = [...new Set(sources.map(s => publicContactUrl(s).href))];
  const contacts = new Map<string, CollectedContact>();
  const pages: CollectionResult["pages"] = [];
  const robots = new Map<string, string>();
  const visited = new Set<string>();
  async function rulesFor(url: URL) {
    if (robots.has(url.origin)) return robots.get(url.origin)!;
    let r = await fetchPage(new URL("/robots.txt", url), deadline);
    for (let i = 0; i < 2 && [301,302,303,307,308].includes(r.status); i++) {
      const next = publicContactUrl(new URL(r.location, r.url).href);
      if (!sameSite(url, next)) throw new Error("Crawl rules redirect to another website.");
      r = await fetchPage(next, deadline);
    }
    const rules = r.status === 404 || r.status === 410 ? "" :
      r.status === 200 && /text\/(?:plain|html)/i.test(r.type) ? r.body : null;
    if (rules === null) throw new Error("Could not confirm this website's crawl rules.");
    robots.set(url.origin, rules);
    return rules;
  }
  async function scan(input: URL, seed: URL, redirects = 0): Promise<string[]> {
    if (Date.now() >= deadline) throw new Error("Collection time limit reached.");
    if (visited.has(input.href)) return [];
    visited.add(input.href);
    if (!robotsAllow(await rulesFor(input), input)) throw new Error("Website crawl rules exclude this page.");
    const page = await fetchPage(input, deadline);
    if ([301,302,303,307,308].includes(page.status)) {
      if (redirects >= 2) throw new Error("Too many website redirects.");
      const next = publicContactUrl(new URL(page.location, input).href);
      if (!sameSite(seed, next)) throw new Error("Redirect to a different website was skipped.");
      return scan(next, seed, redirects + 1);
    }
    if (page.status !== 200 || !/^(?:text\/html|application\/xhtml\+xml)\b/i.test(page.type)) throw new Error(`Page unavailable or not HTML (HTTP ${page.status}).`);
    // Opt-out metadata is respected in addition to robots.txt.
    if (/<meta\b[^>]*(?:noindex|nofollow|noarchive|nosnippet)[^>]*>/i.test(page.body)) throw new Error("Page metadata excludes automated collection.");
    const extracted = extractPublicContacts(page.body, input.href);
    for (const person of extracted.contacts) {
      const previous = contacts.get(person.email);
      if (contacts.size < 60 && (!previous || (!previous.name && person.name))) contacts.set(person.email,person);
    }
    pages.push({url:input.href,status:"scanned",detail:`${extracted.contacts.length} public contact${extracted.contacts.length === 1 ? "" : "s"} found`});
    return extracted.contactLinks;
  }
  for (const source of seeds) {
    const seed = new URL(source);
    try {
      const links = await scan(seed,seed);
      // One linked About/Contact page per seed, never a recursive site crawl.
      if (links[0]) {
        try {await scan(publicContactUrl(links[0]),seed);} catch(error) {
          pages.push({url:links[0],status:"skipped",detail:error instanceof Error ? error.message : "Page skipped."});
        }
      }
    } catch(error) { pages.push({url:source,status:"skipped",detail:error instanceof Error ? error.message : "Website skipped."}); }
  }
  return {contacts:[...contacts.values()],pages,collectedAt:new Date().toISOString()};
}
