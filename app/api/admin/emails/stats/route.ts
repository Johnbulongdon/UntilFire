import { NextRequest, NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/admin-auth";
import type { adminClient } from "@/lib/supabase-admin";

/**
 * Per-broadcast delivery stats, computed from admin_email_events.
 *
 * Rates are over *delivered* rather than over recipients: a message that
 * bounced was never a chance to be opened, and dividing by it understates
 * how the mail that arrived actually performed.
 */
/** Furthest stage a recipient reached. Order matters — later wins. */
const STAGE_ORDER = ["sent", "delivered", "opened", "clicked"] as const;

export async function GET(req: NextRequest) {
  const auth = await requireAdminUser(req);
  if ("error" in auth) return auth.error;
  const { admin } = auth;

  // ?sendId=… returns one send's recipients instead of the list. Kept on the
  // same route but behind a param so the list stays cheap: at 13 users the
  // whole thing would fit inline, at 13,000 it would not.
  const sendId = req.nextUrl.searchParams.get("sendId");
  if (sendId) return recipientsFor(admin, sendId);

  const { data: sends, error: sendsErr } = await admin
    .from("admin_email_sends")
    .select("id, subject, segment, recipients, created_at")
    .order("created_at", { ascending: false })
    .limit(20);
  if (sendsErr) return NextResponse.json({ error: sendsErr.message }, { status: 500 });

  const ids = (sends ?? []).map((s) => s.id);
  const { data: events, error: evErr } = ids.length
    ? await admin.from("admin_email_events").select("send_id, event").in("send_id", ids)
    : { data: [], error: null };
  if (evErr) return NextResponse.json({ error: evErr.message }, { status: 500 });

  const counts = new Map<string, Record<string, number>>();
  for (const e of events ?? []) {
    const row = counts.get(e.send_id) ?? {};
    row[e.event] = (row[e.event] ?? 0) + 1;
    counts.set(e.send_id, row);
  }

  const pct = (n: number, d: number) => (d > 0 ? Math.round((n / d) * 1000) / 10 : null);

  return NextResponse.json({
    sends: (sends ?? []).map((s) => {
      const c = counts.get(s.id) ?? {};
      const delivered = c.delivered ?? 0;
      const opened = c.opened ?? 0;
      const clicked = c.clicked ?? 0;
      // No events at all means tracking was off, or nothing has come back yet
      // — distinguishable from a real zero, and the UI says so.
      const tracked = Object.keys(c).length > 0;
      return {
        id: s.id,
        subject: s.subject,
        segment: s.segment,
        recipients: s.recipients,
        sentAt: s.created_at,
        tracked,
        delivered,
        opened,
        clicked,
        bounced: c.bounced ?? 0,
        complained: c.complained ?? 0,
        openRate: pct(opened, delivered),
        clickRate: pct(clicked, delivered),
        // The strip the UI draws: each stage as a share of the one before it.
        stages: [
          { key: "recipients", label: "Sent to", count: s.recipients, of: null },
          { key: "delivered", label: "Delivered", count: delivered, of: pct(delivered, s.recipients) },
          { key: "opened", label: "Opened", count: opened, of: pct(opened, delivered) },
          { key: "clicked", label: "Clicked", count: clicked, of: pct(clicked, delivered) },
        ],
      };
    }),
  });
}

/**
 * One row per recipient of a single send, with the furthest stage each reached.
 *
 * The events table already stores this granularity — one row per (send,
 * recipient, event) — so this is a regrouping, not new data.
 */
type Stage = (typeof STAGE_ORDER)[number];

interface RecipientRow {
  email: string;
  stage: Stage;
  at: Partial<Record<Stage, string>>;
  opens: number;
  clicks: number;
  link: string | null;
  bounced: boolean;
  complained: boolean;
}

const rankOf = (stage: Stage) => STAGE_ORDER.indexOf(stage);
const isStage = (e: string): e is Stage => (STAGE_ORDER as readonly string[]).includes(e);

async function recipientsFor(admin: ReturnType<typeof adminClient>, sendId: string) {
  const { data: events, error } = await admin
    .from("admin_email_events")
    .select("email, event, occurrences, first_at, link")
    .eq("send_id", sendId)
    .limit(2000);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const byEmail = new Map<string, RecipientRow>();

  for (const e of events ?? []) {
    const row: RecipientRow = byEmail.get(e.email) ?? {
      email: e.email, stage: "sent", at: {}, opens: 0, clicks: 0,
      link: null, bounced: false, complained: false,
    };

    if (isStage(e.event)) {
      row.at[e.event] = e.first_at;
      // Furthest stage wins, whatever order the events arrived in — an open
      // can be delivered by the webhook before the delivery that preceded it.
      if (rankOf(e.event) > rankOf(row.stage)) row.stage = e.event;
    }
    if (e.event === "opened") row.opens = e.occurrences;
    if (e.event === "clicked") { row.clicks = e.occurrences; row.link = e.link ?? row.link; }
    if (e.event === "bounced") row.bounced = true;
    if (e.event === "complained") row.complained = true;

    byEmail.set(e.email, row);
  }

  // Most engaged first — the people worth talking to are at the top.
  const recipients = [...byEmail.values()].sort(
    (a, b) => rankOf(b.stage) - rankOf(a.stage) || a.email.localeCompare(b.email),
  );

  return NextResponse.json({ recipients });
}
