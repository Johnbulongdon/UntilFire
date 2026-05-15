import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

export async function POST(req: NextRequest) {
  const token = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = adminClient();
  const { data: { user }, error: authError } = await admin.auth.getUser(token);
  if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { type, message } = await req.json() as { type: string; message: string };
  if (!type || !message?.trim()) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const { error: dbError } = await admin.from("feedback").insert({
    user_id: user.id,
    type,
    message: message.trim(),
  });
  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 });

  if (process.env.RESEND_API_KEY && process.env.FEEDBACK_TO_EMAIL) {
    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({
      from: "feedback@untilfire.com",
      to: process.env.FEEDBACK_TO_EMAIL,
      subject: `[UntilFire Feedback] ${type} — ${user.email}`,
      text: `Type: ${type}\nFrom: ${user.email}\n\n${message.trim()}\n\nTimestamp: ${new Date().toISOString()}`,
    }).catch(() => {});
  }

  return NextResponse.json({ success: true });
}
