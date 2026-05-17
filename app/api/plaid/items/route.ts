import { NextRequest, NextResponse } from "next/server";
import { adminClient } from "@/lib/supabase-admin";


// Returns the user's connected institutions — never exposes access_token or plaid_item_id.
export async function GET(req: NextRequest): Promise<NextResponse> {
  const token = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = adminClient();
  const { data: { user }, error: authError } = await admin.auth.getUser(token);
  if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await admin
    .from("plaid_items")
    .select("id, institution_name, last_synced_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("[plaid/items]", error);
    return NextResponse.json({ error: "Failed to fetch items" }, { status: 500 });
  }

  return NextResponse.json({ items: data ?? [] });
}
