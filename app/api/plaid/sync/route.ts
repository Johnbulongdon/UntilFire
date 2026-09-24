import { NextRequest, NextResponse } from "next/server";
import { adminClient } from "@/lib/supabase-admin";
import { getPlaidClient } from "@/lib/plaid";
import { syncPlaidItem } from "@/lib/plaid-sync";

export async function POST(req: NextRequest): Promise<NextResponse> {
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
    .select("plaid_access_token, cursor, user_id")
    .eq("id", body.item_id)
    .eq("user_id", user.id)
    .single();

  if (fetchErr || !item) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    // The same work the daily refresh does (lib/plaid-sync.ts).
    const result = await syncPlaidItem(admin, getPlaidClient(), {
      id: body.item_id,
      user_id: user.id,
      plaid_access_token: item.plaid_access_token,
      cursor: item.cursor ?? null,
    });
    return NextResponse.json(result);
  } catch (err) {
    console.error("[plaid/sync]", err);
    return NextResponse.json({ error: "Sync failed" }, { status: 500 });
  }
}
