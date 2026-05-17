import { NextRequest, NextResponse } from "next/server";
import { adminClient } from "@/lib/supabase-admin";
import { Resend } from "resend";


export async function POST(req: NextRequest) {
  const token = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = adminClient();
  const { data: { user }, error: authError } = await admin.auth.getUser(token);
  if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { type, message } = await req.json() as { type: string; message: string };
  const ALLOWED_TYPES = ["bug", "feature", "general", "other"];
  if (!type || !ALLOWED_TYPES.includes(type)) {
    return NextResponse.json({ error: "Invalid type" }, { status: 400 });
  }
  if (!message?.trim() || message.trim().length > 2000) {
    return NextResponse.json({ error: "Message must be 1–2000 characters" }, { status: 400 });
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
