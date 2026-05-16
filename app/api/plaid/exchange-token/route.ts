import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Transaction as PlaidTransaction } from "plaid";
import { getPlaidClient, PLAID_CATEGORY_MAP, PLAID_SKIP_CATEGORIES } from "@/lib/plaid";

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

function mapPlaidTx(tx: PlaidTransaction, userId: string) {
  const primary = tx.personal_finance_category?.primary ?? "";
  if (PLAID_SKIP_CATEGORIES.has(primary)) return null;

  // Plaid: positive amount = debit (money out), negative = credit (money in)
  const isIncome = tx.amount < 0;
  const absAmount = Math.abs(tx.amount);
  const mappedCategory = PLAID_CATEGORY_MAP[primary] ?? "other";
  const category = isIncome
    ? mappedCategory === "salary" ? "salary" : "other_income"
    : mappedCategory;

  return {
    user_id: userId,
    date: tx.date,
    amount: absAmount,
    currency: tx.iso_currency_code ?? "USD",
    description: tx.merchant_name ?? tx.name,
    category,
    tags: [] as string[],
    sub_category: null as string | null,
    is_work_related: false,
    transaction_type: isIncome ? "income" : "expense",
    plaid_transaction_id: tx.transaction_id,
    source: "plaid",
  };
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const token = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = adminClient();
  const { data: { user }, error: authError } = await admin.auth.getUser(token);
  if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json() as {
    public_token: string;
    institution_name: string;
    institution_id: string;
  };

  if (!body.public_token) {
    return NextResponse.json({ error: "Missing public_token" }, { status: 400 });
  }

  // Server-side paywall: free users limited to 1 bank
  const [{ data: sub }, { count: itemCount }] = await Promise.all([
    admin.from("subscriptions").select("status, plan").eq("user_id", user.id).maybeSingle(),
    admin.from("plaid_items").select("id", { count: "exact", head: true }).eq("user_id", user.id),
  ]);
  const isFree = !sub || sub.status !== "active" || sub.plan !== "pro";
  if (isFree && (itemCount ?? 0) >= 1) {
    return NextResponse.json({ error: "Free plan allows 1 bank. Upgrade to Pro for unlimited." }, { status: 403 });
  }

  try {
    const plaid = getPlaidClient();

    // Exchange public token for access token
    const exchangeResp = await plaid.itemPublicTokenExchange({
      public_token: body.public_token,
    });
    const accessToken = exchangeResp.data.access_token;
    const plaidItemId = exchangeResp.data.item_id;

    // Paginate transactions/sync (no cursor = full history)
    let cursor: string | undefined = undefined;
    const allAdded: PlaidTransaction[] = [];
    let hasMore = true;

    while (hasMore) {
      const syncResp = await plaid.transactionsSync({
        access_token: accessToken,
        cursor,
        count: 500,
        options: { include_personal_finance_category: true },
      });
      allAdded.push(...syncResp.data.added);
      cursor = syncResp.data.next_cursor;
      hasMore = syncResp.data.has_more;
    }

    // Upsert plaid_items row (handles re-connect of same institution)
    const { data: itemRow, error: itemErr } = await admin
      .from("plaid_items")
      .upsert(
        {
          user_id: user.id,
          plaid_item_id: plaidItemId,
          plaid_access_token: accessToken,
          institution_id: body.institution_id,
          institution_name: body.institution_name,
          cursor: cursor ?? null,
          last_synced_at: new Date().toISOString(),
        },
        { onConflict: "user_id,institution_id" },
      )
      .select("id")
      .single();

    if (itemErr || !itemRow) {
      console.error("[plaid/exchange-token] plaid_items upsert:", itemErr);
      return NextResponse.json({ error: "Failed to save connection" }, { status: 500 });
    }

    // Map and bulk upsert into expenses
    const rows = allAdded.map((tx) => mapPlaidTx(tx, user.id)).filter(Boolean);

    if (rows.length > 0) {
      const { error: expErr } = await admin
        .from("expenses")
        .upsert(rows, { onConflict: "plaid_transaction_id", ignoreDuplicates: true });
      if (expErr) console.error("[plaid/exchange-token] expenses upsert:", expErr);
    }

    return NextResponse.json({
      item_id: itemRow.id,
      institution_name: body.institution_name,
      added_count: rows.length,
    });
  } catch (err) {
    console.error("[plaid/exchange-token]", err);
    return NextResponse.json({ error: "Failed to connect bank" }, { status: 500 });
  }
}
