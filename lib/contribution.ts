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

import type { RungKind } from "./contribution-waterfall";

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
  iso_currency_code?: string | null;
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
  /** How much of the total is cash. Included in `holdings`, under its
   *  currency code — reported separately only so the note can say so. */
  cashValue: number;
}

/**
 * Plaid reports cash inside an investment account as a holding with
 * `ticker_symbol` set to `CUR:<ISO code>` — "CUR:USD". `type: "cash"` says the
 * same thing a second way; both are honoured.
 *
 * Cash is a real part of a portfolio and plenty of allocations hold a
 * deliberate slice of it, so it is kept as a holding rather than set aside.
 * What it is not is an asset called "CUR:USD" — it is renamed to the currency
 * code it represents.
 */
export function isCashTicker(symbol: string | null | undefined, type?: string | null): boolean {
  if (type && type.toLowerCase() === "cash") return true;
  return /^CUR:/i.test((symbol ?? "").trim());
}

/**
 * What to call a cash position. "CUR:USD" becomes "USD"; cash flagged only by
 * type falls back to the holding's own currency, and to "CASH" when even that
 * is missing — a row you can see and name beats a row that silently vanishes.
 */
export function cashSymbol(symbol?: string | null, isoCurrencyCode?: string | null): string {
  const match = /^CUR:([A-Za-z]{3})$/i.exec((symbol ?? "").trim());
  if (match) return match[1].toUpperCase();
  if (isoCurrencyCode && isoCurrencyCode.trim()) return isoCurrencyCode.trim().toUpperCase();
  return "CASH";
}

export function aggregateHoldingsByTicker(
  rows: PlaidHoldingRow[],
  securities: Record<string, PlaidSecurity>,
): AggregatedHoldings {
  const byTicker = new Map<string, number>();
  let skippedCount = 0;
  let skippedValue = 0;
  let cashValue = 0;

  for (const row of rows) {
    const value = row.institution_value
      ?? (row.quantity != null && row.institution_price != null ? row.quantity * row.institution_price : null);
    if (value == null || !Number.isFinite(value)) continue;

    const security = securities[row.security_id];
    const rawTicker = security?.ticker_symbol?.trim().toUpperCase();
    if (isCashTicker(rawTicker, security?.type)) {
      const symbol = cashSymbol(rawTicker, row.iso_currency_code);
      byTicker.set(symbol, (byTicker.get(symbol) ?? 0) + value);
      cashValue += value;
      continue;
    }
    const ticker = rawTicker;
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
    cashValue,
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
    if (known.has(symbol)) {
      // Fill even a zero: if you sold out of something in the plan, the plan
      // needs to know that, and zero is the fact.
      fill.set(symbol, h.value);
    } else if (h.value > 0) {
      add.push({ symbol, value: h.value });
    }
    // A holding the plan has never heard of AND that you hold none of is a
    // closed position the institution still lists. There is nothing to
    // allocate against it and nothing to say about it.
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
  /** The ladder's inputs. Absent on plans stored before the ladder existed. */
  ladder?: StoredLadder;
  /** When this copy was written, ms since epoch. The two stores can disagree
   *  — the account write is debounced, so leaving the tab quickly cancels it
   *  and leaves localStorage ahead — and this is how the newer one is known.
   *  Absent on plans stored before it was recorded, which is read as oldest. */
  updatedAt?: number;
}

/**
 * The ladder's own inputs.
 *
 * Three of its fields can either follow the account or be overridden. `null`
 * is the difference: it means "whatever my accounts say", and it has to
 * survive a reload, because a stored 7000 would freeze the emergency fund at
 * last month's balance and quietly stop tracking.
 */
export type ExpenseSource = "last-month" | "average";

export interface StoredLadder {
  efOverride: number | null;
  expensesOverride: number | null;
  thresholdOverride: number | null;
  /** Which connected accounts the emergency fund is read from. `null` means
   *  "my savings accounts", which keeps tracking as accounts are added. */
  efAccountIds: string[] | null;
  /** Which measured figure the expenses field follows when it is not
   *  overridden: the most recent complete month, or the average of them. */
  expenseSource: ExpenseSource;
  monthlyMatch: number;
  taxRoom: number;
  lowInterestExtra: number;
  debts: { name: string; balance: number; ratePct: number }[];
  disabled: RungKind[];
}

export interface PlanRow { id: string; symbol: string; targetPct: string; value: string }
export interface DebtRow { id: string; name: string; balance: string; ratePct: string }

/** The ladder as the inputs hold it: strings, and null where a field is
 *  following the account rather than carrying a typed-in value. */
export interface LadderFields {
  efOverride: string | null;
  expensesOverride: string | null;
  thresholdOverride: string | null;
  efAccountIds: string[] | null;
  expenseSource: ExpenseSource;
  monthlyMatch: string;
  taxRoom: string;
  lowInterestExtra: string;
  debts: DebtRow[];
  disabled: RungKind[];
}

export const EMPTY_LADDER: LadderFields = {
  efOverride: null, expensesOverride: null, thresholdOverride: null,
  efAccountIds: null, expenseSource: "last-month",
  monthlyMatch: "", taxRoom: "", lowInterestExtra: "", debts: [], disabled: [],
};

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
  const valueOf = new Map(
    plan.holdings.map((h) => [isCashTicker(h.symbol) ? cashSymbol(h.symbol) : h.symbol, h.value]),
  );
  return {
    // A plan that stored a raw "CUR:USD" repairs itself on load by renaming
    // it to the currency. Renamed rather than dropped: the row is a real
    // holding, it just had the wrong name on it.
    rows: plan.targets.map((t) => ({
      id: rowId(),
      symbol: isCashTicker(t.symbol) ? cashSymbol(t.symbol) : t.symbol,
      // A blank target round-trips as blank rather than "0" — the tab uses
      // blank to mean "imported, not yet placed in the plan".
      targetPct: t.targetPct ? String(+(t.targetPct * 100).toFixed(4)) : "",
      value: (() => {
        const key = isCashTicker(t.symbol) ? cashSymbol(t.symbol) : t.symbol;
        return valueOf.get(key) ? String(valueOf.get(key)) : "";
      })(),
    })),
    budget: String(plan.budget || ""),
    frequency: plan.frequency,
  };
}

/* ── The ladder, to and from storage ─────────────────────────────────────
   Same convention as the rows above: stored as numbers, held as strings.
   A blank field and a typed 0 both compute as 0, so they round-trip to the
   same blank — with one exception. An override of 0 is a real answer ("I
   have no emergency fund") and is distinct from null ("ask my accounts"), so
   0 is kept on the three override fields and only null means follow. */

export function ladderToStored(f: LadderFields): StoredLadder {
  const over = (s: string | null) => (s === null ? null : toNumber(s));
  return {
    efOverride: over(f.efOverride),
    expensesOverride: over(f.expensesOverride),
    thresholdOverride: over(f.thresholdOverride),
    efAccountIds: f.efAccountIds ? [...f.efAccountIds] : null,
    expenseSource: f.expenseSource,
    monthlyMatch: toNumber(f.monthlyMatch),
    taxRoom: toNumber(f.taxRoom),
    lowInterestExtra: toNumber(f.lowInterestExtra),
    // A debt with no name and no balance is an empty row the user added and
    // never filled. It is not part of the plan, so it is not stored.
    debts: f.debts
      .filter((d) => d.name.trim() || toNumber(d.balance) > 0)
      .map((d) => ({ name: d.name.trim(), balance: toNumber(d.balance), ratePct: toNumber(d.ratePct) })),
    disabled: [...f.disabled],
  };
}

export function storedToLadder(s: StoredLadder): LadderFields {
  const over = (n: number | null) => (n === null ? null : String(n));
  const blankIfZero = (n: number) => (n ? String(n) : "");
  return {
    efOverride: over(s.efOverride),
    expensesOverride: over(s.expensesOverride),
    thresholdOverride: over(s.thresholdOverride),
    efAccountIds: s.efAccountIds ? [...s.efAccountIds] : null,
    expenseSource: s.expenseSource,
    monthlyMatch: blankIfZero(s.monthlyMatch),
    taxRoom: blankIfZero(s.taxRoom),
    lowInterestExtra: blankIfZero(s.lowInterestExtra),
    debts: s.debts.map((d) => ({
      id: rowId(),
      name: d.name,
      balance: blankIfZero(d.balance),
      // A 0% loan is a real thing (an interest-free plan), so the rate keeps
      // its zero where the balance does not.
      ratePct: String(d.ratePct),
    })),
    disabled: [...s.disabled],
  };
}

/* Both stores hand back whatever was last written: localStorage is the
   user's own machine and the Supabase column is JSONB, neither of which
   promises a shape. A ladder that comes back malformed is dropped rather
   than trusted — a NaN in one field would render the whole tab blank. */
/* Keyed by the union rather than listed as an array, so a new rung kind is a
   compile error here until it is handled — a second hand-kept copy of the
   list is how a kind ends up silently unrecognised and a user's switched-off
   rung comes back on. */
const RUNG_KINDS: Record<RungKind, true> = {
  "emergency-floor": true, "employer-match": true, "high-interest-debt": true,
  "emergency-target": true, "tax-advantaged": true, "low-interest-debt": true,
  taxable: true,
};

const finite = (v: unknown, fallback = 0) => (typeof v === "number" && Number.isFinite(v) ? v : fallback);
const nullableFinite = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : null);

export function sanitiseLadder(raw: unknown): StoredLadder | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const l = raw as Partial<StoredLadder>;
  return {
    efOverride: nullableFinite(l.efOverride),
    expensesOverride: nullableFinite(l.expensesOverride),
    thresholdOverride: nullableFinite(l.thresholdOverride),
    // An id list from storage is only ever compared against live account ids,
    // so a stray entry selects nothing rather than doing anything.
    efAccountIds: Array.isArray(l.efAccountIds)
      ? l.efAccountIds.filter((id): id is string => typeof id === "string")
      : null,
    expenseSource: l.expenseSource === "average" ? "average" : "last-month",
    monthlyMatch: finite(l.monthlyMatch),
    taxRoom: finite(l.taxRoom),
    lowInterestExtra: finite(l.lowInterestExtra),
    debts: Array.isArray(l.debts)
      ? l.debts
          .filter((d): d is { name: string; balance: number; ratePct: number } => !!d && typeof d === "object")
          .map((d) => ({ name: String(d.name ?? ""), balance: finite(d.balance), ratePct: finite(d.ratePct) }))
      : [],
    disabled: Array.isArray(l.disabled)
      ? l.disabled.filter((k): k is RungKind => typeof k === "string" && k in RUNG_KINDS)
      : [],
  };
}

/** A plan worth restoring. An allocation is not the only thing the tab holds:
 *  someone who only filled in the ladder has a plan too, and losing it on
 *  reload is the exact complaint this persistence exists to answer. */
export function planHasContent(plan: StoredPlan | null | undefined): plan is StoredPlan {
  return !!plan && (plan.targets.length > 0 || plan.ladder != null);
}

/** Of two copies of a plan, the one written later.
 *
 *  They can disagree. The account write is debounced, so leaving the tab
 *  within the debounce cancels it and localStorage is left a keystroke ahead
 *  — and letting the account always win would hand the user back an older
 *  plan, which is the very thing this persistence exists to prevent.
 *
 *  A plan with no timestamp predates them being recorded: it loses to one
 *  that has a timestamp, and ties with one that does not, in which case the
 *  argument order decides and the caller puts the account second. */
export function newerPlan(local: StoredPlan | null, cloud: StoredPlan | null): StoredPlan | null {
  if (!local) return cloud;
  if (!cloud) return local;
  return (local.updatedAt ?? 0) > (cloud.updatedAt ?? 0) ? local : cloud;
}

/** Stamp a plan as written now. Called once per edit and the same object
 *  goes to both stores, so the two copies carry the same timestamp when the
 *  account write succeeds and differ only when it did not happen. */
export function stampPlan(plan: StoredPlan, now = Date.now()): StoredPlan {
  return { ...plan, updatedAt: now };
}
