"use client";

import React from "react";

/**
 * A labelled range control, with the value shown as you drag.
 *
 * Exists because a calculator is a thing people play with. Typing into a
 * number field means selecting, deleting and retyping to ask "what if I
 * retired at 60 instead" — so most people ask it once, or not at all. A slider
 * makes the second and third question free, which is the whole reason the page
 * is interactive rather than a table.
 *
 * Green, not teal: this is a control the reader acts on. Teal is reserved for
 * progress toward a freedom date, and a slider is not progress.
 *
 * The number input stays alongside. A slider is good at "roughly what if" and
 * bad at "exactly 62", and a calculator has to answer both.
 *
 * See docs/design/design-system.md.
 */

export interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
  /** How the live value reads — "$50,000", "7.0%", "age 65". */
  format?: (value: number) => string;
  hint?: string;
  /** Hide the paired number input where space is tight. */
  exact?: boolean;
}

export default function Slider({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
  format,
  hint,
  exact = true,
}: SliderProps) {
  const id = React.useId();
  const shown = format ? format(value) : String(value);

  // Clamped on commit rather than on keystroke: clamping while someone types
  // rewrites "6" into the minimum before they can reach "65".
  const commit = (raw: string) => {
    const n = Number(raw);
    if (!Number.isFinite(n)) return;
    onChange(Math.min(max, Math.max(min, n)));
  };

  return (
    <div style={{ display: "grid", gap: "var(--uf-s2)" }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: "var(--uf-s3)" }}>
        <label htmlFor={id} className="uf-t-label" style={{ color: "var(--uf-ink-2)" }}>
          {label}
        </label>
        <span
          className="uf-t-data"
          style={{ fontSize: 14, fontWeight: 700, color: "var(--uf-ink)", whiteSpace: "nowrap" }}
        >
          {shown}
        </span>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "var(--uf-s3)" }}>
        <input
          id={id}
          type="range"
          className="uf-slider"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          style={{ flex: 1, minWidth: 0 }}
        />
        {exact && (
          <input
            type="number"
            aria-label={`${label}, exact value`}
            value={value}
            min={min}
            max={max}
            step={step}
            onChange={(e) => commit(e.target.value)}
            className="uf-t-data"
            style={{
              width: 78,
              flex: "none",
              fontSize: 13,
              padding: "6px 8px",
              border: "1px solid var(--uf-border-2)",
              borderRadius: "var(--uf-r-control)",
              background: "var(--uf-card)",
              color: "var(--uf-ink)",
              boxSizing: "border-box",
            }}
          />
        )}
      </div>

      {hint && (
        <p className="uf-t-small" style={{ color: "var(--uf-ink-3)", margin: 0 }}>
          {hint}
        </p>
      )}
    </div>
  );
}
