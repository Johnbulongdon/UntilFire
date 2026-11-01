import { NextRequest } from "next/server";
import { providerAuth, reply, apiFailure } from "@/lib/provider-api";
import { checked } from "@/lib/provider-links-server";
import { friendLinkFor } from "@/lib/referrals-server";
import { linkMatchesDomain, normaliseSlug } from "@/lib/partner-offers";
import { callerKey, rateLimit } from "@/lib/rate-limit";
export const dynamic = "force-dynamic";
async function ownedPartner(
  db: Awaited<ReturnType<typeof providerAuth>>["db"],
  id: string,
) {
  return checked(
    await db
      .from("referral_partners")
      .select("id,code,status")
      .eq("user_id", id)
      .maybeSingle(),
  );
}
export async function GET(req: NextRequest) {
  try {
    const { db, user } = await providerAuth(req);
    const partner = await ownedPartner(db, user!.id);
    const [offers, links] = await Promise.all([
      db
        .from("partner_offers")
        .select("id,slug,name,allowed_domain,status,member_links_enabled")
        .order("sort"),
      partner
        ? db
            .from("partner_referral_links")
            .select("id,offer_id,url,display_name,status,version,review_note")
            .eq("partner_id", partner.id)
        : Promise.resolve({ data: [], error: null }),
    ]);
    const own = checked(links) ?? [];
    return reply({
      code: partner?.code ?? null,
      paused: partner?.status === "paused",
      providers: (checked(offers) ?? []).filter(
        (o) =>
          (o.status === "live" && o.member_links_enabled) ||
          own.some((l) => l.offer_id === o.id),
      ),
      links: own,
    });
  } catch (e) {
    return apiFailure(e);
  }
}
export async function POST(req: NextRequest) {
  const limited = rateLimit(callerKey(req, "provider-links"), 12);
  if (limited) return limited;
  try {
    const { db, user } = await providerAuth(req);
    const body = await req.json().catch(() => ({}));
    let partner = await ownedPartner(db, user!.id);
    if (!partner) {
      await friendLinkFor(db, user!.id);
      partner = await ownedPartner(db, user!.id);
    }
    if (!partner || partner.status !== "active")
      return reply({ error: "Your referral profile is unavailable." }, 409);
    const slug = normaliseSlug(body.slug);
    if (!slug) return reply({ error: "Choose a provider." }, 400);
    const offer = checked(
      await db
        .from("partner_offers")
        .select("id,allowed_domain,member_links_enabled,status")
        .eq("slug", slug)
        .maybeSingle(),
    );
    if (!offer) return reply({ error: "Provider not found." }, 404);
    const current = checked(
      await db
        .from("partner_referral_links")
        .select("id,version")
        .eq("partner_id", partner.id)
        .eq("offer_id", offer.id)
        .maybeSingle(),
    );
    if ((current?.version ?? 0) !== body.version)
      return reply(
        { error: "This link changed. Refresh before editing." },
        409,
      );
    if (body.action === "remove") {
      if (current) {
        const removed = checked(
          await db
            .from("partner_referral_links")
            .delete()
            .eq("id", current.id)
            .eq("partner_id", partner.id)
            .eq("version", current.version)
            .select("id")
            .maybeSingle(),
        );
        if (!removed)
          return reply(
            { error: "This link changed. Refresh and try again." },
            409,
          );
      }
      return reply({ ok: true });
    }
    if (!offer.member_links_enabled || offer.status !== "live")
      return reply(
        { error: "Member links aren’t available for this provider yet." },
        409,
      );
    const url = typeof body.url === "string" ? body.url.trim() : "";
    const name =
      typeof body.displayName === "string" ? body.displayName.trim() : "";
    if (url.length > 2048 || !linkMatchesDomain(url, offer.allowed_domain))
      return reply(
        {
          error: "Use an HTTPS referral link on " + offer.allowed_domain + ".",
        },
        400,
      );
    if (!name || name.length > 40 || /[<>\x00-\x1f]|https?:/i.test(name))
      return reply({ error: "Use a public name of 1–40 characters." }, 400);
    // Any edit, including the public name, invalidates previous approval.
    const row = {
      url,
      display_name: name,
      status: "pending",
      reviewed_at: null,
      review_note: null,
      version: (current?.version ?? 0) + 1,
      updated_at: new Date().toISOString(),
    };
    const result = current
      ? await db
          .from("partner_referral_links")
          .update(row)
          .eq("id", current.id)
          .eq("partner_id", partner.id)
          .eq("version", current.version)
          .select("id")
          .maybeSingle()
      : await db
          .from("partner_referral_links")
          .insert({ ...row, partner_id: partner.id, offer_id: offer.id })
          .select("id")
          .single();
    if (result.error?.code === "23505" || (!result.error && !result.data))
      return reply({ error: "This link changed. Refresh and try again." }, 409);
    checked(result);
    return reply({ ok: true });
  } catch (e) {
    return apiFailure(e);
  }
}
