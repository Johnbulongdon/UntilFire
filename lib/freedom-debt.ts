/**
 * The debt the freedom date carries, and its rate (money logic audit round 2).
 * Before, cards never counted and every loan cost a flat 5%, so $8k carried at
 * 24% never moved the date. Now the rates typed on the contribution ladder
 * are used, balance-weighted, and a card counts once its balance is on the
 * ladder with a rate, which is how someone says they carry it; a card paid
 * in full each month stays out. Mortgages are paid separately by the engine.
 */
export const DEFAULT_DEBT_RATE = 0.05;

const norm = (s: string) => s.trim().toLowerCase();
const isMortgageName = (s: string) => /mortgage|\bmtg\b|home ?loan/i.test(s);

export function freedomDebt(opts: {
  /** Loans the app knows of (connected, else typed), mortgages excluded. */
  otherDebt: number;
  cards: { name: string; balance: number }[];
  ladderDebts: { name: string; balance: number; ratePct: number }[];
}): { balance: number; rate: number } {
  const rows = opts.ladderDebts.filter((d) => d.balance > 0 && !isMortgageName(d.name));
  const ladderNames = new Map(rows.map((d) => [norm(d.name), d]));
  const carried = opts.cards.filter((c) => c.balance > 0 && (ladderNames.get(norm(c.name))?.ratePct ?? 0) > 0)
    .reduce((s, c) => s + c.balance, 0);
  const balance = Math.max(0, opts.otherDebt) + carried;
  const rated = rows.filter((d) => d.ratePct > 0);
  const weight = rated.reduce((s, d) => s + d.balance, 0);
  const rate = weight > 0 ? rated.reduce((s, d) => s + d.balance * d.ratePct, 0) / weight / 100 : DEFAULT_DEBT_RATE;
  return { balance, rate };
}

/** How far back a card's own charges are read: a statement still to pay plus the cycle running now. */
export const CARD_CYCLE_DAYS = 60;

/**
 * Cards worth listing as debts on the contribution ladder. A card whose
 * balance is no more than its own charges over the last two cycles is being
 * paid in full, so it is left off rather than offered as a debt to clear.
 * With no charges on record for it, it is still offered, as before.
 */
export function carriedCards<C extends { plaid_account_id?: string | null; balance: number }>(
  cards: C[],
  charges: { plaid_account_id?: string | null; date: string; usd: number }[],
  today: Date = new Date(),
): C[] {
  const from = new Date(today.getFullYear(), today.getMonth(), today.getDate() - CARD_CYCLE_DAYS);
  const since = `${from.getFullYear()}-${String(from.getMonth() + 1).padStart(2, "0")}-${String(from.getDate()).padStart(2, "0")}`;
  const spent = new Map<string, number>();
  for (const c of charges) {
    if (!c.plaid_account_id || c.date < since) continue;
    spent.set(c.plaid_account_id, (spent.get(c.plaid_account_id) ?? 0) + c.usd);
  }
  return cards.filter((c) => {
    if (c.balance <= 0) return false;
    const recent = c.plaid_account_id ? spent.get(c.plaid_account_id) : undefined;
    return recent === undefined || c.balance > recent + 1;
  });
}
