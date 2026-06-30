import { NextRequest, NextResponse } from "next/server";
import { adminClient } from "@/lib/supabase-admin";
import { getStripe } from "@/lib/stripe";
import Stripe from "stripe";
import { trackCheckoutSucceededServer } from "@/lib/analytics-server";
import { Resend } from "resend";
import { buildTrialReminderEmail } from "@/lib/email-html";

export const dynamic = "force-dynamic";


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
      const priceMonthly = (sub.items.data[0]?.price?.unit_amount ?? 0) / 100;
      await trackCheckoutSucceededServer({
        distinctId: userId,
        plan: "pro",
        priceMonthly,
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

    case "customer.subscription.trial_will_end": {
      // Stripe fires this 3 days before the trial ends
      const sub = event.data.object as Stripe.Subscription;
      const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;

      const { data: existing } = await supabaseAdmin
        .from("subscriptions")
        .select("user_id")
        .eq("stripe_customer_id", customerId)
        .single();

      if (!existing) break;

      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("trial_reminder_sent_at")
        .eq("user_id", existing.user_id)
        .single();

      if (profile?.trial_reminder_sent_at) break;

      const { data: { user: authUser } } = await supabaseAdmin.auth.admin.getUserById(existing.user_id);
      if (!authUser?.email) break;

      const trialEndDate = new Date((sub as any).trial_end * 1000).toLocaleDateString("en-US", {
        month: "long", day: "numeric", year: "numeric",
      });

      if (process.env.RESEND_API_KEY) {
        const resend = new Resend(process.env.RESEND_API_KEY);
        const { error: sendError } = await resend.emails.send({
          from: "UntilFire <hello@untilfire.com>",
          to: authUser.email,
          subject: `Your free trial ends on ${trialEndDate} — here's what happens next`,
          html: buildTrialReminderEmail(trialEndDate),
        });
        if (sendError) {
          console.error("[webhook] trial_will_end Resend error:", sendError);
          break;
        }
      }

      await supabaseAdmin
        .from("profiles")
        .upsert(
          { user_id: existing.user_id, trial_reminder_sent_at: new Date().toISOString() },
          { onConflict: "user_id" },
        );
      break;
    }
  }

  return NextResponse.json({ received: true });
}
