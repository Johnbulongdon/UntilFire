/**
 * Bring one bank connection up to date: new, changed and removed
 * transactions, current balances, and the user's need/want rules.
 *
 * Shared by the Sync button (app/api/plaid/sync) and the daily refresh
 * (app/api/cron/plaid-sync). Balances used to move only when someone pressed
 * Sync, which in practice meant months: the contribution figure was worked
 * out from balances as old as the last press.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { PlaidApi, Transaction as PlaidTransaction } from "plaid";
import { mapPlaidTx } from "@/lib/plaid";
import { planTagging, type ClassificationRule } from "@/lib/classification-rules";
import { fetchAllPages } from "@/lib/supabase-pages";

type Admin = SupabaseClient<any, any, any>;

export interface SyncItem {
  /** Our plaid_items.id. */
  id: string;
  user_id: string;
  plaid_access_token: string;
  cursor: string | null;
}

export interface SyncResult { added: number; modified: number; removed: number; tagged: number }

/** Throws if Plaid refuses the transactions sync; the balance refresh and
 *  tagging steps log and carry on, as the Sync button always has. */
export async function syncPlaidItem(admin: Admin, plaid: PlaidApi, item: SyncItem): Promise<SyncResult> {
  const userId = item.user_id;
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
  const addedRows = added.map((tx) => mapPlaidTx(tx, userId)).filter(Boolean);
  if (addedRows.length > 0) {
    await admin
      .from("expenses")
      .upsert(addedRows, { onConflict: "plaid_transaction_id", ignoreDuplicates: true });
  }

  // Update modified
  for (const tx of modified) {
    const row = mapPlaidTx(tx, userId);
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
      .eq("user_id", userId);
  }

  // Hard-delete removed (Plaid only marks removed when they were errors/duplicates)
  if (removedIds.length > 0) {
    await admin
      .from("expenses")
      .delete()
      .in("plaid_transaction_id", removedIds)
      .eq("user_id", userId);
  }

  // Refresh account balances. accountsGet returns the balances Plaid already
  // holds, which it refreshes on its own schedule; it is not the billed
  // real-time balance call.
  try {
    const accountsResp = await plaid.accountsGet({ access_token: item.plaid_access_token });
    const accountRows = accountsResp.data.accounts.map((a) => ({
      user_id: userId,
      plaid_item_id: item.id,
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
      .eq("user_id", userId);
    if (rules && rules.length > 0) {
      /* Filtering "untagged" in SQL is where this goes wrong: `tags = {}`
       * misses a transaction tagged `work` but neither need nor want, and
       * a NOT-contains test drops rows whose tags are NULL. So the filter
       * is the date window the dashboard itself reads — 36 months, beyond
       * which nothing feeds a figure — and planTagging decides the rest. */
      const since = new Date();
      since.setMonth(since.getMonth() - 36);
      const { data: candidates } = await fetchAllPages((from, to) => admin
        .from("expenses")
        .select("id, category, sub_category, tags, transaction_type")
        .eq("user_id", userId)
        .eq("transaction_type", "expense")
        .gte("date", since.toISOString().slice(0, 10))
        .order("id")
        .range(from, to));
      const updates = planTagging(candidates ?? [], rules as ClassificationRule[]);
      for (let i = 0; i < updates.length; i += 50) {
        await Promise.all(updates.slice(i, i + 50).map((u) =>
          admin.from("expenses").update({ tags: u.tags }).eq("id", u.id).eq("user_id", userId),
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
    .eq("id", item.id);

  return { added: addedRows.length, modified: modified.length, removed: removedIds.length, tagged };
}
