import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"
import { getOptionalSupabaseEnv, getSupabaseEnvErrorMessage } from "@/lib/env"
import { Resend } from "resend"

const WAITLIST_EMAIL_MAX_LENGTH = 254
const WAITLIST_BURST_WINDOW_MS = 15_000
const waitlistBurstGuard = new Map<string, number>()

function normalizeEmail(value: unknown): string {
  return String(value ?? "").trim().toLowerCase()
}

function isValidEmail(email: string): boolean {
  if (!email || email.length > WAITLIST_EMAIL_MAX_LENGTH) return false
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

function getClientIp(req: Request): string {
  const forwardedFor = req.headers.get("x-forwarded-for")
  if (forwardedFor) return forwardedFor.split(",")[0]?.trim() ?? "unknown"
  return req.headers.get("x-real-ip") ?? "unknown"
}

function isRateLimited(ip: string): boolean {
  const now = Date.now()
  const previousSeen = waitlistBurstGuard.get(ip)

  for (const [key, seenAt] of waitlistBurstGuard.entries()) {
    if (now - seenAt > WAITLIST_BURST_WINDOW_MS) {
      waitlistBurstGuard.delete(key)
    }
  }

  if (previousSeen && now - previousSeen < WAITLIST_BURST_WINDOW_MS) {
    return true
  }

  waitlistBurstGuard.set(ip, now)
  return false
}

export async function POST(req: Request) {
  const env = getOptionalSupabaseEnv()

  if (!env) {
    return NextResponse.json({ error: getSupabaseEnvErrorMessage() }, { status: 503 })
  }

  if (isRateLimited(getClientIp(req))) {
    return NextResponse.json({ error: "Please wait a moment before trying again." }, { status: 429 })
  }

  const supabase = createClient(env.url, env.anonKey)
  const { email, fireTarget, retireYear, years, monthlySavings, cityName, currency } = await req.json()
  const normalizedEmail = normalizeEmail(email)
  if (!normalizedEmail) {
    return NextResponse.json({ error: "Email required" }, { status: 400 })
  }
  if (!isValidEmail(normalizedEmail)) {
    return NextResponse.json({ error: "Enter a valid email address" }, { status: 400 })
  }

  const { error } = await supabase.from("waitlist").insert({ email: normalizedEmail })
  // A duplicate (23505) is not a failure — the visitor still wants their plan emailed,
  // so fall through to the email send instead of returning early.
  if (error && error.code !== "23505") {
    return NextResponse.json({ error: "Unable to join the waitlist right now" }, { status: 400 })
  }

  if (process.env.RESEND_API_KEY && fireTarget && retireYear) {
    const resend = new Resend(process.env.RESEND_API_KEY)
    const fmt = (n: number) => {
      const sym = currency === "AUD" ? "A$" : currency === "EUR" ? "€" : currency === "GBP" ? "£" : currency === "CAD" ? "C$" : "$"
      return n >= 1_000_000 ? `${sym}${(n / 1_000_000).toFixed(2)}M` : `${sym}${Math.round(n).toLocaleString()}`
    }
    try {
      const { error: sendError } = await resend.emails.send({
        from: "UntilFire <hello@untilfire.com>",
        to: normalizedEmail,
        subject: `Your FIRE number: ${fmt(fireTarget)} by ${retireYear}`,
        html: `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Your freedom date is ${retireYear}</title></head>
<body style="margin:0;padding:0;background:#0d0d14;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0d0d14;padding:40px 16px">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px">

        <!-- Header -->
        <tr><td style="padding-bottom:28px">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td>
                <span style="font-size:18px;font-weight:900;color:#22d3a5;letter-spacing:-0.5px">Until</span><span style="font-size:18px;font-weight:900;color:#f8fafc;letter-spacing:-0.5px">Fire</span>
              </td>
              <td align="right">
                <span style="font-size:11px;color:rgba(255,255,255,0.35);font-weight:600;letter-spacing:1.5px;text-transform:uppercase">Your Plan</span>
              </td>
            </tr>
          </table>
        </td></tr>

        <!-- Hero card -->
        <tr><td style="background:#111118;border:1px solid rgba(255,255,255,0.08);border-radius:20px;padding:36px 32px 32px">

          <!-- Freedom date -->
          <p style="margin:0 0 6px;font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#22d3a5">Your freedom date</p>
          <h1 style="margin:0 0 12px;font-size:52px;font-weight:900;color:#f8fafc;letter-spacing:-2px;line-height:1">${retireYear}</h1>
          <p style="margin:0 0 32px;font-size:15px;color:rgba(255,255,255,0.5);line-height:1.6">
            Work becomes optional in <strong style="color:rgba(255,255,255,0.8)">${years} years</strong>. Here's what your plan looks like right now.
          </p>

          <!-- Stats -->
          <table width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid rgba(255,255,255,0.07)">
            <tr>
              <td style="padding:16px 0;border-bottom:1px solid rgba(255,255,255,0.07)">
                <span style="font-size:12px;color:rgba(255,255,255,0.4);font-weight:600;text-transform:uppercase;letter-spacing:0.8px">FIRE number</span>
              </td>
              <td style="padding:16px 0;border-bottom:1px solid rgba(255,255,255,0.07);text-align:right">
                <span style="font-size:20px;font-weight:800;color:#f8fafc;letter-spacing:-0.5px">${fmt(fireTarget)}</span>
              </td>
            </tr>
            <tr>
              <td style="padding:16px 0;border-bottom:1px solid rgba(255,255,255,0.07)">
                <span style="font-size:12px;color:rgba(255,255,255,0.4);font-weight:600;text-transform:uppercase;letter-spacing:0.8px">Monthly savings needed</span>
              </td>
              <td style="padding:16px 0;border-bottom:1px solid rgba(255,255,255,0.07);text-align:right">
                <span style="font-size:20px;font-weight:800;color:#f8fafc;letter-spacing:-0.5px">${fmt(monthlySavings ?? 0)}</span>
              </td>
            </tr>
            ${cityName ? `<tr>
              <td style="padding:16px 0">
                <span style="font-size:12px;color:rgba(255,255,255,0.4);font-weight:600;text-transform:uppercase;letter-spacing:0.8px">Target location</span>
              </td>
              <td style="padding:16px 0;text-align:right">
                <span style="font-size:15px;font-weight:700;color:#f8fafc">${cityName}</span>
              </td>
            </tr>` : ""}
          </table>

          <!-- CTA -->
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:28px">
            <tr>
              <td>
                <a href="https://untilfire.com/?source=plan-email" style="display:inline-block;background:#f97316;color:#ffffff;font-size:15px;font-weight:800;padding:14px 28px;border-radius:12px;text-decoration:none;letter-spacing:-0.2px">
                  Open your full plan →
                </a>
              </td>
            </tr>
          </table>

        </td></tr>

        <!-- Nudge row -->
        <tr><td style="padding:24px 4px 0">
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#1a1a24;border:1px solid rgba(255,255,255,0.06);border-radius:14px;padding:20px 24px">
            <tr>
              <td>
                <p style="margin:0 0 6px;font-size:13px;font-weight:700;color:#f8fafc">What moves your date closest?</p>
                <p style="margin:0;font-size:13px;color:rgba(255,255,255,0.45);line-height:1.6">Your savings rate is the single biggest lever. Even raising it by 5% can pull your freedom date forward by 2–4 years. Open UntilFire to see your exact numbers.</p>
              </td>
            </tr>
          </table>
        </td></tr>

        <!-- Footer -->
        <tr><td style="padding:28px 4px 0">
          <p style="margin:0;font-size:11px;color:rgba(255,255,255,0.2);line-height:1.7;text-align:center">
            Based on 4% safe withdrawal rate and 10% nominal return.<br>Past market returns don't guarantee future results.<br><br>
            UntilFire &mdash; Personal finance that sets you free.<br>
            <a href="https://untilfire.com" style="color:rgba(255,255,255,0.25);text-decoration:none">untilfire.com</a>
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`,
      })
      if (sendError) console.error("[waitlist] Resend send error:", sendError)
    } catch (err) {
      console.error("[waitlist] Resend threw:", err)
    }
  } else if (!process.env.RESEND_API_KEY) {
    console.error("[waitlist] RESEND_API_KEY is not set — no email sent")
  }

  return NextResponse.json({ success: true })
}
