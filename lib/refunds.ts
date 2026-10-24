/**
 * Money back from a shop reduces what was spent there (audit round 2, Oct 16
 * 2026). The bank sends a refund as money in; counted as income it inflated
 * pay and left the category's spending too high. Sync keeps it as a transfer
 * tagged sys:refund and applies it here to the purchase it came back to: the
 * latest same-merchant purchase in the 90 days before it with room left.
 * A refund with no match stays a transfer, so it is never counted as income.
 */
export interface RefundRow { id: string; date: string; amount: number; description: string | null }
export interface PurchaseRow { id: string; date: string; amount: number; refund_amount: number | null; description: string | null }

const name = (s: string | null) => (s ?? "").trim().toLowerCase();
const days = (a: string, b: string) => (Date.parse(`${a.slice(0, 10)}T00:00:00Z`) - Date.parse(`${b.slice(0, 10)}T00:00:00Z`)) / 864e5;

export function planRefunds(refunds: RefundRow[], purchases: PurchaseRow[]): { refundId: string; purchaseId: string; refundAmount: number }[] {
  const room = new Map(purchases.map((p) => [p.id, p.amount - (p.refund_amount ?? 0)]));
  const added = new Map<string, number>();
  const plan: { refundId: string; purchaseId: string; refundAmount: number }[] = [];
  for (const r of [...refunds].sort((a, b) => a.date.localeCompare(b.date))) {
    const match = purchases
      .filter((p) => name(p.description) && name(p.description) === name(r.description))
      .filter((p) => { const gap = days(r.date, p.date); return gap >= 0 && gap <= 90; })
      .filter((p) => (room.get(p.id) ?? 0) >= r.amount - 0.005)
      .sort((a, b) => b.date.localeCompare(a.date))[0];
    if (!match) continue;
    room.set(match.id, (room.get(match.id) ?? 0) - r.amount);
    const total = (added.get(match.id) ?? (match.refund_amount ?? 0)) + r.amount;
    added.set(match.id, total);
    plan.push({ refundId: r.id, purchaseId: match.id, refundAmount: Math.round(total * 100) / 100 });
  }
  return plan;
}
