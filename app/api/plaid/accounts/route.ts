import { NextRequest, NextResponse } from "next/server";
import { adminClient } from "@/lib/supabase-admin";
import { monthStart } from "@/lib/savings-limits";


export async function GET(req: NextRequest): Promise<NextResponse> {
  const token = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = adminClient();
  const { data: { user }, error: authError } = await admin.auth.getUser(token);
  if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: accounts, error } = await admin
    .from("plaid_accounts")
    .select("id, plaid_account_id, name, official_name, type, subtype, balance_current, balance_available, balance_limit, iso_currency_code, mask, plaid_item_id, updated_at, apy, withdrawal_limit")
    .eq("user_id", user.id)
    .order("type")
    .order("name");

  if (error) {
    console.error("[plaid/accounts]", error);
    return NextResponse.json({ error: "Failed to fetch accounts" }, { status: 500 });
  }

  // This month's withdrawals, for accounts with a limit set (the countdown).
  // A failure leaves the list empty rather than failing the balances.
  const limitedIds = (accounts ?? []).filter((a) => a.withdrawal_limit != null).map((a) => a.plaid_account_id);
  const byAccount: Record<string, { date: string; amount: number; description: string | null; pending: boolean }[]> = {};
  if (limitedIds.length > 0) {
    const { data: rows, error: wdError } = await admin
      .from("savings_withdrawals")
      .select("plaid_account_id, date, amount, description, pending")
      .eq("user_id", user.id)
      .in("plaid_account_id", limitedIds)
      .gte("date", monthStart(new Date().toISOString().slice(0, 10)))
      .order("date");
    if (wdError) console.error("[plaid/accounts] withdrawals", wdError);
    for (const r of rows ?? []) {
      (byAccount[r.plaid_account_id] ??= []).push({ date: r.date, amount: Number(r.amount), description: r.description, pending: r.pending });
    }
  }

  return NextResponse.json({
    accounts: (accounts ?? []).map((a) => a.withdrawal_limit != null ? { ...a, withdrawals: byAccount[a.plaid_account_id] ?? [] } : a),
  });
}
