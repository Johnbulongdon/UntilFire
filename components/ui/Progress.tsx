"use client";

import React from "react";

/**
 * Progress toward the freedom date.
 *
 * This is the one place teal belongs: the design system reserves
 * --uf-teal for progress toward work optionality and nothing else.
 * Green acts, teal means freedom — so this component is teal and the
 * button beside it is green, deliberately.
 *
 * The bar is a fill inside a track. A flex item carrying both flex-grow
 * and a percentage width ignores the width, which is how a 12% bar ships
 * rendering full-width; nesting the fill avoids the whole class of bug.
 */

export interface ProgressProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "children"> {
  /** 0–1. Values outside the range are clamped rather than overflowing the track. */
  value: number;
  label?: string;
  /** Right-hand caption, e.g. "$620k of $1.5M". */
  caption?: string;
  height?: number;
  /** Muted treatment for a projection the user has not committed to. */
  provisional?: boolean;
}

export default function Progress({
  value,
  label,
  caption,
  height = 10,
  provisional = false,
  style,
  ...rest
}: ProgressProps) {
  const pct = Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
  return (
    <div style={style} {...rest}>
      {(label || caption) && (
        <div style={{ display: "flex", alignItems: "baseline", gap: "var(--uf-s3)", marginBottom: 7 }}>
          {label && (
            <span style={{
              fontSize: 11, fontWeight: 700, letterSpacing: "0.09em",
              textTransform: "uppercase", color: "var(--uf-ink-3)",
            }}>{label}</span>
          )}
          {caption && (
            <span style={{
              marginLeft: "auto", fontFamily: "var(--uf-font-mono)",
              fontVariantNumeric: "tabular-nums", fontSize: 12, color: "var(--uf-ink-2)",
            }}>{caption}</span>
          )}
        </div>
      )}
      <div
        role="progressbar"
        aria-valuenow={Math.round(pct * 100)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label ?? "Progress toward freedom"}
        style={{
          height, background: "var(--uf-surface-2)", borderRadius: 999, overflow: "hidden",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${pct * 100}%`,
            borderRadius: 999,
            background: provisional
              ? "var(--uf-teal-line)"
              : "linear-gradient(90deg, var(--uf-teal-line), var(--uf-teal))",
            transition: "width var(--uf-dur-4) var(--uf-ease)",
          }}
        />
      </div>
    </div>
  );
}
