import { NextRequest } from "next/server";
import { normaliseSlug } from "@/lib/partner-offers";
import { providerAuth, reply, apiFailure } from "@/lib/provider-api";
import { checked, inviterFor, resolveOffer } from "@/lib/provider-links-server";
import { rateLimit, callerKey } from "@/lib/rate-limit";
export const dynamic = "force-dynamic";
export async function POST(req: NextRequest) {
  const limited = rateLimit(callerKey(req, "offers-open"), 30);
  if (limited) return limited;
  try {
    const { db, user } = await providerAuth(req);
    const body = await req.json().catch(() => ({}));
    const slug = normaliseSlug(body.slug);
    if (!slug) return reply({ error: "Choose an account." }, 400);
    const resolved = await resolveOffer(
      db,
      slug,
      await inviterFor(db, user!.id),
    );
    if (!resolved)
      return reply({ error: "This provider is no longer available." }, 404);
    if (body.referralKey !== resolved.selection.key)
      return reply(
        {
          error:
            "This referral link changed. Refresh the provider details before continuing.",
        },
        409,
      );
    checked(
      await db
        .from("partner_offer_intents")
        .delete()
        .lt("expires_at", new Date().toISOString()),
    );
    const intent = checked(
      await db
        .from("partner_offer_intents")
        .insert({
          offer_id: resolved.offer.id,
          link_id: resolved.selection.linkId,
          partner_id: resolved.selection.partnerId,
          selection_key: resolved.selection.key,
        })
        .select("id")
        .single(),
    );
    if (!intent) throw new Error("Intent missing");
    return reply({ href: "/go/" + slug + "?intent=" + intent.id });
  } catch (error) {
    return apiFailure(error);
  }
}
