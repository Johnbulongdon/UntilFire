import { NextRequest, NextResponse } from "next/server";
import { adminClient } from "@/lib/supabase-admin";
import { Transaction as PlaidTransaction } from "plaid";
import { getPlaidClient, mapPlaidTx } from "@/lib/plaid";

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

    // Refresh account balances
    try {
      const accountsResp = await plaid.accountsGet({ access_token: item.plaid_access_token });
      const accountRows = accountsResp.data.accounts.map((a) => ({
        user_id: user.id,
        plaid_item_id: body.item_id,
        plaid_account_id: a.account_id,
        name: a.name,
        official_name: a.official_name ?? null,
        type: a.type,
        subtype: a.subtype ?? null,
        balance_current: a.balances.current ?? null,
        balance_available: a.balances.available ?? null,
        balance_limit: a.balances.limit ?? null,
        iso_currency_code: a.balances.iso_currency_code ?? "USD",
        mask: a.mask ?? null,
        updated_at: new Date().toISOString(),
      }));
      if (accountRows.length > 0) {
        await admin.from("plaid_accounts").upsert(accountRows, { onConflict: "plaid_account_id" });
      }
    } catch (accErr) {
      console.error("[plaid/sync] accountsGet:", accErr);
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
