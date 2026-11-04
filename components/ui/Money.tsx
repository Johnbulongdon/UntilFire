"use client";

import React from "react";
import { formatMoney, type MoneyStyle } from "@/lib/money";
import { convertUSDAmount, type SupportedCurrency } from "@/lib/currency";

/**
 * Screens that keep their figures in US dollars (Contributions) can show them
 * in the person's own currency: inside this provider, a Money without its own
 * `currency` is converted from USD and formatted in the display currency.
 * A euro plan read "$0" on Contributions before (walkthrough 3 Nov 2026).
 */
const MoneyDisplayContext = React.createContext<{ currency: string; rates: Record<string, number> } | null>(null);
export function MoneyDisplay({ currency, rates, children }: { currency: string; rates: Record<string, number>; children: React.ReactNode }) {
  const value = React.useMemo(() => ({ currency, rates }), [currency, rates]);
  return <MoneyDisplayContext.Provider value={value}>{children}</MoneyDisplayContext.Provider>;
}

/**
 * A figure of money.
 *
 * Always Inter with tabular numerals, so a column of balances lines up on
 * the decimal instead of drifting. That is legibility in a finance product,
 * not decoration — a misread balance is the whole trust problem.
 *
 * `masked` blanks the digits while keeping the exact width, for the person
 * checking their net worth on a train. It does not remove the value from the
 * DOM, so treat it as visual privacy, not security.
 */

export type MoneyTone = "default" | "positive" | "negative" | "freedom" | "muted";

const TONES: Record<MoneyTone, string> = {
  default: "var(--uf-ink)",
  positive: "var(--uf-pos)",
  negative: "var(--uf-neg)",
  freedom: "var(--uf-teal)",
  muted: "var(--uf-ink-3)",
};

export interface MoneyProps extends Omit<React.HTMLAttributes<HTMLSpanElement>, "children"> {
  amount: number;
  currency?: SupportedCurrency | string;
  format?: MoneyStyle;
  signed?: boolean;
  decimals?: number;
  tone?: MoneyTone;
  /** Colour by sign instead of by tone — negative reads negative, positive reads positive. */
  bySign?: boolean;
  size?: number;
  masked?: boolean;
}

export default function Money({
  amount,
  currency,
  format = "exact",
  signed = false,
  decimals = 0,
  tone = "default",
  bySign = false,
  size,
  masked = false,
  style,
  ...rest
}: MoneyProps) {
  const display = React.useContext(MoneyDisplayContext);
  const shown = !currency && display ? convertUSDAmount(amount, display.currency, display.rates) : amount;
  const text = formatMoney(shown, { currency: currency ?? display?.currency ?? "USD", style: format, signed, decimals });
  const resolved: MoneyTone = bySign ? (amount < 0 ? "negative" : amount > 0 ? "positive" : "muted") : tone;
  return (
    <span
      style={{
        fontFamily: "var(--uf-font-mono)",
        fontVariantNumeric: "tabular-nums",
        fontWeight: 500,
        letterSpacing: "-0.01em",
        color: TONES[resolved],
        fontSize: size,
        ...style,
      }}
      {...rest}
    >
      {masked ? "•".repeat(Math.max(3, text.length - 1)) : text}
    </span>
  );
}
