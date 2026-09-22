/**
 * Where this month's money goes.
 *
 * Ported from the spreadsheet this replaces, with two changes that the sheet
 * left implicit. Both are documented in docs/design/next-contribution.md.
 *
 * The sheet's model, per asset:
 *   currentPct = value / total
 *   deviation  = targetPct - currentPct          (percentage points)
 *   standard   = targetPct * budget              (the untilted split)
 *   adjusted   = standard * (1 + deviation)      (deviation read as a fraction)
 *
 * So an asset 10.4pp under its target gets 10.4% more than its plain share.
 * It is a proportional nudge rather than a true rebalance: an asset far over
 * target still receives something, it just receives less. That is gentler
 * than gap-filling and it is what the sheet does, so it is kept.
 */

export interface Target {
  symbol: string;
  /** Share of the portfolio this asset should be, 0–1. */
  targetPct: number;
  /** Optional per-asset override of the 5/25 band, in percentage points. */
  bandOverride?: { lowPct: number; highPct: number };
}

export interface Holding {
  symbol: string;
  /** Current market value in the portfolio's currency. */
  value: number;
}

export type BandStatus = "under" | "on-track" | "over";

export interface AssetPlan {
  symbol: string;
  value: number;
  targetPct: number;
  currentPct: number;
  /** targetPct − currentPct, as a fraction. Positive means under target. */
  deviation: number;
  /** targetPct × budget — the split with no tilt applied. */
  standard: number;
  /** What to actually contribute this period. */
  adjusted: number;
  band: { lowPct: number; highPct: number };
  status: BandStatus;
}

export interface ContributionPlan {
  total: number;
  perPeriod: number;
  assets: AssetPlan[];
  warnings: AssetPlan[];
}

export type Frequency = "monthly" | "weekly" | "daily";

/** Average periods in a month, so a weekly figure is not 1/4 of a 31-day month. */
const PERIODS_PER_MONTH: Record<Frequency, number> = {
  monthly: 1,
  weekly: 365.25 / 7 / 12,   // 4.348
  daily: 365.25 / 12,        // 30.44
};

/**
 * The 5/25 rule: an asset is out of band when it is off by 5 percentage points
 * OR by 25% of its own target, whichever is tighter.
 *
 * A flat ±5pp band is unusable at small weights — on a 3% target it spans
 * −2% to 8%, so it can never report "too low" and tolerates nearly 3x the
 * target before it reports "too high". A flat relative band is unusable at
 * large weights, where ±25% of a 45% target is ±11pp. Taking the tighter of
 * the two gives every asset a proportionate leash. The two rules meet exactly
 * at a 20% target; above it the absolute rule binds, below it the relative.
 */
export function bandFor(targetPct: number): { lowPct: number; highPct: number } {
  const halfWidth = Math.min(0.05, targetPct * 0.25);
  return { lowPct: Math.max(0, targetPct - halfWidth), highPct: targetPct + halfWidth };
}

export function statusFor(currentPct: number, band: { lowPct: number; highPct: number }): BandStatus {
  if (currentPct < band.lowPct) return "under";
  if (currentPct > band.highPct) return "over";
  return "on-track";
}

/**
 * @param normaliseToBudget Scale the splits so they sum to exactly `budget`.
 *   The sheet does not do this: because each leg is tilted independently,
 *   nothing pulls the total back, and a portfolio well under target asks for
 *   more than there is to give — December's $100 budget produced $114 of
 *   instructions, May's produced $128. Normalising keeps the tilt (every leg
 *   scales by the same factor) while spending exactly the budget, which is
 *   the only version you can actually follow. Off by default only so the
 *   sheet's own numbers can be reproduced in tests.
 */
export function planContribution(
  targets: Target[],
  holdings: Holding[],
  budget: number,
  opts: { frequency?: Frequency; normaliseToBudget?: boolean } = {},
): ContributionPlan {
  const { frequency = "monthly", normaliseToBudget = true } = opts;
  const valueOf = new Map(holdings.map((h) => [h.symbol, h.value]));
  const total = targets.reduce((sum, t) => sum + (valueOf.get(t.symbol) ?? 0), 0);

  const raw = targets.map((t) => {
    const value = valueOf.get(t.symbol) ?? 0;
    // An empty portfolio has no drift to correct, so everything sits at its
    // target and the first contribution is the plain split.
    const currentPct = total > 0 ? value / total : t.targetPct;
    const deviation = t.targetPct - currentPct;
    const standard = t.targetPct * budget;
    return {
      symbol: t.symbol, value, targetPct: t.targetPct, currentPct, deviation, standard,
      // Never instruct a negative contribution: an asset more than 100pp over
      // its target would otherwise come back as money to withdraw, which is a
      // different decision than where to put new money.
      adjusted: Math.max(0, standard * (1 + deviation)),
      band: t.bandOverride ?? bandFor(t.targetPct),
    };
  });

  const rawTotal = raw.reduce((sum, a) => sum + a.adjusted, 0);
  const scale = normaliseToBudget && rawTotal > 0 ? budget / rawTotal : 1;
  const periods = PERIODS_PER_MONTH[frequency];

  const assets: AssetPlan[] = raw.map((a) => ({
    ...a,
    adjusted: a.adjusted * scale,
    status: statusFor(a.currentPct, a.band),
  }));

  const spend = assets.reduce((sum, a) => sum + a.adjusted, 0);
  return {
    total: spend,
    perPeriod: spend / periods,
    assets,
    warnings: assets.filter((a) => a.status !== "on-track"),
  };
}

/** Targets must describe a whole portfolio, or every percentage below is wrong. */
export function targetsSumTo100(targets: Target[]): boolean {
  const sum = targets.reduce((s, t) => s + t.targetPct, 0);
  return Math.abs(sum - 1) < 1e-6;
}

/* ── Plaid holdings ─────────────────────────────────────────────────────
   /api/plaid/holdings returns one row per position per account, keyed to a
   securities map. Turning that into contribution Holdings needs three things
   handled, and all three are real rather than defensive: the same ticker can
   be held in more than one account and must be summed; institution_value is
   optional and has to fall back to quantity x price; and a security can have
   no ticker at all — cash sweeps and some funds — which cannot be matched to
   a target.

   Untickered value is returned rather than dropped. Every percentage on the
   screen is a share of the portfolio total, so value silently left out does
   not just hide a row, it shifts every other row's number. */

export interface PlaidHoldingRow {
  security_id: string;
  quantity?: number | null;
  institution_price?: number | null;
  institution_value?: number | null;
}
export interface PlaidSecurity {
  ticker_symbol?: string | null;
  name?: string | null;
  type?: string | null;
}

export interface AggregatedHoldings {
  holdings: Holding[];
  /** Positions that carried no ticker, so could not be matched to a target. */
  skippedCount: number;
  skippedValue: number;
}

export function aggregateHoldingsByTicker(
  rows: PlaidHoldingRow[],
  securities: Record<string, PlaidSecurity>,
): AggregatedHoldings {
  const byTicker = new Map<string, number>();
  let skippedCount = 0;
  let skippedValue = 0;

  for (const row of rows) {
    const value = row.institution_value
      ?? (row.quantity != null && row.institution_price != null ? row.quantity * row.institution_price : null);
    if (value == null || !Number.isFinite(value)) continue;

    const ticker = securities[row.security_id]?.ticker_symbol?.trim().toUpperCase();
    if (!ticker) {
      skippedCount += 1;
      skippedValue += value;
      continue;
    }
    byTicker.set(ticker, (byTicker.get(ticker) ?? 0) + value);
  }

  return {
    holdings: [...byTicker.entries()]
      .map(([symbol, value]) => ({ symbol, value }))
      .sort((a, b) => b.value - a.value),
    skippedCount,
    skippedValue,
  };
}

/**
 * What an import should do to a plan that already exists.
 *
 * Returned as instructions rather than applied, so the merge itself can be
 * tested without a React tree or a Plaid session. Matching is case-insensitive
 * because the user types tickers by hand and Plaid does not always send them
 * upper-case.
 *
 * An imported holding the plan has never heard of is added with no target.
 * Giving it one would be inventing an allocation on the user's behalf; leaving
 * it blank puts it in front of them and lets the targets-total warning say so.
 */
export function planImportMerge(
  existingSymbols: string[],
  imported: Holding[],
): { fill: Map<string, number>; add: Holding[] } {
  const known = new Set(
    existingSymbols.map((sym) => sym.trim().toUpperCase()).filter(Boolean),
  );
  const fill = new Map<string, number>();
  const add: Holding[] = [];
  for (const h of imported) {
    const symbol = h.symbol.trim().toUpperCase();
    if (!symbol) continue;
    if (known.has(symbol)) fill.set(symbol, h.value);
    else add.push({ symbol, value: h.value });
  }
  return { fill, add };
}

/* ── The stored shape ───────────────────────────────────────────────────
   Kept as numbers, not the strings the inputs hold: a server-side monthly
   email reads this, and asking a cron to parse "1,060" out of a text field
   works right up until someone types a currency symbol. */
export interface StoredPlan {
  /** targetPct is a fraction: 0.26, not 26. */
  targets: { symbol: string; targetPct: number }[];
  holdings: { symbol: string; value: number }[];
  budget: number;
  frequency: Frequency;
}

export interface PlanRow { id: string; symbol: string; targetPct: string; value: string }

const rowId = () =>
  (typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : String(Math.random()));

const toNumber = (s: string) => {
  const n = parseFloat(String(s).replace(/[^0-9.\-]/g, ""));
  return Number.isFinite(n) ? n : 0;
};

/** UI rows to the stored shape. Rows with no ticker are not part of a plan. */
export function rowsToPlan(rows: PlanRow[], budget: string, frequency: Frequency): StoredPlan {
  const named = rows.filter((r) => r.symbol.trim());
  return {
    targets: named.map((r) => ({ symbol: r.symbol.trim().toUpperCase(), targetPct: toNumber(r.targetPct) / 100 })),
    holdings: named.map((r) => ({ symbol: r.symbol.trim().toUpperCase(), value: toNumber(r.value) })),
    budget: toNumber(budget),
    frequency,
  };
}

/** And back. A holding with no matching target is dropped: it cannot be
 *  rendered as a row without inventing the target half of it. */
export function planToRows(plan: StoredPlan): { rows: PlanRow[]; budget: string; frequency: Frequency } {
  const valueOf = new Map(plan.holdings.map((h) => [h.symbol, h.value]));
  return {
    rows: plan.targets.map((t) => ({
      id: rowId(),
      symbol: t.symbol,
      // A blank target round-trips as blank rather than "0" — the tab uses
      // blank to mean "imported, not yet placed in the plan".
      targetPct: t.targetPct ? String(+(t.targetPct * 100).toFixed(4)) : "",
      value: valueOf.get(t.symbol) ? String(valueOf.get(t.symbol)) : "",
    })),
    budget: String(plan.budget || ""),
    frequency: plan.frequency,
  };
}
