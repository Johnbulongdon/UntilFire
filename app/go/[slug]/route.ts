import { NextRequest, NextResponse } from "next/server";
import { adminClient } from "@/lib/supabase-admin";
import { normaliseSlug } from "@/lib/partner-offers";
import { checked, resolveOffer } from "@/lib/provider-links-server";
export const dynamic = "force-dynamic";
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const fallback = new URL("/dashboard?tab=offers&link=refresh", req.url);
  const redirect = (url: string | URL) =>
    NextResponse.redirect(url, {
      headers: {
        "Cache-Control": "private, no-store",
        "Referrer-Policy": "no-referrer",
      },
    });
  const slug = normaliseSlug((await params).slug);
  if (!slug) return redirect(fallback);
  try {
    const db = adminClient();
    const token = req.nextUrl.searchParams.get("intent");
    let partnerId: string | null = null;
    let expected: string | null = null;
    let offerId: string | null = null;
    if (token !== null) {
      if (!/^[0-9a-f-]{36}$/i.test(token)) return redirect(fallback);
      // DELETE RETURNING consumes once, including simultaneous requests.
      const intent = checked(
        await db
          .from("partner_offer_intents")
          .delete()
          .eq("id", token)
          .gt("expires_at", new Date().toISOString())
          .select("offer_id,partner_id,selection_key")
          .maybeSingle(),
      );
      if (!intent) return redirect(fallback);
      partnerId = intent.partner_id;
      expected = intent.selection_key;
      offerId = intent.offer_id;
      if (partnerId) {
        const partner = checked(
          await db
            .from("referral_partners")
            .select("status")
            .eq("id", partnerId)
            .maybeSingle(),
        );
        if (partner?.status !== "active") return redirect(fallback);
      }
    }
    const resolved = await resolveOffer(db, slug, partnerId);
    if (
      !resolved ||
      (expected &&
        (expected !== resolved.selection.key || offerId !== resolved.offer.id))
    )
      return redirect(fallback);
    checked(
      await db
        .from("partner_offer_clicks")
        .insert({
          offer_id: resolved.offer.id,
          partner_id: resolved.selection.partnerId,
        }),
    );
    return redirect(resolved.selection.url);
  } catch {
    return redirect(fallback);
  }
}
