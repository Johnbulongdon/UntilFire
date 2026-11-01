import type { SupabaseClient } from "@supabase/supabase-js";
import { activeBonus, linkMatchesDomain } from "./partner-offers.ts";
import {
  selectedLink,
  type ProviderRow,
  type MemberLink,
} from "./provider-links.ts";
export const OFFER_FIELDS =
  "id,slug,kind,name,blurb,rate_bps,bonus_text,bonus_ends_on,url,allowed_domain,country,status,member_links_enabled,updated_at";
export function checked<T>(result: { data: T; error: unknown }): T {
  if (result.error) throw new Error("Provider data unavailable");
  return result.data;
}
/** A later invitation cookie cannot replace a signed-in account's original inviter. */
export async function inviterFor(db: SupabaseClient, userId: string) {
  const attribution = checked(
    await db
      .from("referral_attributions")
      .select("partner_id")
      .eq("referred_user_id", userId)
      .maybeSingle(),
  );
  if (!attribution) return null;
  const partner = checked(
    await db
      .from("referral_partners")
      .select("id,user_id,status")
      .eq("id", attribution.partner_id)
      .maybeSingle(),
  );
  return partner?.status === "active" && partner.user_id !== userId
    ? (partner.id as string)
    : null;
}
export async function linksFor(
  db: SupabaseClient,
  partnerId: string | null,
): Promise<MemberLink[]> {
  if (!partnerId) return [];
  return (
    checked(
      await db
        .from("partner_referral_links")
        .select("id,partner_id,offer_id,url,display_name,status,version")
        .eq("partner_id", partnerId)
        .eq("status", "approved"),
    ) ?? []
  );
}
export function publicOffer(o: ProviderRow, links: MemberLink[]) {
  const selection = selectedLink(
    o,
    links.find((l) => l.offer_id === o.id) ?? null,
  );
  const bonus = selection.partnerId
    ? null
    : activeBonus({ bonusText: o.bonus_text, bonusEndsOn: o.bonus_ends_on });
  return {
    slug: o.slug,
    kind: o.kind,
    name: o.name,
    blurb: o.blurb,
    rateBps: o.rate_bps,
    bonusText: bonus,
    bonusEndsOn: bonus ? o.bonus_ends_on : null,
    country: o.country,
    referralLabel: selection.label,
    referralKey: selection.key,
  };
}
export async function resolveOffer(
  db: SupabaseClient,
  slug: string,
  partnerId: string | null,
) {
  const offer = checked(
    await db
      .from("partner_offers")
      .select(OFFER_FIELDS)
      .eq("slug", slug)
      .maybeSingle(),
  ) as ProviderRow | null;
  if (
    !offer ||
    offer.status !== "live" ||
    !linkMatchesDomain(offer.url, offer.allowed_domain)
  )
    return null;
  const links = await linksFor(db, partnerId);
  return {
    offer,
    selection: selectedLink(
      offer,
      links.find((l) => l.offer_id === offer.id) ?? null,
    ),
  };
}
