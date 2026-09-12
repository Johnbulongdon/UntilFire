"use client";

import React from "react";
import { formatMoney, type MoneyStyle } from "@/lib/money";
import type { SupportedCurrency } from "@/lib/currency";

/**
 * A figure of money.
 *
 * Always DM Mono with tabular numerals, so a column of balances lines up on
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
  currency = "USD",
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
  const text = formatMoney(amount, { currency, style: format, signed, decimals });
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
