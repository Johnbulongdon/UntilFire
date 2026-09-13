import { NextRequest, NextResponse } from "next/server";
import { Webhook } from "svix";
import { adminClient } from "@/lib/supabase-admin";

/**
 * Resend delivery events, so open and click rates live in the admin page
 * instead of only in Resend's dashboard.
 *
 * Public by necessity — Resend calls it — so the Svix signature is the only
 * thing standing between this and anyone who can POST. Without a configured
 * secret the route refuses every request rather than trusting the body: an
 * unauthenticated writer to this table could invent an open rate.
 */

// Resend event name -> the value stored in admin_email_events.event.
const EVENTS: Record<string, string> = {
  "email.sent": "sent",
  "email.delivered": "delivered",
  "email.opened": "opened",
  "email.clicked": "clicked",
  "email.bounced": "bounced",
  "email.complained": "complained",
  "email.delivery_delayed": "delivery_delayed",
};

type ResendEvent = {
  type?: string;
  created_at?: string;
  data?: {
    to?: string | string[];
    tags?: { name?: string; value?: string }[] | Record<string, string>;
    click?: { link?: string };
    [k: string]: unknown;
  };
};

type Tags = { name?: string; value?: string }[] | Record<string, string> | undefined;

/** Resend has sent tags as both an array and an object across versions. */
function broadcastIdFrom(tags: Tags): string | null {
  if (!tags) return null;
  if (Array.isArray(tags)) {
    const hit = tags.find((t) => t?.name === "broadcast_id");
    return hit?.value ?? null;
  }
  if (typeof tags === "object") {
    const v = (tags as Record<string, string>).broadcast_id;
    return typeof v === "string" ? v : null;
  }
  return null;
}

export async function POST(req: NextRequest) {
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "RESEND_WEBHOOK_SECRET not set" }, { status: 503 });
  }

  // Must verify against the raw body — re-serialising JSON changes the bytes
  // and the signature no longer matches.
  const raw = await req.text();
  let event: ResendEvent;
  try {
    event = new Webhook(secret).verify(raw, {
      "svix-id": req.headers.get("svix-id") ?? "",
      "svix-timestamp": req.headers.get("svix-timestamp") ?? "",
      "svix-signature": req.headers.get("svix-signature") ?? "",
    }) as ResendEvent;
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const mapped = EVENTS[event.type ?? ""];
  // 200 on an event we do not store: a non-2xx makes Resend retry forever
  // for something we are deliberately ignoring.
  if (!mapped) return NextResponse.json({ ok: true, ignored: event.type });

  const sendId = broadcastIdFrom(event.data?.tags);
  if (!sendId) return NextResponse.json({ ok: true, ignored: "untagged" });

  const to = event.data?.to;
  const email = (Array.isArray(to) ? to[0] : to)?.toLowerCase();
  if (!email) return NextResponse.json({ ok: true, ignored: "no recipient" });

  const at = event.created_at ?? new Date().toISOString();
  const admin = adminClient();

  // One row per (send, recipient, event). A second open from the same reader
  // bumps occurrences instead of inflating the rate.
  const { data: existing } = await admin
    .from("admin_email_events")
    .select("id, occurrences")
    .eq("send_id", sendId)
    .eq("email", email)
    .eq("event", mapped)
    .maybeSingle();

  if (existing) {
    await admin
      .from("admin_email_events")
      .update({ occurrences: existing.occurrences + 1, last_at: at })
      .eq("id", existing.id);
  } else {
    await admin.from("admin_email_events").insert({
      send_id: sendId,
      email,
      event: mapped,
      link: event.data?.click?.link ?? null,
      first_at: at,
      last_at: at,
    });
  }

  return NextResponse.json({ ok: true });
}
