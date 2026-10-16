/**
 * Real monthly spending for the freedom date, one rule for the phone and the
 * website (D-86, money logic audit round 2). The average of the last 12
 * complete months, from three months on. The month data starts in is left
 * out when it starts after the 3rd, because a half month read as a whole one
 * made spending low and the date early. Mortgage payments are left out when
 * a mortgage is set, because the engine pays the mortgage itself.
 */
export interface SpendRow { date: string; usd: number; description?: string | null; sub_category?: string | null }

export const isMortgagePayment = (t: { description?: string | null; sub_category?: string | null }) =>
  /mortgage|\bmtg\b|home ?loan/i.test(t.description ?? "") || /mortgage/i.test(t.sub_category ?? "");

const monthKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;

export const MIN_MONTHS = 3;

/** `firstDate` is the earliest transaction of any kind, which says where the data starts. */
export function spendingAverage(rows: SpendRow[], current: string, opts: { excludeMortgage: boolean; firstDate?: string | null }) {
  const [y, m] = current.split("-").map(Number);
  const from = monthKey(new Date(y, m - 1 - 12, 1));
  const partial = opts.firstDate && Number(opts.firstDate.slice(8, 10)) > 3 ? opts.firstDate.slice(0, 7) : null;
  const totals = new Map<string, number>();
  for (const t of rows) {
    const month = t.date.slice(0, 7);
    if (month >= current || month < from || month === partial) continue;
    if (opts.excludeMortgage && isMortgagePayment(t)) continue;
    totals.set(month, (totals.get(month) ?? 0) + t.usd);
  }
  const months = totals.size;
  return { average: months >= MIN_MONTHS ? [...totals.values()].reduce((s, v) => s + v, 0) / months : null, months };
}
