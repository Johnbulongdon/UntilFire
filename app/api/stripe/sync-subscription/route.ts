import { NextRequest, NextResponse } from "next/server";
import { adminClient } from "@/lib/supabase-admin";
import { getStripe } from "@/lib/stripe";
import Stripe from "stripe";


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

    if (!session.subscription || session.payment_status !== "paid") {
      return NextResponse.json({ error: "No active subscription found" }, { status: 400 });
    }

    const sub = session.subscription as Stripe.Subscription;
    const customerId = typeof session.customer === "string" ? session.customer : session.customer!.id;

    await admin.from("subscriptions").upsert({
      user_id: user.id,
      stripe_customer_id: customerId,
      stripe_subscription_id: sub.id,
      status: "active",
      plan: "pro",
      current_period_end: new Date((sub as unknown as { current_period_end: number }).current_period_end * 1000).toISOString(),
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id" });

    return NextResponse.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Sync failed";
    console.error("[stripe/sync-subscription]", err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
