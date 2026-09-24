/**
 * Disconnect bank connections at Plaid, so they stop being billed.
 *
 * Plaid bills Transactions and Investments every month for as long as the
 * connection exists at Plaid, used or not. Deleting our row does not end it:
 * only /item/remove does, and it needs the access token, which lives only in
 * that row. Deleting an account used to cascade the rows away without
 * telling Plaid, which left each connection billing with no way left to
 * remove it. Disconnect had the same gap whenever Plaid refused the removal.
 *
 * So a row is deleted only once Plaid has confirmed the connection is gone.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { PlaidApi } from "plaid";
import { plaidErrorCode } from "./plaid-errors.ts";

type Admin = SupabaseClient<any, any, any>;

/** Plaid no longer has the connection, so there is nothing left to bill. */
const ALREADY_GONE = new Set(["ITEM_NOT_FOUND", "INVALID_ACCESS_TOKEN"]);

export interface RemovableItem {
  /** Our plaid_items.id. */
  id: string;
  plaid_access_token: string;
  institution_name: string | null;
}

export interface RemovalResult {
  /** Our ids whose connection Plaid no longer has. */
  removed: string[];
  failed: { id: string; institution: string; errorCode?: string }[];
}

type ItemRemover = Pick<PlaidApi, "itemRemove">;

export async function removePlaidItems(plaid: ItemRemover, items: RemovableItem[]): Promise<RemovalResult> {
  const result: RemovalResult = { removed: [], failed: [] };
  for (const item of items) {
    try {
      await plaid.itemRemove({ access_token: item.plaid_access_token });
      result.removed.push(item.id);
    } catch (err) {
      const errorCode = plaidErrorCode(err);
      if (errorCode && ALREADY_GONE.has(errorCode)) result.removed.push(item.id);
      else result.failed.push({ id: item.id, institution: item.institution_name ?? "a bank", errorCode });
    }
  }
  return result;
}

/** "Chase", "Chase and Wise", "Chase, Wise and Fidelity". */
export function listInstitutions(names: string[]): string {
  if (names.length <= 1) return names[0] ?? "";
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

/**
 * Remove every connection a user has, before their account is deleted.
 * Returns what could not be removed; the caller must not delete the account
 * while anything is left, because the cascade would take the only copy of
 * the access token with it.
 */
export async function disconnectAllForUser(
  admin: Admin,
  userId: string,
  getPlaid: () => ItemRemover,
): Promise<{ failed: RemovalResult["failed"]; readError?: string }> {
  const { data: items, error } = await admin
    .from("plaid_items")
    .select("id, plaid_access_token, institution_name")
    .eq("user_id", userId);
  if (error) return { failed: [], readError: error.message };
  if (!items || items.length === 0) return { failed: [] };

  const { removed, failed } = await removePlaidItems(getPlaid(), items as RemovableItem[]);
  if (removed.length > 0) {
    // Gone at Plaid, so the rows are only dead tokens now; a retry after a
    // partial failure then only has the failures left to try.
    await admin.from("plaid_items").delete().in("id", removed).eq("user_id", userId);
  }
  for (const f of failed) console.error("[plaid/remove]", f.institution, f.errorCode ?? "no code");
  return { failed };
}
