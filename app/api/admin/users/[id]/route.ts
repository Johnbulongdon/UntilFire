import { NextRequest, NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/admin-auth";

// Manual Pro grant/revoke — a support override, not a billing action. It
// does not touch Stripe; it only flips the local subscriptions row that
// the rest of the app reads to gate Pro features.
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdminUser(req);
  if ("error" in auth) return auth.error;
  const { admin } = auth;
  const { id } = await params;

  const body = await req.json().catch(() => ({}));
  const makePro = body?.pro === true;

  const { error } = await admin
    .from("subscriptions")
    .upsert(
      { user_id: id, status: makePro ? "active" : "free", plan: makePro ? "pro" : "free" },
      { onConflict: "user_id" }
    );

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

// Deletes the auth user; ON DELETE CASCADE on every user_id foreign key
// (profiles, expenses, plaid_items, subscriptions, goals, ...) removes the
// rest of their data. Irreversible — the UI requires typing the email to
// confirm before calling this.
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdminUser(req);
  if ("error" in auth) return auth.error;
  const { admin, user: adminUser } = auth;
  const { id } = await params;

  if (id === adminUser.id) {
    return NextResponse.json({ error: "Cannot delete your own admin account from here." }, { status: 400 });
  }

  const { error } = await admin.auth.admin.deleteUser(id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
