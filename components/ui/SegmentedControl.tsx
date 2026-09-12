"use client";

import React from "react";

/**
 * The time-scale switch that belongs on every chart.
 *
 * A chart without one answers exactly one question. With one it answers four,
 * for the cost of a row of 32px controls — which is why "1M · 6M · 1Y · All"
 * is standard on every serious finance chart and conspicuous by its absence.
 *
 * It is a radio group, not a row of buttons: arrow keys move between options
 * and only one is ever selected. Options are short — if they need more than a
 * few characters each, this is a Select.
 */

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
}

export interface SegmentedControlProps<T extends string> {
  options: readonly SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  label?: string;
  size?: "sm" | "md";
}

export default function SegmentedControl<T extends string>({
  options, value, onChange, label = "Time range", size = "md",
}: SegmentedControlProps<T>) {
  const pad = size === "sm" ? "5px 11px" : "7px 14px";
  const font = size === "sm" ? 12 : 13;
  return (
    <div
      role="radiogroup"
      aria-label={label}
      style={{
        display: "inline-flex", gap: 2, padding: 3,
        background: "var(--uf-surface-2)", borderRadius: "var(--uf-r-pill)",
      }}
    >
      {options.map((o) => {
        const on = o.value === value;
        return (
          <button
            key={o.value}
            role="radio"
            aria-checked={on}
            onClick={() => onChange(o.value)}
            style={{
              font: "inherit", fontFamily: "var(--uf-font)", fontSize: font, fontWeight: 700,
              padding: pad, borderRadius: "var(--uf-r-pill)", border: "1px solid transparent",
              cursor: "pointer", whiteSpace: "nowrap",
              background: on ? "var(--uf-card)" : "transparent",
              color: on ? "var(--uf-ink)" : "var(--uf-ink-3)",
              boxShadow: on ? "var(--uf-e1)" : "none",
              transition: "background var(--uf-dur-1) var(--uf-ease), color var(--uf-dur-1) var(--uf-ease)",
            }}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
