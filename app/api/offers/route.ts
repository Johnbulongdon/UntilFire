import { NextRequest } from "next/server";
import { isOfferKind, linkMatchesDomain } from "@/lib/partner-offers";
import { providerAuth, reply, apiFailure } from "@/lib/provider-api";
import {
  checked,
  inviterFor,
  linksFor,
  publicOffer,
  OFFER_FIELDS,
} from "@/lib/provider-links-server";
import type { ProviderRow } from "@/lib/provider-links";
export const dynamic = "force-dynamic";
export async function GET(req: NextRequest) {
  try {
    const { db, user } = await providerAuth(req, false);
    const partnerId = user ? await inviterFor(db, user.id) : null;
    const [rows, links] = await Promise.all([
      db
        .from("partner_offers")
        .select(OFFER_FIELDS)
        .eq("status", "live")
        .order("sort")
        .order("name"),
      linksFor(db, partnerId),
    ]);
    const offers = (checked(rows) ?? []) as ProviderRow[];
    return reply({
      offers: offers
        .filter(
          (o) =>
            isOfferKind(o.kind) && linkMatchesDomain(o.url, o.allowed_domain),
        )
        .map((o) => publicOffer(o, links)),
    });
  } catch (error) {
    return apiFailure(error);
  }
}
