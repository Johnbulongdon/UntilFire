import { NextRequest, NextResponse } from "next/server";
import { adminClient } from "@/lib/supabase-admin";
import {
  coldMessage,
  coldPreparedJob,
  coldPublicUrl,
  coldReady,
  coldWorkerAuthorized,
} from "@/lib/cold-email-server";

export const dynamic = "force-dynamic";
export async function POST(req: NextRequest) {
  if (!coldWorkerAuthorized(req))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const admin = adminClient();
  try {
    if (body.action === "claim") {
      if (!coldReady())
        return NextResponse.json(
          { error: "Sending is disabled or configuration is incomplete" },
          { status: 503 },
        );
      const { data, error } = await admin.rpc("cold_claim");
      if (error) throw new Error("Could not reserve an email");
      const job = data?.[0];
      if (!job) return NextResponse.json({ job: null });
      const row = await coldPreparedJob(admin, job.id);
      if (row.suppressed || row.campaign.state !== "running") {
        const updated = await admin
          .from("cold_jobs")
          .update({
            state: row.suppressed ? "suppressed" : "queued",
            lease: null,
          })
          .eq("id", job.id)
          .eq("lease", job.lease);
        if (updated.error) throw new Error("Could not release reservation");
        return NextResponse.json({ job: null });
      }
      const message = coldMessage(row);
      return NextResponse.json(
        {
          job: {
            id: job.id,
            lease: job.lease,
            to: row.prospect.email,
            from: "John at UntilFire <john.ng@untilfire.com>",
            replyTo: "john.ng@untilfire.com",
            ...message,
            unsubscribeUrl: coldPublicUrl(job.id, "unsubscribe"),
            messageId: `<cold-${job.id}@untilfire.com>`,
          },
        },
        { headers: { "Cache-Control": "no-store" } },
      );
    }
    if (
      !["check", "ack"].includes(body.action) ||
      typeof body.id !== "string" ||
      typeof body.lease !== "string"
    )
      return NextResponse.json(
        { error: "Invalid worker action" },
        { status: 400 },
      );
    const row = await coldPreparedJob(admin, body.id);
    if (row.job.lease !== body.lease || row.job.state !== "sending")
      return NextResponse.json(
        { error: "Reservation is no longer valid" },
        { status: 409 },
      );
    if (body.action === "check") {
      const fresh =
        Date.now() - Date.parse(row.job.claimed_at) < 10 * 60 * 1000;
      return NextResponse.json({
        send:
          coldReady() &&
          !row.suppressed &&
          row.campaign.state === "running" &&
          fresh,
      });
    }
    if (!["accepted", "failed", "unknown", "suppressed"].includes(body.state))
      return NextResponse.json({ error: "Invalid result" }, { status: 400 });
    const { error } = await admin
      .from("cold_jobs")
      .update({
        state: body.state,
        message_id: `<cold-${row.job.id}@untilfire.com>`,
        ...(body.state === "accepted"
          ? { accepted_at: new Date().toISOString() }
          : {}),
      })
      .eq("id", body.id)
      .eq("lease", body.lease)
      .eq("state", "sending");
    if (error) throw new Error("Could not record result");
    if (["failed", "unknown"].includes(body.state)) {
      const paused = await admin.rpc("cold_update_campaign", {
        p_id: row.job.campaign_id,
        p_state: "paused",
        p_variants: null,
        p_limit: null,
      });
      if (paused.error) throw new Error("Could not pause the campaign");
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: "Worker operation failed; do not retry delivery automatically" },
      { status: 503 },
    );
  }
}
