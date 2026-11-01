import { NextRequest } from "next/server";
import { requireAdminUser } from "@/lib/admin-auth";
import { reply, apiFailure } from "@/lib/provider-api";
import { checked } from "@/lib/provider-links-server";
import { linkMatchesDomain } from "@/lib/partner-offers";
export const dynamic = "force-dynamic";
export async function GET(req: NextRequest) {
  const auth = await requireAdminUser(req);
  if ("error" in auth) return auth.error;
  try {
    return reply({
      links: checked(
        await auth.admin
          .from("partner_referral_links")
          .select(
            "id,offer_id,url,display_name,status,version,review_note,partner_offers(name),referral_partners(code,status)",
          )
          .order("updated_at", { ascending: false })
          .limit(200),
      ),
    });
  } catch (e) {
    return apiFailure(e);
  }
}
export async function POST(req: NextRequest) {
  const auth = await requireAdminUser(req);
  if ("error" in auth) return auth.error;
  try {
    const b = await req.json().catch(() => ({}));
    if (
      !["approved", "rejected"].includes(b.status) ||
      !Number.isInteger(b.version)
    )
      return reply({ error: "Choose an approval decision." }, 400);
    const link = checked(
      await auth.admin
        .from("partner_referral_links")
        .select("id,offer_id,partner_id,url,version")
        .eq("id", String(b.id))
        .maybeSingle(),
    );
    if (!link || link.version !== b.version)
      return reply(
        { error: "The member edited this link. Reload before reviewing." },
        409,
      );
    if (b.status === "approved") {
      const offer = checked(
        await auth.admin
          .from("partner_offers")
          .select("allowed_domain,status,member_links_enabled")
          .eq("id", link.offer_id)
          .maybeSingle(),
      );
      const partner = checked(
        await auth.admin
          .from("referral_partners")
          .select("status")
          .eq("id", link.partner_id)
          .maybeSingle(),
      );
      if (
        !offer?.member_links_enabled ||
        offer.status !== "live" ||
        partner?.status !== "active" ||
        !linkMatchesDomain(link.url, offer.allowed_domain)
      )
        return reply(
          {
            error:
              "Check the live programme, active partner and provider domain before approving.",
          },
          409,
        );
    }
    const result = await auth.admin
      .from("partner_referral_links")
      .update({
        status: b.status,
        review_note:
          typeof b.note === "string"
            ? b.note.trim().slice(0, 240) || null
            : null,
        reviewed_at: new Date().toISOString(),
        version: link.version + 1,
      })
      .eq("id", link.id)
      .eq("version", link.version)
      .select("id")
      .maybeSingle();
    if (!result.error && !result.data)
      return reply(
        { error: "This link changed. Reload before reviewing." },
        409,
      );
    checked(result);
    return reply({ ok: true });
  } catch (e) {
    return apiFailure(e);
  }
}
