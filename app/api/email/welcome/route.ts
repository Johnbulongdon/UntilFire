import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

async function loopsPost(path: string, body: object) {
  if (!process.env.LOOPS_API_KEY) return;
  return fetch(`https://app.loops.so/api/v1${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.LOOPS_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

export async function POST(req: NextRequest) {
  const token = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = adminClient();
  const { data: { user }, error: authError } = await admin.auth.getUser(token);
  if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Idempotency — skip if already triggered
  const { data: profile } = await admin
    .from("profiles")
    .select("welcome_email_sent_at")
    .eq("id", user.id)
    .single();

  if (profile?.welcome_email_sent_at) {
    return NextResponse.json({ skipped: true });
  }

  await admin.from("profiles").upsert({
    id: user.id,
    welcome_email_sent_at: new Date().toISOString(),
  });

  if (process.env.LOOPS_API_KEY && user.email) {
    // Add contact to Loops, then fire the signup event to trigger the sequence
    await loopsPost("/contacts/upsert", {
      email: user.email,
      userId: user.id,
      source: "untilfire-signup",
    }).catch(() => {});

    await loopsPost("/events/send", {
      email: user.email,
      eventName: "signup",
    }).catch(() => {});
  }

  return NextResponse.json({ success: true });
}
