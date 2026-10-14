import { NextRequest, NextResponse } from "next/server";
import { adminClient } from "@/lib/supabase-admin";
import { REWARD_DAYS, rewardEligible } from "@/lib/reward-month";

/** Give the quiz's free month of Pro (D-79). Answers { granted, until } either way. */
export async function POST(req: NextRequest): Promise<NextResponse> {
  const token = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const admin = adminClient();
  const { data: { user }, error: authError } = await admin.auth.getUser(token);
  if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [{ data: sub }, { data: profile, error: profileError }] = await Promise.all([
    admin.from("subscriptions").select("status, source, stripe_subscription_id, apple_original_transaction_id").eq("user_id", user.id).maybeSingle(),
    admin.from("profiles").select("reward_month_at").eq("user_id", user.id).maybeSingle(),
  ]);
  // Unknown means no: a missing column (0052 not applied) must not hand out months.
  if (profileError) return NextResponse.json({ granted: false });
  if (!rewardEligible(sub, profile?.reward_month_at ?? null)) return NextResponse.json({ granted: false });

  const now = new Date();
  const until = new Date(now.getTime() + REWARD_DAYS * 86_400_000).toISOString();
  // Claim the reward first: of two quick calls, only the one that sets it gives the month.
  const stamp = now.toISOString();
  const { data: claimed } = profile
    ? await admin.from("profiles").update({ reward_month_at: stamp }).eq("user_id", user.id).is("reward_month_at", null).select("user_id")
    : await admin.from("profiles").insert({ user_id: user.id, reward_month_at: stamp }).select("user_id");
  if (!claimed?.length) return NextResponse.json({ granted: false });

  const { error } = await admin.from("subscriptions").upsert({
    user_id: user.id, source: "reward", status: "active", plan: "pro",
    current_period_end: until, updated_at: now.toISOString(),
  }, { onConflict: "user_id" });
  if (error) {
    console.error("[rewards/quiz-month]", error.message);
    return NextResponse.json({ error: "Couldn't add your free month. Please try again." }, { status: 500 });
  }
  return NextResponse.json({ granted: true, until });
}
