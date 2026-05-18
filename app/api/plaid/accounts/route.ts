import { NextRequest, NextResponse } from "next/server";
import { adminClient } from "@/lib/supabase-admin";


export async function GET(req: NextRequest): Promise<NextResponse> {
  const token = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = adminClient();
  const { data: { user }, error: authError } = await admin.auth.getUser(token);
  if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: accounts, error } = await admin
    .from("plaid_accounts")
    .select("id, plaid_account_id, name, official_name, type, subtype, balance_current, balance_available, balance_limit, iso_currency_code, mask, plaid_item_id, updated_at, apy")
    .eq("user_id", user.id)
    .order("type")
    .order("name");

  if (error) {
    console.error("[plaid/accounts]", error);
    return NextResponse.json({ error: "Failed to fetch accounts" }, { status: 500 });
  }

  return NextResponse.json({ accounts: accounts ?? [] });
}
