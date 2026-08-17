import { NextRequest, NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/admin-auth";

export async function GET(req: NextRequest) {
  const auth = await requireAdminUser(req);
  if ("error" in auth) return auth.error;
  const { admin } = auth;

  const [{ data: feedback }, { data: surveys }, { data: usersPage }] = await Promise.all([
    admin.from("feedback").select("id, user_id, type, message, created_at").order("created_at", { ascending: false }),
    admin.from("surveys").select("id, user_id, satisfaction, recommend, missing, missing_other, notes, created_at").order("created_at", { ascending: false }),
    admin.auth.admin.listUsers({ page: 1, perPage: 1000 }),
  ]);

  const emailByUser = new Map((usersPage?.users ?? []).map((u) => [u.id, u.email ?? ""]));

  const feedbackItems = (feedback ?? []).map((f) => ({
    kind: "feedback" as const,
    id: f.id,
    email: emailByUser.get(f.user_id) ?? "",
    type: f.type,
    message: f.message,
    createdAt: f.created_at,
  }));

  const surveyItems = (surveys ?? []).map((s) => ({
    kind: "survey" as const,
    id: s.id,
    email: emailByUser.get(s.user_id) ?? "",
    satisfaction: s.satisfaction,
    recommend: s.recommend,
    missing: s.missing_other || s.missing,
    notes: s.notes,
    createdAt: s.created_at,
  }));

  const items = [...feedbackItems, ...surveyItems].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return NextResponse.json({ items });
}
