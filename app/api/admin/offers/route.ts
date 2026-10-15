import { NextRequest, NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/admin-auth";
import { isOfferKind, linkMatchesDomain, normaliseDomain, normaliseSlug } from "@/lib/partner-offers";

export const dynamic = "force-dynamic";

/**
 * The founder's side of partner offers: every offer with its click count,
 * and adding, editing, showing or hiding one.
 */
export async function GET(req: NextRequest) {
  const auth = await requireAdminUser(req);
  if ("error" in auth) return auth.error;
  const { admin } = auth;

  const [offers, clicks] = await Promise.all([
    admin.from("partner_offers").select("*").order("sort", { ascending: true }).order("name", { ascending: true }),
    admin.from("partner_offer_clicks").select("offer_id"),
  ]);
  if (offers.error) return NextResponse.json({ error: offers.error.message }, { status: 500 });

  const clicksBy = new Map<string, number>();
  for (const c of clicks.data ?? []) clicksBy.set(c.offer_id, (clicksBy.get(c.offer_id) ?? 0) + 1);

  return NextResponse.json({
    offers: (offers.data ?? []).map((o) => ({
      id: o.id,
      slug: o.slug,
      kind: o.kind,
      name: o.name,
      blurb: o.blurb,
      rateBps: o.rate_bps,
      bonusText: o.bonus_text,
      bonusEndsOn: o.bonus_ends_on,
      url: o.url,
      allowedDomain: o.allowed_domain,
      status: o.status,
      sort: o.sort,
      clicks: clicksBy.get(o.id) ?? 0,
    })),
  });
}

/**
 * { action: "save", offer }            add an offer, or edit one by id
 * { action: "status", id, status }     show ("live") or hide one
 */
export async function POST(req: NextRequest) {
  const auth = await requireAdminUser(req);
  if ("error" in auth) return auth.error;
  const { admin } = auth;
  const body = await req.json().catch(() => ({}));

  if (body?.action === "status") {
    if (body.status !== "live" && body.status !== "hidden") return NextResponse.json({ error: "Bad status" }, { status: 400 });
    const { error } = await admin
      .from("partner_offers")
      .update({ status: body.status, updated_at: new Date().toISOString() })
      .eq("id", String(body.id));
    return error ? NextResponse.json({ error: error.message }, { status: 500 }) : NextResponse.json({ ok: true });
  }

  if (body?.action === "save") {
    const o = body.offer ?? {};
    const slug = normaliseSlug(o.slug);
    const domain = normaliseDomain(o.allowedDomain);
    const name = String(o.name ?? "").trim().slice(0, 80);
    const url = String(o.url ?? "").trim();
    if (!slug) return NextResponse.json({ error: "Use a short slug: lower-case letters, numbers and dashes." }, { status: 400 });
    if (!isOfferKind(o.kind)) return NextResponse.json({ error: "Pick savings, bank or brokerage." }, { status: 400 });
    if (!name) return NextResponse.json({ error: "Enter the provider's name." }, { status: 400 });
    if (!domain) return NextResponse.json({ error: "Enter the provider's domain, like example.com." }, { status: 400 });
    if (!linkMatchesDomain(url, domain)) return NextResponse.json({ error: `The link must be https and on ${domain}.` }, { status: 400 });

    const rate = o.rateBps === "" || o.rateBps == null ? null : Math.round(Number(o.rateBps));
    if (rate != null && !(rate >= 0 && rate <= 2000)) return NextResponse.json({ error: "Rate is in basis points: 420 means 4.20%." }, { status: 400 });
    const endsOn = typeof o.bonusEndsOn === "string" && /^\d{4}-\d{2}-\d{2}$/.test(o.bonusEndsOn) ? o.bonusEndsOn : null;

    const row = {
      slug,
      kind: o.kind,
      name,
      blurb: String(o.blurb ?? "").trim().slice(0, 240),
      rate_bps: rate,
      bonus_text: String(o.bonusText ?? "").trim().slice(0, 80) || null,
      bonus_ends_on: endsOn,
      url,
      allowed_domain: domain,
      sort: Number.isFinite(Number(o.sort)) ? Math.round(Number(o.sort)) : 0,
      updated_at: new Date().toISOString(),
    };
    const { error } = o.id
      ? await admin.from("partner_offers").update(row).eq("id", String(o.id))
      : await admin.from("partner_offers").insert(row);
    if (error?.code === "23505") return NextResponse.json({ error: "Another offer already uses that slug." }, { status: 409 });
    return error ? NextResponse.json({ error: error.message }, { status: 500 }) : NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
