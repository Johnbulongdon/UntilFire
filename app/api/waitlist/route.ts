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
  const { email, fireTarget, retireYear, years, monthlySavings, cityName, currency, portfolioBalance } = await req.json()
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
        html: (() => {
        const pb = portfolioBalance ?? 0;
        const progressPct = fireTarget > 0 ? Math.min(100, Math.round(pb / fireTarget * 100)) : 0;

        return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Your freedom date is ${retireYear}</title></head>
<body style="margin:0;padding:0;background:#F0F4F1;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F0F4F1;padding:40px 16px">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:540px">

        <!-- Logo -->
        <tr><td style="padding-bottom:24px;text-align:center">
          <img src="https://www.untilfire.com/logo/horizon-wordmark-horizontal.svg" alt="UntilFire" width="160" height="46" style="display:inline-block;border:0;max-width:160px" />
        </td></tr>

        <!-- Hero card -->
        <tr><td style="background:linear-gradient(160deg,#059669 0%,#003527 100%);border-radius:20px;padding:36px 32px 32px">
          <p style="margin:0 0 8px;font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#22D3A5">Your freedom date</p>
          <h1 style="margin:0 0 8px;font-size:58px;font-weight:900;color:#ffffff;letter-spacing:-3px;line-height:1">${retireYear}</h1>
          <p style="margin:0 0 28px;font-size:15px;color:rgba(255,255,255,0.7);line-height:1.6">
            Work becomes optional in <strong style="color:#ffffff">${years} year${years === 1 ? "" : "s"}</strong>. Here is your plan.
          </p>

          <!-- Stats -->
          <table width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid rgba(255,255,255,0.15)">
            <tr>
              <td style="padding:14px 0;border-bottom:1px solid rgba(255,255,255,0.10)">
                <span style="font-size:11px;color:rgba(255,255,255,0.55);font-weight:600;text-transform:uppercase;letter-spacing:0.8px">FIRE number</span>
              </td>
              <td style="padding:14px 0;border-bottom:1px solid rgba(255,255,255,0.10);text-align:right">
                <span style="font-size:20px;font-weight:800;color:#ffffff;letter-spacing:-0.5px">${fmt(fireTarget)}</span>
              </td>
            </tr>
            <tr>
              <td style="padding:14px 0;border-bottom:1px solid rgba(255,255,255,0.10)">
                <span style="font-size:11px;color:rgba(255,255,255,0.55);font-weight:600;text-transform:uppercase;letter-spacing:0.8px">Monthly savings</span>
              </td>
              <td style="padding:14px 0;border-bottom:1px solid rgba(255,255,255,0.10);text-align:right">
                <span style="font-size:20px;font-weight:800;color:#ffffff;letter-spacing:-0.5px">${fmt(monthlySavings ?? 0)}</span>
              </td>
            </tr>
            ${cityName ? `<tr>
              <td style="padding:14px 0">
                <span style="font-size:11px;color:rgba(255,255,255,0.55);font-weight:600;text-transform:uppercase;letter-spacing:0.8px">Location</span>
              </td>
              <td style="padding:14px 0;text-align:right">
                <span style="font-size:15px;font-weight:700;color:#ffffff">${cityName}</span>
              </td>
            </tr>` : ""}
          </table>

          ${pb > 0 ? `<!-- Progress bar -->
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:20px">
            <tr>
              <td>
                <div style="display:flex;justify-content:space-between;margin-bottom:6px">
                  <span style="font-size:11px;color:rgba(255,255,255,0.55);font-weight:600;text-transform:uppercase;letter-spacing:0.8px">Current progress</span>
                  <span style="font-size:11px;color:#22D3A5;font-weight:700">${progressPct}%</span>
                </div>
                <table width="100%" cellpadding="0" cellspacing="0" style="border-radius:99px;background:rgba(255,255,255,0.15);overflow:hidden">
                  <tr>
                    <td width="${progressPct}%" style="background:#22D3A5;height:6px;border-radius:99px"></td>
                    <td width="${100 - progressPct}%" style="height:6px"></td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>` : ""}
        </td></tr>

        <!-- CTA -->
        <tr><td style="padding:20px 0 0;text-align:center">
          <a href="https://www.untilfire.com/login?source=plan-email" style="display:inline-block;background:#059669;color:#ffffff;font-size:15px;font-weight:800;padding:16px 36px;border-radius:12px;text-decoration:none;letter-spacing:-0.2px">
            Start optimizing your finances &#8594;
          </a>
        </td></tr>

        <!-- Benefits -->
        <tr><td style="padding:20px 0 0">
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;padding:24px">
            <tr><td>
              <p style="margin:0 0 16px;font-size:13px;font-weight:700;color:#003527;text-transform:uppercase;letter-spacing:1px">What you get with UntilFire</p>
              <table width="100%" cellpadding="0" cellspacing="0">
                ${[
                  { icon: "&#127974;", title: "Connect your bank accounts", desc: "See exactly where your money goes each month." },
                  { icon: "&#128202;", title: "Know your spending", desc: "Understand your needs vs wants — spot leaks fast." },
                  { icon: "&#128200;", title: "Know your investments", desc: "Track portfolio progress toward your FIRE number." },
                  { icon: "&#127919;", title: "Keep discipline", desc: "Stay on track with your monthly savings goal." },
                ].map((b) => `
                <tr>
                  <td style="padding:10px 0;border-bottom:1px solid #F3F4F6;vertical-align:top;width:32px;font-size:20px">${b.icon}</td>
                  <td style="padding:10px 0 10px 12px;border-bottom:1px solid #F3F4F6">
                    <p style="margin:0 0 2px;font-size:14px;font-weight:700;color:#003527">${b.title}</p>
                    <p style="margin:0;font-size:13px;color:#6B7280;line-height:1.5">${b.desc}</p>
                  </td>
                </tr>`).join("")}
              </table>
            </td></tr>
          </table>
        </td></tr>

        <!-- Footer -->
        <tr><td style="padding:24px 4px 0">
          <p style="margin:0;font-size:11px;color:#9CA3AF;line-height:1.7;text-align:center">
            Based on 4% safe withdrawal rate and 10% nominal return.<br>Past market returns do not guarantee future results.<br><br>
            UntilFire &mdash; Personal finance that sets you free.<br>
            <a href="https://www.untilfire.com" style="color:#9CA3AF;text-decoration:none">untilfire.com</a>
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
      })(),
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
