import { NextRequest, NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/admin-auth";

export async function GET(req: NextRequest) {
  const auth = await requireAdminUser(req);
  if ("error" in auth) return auth.error;
  const { admin } = auth;

  const [{ data: usersPage, error: usersErr }, { data: profiles }, { data: subs }] = await Promise.all([
    admin.auth.admin.listUsers({ page: 1, perPage: 1000 }),
    admin.from("profiles").select("user_id, display_name, marketing_unsubscribed_at"),
    admin.from("subscriptions").select("user_id, status, plan"),
  ]);

  if (usersErr) {
    return NextResponse.json({ error: usersErr.message }, { status: 500 });
  }

  const profileByUser = new Map((profiles ?? []).map((p) => [p.user_id, p]));
  const subByUser = new Map((subs ?? []).map((s) => [s.user_id, s]));

  const users = usersPage.users
    .map((u) => {
      const profile = profileByUser.get(u.id);
      const sub = subByUser.get(u.id);
      const isPro = sub?.status === "active";
      return {
        id: u.id,
        email: u.email ?? "",
        displayName: profile?.display_name ?? null,
        createdAt: u.created_at,
        lastSignInAt: u.last_sign_in_at ?? null,
        plan: isPro ? (sub?.plan ?? "pro") : "free",
        unsubscribed: !!profile?.marketing_unsubscribed_at,
      };
    })
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return NextResponse.json({ users });
}
