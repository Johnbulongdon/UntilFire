/**
 * One person's position, read straight from their saved budget.
 *
 * This exists so an email can state a number without inventing one. If the
 * mail says a target the dashboard disagrees with, the product has lied to
 * someone about their own money — which costs more trust than the email could
 * ever earn back.
 *
 * Deliberately narrow: spending, assets and the target that falls out of them.
 * It does NOT project a freedom date. A date needs return and contribution
 * assumptions that live in the dashboard's own model, and reimplementing them
 * here is exactly how two numbers drift apart.
 *
 * No imports, so the email builder can use it without gaining dependencies.
 */

/** The shape of user_budget.expenses: category totals, plus underscore-prefixed metadata. */
type BudgetBlob = Record<string, unknown> | null | undefined;

export interface FireSummary {
  /** Monthly spending, summed across real categories. */
  monthlySpend: number;
  /** Everything they have saved, across all four asset buckets. */
  assets: number;
  /** Annual spend ÷ safe withdrawal rate. Zero when they have no spending yet. */
  target: number;
  /** 0–100, or null when there is nothing honest to show. */
  pct: number | null;
  /** 1 / SWR. 25 at the default 4%, but they can change it, so never assume. */
  multiple: number;
  /** Do they have real spending entered? The one that decides what to ask for. */
  hasNumbers: boolean;
}

const ASSET_KEYS = ["k401", "rothIRA", "taxable", "cashSavings"] as const;

function num(v: unknown): number {
  const n = typeof v === "number" ? v : typeof v === "string" ? Number(v) : 0;
  return Number.isFinite(n) ? n : 0;
}

export function summarise(expenses: BudgetBlob): FireSummary {
  const blob = (expenses ?? {}) as Record<string, unknown>;
  const profile = (blob._fire_profile ?? {}) as Record<string, unknown>;

  // Underscore keys are metadata (_fire_profile, _custom_cats, _custom_subcats),
  // not spending. Summing them would inflate the target quietly.
  const monthlySpend = Object.entries(blob)
    .filter(([k]) => !k.startsWith("_"))
    .reduce((sum, [, v]) => sum + num(v), 0);

  const assets = ASSET_KEYS.reduce((sum, k) => sum + num(profile[k]), 0);

  // Stored as a fraction (0.04), not a percentage. Reading it as 4 turns a
  // $1.7M target into $171M, which is how this was found.
  const rawSwr = num(profile.withdrawalRate);
  const swr = rawSwr > 0 && rawSwr < 1 ? rawSwr : 0.04;

  const target = monthlySpend > 0 ? (monthlySpend * 12) / swr : 0;

  return {
    monthlySpend,
    assets,
    target,
    multiple: Math.round(1 / swr),
    // Only a real fraction of a real target. "0.0%" is true and useless, and
    // most people here have nothing saved yet — see buildProgressBlock, which
    // shows the target alone in that case.
    pct: target > 0 && assets > 0 ? Math.min(100, (assets / target) * 100) : null,
    hasNumbers: monthlySpend > 0,
  };
}

const SYMBOLS: Record<string, string> = {
  USD: "$", EUR: "€", GBP: "£", JPY: "¥", CNY: "¥",
  AUD: "A$", CAD: "C$", CHF: "CHF ", HKD: "HK$", SGD: "S$", NZD: "NZ$",
  SEK: "kr", NOK: "kr", DKK: "kr", INR: "₹", KRW: "₩", TWD: "NT$",
};

/** "$1,050,000" — whole units only, because nobody needs cents on a FIRE target. */
export function formatAmount(value: number, currency = "USD"): string {
  const symbol = SYMBOLS[currency.toUpperCase()] ?? `${currency.toUpperCase()} `;
  return symbol + Math.round(value).toLocaleString("en-US");
}
