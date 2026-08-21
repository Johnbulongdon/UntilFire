import { NextRequest, NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/admin-auth";

const DRAFT_COLUMNS = "id, name, template, segment, subject, content, updated_at";

export async function GET(req: NextRequest) {
  const auth = await requireAdminUser(req);
  if ("error" in auth) return auth.error;
  const { admin } = auth;

  const { data, error } = await admin
    .from("admin_email_drafts")
    .select(DRAFT_COLUMNS)
    .order("updated_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ drafts: data });
}

export async function POST(req: NextRequest) {
  const auth = await requireAdminUser(req);
  if ("error" in auth) return auth.error;
  const { admin, user } = auth;

  const body = await req.json().catch(() => ({}));
  const name = typeof body?.name === "string" && body.name.trim() ? body.name.trim() : "Untitled draft";
  const template = body?.template === "monthly_update" ? "monthly_update" : "announcement";
  const segment = body?.segment === "free" || body?.segment === "pro" ? body.segment : "all";
  const subject = typeof body?.subject === "string" ? body.subject : "";
  const content = body?.content && typeof body.content === "object" ? body.content : {};

  const { data, error } = await admin
    .from("admin_email_drafts")
    .insert({ name, template, segment, subject, content, created_by: user.id })
    .select(DRAFT_COLUMNS)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ draft: data });
}
