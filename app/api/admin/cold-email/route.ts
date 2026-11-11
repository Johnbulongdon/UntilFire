import { NextRequest, NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/admin-auth";
import {
  cleanColdText,
  DEFAULT_COLD_VARIANTS,
  normalizeColdEmail,
} from "@/lib/cold-email";
import { coldReadiness, coldReady } from "@/lib/cold-email-server";

export const dynamic = "force-dynamic";
const uuid = (v: unknown): v is string =>
  typeof v === "string" &&
  /^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i.test(v);
function variants(value: unknown) {
  if (!value || typeof value !== "object")
    throw new Error("A and B copy are required");
  const input = value as Record<string, Record<string, unknown>>;
  return Object.fromEntries(
    ["A", "B"].map((key) => {
      if (!input[key]) throw new Error("Both variants are required");
      const v = {
        subject: cleanColdText(input[key].subject, 150),
        intro: cleanColdText(input[key].intro, 600),
        bridge: cleanColdText(input[key].bridge, 1200),
      };
      if (/calculator/i.test(Object.values(v).join(" ")))
        throw new Error("Use personal finance wording");
      return [key, v];
    }),
  );
}
export async function GET(req: NextRequest) {
  const auth = await requireAdminUser(req);
  if ("error" in auth) return auth.error;
  const [campaigns, prospects, jobs, suppressions] = await Promise.all([
    auth.admin
      .from("cold_campaigns")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50),
    auth.admin
      .from("cold_prospects")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(1000),
    auth.admin
      .from("cold_jobs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(10000),
    auth.admin.from("cold_suppressions").select("email,reason").limit(10000),
  ]);
  if ([campaigns, prospects, jobs, suppressions].some((r) => r.error))
    return NextResponse.json(
      {
        error:
          "Cold-email storage is unavailable. Apply the outreach migration first.",
      },
      { status: 503 },
    );
  return NextResponse.json(
    {
      campaigns: campaigns.data,
      prospects: prospects.data,
      jobs: jobs.data,
      suppressions: suppressions.data,
      readiness: coldReadiness(),
      bounded: true,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
export async function POST(req: NextRequest) {
  const auth = await requireAdminUser(req);
  if ("error" in auth) return auth.error;
  if (Number(req.headers.get("content-length")) > 250000)
    return NextResponse.json({ error: "Import is too large" }, { status: 413 });
  const raw = await req.text();
  if (raw.length > 250000)
    return NextResponse.json({ error: "Import is too large" }, { status: 413 });
  try {
    const body = JSON.parse(raw);
    let result;
    if (body.action === "create") {
      result = await auth.admin
        .from("cold_campaigns")
        .insert({
          name: cleanColdText(body.name, 120),
          variants: DEFAULT_COLD_VARIANTS,
        })
        .select()
        .single();
    } else if (body.action === "import") {
      if (
        !Array.isArray(body.rows) ||
        !body.rows.length ||
        body.rows.length > 300
      )
        throw new Error("Import 1–300 prospects per batch");
      const seen = new Set<string>();
      const rows = body.rows.map((row: Record<string, unknown>) => {
        if (row.country !== "US")
          throw new Error(
            "This pipeline currently accepts explicitly verified US prospects only",
          );
        const email = normalizeColdEmail(row.email);
        if (seen.has(email)) throw new Error("Duplicate email in this batch");
        seen.add(email);
        const source = cleanColdText(row.source_url, 1000);
        const url = new URL(source);
        if (url.protocol !== "https:" && url.protocol !== "http:")
          throw new Error("Use an http(s) source URL");
        return {
          email,
          first_name: row.first_name ? cleanColdText(row.first_name, 80) : null,
          city: row.city ? cleanColdText(row.city, 100) : null,
          country: "US",
          source_url: source,
          fit_note: cleanColdText(row.fit_note, 1000),
        };
      });
      // Never overwrite an existing person's identity or qualification on re-import.
      result = await auth.admin
        .from("cold_prospects")
        .upsert(rows, { onConflict: "email", ignoreDuplicates: true })
        .select("id");
    } else if (body.action === "enqueue") {
      if (!uuid(body.id)) throw new Error("Invalid campaign");
      result = await auth.admin.rpc("cold_enqueue", { p_campaign: body.id });
    } else if (body.action === "update") {
      if (!uuid(body.id)) throw new Error("Invalid campaign");
      if (body.state && !["draft", "running", "paused"].includes(body.state))
        throw new Error("Invalid state");
      if (body.state === "running" && !coldReady())
        throw new Error(
          "Configure the worker, postal address, signing key and sending switch before starting",
        );
      if (
        body.daily_limit !== undefined &&
        (!Number.isInteger(body.daily_limit) ||
          body.daily_limit < 1 ||
          body.daily_limit > 300)
      )
        throw new Error("Daily cap must be 1–300");
      result = await auth.admin.rpc("cold_update_campaign", {
        p_id: body.id,
        p_state: body.state || null,
        p_variants: body.variants ? variants(body.variants) : null,
        p_limit: body.daily_limit ?? null,
      });
    } else if (body.action === "suppress") {
      const email = normalizeColdEmail(body.email);
      if (
        !["unsubscribe", "reply", "bounce", "complaint", "manual"].includes(
          body.reason,
        )
      )
        throw new Error("Invalid opt-out reason");
      result = await auth.admin.rpc("cold_suppress", {
        p_email: email,
        p_reason: body.reason,
      });
    } else if (body.action === "outcome") {
      if (
        !uuid(body.id) ||
        ![
          "positive",
          "negative",
          "bounce",
          "complaint",
          "trial_started",
          "activated",
        ].includes(body.outcome)
      )
        throw new Error("Invalid outcome");
      const { data: job, error } = await auth.admin
        .from("cold_jobs")
        .select("prospect_id,state")
        .eq("id", body.id)
        .single();
      if (error || !job || !["accepted", "unknown"].includes(job.state))
        throw new Error("Only sent or uncertain sends can receive an outcome");
      const { data: p, error: pe } = await auth.admin
        .from("cold_prospects")
        .select("email")
        .eq("id", job.prospect_id)
        .single();
      if (pe || !p) throw new Error("Prospect missing");
      if (
        ["positive", "negative", "bounce", "complaint"].includes(body.outcome)
      ) {
        const reason =
          body.outcome === "bounce"
            ? "bounce"
            : body.outcome === "complaint"
              ? "complaint"
              : "reply";
        const s = await auth.admin.rpc("cold_suppress", {
          p_email: p.email,
          p_reason: reason,
        });
        if (s.error) throw new Error("Could not stop future outreach");
      }
      const now = new Date().toISOString();
      result = await auth.admin
        .from("cold_jobs")
        .update({
          outcome: body.outcome,
          ...(["positive", "negative"].includes(body.outcome)
            ? { replied_at: now }
            : {}),
          ...(body.outcome === "positive" ? { positive_at: now } : {}),
          ...(body.outcome === "trial_started"
            ? { trial_started_at: now }
            : {}),
          ...(body.outcome === "activated" ? { activated_at: now } : {}),
        })
        .eq("id", body.id);
      if (!result.error && ["bounce", "complaint"].includes(body.outcome)) {
        const { data: source } = await auth.admin
          .from("cold_jobs")
          .select("campaign_id")
          .eq("id", body.id)
          .single();
        if (source)
          await auth.admin.rpc("cold_update_campaign", {
            p_id: source.campaign_id,
            p_state: "paused",
            p_variants: null,
            p_limit: null,
          });
      }
    } else throw new Error("Unknown action");
    if (result.error)
      return NextResponse.json(
        { error: result.error.message },
        { status: 400 },
      );
    return NextResponse.json({ ok: true, result: result.data });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Invalid request" },
      { status: 400 },
    );
  }
}
