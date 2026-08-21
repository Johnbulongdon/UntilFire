import { NextRequest, NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/admin-auth";

const DRAFT_COLUMNS = "id, name, template, segment, subject, content, updated_at";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdminUser(req);
  if ("error" in auth) return auth.error;
  const { admin } = auth;
  const { id } = await params;

  const body = await req.json().catch(() => ({}));
  const updates: Record<string, unknown> = {};
  if (typeof body?.name === "string") updates.name = body.name.trim() || "Untitled draft";
  if (body?.template === "announcement" || body?.template === "monthly_update") updates.template = body.template;
  if (body?.segment === "all" || body?.segment === "free" || body?.segment === "pro") updates.segment = body.segment;
  if (typeof body?.subject === "string") updates.subject = body.subject;
  if (body?.content && typeof body.content === "object") updates.content = body.content;

  const { data, error } = await admin
    .from("admin_email_drafts")
    .update(updates)
    .eq("id", id)
    .select(DRAFT_COLUMNS)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ draft: data });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdminUser(req);
  if ("error" in auth) return auth.error;
  const { admin } = auth;
  const { id } = await params;

  const { error } = await admin.from("admin_email_drafts").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
