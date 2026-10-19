import { NextRequest, NextResponse } from "next/server";
import { adminClient } from "@/lib/supabase-admin";
import { getStripe } from "@/lib/stripe";
import Stripe from "stripe";
import { stripeSubscriptionState } from "@/lib/stripe-subscription";


export async function POST(req: NextRequest) {
  const token = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = adminClient();
  const { data: { user }, error: authError } = await admin.auth.getUser(token);
  if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { session_id } = await req.json() as { session_id?: string };
  if (!session_id) return NextResponse.json({ error: "Missing session_id" }, { status: 400 });

  try {
    const stripe = getStripe();
    const session = await stripe.checkout.sessions.retrieve(session_id, {
      expand: ["subscription"],
    });

    if (session.metadata?.supabase_user_id !== user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    if (!session.subscription || !["paid", "no_payment_required"].includes(session.payment_status)) {
      return NextResponse.json({ error: "No active subscription found" }, { status: 400 });
    }

    const sub = session.subscription as Stripe.Subscription;
    const customerId = typeof session.customer === "string" ? session.customer : session.customer!.id;

    const state = stripeSubscriptionState(sub);
    if (state.plan !== "pro") return NextResponse.json({ error: "Subscription is not active" }, { status: 409 });

    const { error: writeError } = await admin.from("subscriptions").upsert({
      source: "stripe",
      user_id: user.id,
      stripe_customer_id: customerId,
      stripe_subscription_id: sub.id,
      ...state,
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id" });

    if (writeError) throw new Error("Subscription save failed");
    return NextResponse.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Sync failed";
    console.error("[stripe/sync-subscription]", err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
