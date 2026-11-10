import { NextRequest, NextResponse } from "next/server";
import { adminClient } from "@/lib/supabase-admin";
import { validColdToken } from "@/lib/cold-email";
export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id") || "";
  if (
    !validColdToken(
      id,
      "click",
      req.nextUrl.searchParams.get("token"),
      process.env.COLD_EMAIL_SECRET || "",
    )
  )
    return new NextResponse("Invalid link", { status: 400 });
  const admin = adminClient();
  const { data } = await admin
    .from("cold_jobs")
    .select("variant")
    .eq("id", id)
    .single();
  // Best effort measurement never blocks the fixed, non-sensitive destination.
  if (data)
    await admin
      .from("cold_jobs")
      .update({ clicked_at: new Date().toISOString() })
      .eq("id", id)
      .is("clicked_at", null);
  return NextResponse.redirect(
    `https://www.untilfire.com/?source=cold-email-${data?.variant === "A" ? "a" : "b"}`,
    {
      status: 302,
      headers: {
        "Cache-Control": "no-store",
        "Referrer-Policy": "no-referrer",
        "X-Robots-Tag": "noindex",
      },
    },
  );
}
