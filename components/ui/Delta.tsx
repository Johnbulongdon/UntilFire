"use client";

import React from "react";
import { formatMoney } from "@/lib/money";
import type { SupportedCurrency } from "@/lib/currency";

/**
 * A change, and whether that change is good news.
 *
 * The direction of a number does not tell you its meaning: spending down is
 * good, income down is bad, and both are a negative delta. So the caller
 * states which direction is good and this decides the colour — rather than
 * every screen re-deciding, which is how a budget overspend ends up green.
 *
 * `goodWhen="down"` is the right setting for spending, cost of living, debt,
 * and years-to-freedom. `goodWhen="up"` is for income, savings rate and
 * portfolio value. `goodWhen="neutral"` colours nothing.
 */

export type GoodWhen = "up" | "down" | "neutral";

export interface DeltaProps extends Omit<React.HTMLAttributes<HTMLSpanElement>, "children"> {
  value: number;
  goodWhen?: GoodWhen;
  /** Render as money rather than a bare number. */
  currency?: SupportedCurrency | string;
  /** Text after the figure, e.g. "vs plan" or "this month". */
  context?: string;
  /** Override the formatted figure entirely — for "2.4 years earlier" and friends. */
  label?: string;
  size?: number;
}

export default function Delta({
  value,
  goodWhen = "up",
  currency,
  context,
  label,
  size = 12,
  style,
  ...rest
}: DeltaProps) {
  const rising = value > 0;
  const flat = value === 0;
  const good = goodWhen === "neutral" ? null : goodWhen === "up" ? rising : !rising;
  const color = flat || good === null
    ? "var(--uf-ink-3)"
    : good ? "var(--uf-pos)" : "var(--uf-neg)";

  const figure = label
    ?? (currency
      ? formatMoney(value, { currency, signed: true })
      : `${rising ? "+" : value < 0 ? "−" : ""}${Math.abs(value).toLocaleString("en-US")}`);

  return (
    <span
      style={{ display: "inline-flex", alignItems: "baseline", gap: 5, fontSize: size, color, ...style }}
      {...rest}
    >
      <span aria-hidden style={{ fontSize: size - 2 }}>{flat ? "→" : rising ? "↑" : "↓"}</span>
      <span style={{ fontFamily: "var(--uf-font-mono)", fontVariantNumeric: "tabular-nums", fontWeight: 500 }}>
        {figure}
      </span>
      {context && <span style={{ color: "var(--uf-ink-3)", fontFamily: "var(--uf-font)" }}>{context}</span>}
    </span>
  );
}
