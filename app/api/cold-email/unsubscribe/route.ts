import { NextRequest, NextResponse } from "next/server";
import { adminClient } from "@/lib/supabase-admin";
import { validColdToken } from "@/lib/cold-email";

function valid(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id") || "";
  return validColdToken(
    id,
    "unsubscribe",
    req.nextUrl.searchParams.get("token"),
    process.env.COLD_EMAIL_SECRET || "",
  )
    ? id
    : null;
}
const html = (text: string, status = 200) =>
  new NextResponse(
    `<!doctype html><html><meta name="viewport" content="width=device-width,initial-scale=1"><title>UntilFire email preferences</title><body style="font-family:Arial,sans-serif;max-width:520px;margin:80px auto;padding:24px;color:#151719"><h1>UntilFire email preferences</h1>${text}</body></html>`,
    {
      status,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store",
        "Referrer-Policy": "no-referrer",
        "X-Robots-Tag": "noindex",
        "Content-Security-Policy":
          "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; frame-ancestors 'none'",
      },
    },
  );
export async function GET(req: NextRequest) {
  if (!valid(req))
    return html("<p>This email-preference link is invalid.</p>", 400);
  // GET must never opt out: mail security scanners routinely follow links.
  return html(
    '<p>Stop future cold-outreach emails from UntilFire. Your app account and paid subscription are unaffected.</p><form method="post"><button style="padding:14px 20px;border:0;border-radius:24px;background:#151719;color:white">Unsubscribe from outreach</button></form>',
  );
}
export async function POST(req: NextRequest) {
  const id = valid(req);
  if (!id) return html("<p>This email-preference link is invalid.</p>", 400);
  const admin = adminClient();
  const { data: job, error: je } = await admin
    .from("cold_jobs")
    .select("prospect_id")
    .eq("id", id)
    .single();
  if (je || !job) return html("<p>We could not find this email.</p>", 404);
  const { data: p, error: pe } = await admin
    .from("cold_prospects")
    .select("email")
    .eq("id", job.prospect_id)
    .single();
  if (pe || !p) return html("<p>Please try again later.</p>", 503);
  const { error } = await admin.rpc("cold_suppress", {
    p_email: p.email,
    p_reason: "unsubscribe",
  });
  return error
    ? html("<p>We could not save your preference. Please try again.</p>", 503)
    : html(
        "<p>You’re unsubscribed from future cold-outreach emails. Your app account and subscription have not changed.</p>",
      );
}
