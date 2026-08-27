"use client";

import React from "react";

/**
 * A labelled input. Label, control, optional hint or error.
 *
 * Set `numeric` on anything holding a figure — it switches the control to
 * DM Mono with tabular numerals so decimals line up in a column. In a finance
 * product that's legibility, not decoration.
 *
 * See docs/design/design-system.md.
 */

export const inputStyle = (numeric = false): React.CSSProperties => ({
  fontFamily: numeric ? "var(--uf-font-mono)" : "var(--uf-font)",
  fontVariantNumeric: numeric ? "tabular-nums" : undefined,
  fontSize: 14,
  padding: "10px 12px",
  border: "1px solid var(--uf-border-2)",
  borderRadius: "var(--uf-r-control)",
  background: "var(--uf-card)",
  color: "var(--uf-ink)",
  width: "100%",
  boxSizing: "border-box",
});

export interface FieldProps {
  label?: string;
  hint?: string;
  error?: string;
  htmlFor?: string;
  children: React.ReactNode;
  style?: React.CSSProperties;
}

export function Field({ label, hint, error, htmlFor, children, style }: FieldProps) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, ...style }}>
      {label && (
        <label
          htmlFor={htmlFor}
          style={{
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: "0.09em",
            textTransform: "uppercase",
            color: "var(--uf-ink-2)",
          }}
        >
          {label}
        </label>
      )}
      {children}
      {error ? (
        <span style={{ fontSize: 12, color: "var(--uf-neg)" }}>{error}</span>
      ) : hint ? (
        <span style={{ fontSize: 12, color: "var(--uf-ink-3)" }}>{hint}</span>
      ) : null}
    </div>
  );
}

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  numeric?: boolean;
}

export function Input({ numeric = false, style, ...rest }: InputProps) {
  return <input style={{ ...inputStyle(numeric), ...style }} {...rest} />;
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  children: React.ReactNode;
}

export function Select({ style, children, ...rest }: SelectProps) {
  return (
    <select style={{ ...inputStyle(false), cursor: "pointer", ...style }} {...rest}>
      {children}
    </select>
  );
}

export default Field;
