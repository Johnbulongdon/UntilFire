import { NextRequest, NextResponse } from "next/server";
import { adminClient } from "@/lib/supabase-admin";
import { getPlaidClient } from "@/lib/plaid";


export async function DELETE(req: NextRequest): Promise<NextResponse> {
  const token = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = adminClient();
  const { data: { user }, error: authError } = await admin.auth.getUser(token);
  if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json() as { item_id: string };
  if (!body.item_id) return NextResponse.json({ error: "Missing item_id" }, { status: 400 });

  // Fetch item with ownership check
  const { data: item, error: fetchErr } = await admin
    .from("plaid_items")
    .select("plaid_access_token, institution_name, user_id")
    .eq("id", body.item_id)
    .eq("user_id", user.id)
    .single();

  if (fetchErr || !item) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Revoke Plaid access token (best-effort — proceed even if this fails)
  try {
    const plaid = getPlaidClient();
    await plaid.itemRemove({ access_token: item.plaid_access_token });
  } catch (err) {
    console.warn("[plaid/disconnect] itemRemove failed (proceeding anyway):", err);
  }

  // Delete plaid_items row. Transactions are kept (source='plaid' identifies them).
  await admin.from("plaid_items").delete().eq("id", body.item_id);

  return NextResponse.json({ success: true, institution_name: item.institution_name });
}
