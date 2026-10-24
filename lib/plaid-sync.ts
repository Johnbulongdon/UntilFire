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
import { classifyPlaid } from "@/lib/plaid-category";
import { planRefunds } from "@/lib/refunds";
import { planTagging, type ClassificationRule } from "@/lib/classification-rules";
import { fetchAllPages } from "@/lib/supabase-pages";
import { planMerchantRules, readMerchantRules } from "@/lib/merchant-rules";
import { monthStart, pickWithdrawals } from "@/lib/savings-limits";

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

  /* What the person changed is theirs (audit round 2): a row whose category
     no longer matches what Plaid's own category maps to was filed by hand,
     and a pending row that posts under a new id brings its filing along. */
  const autoCategory = (r: { pfc_primary?: string | null; pfc_detailed?: string | null; amount?: number | null; transaction_type?: string | null }) =>
    classifyPlaid(r.pfc_primary ?? "", r.pfc_detailed ?? "", (r.transaction_type === "expense" ? 1 : -1) * Math.abs(r.amount ?? 0)).category;
  type Existing = { plaid_transaction_id: string; category: string | null; sub_category: string | null; tags: string[] | null; refund_amount: number | null; transaction_type: string | null; pfc_primary: string | null; pfc_detailed: string | null; amount: number | null };
  const readExisting = async (ids: string[]): Promise<Map<string, Existing>> => {
    if (ids.length === 0) return new Map();
    const { data } = await admin.from("expenses")
      .select("plaid_transaction_id, category, sub_category, tags, refund_amount, transaction_type, pfc_primary, pfc_detailed, amount")
      .eq("user_id", userId).in("plaid_transaction_id", ids);
    return new Map(((data ?? []) as Existing[]).map((r) => [r.plaid_transaction_id, r]));
  };
  const filedByHand = (r: Existing) => !!r.category && r.category !== autoCategory(r);
  const ownTags = (r: Existing) => (r.tags ?? []).filter((t) => !t.startsWith("sys:"));

  // Upsert added
  const addedRows = added.map((tx) => mapPlaidTx(tx, userId)).filter(Boolean);
  if (addedRows.length > 0) {
    await admin
      .from("expenses")
      .upsert(addedRows, { onConflict: "plaid_transaction_id", ignoreDuplicates: true });
  }

  // Refunds reduce the purchase they came back to (lib/refunds).
  await applyRefunds(admin, userId, added.filter((tx) => tx.amount < 0 && !tx.pending).map((tx) => tx.transaction_id));

  // A posted transaction replacing a pending one keeps what was set on the pending row.
  try {
    const posted = added.filter((tx) => tx.pending_transaction_id);
    const before = await readExisting(posted.map((tx) => tx.pending_transaction_id!));
    for (const tx of posted) {
      const old = before.get(tx.pending_transaction_id!);
      const row = mapPlaidTx(tx, userId);
      if (!old || !row) continue;
      const keep: Record<string, unknown> = {};
      if (filedByHand(old)) { keep.category = old.category; keep.sub_category = old.sub_category; keep.transaction_type = old.transaction_type; }
      if (ownTags(old).length) keep.tags = [...new Set([...row.tags.filter((t) => t !== "sys:pending"), ...ownTags(old)])];
      if ((old.refund_amount ?? 0) > 0) keep.refund_amount = Math.min(old.refund_amount ?? 0, row.amount);
      if (Object.keys(keep).length) await admin.from("expenses").update(keep).eq("plaid_transaction_id", tx.transaction_id).eq("user_id", userId);
    }
  } catch (carryErr) {
    console.error("[plaid/sync] carrying pending edits:", carryErr);
  }

  // Update modified
  const modifiedBefore = await readExisting(modified.map((tx) => tx.transaction_id)).catch(() => new Map<string, Existing>());
  for (const tx of modified) {
    const row = mapPlaidTx(tx, userId);
    if (!row) continue;
    const old = modifiedBefore.get(tx.transaction_id);
    const mine = old ? filedByHand(old) : false;
    await admin
      .from("expenses")
      .update({
        amount: row.amount,
        description: row.description,
        // Plaid's category only where the person hasn't filed it themselves.
        ...(mine ? {} : { category: row.category, transaction_type: row.transaction_type }),
        ...(old ? { tags: [...new Set([...ownTags(old), ...row.tags])] } : {}),
        // A pending transaction that posts is exactly when Plaid starts
        // sending a real time and a settled category, so re-read both.
        occurred_at: row.occurred_at,
        plaid_account_id: row.plaid_account_id,
        pfc_primary: row.pfc_primary,
        pfc_detailed: row.pfc_detailed,
        pfc_confidence: row.pfc_confidence,
        updated_at: new Date().toISOString(),
      })
      .eq("plaid_transaction_id", tx.transaction_id)
      .eq("user_id", userId);
  }

  // The person's "always file this merchant" rules. A new row is filed
  // outright; a changed one gets its category back, since the update above
  // re-reads Plaid's.
  try {
    const { data: budget } = await admin.from("user_budget").select("expenses").eq("user_id", userId).maybeSingle();
    const rules = readMerchantRules((budget?.expenses as { _fire_profile?: { merchantRules?: unknown } } | null)?._fire_profile?.merchantRules);
    if (Object.keys(rules).length > 0) {
      const isNew = new Set(added.map((tx) => tx.transaction_id));
      const rows = [...added, ...modified].map((tx) => mapPlaidTx(tx, userId)).filter((r): r is NonNullable<typeof r> => !!r);
      for (const r of planMerchantRules(rows, rules)) {
        await admin
          .from("expenses")
          .update(isNew.has(r.plaid_transaction_id)
            ? { category: r.category, sub_category: r.sub_category, tags: [r.need] }
            : { category: r.category, sub_category: r.sub_category })
          .eq("plaid_transaction_id", r.plaid_transaction_id)
          .eq("user_id", userId);
      }
    }
  } catch (ruleErr) {
    console.error("[plaid/sync] merchant rules:", ruleErr);
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

  /* This month's withdrawals from savings accounts that have a limit set.
   *
   * Re-read the whole month each time rather than riding the cursor: the
   * cursor has already passed transfers synced before a limit was set, and a
   * pending withdrawal that posts comes back under a new id. Replacing the
   * month keeps the count exact. Skipped entirely when no limit is set, so
   * it costs nothing for everyone else.
   */
  try {
    const { data: limited } = await admin
      .from("plaid_accounts")
      .select("plaid_account_id")
      .eq("plaid_item_id", item.id)
      .eq("user_id", userId)
      .not("withdrawal_limit", "is", null);
    const ids = (limited ?? []).map((a) => a.plaid_account_id as string);
    if (ids.length > 0) {
      const today = new Date().toISOString().slice(0, 10);
      const start = monthStart(today);
      const txs: PlaidTransaction[] = [];
      let total = Infinity;
      while (txs.length < total) {
        const resp = await plaid.transactionsGet({
          access_token: item.plaid_access_token,
          start_date: start,
          end_date: today,
          options: { account_ids: ids, count: 500, offset: txs.length },
        });
        total = resp.data.total_transactions;
        if (resp.data.transactions.length === 0) break;
        txs.push(...resp.data.transactions);
      }
      const rows = pickWithdrawals(txs, new Set(ids), userId);
      await admin.from("savings_withdrawals").delete()
        .eq("user_id", userId).in("plaid_account_id", ids).gte("date", start);
      if (rows.length > 0) {
        await admin.from("savings_withdrawals").upsert(rows, { onConflict: "plaid_transaction_id" });
      }
    }
  } catch (wdErr) {
    // The countdown is a nice-to-have; a failure here never fails the sync.
    console.error("[plaid/sync] savings withdrawals:", wdErr);
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

/** Applies newly imported refunds (tag sys:refund) to the purchases they came back to. Never throws. */
export async function applyRefunds(admin: Admin, userId: string, refundIds: string[]): Promise<void> {
  try {
    if (!refundIds.length) return;
    const { data: refunds } = await admin.from("expenses").select("id, date, amount, description, tags")
      .eq("user_id", userId).in("plaid_transaction_id", refundIds).contains("tags", ["sys:refund"]);
    if (!refunds?.length) return;
    const earliest = refunds.reduce((m, r) => (r.date < m ? r.date : m), refunds[0].date);
    const since = new Date(Date.parse(`${earliest}T00:00:00Z`) - 90 * 864e5).toISOString().slice(0, 10);
    const { data: purchases } = await admin.from("expenses").select("id, date, amount, refund_amount, description")
      .eq("user_id", userId).eq("transaction_type", "expense").gte("date", since)
      .in("description", [...new Set(refunds.map((r) => r.description).filter(Boolean))]);
    for (const p of planRefunds(refunds, purchases ?? [])) {
      await admin.from("expenses").update({ refund_amount: p.refundAmount }).eq("id", p.purchaseId).eq("user_id", userId);
      const r = refunds.find((x) => x.id === p.refundId);
      await admin.from("expenses").update({ tags: [...(r?.tags ?? []).filter((t: string) => t !== "sys:refund"), "sys:refund-applied"] })
        .eq("id", p.refundId).eq("user_id", userId);
    }
  } catch (refundErr) {
    console.error("[plaid] applying refunds:", refundErr);
  }
}
