import { NextRequest, NextResponse } from "next/server";
import { adminClient } from "@/lib/supabase-admin";
import { getStripe, STRIPE_PRO_PRICE_ID } from "@/lib/stripe";


export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.replace("Bearer ", "");
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabaseAdmin = adminClient();
  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const stripe = getStripe();

  try {
    // Find or create Stripe customer
    const { data: sub } = await supabaseAdmin
      .from("subscriptions")
      .select("stripe_customer_id, stripe_subscription_id")
      .eq("user_id", user.id)
      .single();

    let customerId = sub?.stripe_customer_id;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { supabase_user_id: user.id },
      });
      customerId = customer.id;
    }

    const origin = req.headers.get("origin") || "https://www.untilfire.com";

    // First-time subscribers get a 90-day free trial (3 months)
    const isFirstTimeSubscriber = !sub?.stripe_subscription_id;

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      line_items: [{ price: STRIPE_PRO_PRICE_ID, quantity: 1 }],
      success_url: `${origin}/dashboard?upgraded=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/dashboard`,
      metadata: { supabase_user_id: user.id },
      allow_promotion_codes: true,
      ...(isFirstTimeSubscriber && {
        subscription_data: { trial_period_days: 90 },
      }),
    });

    return NextResponse.json({ url: session.url, priceId: STRIPE_PRO_PRICE_ID });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Stripe error";
    console.error("[stripe/checkout]", err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
