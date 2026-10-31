/** Household history requires every member and confirmed shared-account identity. */
import { MIN_MONTHS, spendingAverage, type SpendRow } from "./real-spending.ts";

export interface MemberSpendRow { user_id: string; date: string; amount: number; refund_amount: number | null; currency: string | null; description: string | null; sub_category?: string | null; plaid_account_id?: string | null; transaction_type?: string }
export interface ConfirmedAccountLink { a: string; b: string }

/** Stable groups also prevent subtracting the same shared balance twice. */
export function confirmedAccountGroups(links: ConfirmedAccountLink[]): Map<string, string> {
  const parent = new Map<string, string>();
  const find = (id: string): string => {
    const p = parent.get(id);
    if (!p || p === id) return id;
    const root = find(p); parent.set(id, root); return root;
  };
  for (const { a, b } of links) {
    if (!a || !b || a === b) continue;
    const first = find(a), second = find(b);
    parent.set(first < second ? second : first, first < second ? first : second);
    if (!parent.has(a)) parent.set(a, a);
    if (!parent.has(b)) parent.set(b, b);
  }
  return new Map([...parent.keys()].map(id => [id, find(id)]));
}

export function householdSpending(rows: MemberSpendRow[], current: string, toUsd: (amount: number, currency: string) => number,
  options: { memberIds: string[]; confirmedLinks: ConfirmedAccountLink[] } = { memberIds: [], confirmedLinks: [] }) {
  const members = [...new Set(options.memberIds)];
  const incomplete = { average: null, months: 0 };
  if (members.length < 2) return incomplete;
  const memberRows = rows.filter(r => members.includes(r.user_id));
  const firstBy = members.map(id => memberRows.filter(r => r.user_id === id).map(r => r.date).sort()[0]);
  if (firstBy.some(d => !d)) return incomplete;
  const firstDate = firstBy.sort().at(-1)!;
  const partial = Number(firstDate.slice(8, 10)) > 3 ? firstDate.slice(0, 7) : null;
  const expenseRows = memberRows.filter(r => (!r.transaction_type || r.transaction_type === "expense") && r.date >= firstDate.slice(0, 7));
  // Every averaged month must have observed spending from every member. Missing
  // history is not a zero-spend month; use the combined budgets until it exists.
  const eligible = members.map(id => new Set(expenseRows.filter(r => r.user_id === id && r.date.slice(0, 7) !== partial)
    .filter(r => spendingAverage([{ date: r.date, usd: 1 }], current, { excludeMortgage: false }).months > 0)
    .map(r => r.date.slice(0, 7))));
  const common = new Set([...eligible[0]].filter(month => eligible.every(set => set.has(month))));
  if (common.size < MIN_MONTHS) return { average: null, months: common.size };
  const groups = confirmedAccountGroups(options.confirmedLinks);
  const counts = new Map<string, Map<string, number>>();
  const kept = new Map<string, SpendRow>();
  let independent = 0;
  for (const r of expenseRows) {
    if (!common.has(r.date.slice(0, 7))) continue;
    const usd = toUsd(Math.max(0, Number(r.amount) - Number(r.refund_amount ?? 0)), r.currency ?? "USD");
    if (!Number.isFinite(usd)) return incomplete;
    const row = { date: r.date, usd, description: r.description, sub_category: r.sub_category };
    const group = r.plaid_account_id ? groups.get(r.plaid_account_id) : undefined;
    if (!group) { kept.set("independent:" + independent++, row); continue; }
    const key = JSON.stringify([group, r.date.slice(0, 10), Number(r.amount), (r.currency ?? "USD").toUpperCase(), (r.description ?? "").trim().toLowerCase()]);
    const byAccount = counts.get(key) ?? new Map<string, number>();
    const account = r.user_id + ":" + r.plaid_account_id;
    const occurrence = (byAccount.get(account) ?? 0) + 1;
    byAccount.set(account, occurrence); counts.set(key, byAccount);
    const occurrenceKey = key + ":" + occurrence;
    const previous = kept.get(occurrenceKey);
    // Keep repeated purchases, but merge the matching occurrence on the other
    // bank connection. If refund updates disagree, retain the larger net spend.
    if (!previous || row.usd > previous.usd) kept.set(occurrenceKey, row);
  }
  return spendingAverage([...kept.values()], current, { excludeMortgage: false, firstDate });
}
