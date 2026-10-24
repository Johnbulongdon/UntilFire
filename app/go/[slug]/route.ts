import { NextRequest, NextResponse } from "next/server";
import { adminClient } from "@/lib/supabase-admin";
import { linkMatchesDomain, normaliseSlug } from "@/lib/partner-offers";

export const dynamic = "force-dynamic";

/**
 * A click on a partner offer: untilfire.com/go/<slug>. Counts the click and
 * sends the person to the offer's stored referral link. Only ever redirects
 * to a URL from partner_offers whose host still matches its allowed domain,
 * never to anything taken from the request; otherwise back to the page.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const fallback = new URL("/dashboard?tab=offers", req.url);
  const slug = normaliseSlug((await params).slug);
  if (!slug) return NextResponse.redirect(fallback);

  try {
    const admin = adminClient();
    const { data: offer } = await admin
      .from("partner_offers")
      .select("id, url, allowed_domain, status")
      .eq("slug", slug)
      .maybeSingle();
    if (!offer || offer.status !== "live" || !linkMatchesDomain(offer.url, offer.allowed_domain)) {
      return NextResponse.redirect(fallback);
    }
    await admin.from("partner_offer_clicks").insert({ offer_id: offer.id, partner_id: null });
    return NextResponse.redirect(offer.url);
  } catch (err) {
    console.error("[go] offer lookup failed:", err);
    return NextResponse.redirect(fallback);
  }
}
