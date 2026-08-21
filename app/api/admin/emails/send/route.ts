import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { requireAdminUser } from "@/lib/admin-auth";
import { buildAdminAnnouncementEmail, buildMonthlyUpdateEmail, type UpdateItem } from "@/lib/email-html";
import { makeUnsubscribeToken } from "@/lib/unsubscribe-token";

const SITE = "https://www.untilfire.com";
type Segment = "all" | "free" | "pro";
type Template = "announcement" | "monthly_update";

function parseUpdateItems(raw: unknown): UpdateItem[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((it): it is { title: unknown; desc: unknown } => !!it && typeof it === "object")
    .map((it) => ({
      title: typeof it.title === "string" ? it.title.trim() : "",
      desc: typeof it.desc === "string" ? it.desc.trim() : "",
    }))
    .filter((it) => it.title || it.desc);
}

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
  const template: Template = body?.template === "monthly_update" ? "monthly_update" : "announcement";
  const subject = typeof body?.subject === "string" ? body.subject.trim() : "";
  const segment: Segment = body?.segment === "free" || body?.segment === "pro" ? body.segment : "all";

  // Announcement fields
  const heading = typeof body?.heading === "string" ? body.heading.trim() : "";
  const bodyHtml = typeof body?.bodyHtml === "string" ? body.bodyHtml.trim() : "";

  // Monthly update fields
  const monthLabel = typeof body?.monthLabel === "string" ? body.monthLabel.trim() : "";
  const intro = typeof body?.intro === "string" ? body.intro.trim() : "";
  const newItems = parseUpdateItems(body?.newItems);
  const fixItems = parseUpdateItems(body?.fixItems);
  const ctaLabel = typeof body?.ctaLabel === "string" ? body.ctaLabel.trim() : "";
  const ctaHref = typeof body?.ctaHref === "string" ? body.ctaHref.trim() : "";

  if (!subject) {
    return NextResponse.json({ error: "subject is required" }, { status: 400 });
  }
  if (template === "announcement" && (!heading || !bodyHtml)) {
    return NextResponse.json({ error: "heading and bodyHtml are required" }, { status: 400 });
  }
  if (template === "monthly_update" && (!monthLabel || !intro || (!newItems.length && !fixItems.length))) {
    return NextResponse.json(
      { error: "monthLabel, intro, and at least one update item are required" },
      { status: 400 }
    );
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
    const html =
      template === "monthly_update"
        ? buildMonthlyUpdateEmail({
            monthLabel,
            intro,
            newItems,
            fixItems,
            ctaLabel: ctaLabel || undefined,
            ctaHref: ctaHref || undefined,
            unsubscribeUrl,
          })
        : buildAdminAnnouncementEmail({ heading, bodyHtml, unsubscribeUrl });

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
