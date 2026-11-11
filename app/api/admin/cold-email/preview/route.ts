import { NextRequest, NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/admin-auth";
import { cleanColdText, renderColdEmail } from "@/lib/cold-email";
export async function POST(req: NextRequest) {
  const auth = await requireAdminUser(req);
  if ("error" in auth) return auth.error;
  const raw = await req.text();
  if (raw.length > 10000)
    return NextResponse.json(
      { error: "Preview is too large" },
      { status: 413 },
    );
  try {
    const { variant: v } = JSON.parse(raw);
    const result = renderColdEmail({
      variant: {
        subject: cleanColdText(v.subject, 150),
        intro: cleanColdText(v.intro, 600),
        bridge: cleanColdText(v.bridge, 1200),
      },
      firstName: "Alex",
      city: "Chicago",
      postalAddress:
        process.env.COLD_EMAIL_POSTAL_ADDRESS ||
        "[Business postal address required before sending]",
      origin: "https://www.untilfire.com",
      unsubscribeUrl: "#preview-only",
      clickUrl: "#preview-only",
    });
    return NextResponse.json(result, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return NextResponse.json(
      { error: "Invalid preview copy" },
      { status: 400 },
    );
  }
}
