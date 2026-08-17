import { NextRequest, NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/admin-auth";
import { PRO_PLAN_ANALYTICS } from "@/lib/analytics-events";

const DAY_MS = 24 * 60 * 60 * 1000;

export async function GET(req: NextRequest) {
  const auth = await requireAdminUser(req);
  if ("error" in auth) return auth.error;
  const { admin } = auth;

  const [
    { data: usersPage, error: usersErr },
    { count: activePro },
    { count: waitlistCount },
    { count: feedbackCount },
  ] = await Promise.all([
    admin.auth.admin.listUsers({ page: 1, perPage: 1000 }),
    admin.from("subscriptions").select("*", { count: "exact", head: true }).eq("status", "active"),
    admin.from("waitlist").select("*", { count: "exact", head: true }),
    admin.from("feedback").select("*", { count: "exact", head: true }),
  ]);

  if (usersErr) {
    return NextResponse.json({ error: usersErr.message }, { status: 500 });
  }

  const users = usersPage.users;
  const now = Date.now();
  const newLast7d = users.filter((u) => now - new Date(u.created_at).getTime() <= 7 * DAY_MS).length;
  const newLast30d = users.filter((u) => now - new Date(u.created_at).getTime() <= 30 * DAY_MS).length;
  const proCount = activePro ?? 0;

  return NextResponse.json({
    totalUsers: users.length,
    newLast7d,
    newLast30d,
    activePro: proCount,
    mrr: Math.round(proCount * PRO_PLAN_ANALYTICS.priceMonthly * 100) / 100,
    waitlistCount: waitlistCount ?? 0,
    feedbackCount: feedbackCount ?? 0,
  });
}
