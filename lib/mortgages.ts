/**
 * Mortgages (D-61): as many as a person has, each with its own balance,
 * monthly payment and rate. Typed ones are saved with the profile; a
 * connected mortgage keeps its balance from the bank, and its rate and payment
 * are saved here by account id. As net worth already does, typed mortgages
 * count only while no mortgage is connected, so nothing is counted twice.
 */
export type Mortgage = { id: string; name: string; balance: number; monthly: number; ratePct?: number };
export type MortgageTerms = Record<string, { monthly?: number; ratePct?: number }>;
export type EngineMortgage = { balance: number; monthly: number; rate: number };

/** The rate a mortgage without one is projected at: what the single-mortgage plan always used. */
export const DEFAULT_MORTGAGE_RATE_PCT = 6.5;

/** Saved mortgages, or the single typed mortgage older profiles saved, as the first entry. */
export function loadMortgages(fp: { mortgages?: unknown; mortgageBalance?: number; mortgageMonthly?: number }): Mortgage[] {
  if (Array.isArray(fp.mortgages)) {
    return fp.mortgages
      .filter((m): m is Mortgage => !!m && typeof m === "object" && typeof (m as Mortgage).id === "string")
      .map((m) => ({ id: m.id, name: m.name || "Mortgage", balance: Number(m.balance) || 0, monthly: Number(m.monthly) || 0, ...(m.ratePct != null ? { ratePct: Number(m.ratePct) } : {}) }));
  }
  const balance = Number(fp.mortgageBalance) || 0, monthly = Number(fp.mortgageMonthly) || 0;
  return balance > 0 || monthly > 0 ? [{ id: "m1", name: "Mortgage", balance, monthly }] : [];
}

/** What the freedom date projects: connected mortgages with their saved terms, else the typed ones. */
export function engineMortgages(typed: Mortgage[], connected: { id: string; balance: number }[], terms: MortgageTerms): EngineMortgage[] {
  const rate = (pct?: number) => (pct ?? DEFAULT_MORTGAGE_RATE_PCT) / 100;
  if (connected.length > 0) {
    // A connected mortgage with no payment of its own takes the typed payments, as the single-mortgage plan did.
    const typedMonthly = typed.reduce((s, m) => s + m.monthly, 0);
    return connected.map((c, i) => ({ balance: c.balance, monthly: terms[c.id]?.monthly ?? (i === 0 ? typedMonthly : 0), rate: rate(terms[c.id]?.ratePct) }));
  }
  return typed.map((m) => ({ balance: m.balance, monthly: m.monthly, rate: rate(m.ratePct) }));
}

/** The year a mortgage is paid off at its payment and rate, or null when the payment does not cover the interest. */
export function payoffYear(balance: number, monthly: number, ratePct: number = DEFAULT_MORTGAGE_RATE_PCT, from = new Date()): number | null {
  if (balance <= 0) return from.getFullYear();
  const r = ratePct / 100 / 12;
  if (monthly <= balance * r) return null;
  const months = r > 0 ? -Math.log(1 - (balance * r) / monthly) / Math.log(1 + r) : balance / monthly;
  return new Date(from.getFullYear(), from.getMonth() + Math.ceil(months), 1).getFullYear();
}

export const newMortgageId = () => `m${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
