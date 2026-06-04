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
  if (error?.code === "23505") {
    return NextResponse.json({ success: true })
  }
  if (error) {
    return NextResponse.json({ error: "Unable to join the waitlist right now" }, { status: 400 })
  }

  if (process.env.RESEND_API_KEY && fireTarget && retireYear) {
    const resend = new Resend(process.env.RESEND_API_KEY)
    const fmt = (n: number) => {
      const sym = currency === "AUD" ? "A$" : currency === "EUR" ? "€" : currency === "GBP" ? "£" : currency === "CAD" ? "C$" : "$"
      return n >= 1_000_000 ? `${sym}${(n / 1_000_000).toFixed(2)}M` : `${sym}${Math.round(n).toLocaleString()}`
    }
    await resend.emails.send({
      from: "UntilFire <hello@untilfire.com>",
      to: normalizedEmail,
      subject: `Your FIRE number: ${fmt(fireTarget)} by ${retireYear}`,
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;background:#08080e;color:#f8fafc;border-radius:16px">
          <h1 style="font-size:22px;font-weight:800;margin:0 0 8px;color:#22d3a5">Your freedom date is ${retireYear}</h1>
          <p style="color:rgba(255,255,255,0.6);margin:0 0 28px;font-size:14px">Here's your FIRE summary from UntilFire</p>
          <table style="width:100%;border-collapse:collapse">
            <tr><td style="padding:12px 0;border-bottom:1px solid rgba(255,255,255,0.08);color:rgba(255,255,255,0.5);font-size:13px">FIRE number</td><td style="padding:12px 0;border-bottom:1px solid rgba(255,255,255,0.08);text-align:right;font-weight:700;font-size:16px;color:#f8fafc">${fmt(fireTarget)}</td></tr>
            <tr><td style="padding:12px 0;border-bottom:1px solid rgba(255,255,255,0.08);color:rgba(255,255,255,0.5);font-size:13px">Years away</td><td style="padding:12px 0;border-bottom:1px solid rgba(255,255,255,0.08);text-align:right;font-weight:700;font-size:16px;color:#f8fafc">${years} years</td></tr>
            <tr><td style="padding:12px 0;border-bottom:1px solid rgba(255,255,255,0.08);color:rgba(255,255,255,0.5);font-size:13px">Monthly savings</td><td style="padding:12px 0;border-bottom:1px solid rgba(255,255,255,0.08);text-align:right;font-weight:700;font-size:16px;color:#f8fafc">${fmt(monthlySavings ?? 0)}</td></tr>
            ${cityName ? `<tr><td style="padding:12px 0;color:rgba(255,255,255,0.5);font-size:13px">Target location</td><td style="padding:12px 0;text-align:right;font-weight:700;font-size:16px;color:#f8fafc">${cityName}</td></tr>` : ""}
          </table>
          <div style="margin:28px 0 0">
            <a href="https://untilfire.com" style="display:inline-block;background:#f97316;color:#fff;font-weight:700;font-size:14px;padding:12px 24px;border-radius:8px;text-decoration:none">See your full plan →</a>
          </div>
          <p style="margin:24px 0 0;font-size:11px;color:rgba(255,255,255,0.25)">Based on 4% safe withdrawal rate and 10% nominal return. Past market returns don't guarantee future results.</p>
        </div>
      `,
    }).catch(() => {})
  }

  return NextResponse.json({ success: true })
}
