"use client";

import React from "react";

/**
 * The status pill. One component, five tones — this is the one that shipped
 * as `2px 9px` in RecurringTab and `2px 10px` in ExpectedPaymentsTab because
 * both were typed by hand.
 *
 * `freedom` is the teal tone and is reserved for progress toward the freedom
 * date ("2.4 years earlier"). Don't use it for generic success — that's `positive`.
 *
 * See docs/design/design-system.md.
 */

export type BadgeTone = "positive" | "negative" | "warning" | "freedom" | "muted";

const TONES: Record<BadgeTone, React.CSSProperties> = {
  positive: { background: "var(--uf-green-50)",  color: "var(--uf-pos-ink)" },
  negative: { background: "var(--uf-neg-bg)",    color: "var(--uf-neg-ink)" },
  warning:  { background: "var(--uf-warn-bg)",   color: "var(--uf-warn-ink)" },
  freedom:  { background: "var(--uf-teal-soft)", color: "var(--uf-teal-deep)" },
  muted:    { background: "var(--uf-surface-2)", color: "var(--uf-ink-3)" },
};

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone;
}

export default function Badge({ tone = "muted", style, ...rest }: BadgeProps) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        borderRadius: "var(--uf-r-pill)",
        padding: "4px 11px",
        fontSize: 11,
        fontWeight: 700,
        whiteSpace: "nowrap",
        fontFamily: "var(--uf-font)",
        ...TONES[tone],
        ...style,
      }}
      {...rest}
    />
  );
}
