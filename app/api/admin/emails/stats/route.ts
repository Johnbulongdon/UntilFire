import { NextRequest, NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/admin-auth";

/**
 * Per-broadcast delivery stats, computed from admin_email_events.
 *
 * Rates are over *delivered* rather than over recipients: a message that
 * bounced was never a chance to be opened, and dividing by it understates
 * how the mail that arrived actually performed.
 */
export async function GET(req: NextRequest) {
  const auth = await requireAdminUser(req);
  if ("error" in auth) return auth.error;
  const { admin } = auth;

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
      };
    }),
  });
}
