import { NextRequest, NextResponse } from "next/server";
import { adminClient } from "@/lib/supabase-admin";
import { getStripe, periodEndIso } from "@/lib/stripe";
import { CANCEL_REASONS, isCancelReason } from "@/lib/cancel-reasons";

/**
 * Cancel or keep Pro from Profile (D-99), without the Stripe portal.
 *
 * - `cancel`: stops renewal at the end of the paid or trial period, never at
 *   once, and keeps the one reason picked in Stripe's own cancellation fields.
 * - `resume`: undoes that while the period is still running.
 * - `note`: the optional "one thing we should fix" from the goodbye screen.
 *
 * The row is updated here too, so Profile shows the end date straight away;
 * the customer.subscription.updated webhook writes the same values.
 */
export async function POST(req: NextRequest) {
  const token = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = adminClient();
  const { data: { user }, error: authError } = await admin.auth.getUser(token);
  if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const action = body?.action;
  if (action !== "cancel" && action !== "resume" && action !== "note") {
    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  }

  const { data: sub } = await admin
    .from("subscriptions")
    .select("source, stripe_subscription_id")
    .eq("user_id", user.id)
    .maybeSingle();

  // Apple bills Pro bought in the iOS app, and only Apple can change it (D-75).
  if (sub?.source === "apple") {
    return NextResponse.json({ error: "Your Pro is billed by Apple. Change or cancel it in your iPhone's Settings, under your name, then Subscriptions." }, { status: 409 });
  }
  if (!sub?.stripe_subscription_id) {
    return NextResponse.json({ error: "No subscription found" }, { status: 404 });
  }

  const stripe = getStripe();
  try {
    if (action === "note") {
      const note = typeof body.note === "string" ? body.note.trim().slice(0, 500) : "";
      if (note) {
        await stripe.subscriptions.update(sub.stripe_subscription_id, { cancellation_details: { comment: note } });
      }
      return NextResponse.json({ ok: true });
    }

    let updated;
    if (action === "cancel") {
      const reason = isCancelReason(body.reason) ? body.reason : null;
      const feedback = CANCEL_REASONS.find((r) => r.key === reason)?.stripe;
      updated = await stripe.subscriptions.update(sub.stripe_subscription_id, {
        cancel_at_period_end: true,
        ...(feedback ? { cancellation_details: { feedback } } : {}),
        ...(reason ? { metadata: { cancel_reason: reason } } : {}),
      });
    } else {
      updated = await stripe.subscriptions.update(sub.stripe_subscription_id, {
        cancel_at_period_end: false,
        cancellation_details: { feedback: "", comment: "" },
        metadata: { cancel_reason: "" },
      });
    }

    const endsAt = periodEndIso(updated);
    await admin.from("subscriptions").update({
      auto_renew: action === "resume",
      ...(endsAt ? { current_period_end: endsAt } : {}),
      updated_at: new Date().toISOString(),
    }).eq("user_id", user.id);

    return NextResponse.json({ ok: true, endsAt, renews: action === "resume" });
  } catch (err) {
    console.error("[stripe/cancel]", err);
    return NextResponse.json({ error: "Couldn't reach Stripe. Try again in a minute." }, { status: 502 });
  }
}
