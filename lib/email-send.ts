import type { Resend } from "resend";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Send an email that can be measured afterwards.
 *
 * The Resend webhook identifies an email by a `broadcast_id` tag and discards
 * anything arriving without one. Only admin broadcasts set that tag, so every
 * delivery, open and click from the welcome email, the day 1/3/7 sequence, the
 * waitlist result and the trial reminder was dropped on arrival. Six retention
 * emails went out on 16 September and left no trace that they had existed.
 *
 * So nothing sends directly any more. Everything goes through here, gets a
 * send row to be attributed to, and carries the tag that lets an open find its
 * way back to it.
 *
 * The rule from lib/lifecycle.ts applies just as hard: measurement NEVER
 * decides anything. If the send row cannot be written, the email is still sent
 * — untagged and unmeasurable, but sent. Losing an analytics row is a bad day;
 * failing to deliver someone's welcome email because of one is a broken
 * product.
 */

type Admin = SupabaseClient<any, any, any>;

/** Stable campaign keys. One per kind of automated email. */
export const CAMPAIGNS = {
  WELCOME: "lifecycle_welcome",
  DAY1: "lifecycle_day1",
  DAY3: "lifecycle_day3",
  DAY7: "lifecycle_day7",
  // Retired with the waitlist form; kept so already-sent emails tagged
  // waitlist_result still resolve to a known campaign.
  WAITLIST_RESULT: "waitlist_result",
  TRIAL_ENDING: "billing_trial_ending",
  FEEDBACK: "internal_feedback",
  PREVIEW: "preview",
  HOUSEHOLD_INVITE: "household_invite",
} as const;

export interface TaggedSend {
  campaign: string;
  /** What the Emails tab calls this send. */
  label: string;
  from: string;
  to: string;
  subject: string;
  html?: string;
  text?: string;
  replyTo?: string;
}

/**
 * Find or create today's send row for a campaign.
 *
 * One row per campaign per UTC day, so the five day-7 emails from a single
 * cron run group into one send with one open rate — the same shape the Emails
 * tab already renders for broadcasts.
 *
 * Returns null rather than throwing: see the note above about what must not
 * break when analytics does.
 */
async function sendRowFor(admin: Admin, campaign: string, label: string): Promise<string | null> {
  const today = new Date().toISOString().slice(0, 10);
  try {
    const { data: existing } = await admin
      .from("admin_email_sends")
      .select("id")
      .eq("campaign", campaign)
      .gte("created_at", `${today}T00:00:00Z`)
      .maybeSingle();
    if (existing?.id) return existing.id as string;

    const { data: created, error } = await admin
      .from("admin_email_sends")
      // segment is constrained to all | free | pro — it describes a plan
      // audience, which an automated send does not have. The campaign key has
      // its own column. Setting it here failed the CHECK, which would have
      // left every automated send with no row, no tag, and no way to be
      // measured: the exact failure this file exists to end.
      .insert({ subject: label, segment: "all", campaign, kind: "campaign", recipients: 0, sent_by: null })
      .select("id")
      .single();
    if (!error && created?.id) return created.id as string;

    // Lost a race against another invocation of the same job; the row the
    // other one created is the right one to use.
    const { data: raced } = await admin
      .from("admin_email_sends")
      .select("id")
      .eq("campaign", campaign)
      .gte("created_at", `${today}T00:00:00Z`)
      .maybeSingle();
    return (raced?.id as string) ?? null;
  } catch (err) {
    console.error(`[email-send] could not open a send row for ${campaign}:`, err);
    return null;
  }
}

export async function sendTagged(
  resend: Resend,
  admin: Admin,
  opts: TaggedSend,
): Promise<{ error: unknown; sendId: string | null }> {
  const sendId = await sendRowFor(admin, opts.campaign, opts.label);

  const { error } = await resend.emails.send({
    from: opts.from,
    to: opts.to,
    subject: opts.subject,
    ...(opts.html ? { html: opts.html } : { text: opts.text ?? "" }),
    ...(opts.replyTo ? { replyTo: opts.replyTo } : {}),
    // broadcast_id is what the webhook reads. The campaign tag is for reading
    // in Resend's own dashboard — tag values there allow only letters,
    // numbers, underscores and dashes, which every CAMPAIGNS key respects.
    ...(sendId
      ? { tags: [{ name: "broadcast_id", value: sendId }, { name: "campaign", value: opts.campaign }] }
      : {}),
  } as Parameters<typeof resend.emails.send>[0]);

  // Counted only on a send that actually left, so the denominator of an open
  // rate is emails sent rather than emails attempted.
  if (!error && sendId) {
    try {
      await admin.rpc("increment_email_recipients", { send_id: sendId });
    } catch {
      // No RPC in this project yet — fall back to a read-modify-write, which
      // is fine at these volumes and still never throws.
      try {
        const { data } = await admin.from("admin_email_sends").select("recipients").eq("id", sendId).single();
        await admin
          .from("admin_email_sends")
          .update({ recipients: (data?.recipients ?? 0) + 1 })
          .eq("id", sendId);
      } catch (err) {
        console.error(`[email-send] could not count a recipient for ${opts.campaign}:`, err);
      }
    }
  }

  return { error, sendId };
}
