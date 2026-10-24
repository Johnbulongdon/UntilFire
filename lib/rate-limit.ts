import { NextRequest, NextResponse } from "next/server";

// A sliding-window limit per caller, held in the serverless instance's memory.
// It stops a script hammering one warm instance (the usual abuse of the AI and
// email routes), not a distributed attack; Vercel Firewall rules cover that.
const hits = new Map<string, number[]>();

export function callerKey(req: NextRequest, route: string): string {
  const token = req.headers.get("authorization")?.replace("Bearer ", "");
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown";
  // A signed-in caller is limited per token, so people behind one office IP don't share a limit.
  return `${route}:${token ? `t:${token.slice(-24)}` : `ip:${ip}`}`;
}

/** Returns a 429 response when `key` has made `max` calls in the last `windowMs`, else null. */
export function rateLimit(key: string, max: number, windowMs = 60_000): NextResponse | null {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter(t => now - t < windowMs);
  if (recent.length >= max) {
    const retry = Math.ceil((windowMs - (now - recent[0])) / 1000);
    return NextResponse.json({ error: "Too many requests" }, { status: 429, headers: { "Retry-After": String(retry) } });
  }
  recent.push(now);
  hits.set(key, recent);
  if (hits.size > 5000) {
    for (const [k, times] of hits) if (now - times[times.length - 1] >= windowMs) hits.delete(k);
  }
  return null;
}
