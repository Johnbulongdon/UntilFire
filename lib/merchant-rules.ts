/**
 * "Always file this merchant like this" (Oct 2026): rules the person sets in
 * the app's Review, saved by merchantKey in _fire_profile.merchantRules.
 * Bank sync applies them as transactions arrive, so a rule set once keeps
 * Review short instead of only suggesting.
 */
import { merchantKey } from "./merchant-memory.ts";

export type MerchantRule = { category: string; sub_category: string | null; need: "need" | "want" };
export interface RuleRow { plaid_transaction_id: string; description: string; transaction_type: string }
export interface RuledRow extends MerchantRule { plaid_transaction_id: string }

/** Rules as stored, keeping only well-formed ones: the profile is JSON anyone's client can write. */
export function readMerchantRules(raw: unknown): Record<string, MerchantRule> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const out: Record<string, MerchantRule> = {};
  for (const [key, r] of Object.entries(raw as Record<string, Partial<MerchantRule>>)) {
    if (!r || typeof r.category !== "string" || !r.category || (r.need !== "need" && r.need !== "want")) continue;
    out[key] = { category: r.category, sub_category: typeof r.sub_category === "string" ? r.sub_category : null, need: r.need };
  }
  return out;
}

/** The expenses a rule covers, with what to file them as. */
export function planMerchantRules(rows: RuleRow[], rules: Record<string, MerchantRule>): RuledRow[] {
  const out: RuledRow[] = [];
  for (const row of rows) {
    if (row.transaction_type !== "expense") continue;
    const rule = rules[merchantKey(row.description ?? "")];
    if (rule) out.push({ plaid_transaction_id: row.plaid_transaction_id, ...rule });
  }
  return out;
}
