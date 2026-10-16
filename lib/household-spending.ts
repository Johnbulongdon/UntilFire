/**
 * A household's real monthly spending (money logic audit round 2): both
 * partners' spending by the same 12-month rule as each person's date
 * (lib/real-spending), with a joint account both of them connected counted
 * once. The same purchase arrives on both sides with the same day, amount,
 * currency and name; one of each such pair is dropped. Pure, so it is tested.
 */
import { spendingAverage, type SpendRow } from "./real-spending.ts";

export interface MemberSpendRow { user_id: string; date: string; amount: number; refund_amount: number | null; currency: string | null; description: string | null; sub_category?: string | null }

export function householdSpending(rows: MemberSpendRow[], current: string, toUsd: (amount: number, currency: string) => number) {
  const seen = new Map<string, Set<string>>();
  const kept: SpendRow[] = [];
  const firstBy = new Map<string, string>();
  for (const r of rows) {
    if (!firstBy.has(r.user_id) || r.date < firstBy.get(r.user_id)!) firstBy.set(r.user_id, r.date);
    const key = `${r.date.slice(0, 10)}|${Number(r.amount).toFixed(2)}|${r.currency ?? "USD"}|${(r.description ?? "").trim().toLowerCase()}`;
    const owners = seen.get(key) ?? new Set<string>();
    // A second member with the identical row is the joint account seen twice.
    const duplicate = owners.size > 0 && !owners.has(r.user_id);
    owners.add(r.user_id);
    seen.set(key, owners);
    if (duplicate) continue;
    kept.push({ date: r.date, usd: toUsd(Number(r.amount) - Number(r.refund_amount ?? 0), r.currency ?? "USD"), description: r.description, sub_category: r.sub_category });
  }
  // Data starts where the later of the two starts, so neither half-month drags the average.
  const firstDate = [...firstBy.values()].sort().pop() ?? null;
  return spendingAverage(kept.filter((r) => !firstDate || r.date >= firstDate.slice(0, 7)), current, { excludeMortgage: false, firstDate });
}
