import { NextResponse } from "next/server";
import { adminClient } from "@/lib/supabase-admin";
import { activeBonus, isOfferKind, type PartnerOffer } from "@/lib/partner-offers";

export const dynamic = "force-dynamic";

/**
 * The live partner offers, for "Where to keep your money". Public data only:
 * no referral URLs (every click goes through /go/<slug>, which picks the link
 * and counts the click), and a bonus past its end date is left out.
 */
export async function GET() {
  try {
    const { data, error } = await adminClient()
      .from("partner_offers")
      .select("slug, kind, name, blurb, rate_bps, bonus_text, bonus_ends_on")
      .eq("status", "live")
      .order("sort", { ascending: true })
      .order("name", { ascending: true });
    if (error) throw error;

    const now = new Date();
    const offers: PartnerOffer[] = (data ?? [])
      .filter((o) => isOfferKind(o.kind))
      .map((o) => {
        const bonusText = activeBonus({ bonusText: o.bonus_text, bonusEndsOn: o.bonus_ends_on }, now);
        return {
          slug: o.slug,
          kind: o.kind,
          name: o.name,
          blurb: o.blurb ?? "",
          rateBps: o.rate_bps,
          bonusText,
          bonusEndsOn: bonusText ? o.bonus_ends_on : null,
        };
      });
    // Step 1 shows UntilFire's own links only; a creator's links come later.
    return NextResponse.json({ offers, referrer: null });
  } catch (err) {
    console.error("[offers] list failed:", err);
    return NextResponse.json({ offers: [], referrer: null });
  }
}
