/**
 * A starting budget for someone with none (D-116, Oct 29 2026): 50% needs,
 * 30% wants, 20% saving of monthly take-home pay, offered, never forced.
 *
 * It never asks anyone to spend more. Each category starts at what they
 * usually spend; only wants that aren't bills are trimmed, all by the same
 * share, until wants fit. Needs are never cut: when they pass 50% the extra
 * comes out of wants, and saving keeps its 20%. Someone who already saves
 * more keeps their rate. Bills (from Calendar) stay as they are.
 *
 * Need or want is the shared rule in lib/needs.ts, per purchase, so Food's
 * groceries stay whole while its eating out can be trimmed.
 */
import { transactionNeed, type NeedOverrides } from "./needs.ts";

export const STARTER_SPLIT = { needs: 0.5, wants: 0.3, saving: 0.2 } as const;

export interface StarterRow {
  key: string;
  /** Usual monthly spending, the part that counts as a need. */
  need: number;
  /** Usual monthly spending, the part that counts as a want. */
  want: number;
  /** A repeating bill from Calendar: never trimmed. */
  bill: boolean;
}

export interface StarterLimit extends StarterRow {
  usual: number;
  limit: number;
}

export interface StarterBudget {
  /** False with no full month of spending: only the three totals, as a guide. */
  hasData: boolean;
  needs: number;
  wants: number;
  saving: number;
  /** What wants usually come to, before trimming. */
  wantsUsual: number;
  /** The share taken off each trimmed want, 0 to 1. */
  trim: number;
  limits: StarterLimit[];
}

const floor5 = (n: number) => Math.max(0, Math.floor(n / 5) * 5);

/** The three totals only, before any spending is known. */
export function starterGuide(takeHome: number): StarterBudget {
  const t = Math.max(0, takeHome);
  return {
    hasData: false, needs: Math.round(t * STARTER_SPLIT.needs), wants: Math.round(t * STARTER_SPLIT.wants),
    saving: Math.round(t * STARTER_SPLIT.saving), wantsUsual: 0, trim: 0, limits: [],
  };
}

export function starterBudget(takeHome: number, rows: StarterRow[]): StarterBudget {
  const used = rows.filter((r) => r.need + r.want > 0);
  if (takeHome <= 0 || used.length === 0) return starterGuide(takeHome);
  const t = takeHome;
  const needs = used.reduce((s, r) => s + r.need, 0);
  const wantsBills = used.reduce((s, r) => s + (r.bill ? r.want : 0), 0);
  const wantsFlex = used.reduce((s, r) => s + (r.bill ? 0 : r.want), 0);
  const wantsUsual = wantsBills + wantsFlex;
  // The 30% line, lowered when needs take more than half so saving keeps 20%.
  const cap = Math.min(t * STARTER_SPLIT.wants, t * (1 - STARTER_SPLIT.saving) - needs);
  const wantsTarget = Math.max(wantsBills, Math.min(wantsUsual, cap));
  const keep = wantsFlex > 0 ? Math.min(1, (wantsTarget - wantsBills) / wantsFlex) : 1;
  const limits = used.map((r) => {
    const usual = Math.round(r.need + r.want);
    const trimmed = !r.bill && r.want > 0 && keep < 1;
    return { ...r, usual, limit: trimmed ? Math.round(r.need) + floor5(r.want * keep) : usual };
  });
  const wants = limits.reduce((s, l) => s + l.limit - Math.round(l.need), 0);
  return {
    hasData: true, needs: Math.round(needs), wants, saving: Math.round(t - needs - wants),
    wantsUsual: Math.round(wantsUsual), trim: Math.max(0, 1 - keep), limits,
  };
}

export interface StarterTxn {
  date: string;
  usd: number;
  category?: string | null;
  sub_category?: string | null;
  tags?: string[] | null;
  transaction_type?: string;
}

/**
 * Usual monthly spending per category, need and want parts, averaged over the
 * last three full months that have spending (this month is left out).
 */
export function usualByCategory(txns: StarterTxn[], today: Date, overrides: NeedOverrides = {}, bills: Set<string> = new Set()): StarterRow[] {
  const thisMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
  const spend = txns.filter((t) => (t.transaction_type ?? "expense") === "expense" && t.date.slice(0, 7) < thisMonth && t.usd > 0);
  const months = [...new Set(spend.map((t) => t.date.slice(0, 7)))].sort().slice(-3);
  if (months.length === 0) return [];
  const rows: Record<string, StarterRow> = {};
  for (const t of spend) {
    if (!months.includes(t.date.slice(0, 7))) continue;
    const key = t.category || "other";
    const row = rows[key] ??= { key, need: 0, want: 0, bill: bills.has(key) };
    row[transactionNeed({ category: key, sub_category: t.sub_category ?? null, tags: t.tags ?? [] }, overrides)] += t.usd / months.length;
  }
  return Object.values(rows);
}
