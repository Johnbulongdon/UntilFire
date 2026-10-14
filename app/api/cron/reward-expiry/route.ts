import { NextRequest, NextResponse } from "next/server";
import { adminClient } from "@/lib/supabase-admin";

/**
 * End quiz free months whose 30 days are up (D-79). Only rows still marked
 * 'reward' with no Stripe or Apple purchase on them: anyone who paid since
 * has a row with another source, and it is left alone.
 */
export async function GET(req: NextRequest) {
  const secret = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!secret || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const now = new Date().toISOString();
  const { data, error } = await adminClient().from("subscriptions")
    .update({ status: "inactive", plan: "free", updated_at: now })
    .eq("source", "reward").eq("status", "active").lt("current_period_end", now)
    .is("stripe_subscription_id", null).is("apple_original_transaction_id", null)
    .select("user_id");
  if (error) {
    console.error("[cron/reward-expiry]", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ended: data?.length ?? 0 });
}
