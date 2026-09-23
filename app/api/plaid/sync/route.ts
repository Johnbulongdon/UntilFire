import { NextRequest, NextResponse } from "next/server";
import { adminClient } from "@/lib/supabase-admin";
import { Transaction as PlaidTransaction } from "plaid";
import { getPlaidClient, mapPlaidTx } from "@/lib/plaid";
import { planTagging, type ClassificationRule } from "@/lib/classification-rules";

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
    let tagged = 0;

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
          // A pending transaction that posts is exactly when Plaid starts
          // sending a real time and a settled category, so re-read both.
          occurred_at: row.occurred_at,
          pfc_primary: row.pfc_primary,
          pfc_detailed: row.pfc_detailed,
          pfc_confidence: row.pfc_confidence,
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

    /* Apply the user's need/want rules to anything still untagged.
     *
     * Plaid writes `tags: []`, so without this a rule set in March stops
     * applying in April and everything that counts needs — the emergency
     * fund target, the contribution ladder's monthly expenses — reads low.
     *
     * Run over everything untagged rather than only what just arrived: that
     * also catches a pending transaction whose category only settled on this
     * sync, anything typed in by hand, and the backlog from before this
     * existed. It never overwrites a tag, so it converges to no work and a
     * transaction the user tagged themselves is left alone.
     */
    try {
      const { data: rules } = await admin
        .from("classification_rules")
        .select("category, sub_category, classification")
        .eq("user_id", user.id);
      if (rules && rules.length > 0) {
        /* Filtering "untagged" in SQL is where this goes wrong: `tags = {}`
         * misses a transaction tagged `work` but neither need nor want, and
         * a NOT-contains test drops rows whose tags are NULL. So the filter
         * is the date window the dashboard itself reads — 36 months, beyond
         * which nothing feeds a figure — and planTagging decides the rest. */
        const since = new Date();
        since.setMonth(since.getMonth() - 36);
        const { data: candidates } = await admin
          .from("expenses")
          .select("id, category, sub_category, tags, transaction_type")
          .eq("user_id", user.id)
          .eq("transaction_type", "expense")
          .gte("date", since.toISOString().slice(0, 10));
        const updates = planTagging(candidates ?? [], rules as ClassificationRule[]);
        for (let i = 0; i < updates.length; i += 50) {
          await Promise.all(updates.slice(i, i + 50).map((u) =>
            admin.from("expenses").update({ tags: u.tags }).eq("id", u.id).eq("user_id", user.id),
          ));
        }
        tagged = updates.length;
      }
    } catch (tagErr) {
      // A sync that imported transactions but could not tag them is still a
      // useful sync; the next one tries again.
      console.error("[plaid/sync] classification rules:", tagErr);
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
      tagged,
    });
  } catch (err) {
    console.error("[plaid/sync]", err);
    return NextResponse.json({ error: "Sync failed" }, { status: 500 });
  }
}
