import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getStripe } from "@/lib/stripe";
import Stripe from "stripe";
import { trackCheckoutSucceededServer } from "@/lib/analytics-server";

export const dynamic = "force-dynamic";

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature");

  if (!sig || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Missing signature or secret" }, { status: 400 });
  }

  const stripe = getStripe();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch {
    return NextResponse.json({ error: "Webhook signature verification failed" }, { status: 400 });
  }

  const supabaseAdmin = adminClient();

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.metadata?.supabase_user_id;
      if (!userId || !session.subscription || !session.customer) break;

      const subscriptionId = typeof session.subscription === "string"
        ? session.subscription : session.subscription.id;
      const customerId = typeof session.customer === "string"
        ? session.customer : session.customer.id;

      const sub = await stripe.subscriptions.retrieve(subscriptionId);

      await supabaseAdmin.from("subscriptions").upsert({
        user_id: userId,
        stripe_customer_id: customerId,
        stripe_subscription_id: subscriptionId,
        status: "active",
        plan: "pro",
        current_period_end: new Date((sub as any).current_period_end * 1000).toISOString(),
        updated_at: new Date().toISOString(),
      }, { onConflict: "user_id" });

      // Funnel: server-confirmed checkout success. distinct_id = supabase
      // user id so this stitches to the client funnel (identify is called on
      // signup and dashboard first view).
      const priceId = sub.items.data[0]?.price?.id;
      await trackCheckoutSucceededServer({
        distinctId: userId,
        plan: "pro",
        priceId,
        stripeSessionId: session.id,
        mode: session.mode ?? "subscription",
      });
      break;
    }

    case "customer.subscription.updated": {
      const sub = event.data.object as Stripe.Subscription;
      const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;

      const { data: existing } = await supabaseAdmin
        .from("subscriptions")
        .select("user_id")
        .eq("stripe_customer_id", customerId)
        .single();

      if (!existing) break;

      const isActive = ["active", "trialing"].includes(sub.status);
      await supabaseAdmin.from("subscriptions").upsert({
        user_id: existing.user_id,
        stripe_customer_id: customerId,
        stripe_subscription_id: sub.id,
        status: isActive ? "active" : sub.status,
        plan: isActive ? "pro" : "free",
        current_period_end: new Date((sub as any).current_period_end * 1000).toISOString(),
        updated_at: new Date().toISOString(),
      }, { onConflict: "user_id" });
      break;
    }

    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;

      await supabaseAdmin
        .from("subscriptions")
        .update({ status: "inactive", plan: "free", updated_at: new Date().toISOString() })
        .eq("stripe_customer_id", customerId);
      break;
    }
  }

  return NextResponse.json({ received: true });
}
