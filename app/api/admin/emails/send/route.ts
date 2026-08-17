import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { requireAdminUser } from "@/lib/admin-auth";
import { buildAdminAnnouncementEmail } from "@/lib/email-html";
import { makeUnsubscribeToken } from "@/lib/unsubscribe-token";

const SITE = "https://www.untilfire.com";
type Segment = "all" | "free" | "pro";

// Sequential send with a small delay between calls to stay under Resend's
// rate limit. Fine at UntilFire's current scale (dozens of users); if the
// user base grows into the hundreds+, this should move to a queued/batched
// background job instead of a single request — a serverless function has a
// hard execution-time ceiling this loop would eventually hit.
const SEND_DELAY_MS = 550;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function POST(req: NextRequest) {
  const auth = await requireAdminUser(req);
  if ("error" in auth) return auth.error;
  const { admin, user: adminUser } = auth;

  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json({ error: "RESEND_API_KEY not set" }, { status: 503 });
  }
  if (!process.env.UNSUBSCRIBE_SECRET) {
    return NextResponse.json({ error: "UNSUBSCRIBE_SECRET not set" }, { status: 503 });
  }

  const body = await req.json().catch(() => ({}));
  const subject = typeof body?.subject === "string" ? body.subject.trim() : "";
  const heading = typeof body?.heading === "string" ? body.heading.trim() : "";
  const bodyHtml = typeof body?.bodyHtml === "string" ? body.bodyHtml.trim() : "";
  const segment: Segment = body?.segment === "free" || body?.segment === "pro" ? body.segment : "all";

  if (!subject || !heading || !bodyHtml) {
    return NextResponse.json({ error: "subject, heading, and bodyHtml are required" }, { status: 400 });
  }

  const [{ data: usersPage, error: usersErr }, { data: profiles }, { data: subs }] = await Promise.all([
    admin.auth.admin.listUsers({ page: 1, perPage: 1000 }),
    admin.from("profiles").select("user_id, marketing_unsubscribed_at"),
    admin.from("subscriptions").select("user_id, status"),
  ]);
  if (usersErr) return NextResponse.json({ error: usersErr.message }, { status: 500 });

  const unsubscribed = new Set(
    (profiles ?? []).filter((p) => p.marketing_unsubscribed_at).map((p) => p.user_id)
  );
  const proUserIds = new Set((subs ?? []).filter((s) => s.status === "active").map((s) => s.user_id));

  const recipients = usersPage.users.filter((u) => {
    if (!u.email || unsubscribed.has(u.id)) return false;
    if (segment === "pro") return proUserIds.has(u.id);
    if (segment === "free") return !proUserIds.has(u.id);
    return true;
  });

  const resend = new Resend(process.env.RESEND_API_KEY);
  let sent = 0;
  const failures: string[] = [];

  for (const recipient of recipients) {
    const token = makeUnsubscribeToken(recipient.id);
    const unsubscribeUrl = `${SITE}/unsubscribe?u=${recipient.id}&t=${token}`;
    const html = buildAdminAnnouncementEmail({ heading, bodyHtml, unsubscribeUrl });

    try {
      const { error } = await resend.emails.send({
        from: "UntilFire <hello@untilfire.com>",
        to: recipient.email!,
        subject,
        html,
      });
      if (error) {
        failures.push(recipient.email!);
      } else {
        sent++;
      }
    } catch {
      failures.push(recipient.email!);
    }
    await sleep(SEND_DELAY_MS);
  }

  await admin.from("admin_email_sends").insert({
    subject,
    segment,
    recipients: sent,
    sent_by: adminUser.id,
  });

  return NextResponse.json({ sent, total: recipients.length, failed: failures });
}
