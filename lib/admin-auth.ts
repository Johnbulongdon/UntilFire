import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { adminClient } from "@/lib/supabase-admin";

function adminAllowlist(): string[] {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return adminAllowlist().includes(email.toLowerCase());
}

/**
 * Verifies the request's bearer token belongs to a real, logged-in user on
 * the ADMIN_EMAILS allowlist. Every /api/admin/* route calls this first — it
 * is the actual security boundary. The client-side /admin page gate is UX
 * only (it hides the page and asks this same check), never the enforcement.
 */
export async function requireAdminUser(req: NextRequest) {
  const token = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) } as const;
  }

  const admin = adminClient();
  const { data: { user }, error } = await admin.auth.getUser(token);
  if (error || !user || !isAdminEmail(user.email)) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) } as const;
  }

  return { user, admin } as const;
}
