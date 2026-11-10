import { timingSafeEqual } from "node:crypto";
import type { NextRequest } from "next/server";
import { adminClient } from "@/lib/supabase-admin";
import { coldToken, renderColdEmail, type ColdVariant } from "@/lib/cold-email";

export const COLD_ORIGIN = "https://www.untilfire.com";
export function coldReadiness() {
  return {
    enabled: process.env.COLD_EMAIL_ENABLED === "true",
    signing: (process.env.COLD_EMAIL_SECRET?.length ?? 0) >= 32,
    worker: (process.env.COLD_EMAIL_WORKER_SECRET?.length ?? 0) >= 32,
    postalAddress: !!process.env.COLD_EMAIL_POSTAL_ADDRESS?.trim(),
    from: "John at UntilFire <john.ng@untilfire.com>",
  };
}
export function coldReady() {
  const r = coldReadiness();
  return r.enabled && r.signing && r.worker && r.postalAddress;
}
export function coldWorkerAuthorized(req: NextRequest) {
  const expected = process.env.COLD_EMAIL_WORKER_SECRET || "";
  const supplied =
    req.headers.get("authorization")?.replace(/^Bearer /, "") || "";
  return (
    expected.length >= 32 &&
    Buffer.byteLength(expected) === Buffer.byteLength(supplied) &&
    timingSafeEqual(Buffer.from(expected), Buffer.from(supplied))
  );
}
export function coldPublicUrl(id: string, kind: "unsubscribe" | "click") {
  return `${COLD_ORIGIN}/api/cold-email/${kind}?id=${id}&token=${coldToken(id, kind, process.env.COLD_EMAIL_SECRET || "")}`;
}
export async function coldPreparedJob(
  admin: ReturnType<typeof adminClient>,
  id: string,
) {
  const { data: job, error } = await admin
    .from("cold_jobs")
    .select("*")
    .eq("id", id)
    .single();
  if (error || !job) throw new Error("Job unavailable");
  const [{ data: prospect, error: pe }, { data: campaign, error: ce }] =
    await Promise.all([
      admin
        .from("cold_prospects")
        .select("*")
        .eq("id", job.prospect_id)
        .single(),
      admin
        .from("cold_campaigns")
        .select("*")
        .eq("id", job.campaign_id)
        .single(),
    ]);
  if (pe || ce || !prospect || !campaign)
    throw new Error("Campaign or prospect unavailable");
  const { data: suppressed, error: se } = await admin
    .from("cold_suppressions")
    .select("email")
    .eq("email", prospect.email)
    .maybeSingle();
  if (se) throw new Error("Could not verify opt-out status");
  return { job, prospect, campaign, suppressed: !!suppressed };
}
export function coldMessage(row: Awaited<ReturnType<typeof coldPreparedJob>>) {
  return renderColdEmail({
    variant: row.campaign.variants[row.job.variant] as ColdVariant,
    firstName: row.prospect.first_name,
    city: row.prospect.city,
    unsubscribeUrl: coldPublicUrl(row.job.id, "unsubscribe"),
    clickUrl: coldPublicUrl(row.job.id, "click"),
    postalAddress: process.env.COLD_EMAIL_POSTAL_ADDRESS || "",
    origin: COLD_ORIGIN,
  });
}
