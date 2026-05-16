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
    const plaid = getPlaidClient();

    let cursor: string | undefined = item.cursor ?? undefined;
    const added: PlaidTransaction[] = [];
    const modified: PlaidTransaction[] = [];
    const removedIds: string[] = [];
    let hasMore = true;

    while (hasMore) {
      const syncResp = await plaid.transactionsSync({
        access_token: item.plaid_access_token,
        cursor,
        count: 500,
        options: { include_personal_finance_category: true },
      });
      added.push(...syncResp.data.added);
      modified.push(...syncResp.data.modified);
      removedIds.push(...syncResp.data.removed.map((r) => r.transaction_id));
      cursor = syncResp.data.next_cursor;
      hasMore = syncResp.data.has_more;
    }

    // Upsert added
    const addedRows = added.map((tx) => mapPlaidTx(tx, user.id)).filter(Boolean);
    if (addedRows.length > 0) {
      await admin
        .from("expenses")
        .upsert(addedRows, { onConflict: "plaid_transaction_id", ignoreDuplicates: true });
    }

    // Update modified
    for (const tx of modified) {
      const row = mapPlaidTx(tx, user.id);
      if (!row) continue;
      await admin
        .from("expenses")
        .update({
          amount: row.amount,
          description: row.description,
          category: row.category,
          updated_at: new Date().toISOString(),
        })
        .eq("plaid_transaction_id", tx.transaction_id)
        .eq("user_id", user.id);
    }

    // Hard-delete removed (Plaid only marks removed when they were errors/duplicates)
    if (removedIds.length > 0) {
      await admin
        .from("expenses")
        .delete()
        .in("plaid_transaction_id", removedIds)
        .eq("user_id", user.id);
    }

    // Advance cursor
    await admin
      .from("plaid_items")
      .update({ cursor: cursor ?? null, last_synced_at: new Date().toISOString() })
      .eq("id", body.item_id);

    return NextResponse.json({
      added: addedRows.length,
      modified: modified.length,
      removed: removedIds.length,
    });
  } catch (err) {
    console.error("[plaid/sync]", err);
    return NextResponse.json({ error: "Sync failed" }, { status: 500 });
  }
}
