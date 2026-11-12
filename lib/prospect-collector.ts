export type CollectedContact = {
  email: string;
  name: string;
  nameEvidence: "person metadata" | "public profile" | "email link" | "not published";
  sourceUrl: string;
  pageTitle: string;
  evidence: string;
  topics: string[];
};

export function decodeContactText(text: string): string {
  return text.replace(/&#(x[\da-f]+|\d+);?/gi, (_, n: string) => {
    const code = n[0].toLowerCase() === "x" ? parseInt(n.slice(1), 16) : Number(n);
    return code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : "";
  }).replace(/&(amp|quot|apos|lt|gt|nbsp);/gi, (_, n: string) =>
    ({amp:"&",quot:'"',apos:"'",lt:"<",gt:">",nbsp:" "})[n.toLowerCase()] || "");
}
export function contactText(html: string): string {
  return decodeContactText(html.replace(/<(script|style|noscript)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ").replace(/<[^>]*>/g, " "))
    .replace(/[\x00-\x1f]/g, " ").replace(/\s+/g, " ").trim();
}
function emailValue(value: unknown): string | null {
  if (typeof value !== "string") return null;
  let valueText = decodeContactText(value).replace(/^mailto:/i, "").split("?")[0];
  try { valueText = decodeURIComponent(valueText); } catch { return null; }
  const email = valueText.trim().toLowerCase();
  if (email.length > 254 || !/^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?\.[a-z]{2,}$/i.test(email)) return null;
  if (/^(?:no-?reply|abuse|privacy|legal|security|support|billing|webmaster|postmaster)@/.test(email)) return null;
  return email;
}
function publishedName(value: unknown): string {
  if (typeof value !== "string") return "";
  const name = contactText(value).replace(/^(?:email|contact|write to)\s+/i, "");
  if (!name || name.length > 80 || /[@\d/:]/.test(name) || /\b(?:inquiries|enquiries|business|support|collaboration|newsletter)\b/i.test(name) || /^(?:me|us|here|team|hello|contact|email|send.*|get in touch|click.*)$/i.test(name)) return "";
  return name;
}
const topicRules: [string, RegExp][] = [
  ["FIRE / financial independence", /\b(?:FIRE|financial independence|early retirement)\b/i],
  ["Budgeting", /\b(?:budgeting|budget|spending plan)\b/i],
  ["Saving goals", /\b(?:savings goal|saving money|savings rate)\b/i],
];

/** Extract intentionally published contact text, mail links and Person metadata.
 * Never pair a page author's name with an unrelated address or guess from a handle. */
export function extractPublicContacts(html: string, sourceUrl: string) {
  const pageTitle = contactText(html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1] || "").slice(0, 160);
  const text = contactText(html);
  const topics = topicRules.filter(([, rule]) => rule.test(text)).map(([label]) => label);
  const contacts = new Map<string, CollectedContact>();
  const add = (raw: unknown, rawName: unknown, evidence: CollectedContact["nameEvidence"], excerpt: string) => {
    const email = emailValue(raw);
    if (!email || contacts.size >= 30) return;
    const name = publishedName(rawName);
    const old = contacts.get(email);
    if (old?.name || (old && !name)) return;
    contacts.set(email, {email, name, nameEvidence: name ? evidence : "not published", sourceUrl, pageTitle,
      evidence: excerpt.slice(0, 260), topics});
  };
  const walk = (value: unknown, depth = 0) => {
    if (depth > 12 || !value || typeof value !== "object") return;
    if (Array.isArray(value)) { value.slice(0, 100).forEach(v => walk(v, depth + 1)); return; }
    const obj = value as Record<string, unknown>;
    const types = Array.isArray(obj["@type"]) ? obj["@type"] : [obj["@type"]];
    if (types.includes("Person")) add(obj.email, obj.name, "person metadata", "Name and email published together in Person metadata.");
    Object.values(obj).slice(0, 100).forEach(v => walk(v, depth + 1));
  };
  for (const match of html.matchAll(/<script\b[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try { walk(JSON.parse(match[1])); } catch { /* Malformed site metadata is not contact evidence. */ }
  }
  const visible = html.replace(/<(script|style|noscript)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, " ").replace(/<!--[\s\S]*?-->/g, " ");
  for (const match of visible.matchAll(/<a\b[^>]*href\s*=\s*(["'])(mailto:[^"']+)\1[^>]*>([\s\S]*?)<\/a>/gi)) {
    const label = contactText(match[3]);
    const possibleName = label.replace(/^(?:email|contact|write to)\s+/i, "");
    const name = /^[\p{Lu}][\p{L}'’\-]+(?:\s+[\p{Lu}][\p{L}'’\-]+){0,3}$/u.test(possibleName) ? possibleName : "";
    add(match[2], name, "email link", `Public email link${label ? `: ${label}` : ""}.`);
  }
  // A visible email explicitly introduced as a contact method is useful even
  // without a mailto link. Do not extract arbitrary address lists or source code.
  const blocks = visible.split(/<\/(?:p|div|li|address|section)\s*>/i);
  for (const block of blocks) {
    const text = contactText(block);
    for (const match of text.matchAll(/\b(?:email|e-mail|contact|reach (?:me|us))\b[^@]{0,100}?\b([a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9.-]+\.[a-z]{2,})\b/gi)) {
      add(match[1], "", "not published", `Public contact text: ${match[0]}`);
    }
  }
  const contactLinks: string[] = [];
  for (const match of visible.matchAll(/<a\b[^>]*href\s*=\s*(["'])([^"']+)\1[^>]*>([\s\S]*?)<\/a>/gi)) {
    try {
      const url = new URL(decodeContactText(match[2]), sourceUrl);
      if (url.origin !== new URL(sourceUrl).origin || !/\b(?:contact|about)\b/i.test(url.pathname + " " + contactText(match[3]))) continue;
      url.hash = ""; url.search = "";
      if (url.href !== sourceUrl && !contactLinks.includes(url.href)) contactLinks.push(url.href);
    } catch { /* Skip non-web links. */ }
    if (contactLinks.length >= 2) break;
  }
  return { contacts: [...contacts.values()], contactLinks };
}

/** Conservative robots handling: deny wins on ties; unknown/complex directives
 * do not grant permission. Wildcard and end-anchored path rules are supported. */
export function robotsAllow(robots: string, url: URL): boolean {
  const groups: {agents: string[]; rules: {allow: boolean; path: string}[]}[] = [];
  let group = {agents: [] as string[], rules: [] as {allow: boolean; path: string}[]};
  for (const line of robots.split(/\r?\n/)) {
    const clean = line.split("#")[0].trim();
    const colon = clean.indexOf(":");
    if (colon < 0) continue;
    const key = clean.slice(0, colon).trim().toLowerCase(), value = clean.slice(colon + 1).trim();
    if (key === "user-agent") {
      if (group.rules.length) {groups.push(group);group = {agents:[],rules:[]};}
      group.agents.push(value.toLowerCase());
    } else if ((key === "allow" || key === "disallow") && group.agents.length && value) {
      group.rules.push({allow:key === "allow",path:value});
    }
  }
  groups.push(group);
  const specific = groups.filter(g => g.agents.some(a => a !== "*" && "untilfirecontactbot".includes(a)));
  const relevant = specific.length ? specific : groups.filter(g => g.agents.includes("*"));
  let best = -1, allowed = true;
  let path: string;
  try { path = decodeURI(url.pathname + url.search); } catch { return false; }
  for (const rule of relevant.flatMap(g => g.rules)) {
    const end = rule.path.endsWith("$");
    let rulePath: string;
    try { rulePath = decodeURI(end ? rule.path.slice(0, -1) : rule.path); } catch { continue; }
    const pattern = rulePath.split("*").map(p => p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join(".*");
    if (new RegExp("^" + pattern + (end ? "$" : "")).test(path)) {
      const length = rulePath.replaceAll("*", "").length;
      if (length > best || (length === best && !rule.allow)) {best = length;allowed = rule.allow;}
    }
  }
  return allowed;
}
