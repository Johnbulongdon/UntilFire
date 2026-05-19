import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"
import { getOptionalSupabaseEnv, getSupabaseEnvErrorMessage } from "@/lib/env"

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
  const { email } = await req.json()
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

  return NextResponse.json({ success: true })
}
