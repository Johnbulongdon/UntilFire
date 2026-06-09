import { NextRequest, NextResponse } from "next/server";
import { adminClient } from "@/lib/supabase-admin";
import { Resend } from "resend";
import { buildRetentionEmail } from "@/lib/email-html";

// Called daily by Vercel Cron (Authorization: Bearer <CRON_SECRET>)
export async function POST(req: NextRequest) {
  const secret = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!secret || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json({ error: "RESEND_API_KEY not set" }, { status: 503 });
  }

  const admin = adminClient();
  const resend = new Resend(process.env.RESEND_API_KEY);

  // Find users who signed up 7+ days ago, got a welcome email, but haven't
  // received a day-7 retention email yet.
  // We use auth.admin.listUsers() since we can't JOIN auth.users directly.
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
  const fiveDaysAgo = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString();

  // Fetch profiles needing day-7 email
  const { data: profiles } = await admin
    .from("profiles")
    .select("user_id")
    .not("welcome_email_sent_at", "is", null)
    .is("day7_email_sent_at", null);

  if (!profiles?.length) return NextResponse.json({ sent: 0 });

  const userIds = profiles.map((p) => p.user_id);

  // Pull auth user records for those IDs to check sign-up date and last sign-in
  const results = await Promise.all(
    userIds.map((id) => admin.auth.admin.getUserById(id))
  );

  const eligible = results
    .filter(({ data: { user } }) => {
      if (!user?.email) return false;
      const created = user.created_at;
      const lastSeen = user.last_sign_in_at ?? created;
      // Signed up 7–14 days ago AND not active in last 5 days
      return created <= sevenDaysAgo && created >= fourteenDaysAgo && lastSeen <= fiveDaysAgo;
    })
    .map(({ data: { user } }) => user!);

  let sent = 0;
  for (const user of eligible) {
    try {
      const { error } = await resend.emails.send({
        from: "UntilFire <hello@untilfire.com>",
        to: user.email!,
        subject: "Your path to financial freedom is waiting",
        html: buildRetentionEmail(),
      });
      if (error) {
        console.error(`[retention] Resend error for ${user.id}:`, error);
        continue;
      }
      await admin
        .from("profiles")
        .upsert({ user_id: user.id, day7_email_sent_at: new Date().toISOString() }, { onConflict: "user_id" });
      sent++;
    } catch (err) {
      console.error(`[retention] threw for ${user.id}:`, err);
    }
  }

  return NextResponse.json({ sent, eligible: eligible.length });
}
