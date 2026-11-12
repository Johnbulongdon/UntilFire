import { contactText, decodeContactText, robotsAllow } from "./prospect-collector";
import { collectContacts, fetchPublicPage, publicContactUrl } from "./prospect-fetch";

// Public reading lists discover current sites beyond these starting points.
export const DISCOVERY_SOURCES = [
  "https://refinedbyfire.co/list-of-lists/",
  "https://www.fighttofire.com/blogroll/",
  "https://www.howtofire.com/fire-blogs/",
  "https://wallethacks.com/best-fire-financial-independence-early-retirement-blogs/",
  "https://minimalistinthecity.com/blogroll/",
  "https://personalfinanceblogs.com/directory/",
];
const excluded = /(?:^|\.)(?:facebook|instagram|twitter|x|youtube|linkedin|pinterest|amazon|google|wordpress|gravatar|wikipedia|reddit|tiktok|paypal|patreon)\.[a-z.]+$/i;

export function discoverWebsiteLinks(html: string, source: string): string[] {
  const sites = new Set<string>();
  const sourceHost = new URL(source).hostname.replace(/^www\./, "");
  const visible = html.replace(/<(script|style|noscript)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, "").replace(/<!--[\s\S]*?-->/g, "");
  for (const match of visible.matchAll(/<a\b[^>]*href\s*=\s*["']([^"']+)["'][^>]*>([\s\S]*?)<\/a\s*>/gi)) {
    try {
      const url = publicContactUrl(new URL(decodeContactText(match[1]), source).href);
      const host = url.hostname.replace(/^www\./, "");
      if (host === sourceHost || excluded.test(host) || /\.(?:pdf|png|jpg|zip)$/i.test(url.pathname)) continue;
      if (!/financ|money|budget|frugal|retir|\bfire\b|wealth|invest|saving|freedom|debt|rich|fientist|1500/i.test(`${host} ${contactText(match[2])}`)) continue;
      sites.add(`https://${host}/`);
      if (sites.size >= 100) break;
    } catch { /* Invalid destinations never reach the network. */ }
  }
  return [...sites];
}

export async function lookupProspects(cursor = 0, fetchPage = fetchPublicPage) {
  const deadline = Date.now() + 22_000;
  const source = DISCOVERY_SOURCES[cursor % DISCOVERY_SOURCES.length];
  const pages: {url:string; status:"scanned" | "skipped"; detail:string}[] = [];
  let sites: string[] = [];
  try {
    const url = new URL(source);
    const discoveryDeadline = Math.min(deadline, Date.now() + 7_000);
    const rules = await fetchPage(new URL("/robots.txt", url), discoveryDeadline);
    if (!(rules.status === 404 || rules.status === 410 ||
      (rules.status === 200 && /text\/(?:plain|html)/i.test(rules.type) && robotsAllow(rules.body, url))))
      throw new Error("Source crawl rules unavailable or exclude discovery.");
    const page = await fetchPage(url, discoveryDeadline);
    if (page.status !== 200 || !/^(?:text\/html|application\/xhtml\+xml)\b/i.test(page.type))
      throw new Error(`Discovery source unavailable (HTTP ${page.status}).`);
    if (/<meta\b[^>]*(?:noindex|nofollow|noarchive|nosnippet)[^>]*>/i.test(page.body))
      throw new Error("Source metadata excludes discovery.");
    const discovered = discoverWebsiteLinks(page.body, source);
    const start = discovered.length ? (Math.floor(cursor / DISCOVERY_SOURCES.length) * 3) % discovered.length : 0;
    sites = [...discovered.slice(start), ...discovered.slice(0, start)].slice(0, 3);
    pages.push({url:source,status:"scanned",detail:`Discovered ${discovered.length} relevant linked websites; checking ${sites.length}.`});
  } catch (error) {
    pages.push({url:source,status:"skipped",detail:error instanceof Error ? error.message : "Discovery unavailable."});
  }
  if (!sites.length) sites = [new URL(source).origin + "/"];
  const result = await collectContacts(sites, fetchPage, deadline);
  return {...result, pages:[...pages,...result.pages], nextCursor:cursor + 1};
}
