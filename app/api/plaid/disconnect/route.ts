import { NextRequest, NextResponse } from "next/server";
import { adminClient } from "@/lib/supabase-admin";
import { getPlaidClient } from "@/lib/plaid";
import { removePlaidItems } from "@/lib/plaid-remove";


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

  // Remove the connection at Plaid before deleting our row. The row holds
  // the only copy of the access token, and Plaid keeps billing a connection
  // it still has, so the row goes only once Plaid confirms it is gone.
  const { removed, failed } = await removePlaidItems(getPlaidClient(), [{
    id: body.item_id, plaid_access_token: item.plaid_access_token, institution_name: item.institution_name,
  }]);
  if (failed.length > 0 || removed.length === 0) {
    console.error("[plaid/disconnect] itemRemove failed:", item.institution_name, failed[0]?.errorCode ?? "no code");
    return NextResponse.json({
      error: `Couldn't disconnect ${item.institution_name ?? "this bank"} right now. Please try again in a few minutes.`,
    }, { status: 502 });
  }

  // Delete plaid_items row. Transactions are kept (source='plaid' identifies them).
  await admin.from("plaid_items").delete().eq("id", body.item_id);

  return NextResponse.json({ success: true, institution_name: item.institution_name });
}
