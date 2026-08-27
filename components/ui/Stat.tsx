"use client";

import React from "react";

/**
 * Label, figure, delta. You render this shape on nearly every screen, so it's
 * a primitive rather than something to rebuild each time.
 *
 * The figure always uses DM Mono with tabular numerals so columns of numbers
 * align. `tone="freedom"` is the teal treatment and belongs only to the
 * freedom date and time-saved figures — not to generic good news.
 *
 * See docs/design/design-system.md.
 */

export type StatTone = "default" | "positive" | "negative" | "freedom";
export type StatSize = "md" | "lg" | "display";

const VALUE_COLORS: Record<StatTone, string> = {
  default: "var(--uf-ink)",
  positive: "var(--uf-pos)",
  negative: "var(--uf-neg)",
  freedom: "var(--uf-teal)",
};

const SIZES: Record<StatSize, { fontSize: number; weight: number }> = {
  md: { fontSize: 20, weight: 500 },
  lg: { fontSize: 26, weight: 500 },
  display: { fontSize: 52, weight: 500 },
};

export interface StatProps {
  label: string;
  value: React.ReactNode;
  delta?: React.ReactNode;
  deltaTone?: StatTone;
  tone?: StatTone;
  size?: StatSize;
  style?: React.CSSProperties;
}

export default function Stat({
  label,
  value,
  delta,
  deltaTone,
  tone = "default",
  size = "lg",
  style,
}: StatProps) {
  const { fontSize, weight } = SIZES[size];
  return (
    <div style={style}>
      <div
        style={{
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: "0.09em",
          textTransform: "uppercase",
          color: "var(--uf-ink-3)",
          marginBottom: 5,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontFamily: "var(--uf-font-mono)",
          fontVariantNumeric: "tabular-nums",
          fontSize,
          fontWeight: weight,
          letterSpacing: "-0.02em",
          lineHeight: 1.1,
          color: VALUE_COLORS[tone],
        }}
      >
        {value}
      </div>
      {delta != null && (
        <div style={{ fontSize: 12, marginTop: 5, color: VALUE_COLORS[deltaTone ?? tone] }}>
          {delta}
        </div>
      )}
    </div>
  );
}
