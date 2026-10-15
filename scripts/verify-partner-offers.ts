/**
 * Partner offers: the link rules that keep a look-alike or short link from
 * reaching a user, bonus expiry, the disclosure line, and the wiring that keeps
 * the tables private and the redirect closed.
 *
 * Run: npm run test:partner-offers
 */
import { readFileSync } from "node:fs";
import {
  activeBonus, disclosure, groupOffers, linkMatchesDomain, normaliseDomain, normaliseSlug, rateLabel, yearlyInterest,
} from "../lib/partner-offers.ts";

const checks: { name: string; ok: boolean }[] = [];
const check = (name: string, ok: boolean) => checks.push({ name, ok });
const read = (p: string) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");

check("links: https on the domain or a subdomain", linkMatchesDomain("https://example.com/r/x", "example.com") && linkMatchesDomain("https://www.example.com/r/x", "example.com"));
check("links: refuse http, short links, look-alikes and userinfo",
  !linkMatchesDomain("http://example.com/r", "example.com") &&
  !linkMatchesDomain("https://bit.ly/abc", "example.com") &&
  !linkMatchesDomain("https://example.com.evil.io/r", "example.com") &&
  !linkMatchesDomain("https://notexample.com/r", "example.com") &&
  !linkMatchesDomain("https://example.com@evil.io/r", "example.com") &&
  !linkMatchesDomain("javascript:alert(1)", "example.com"));
check("domains: normalised", normaliseDomain("https://www.Example.com/path") === "example.com" && normaliseDomain("nope") === null);
check("slugs: lower-case, digits, dashes", normaliseSlug(" Savings-A ") === "savings-a" && normaliseSlug("a") === null && normaliseSlug("../x") === null);

const now = new Date("2026-10-15T12:00:00Z");
check("bonus: shown through its end date", activeBonus({ bonusText: "$300", bonusEndsOn: "2026-10-15" }, now) === "$300");
check("bonus: hidden the day after", activeBonus({ bonusText: "$300", bonusEndsOn: "2026-10-14" }, now) === null);
check("bonus: no end date stays", activeBonus({ bonusText: "$300", bonusEndsOn: null }, now) === "$300");
check("rate: 420 bps is 4.20% APY", rateLabel(420) === "4.20% APY" && rateLabel(null) === null);
check("interest: $12,400 at 4.20% is $521 a year", yearlyInterest(12400, 420) === 521 && yearlyInterest(-5, 420) === 0);
check("disclosure: names who earns", disclosure(null).startsWith("UntilFire earns") && disclosure("Alex").startsWith("Alex, who invited you"));
check("groups: savings, bank, brokerage order; empty kinds dropped",
  JSON.stringify(groupOffers([{ kind: "brokerage" }, { kind: "savings" }] as { kind: "savings" | "bank" | "brokerage" }[]).map((g) => g.kind)) === '["savings","brokerage"]');

const sql = read("supabase/migrations/0053_partner_offers.sql");
check("tables: RLS on, no policies", /ALTER TABLE partner_offers ENABLE ROW LEVEL SECURITY/.test(sql) && /ALTER TABLE partner_offer_clicks ENABLE ROW LEVEL SECURITY/.test(sql) && !/CREATE POLICY/.test(sql));
check("clicks: no user id stored", !/user_id/.test(sql.split("partner_offer_clicks (")[1] ?? ""));

const go = read("app/go/[slug]/route.ts");
check("redirect: only to a stored URL that still matches its domain", go.includes("linkMatchesDomain(offer.url, offer.allowed_domain)") && go.includes("NextResponse.redirect(offer.url)") && !/searchParams\.get/.test(go));
const list = read("app/api/offers/route.ts");
check("public list: never sends referral URLs", !/select\([^)]*\burl\b/.test(list));
const admin = read("app/api/admin/offers/route.ts");
check("admin: every handler checks the admin first", (admin.match(/requireAdminUser\(req\)/g) ?? []).length === 2);
const page = read("app/dashboard/OffersTab.tsx");
check("page: every offer shows the disclosure and a sponsored link", page.includes("disclosure(referrer)") && page.includes('rel="noopener noreferrer sponsored"'));

const failed = checks.filter((c) => !c.ok);
for (const c of checks) console.log(`${c.ok ? "✓" : "✗"} ${c.name}`);
if (failed.length) process.exit(1);
console.log(`\nAll ${checks.length} partner offer checks passed.`);
