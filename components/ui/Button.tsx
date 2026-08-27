"use client";

import React from "react";

/**
 * The button. Four variants, three sizes — that's the whole vocabulary.
 *
 * Green ACTS: `primary` is the only green-filled button on a screen. If two
 * things on the same screen are both primary, one of them isn't.
 * Teal is never a button — it means progress toward the freedom date.
 *
 * See docs/design/design-system.md.
 */

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

const SIZES: Record<ButtonSize, React.CSSProperties> = {
  sm: { fontSize: 13, padding: "8px 16px" },
  md: { fontSize: 14, padding: "11px 22px" },
  lg: { fontSize: 15, padding: "14px 28px" },
};

const VARIANTS: Record<ButtonVariant, React.CSSProperties> = {
  primary:   { background: "var(--uf-green)", color: "#fff", borderColor: "transparent" },
  secondary: { background: "var(--uf-card)", color: "var(--uf-ink)", borderColor: "var(--uf-border-2)" },
  ghost:     { background: "transparent", color: "var(--uf-ink-2)", borderColor: "transparent" },
  danger:    { background: "transparent", color: "var(--uf-neg)", borderColor: "var(--uf-neg)" },
};

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
}

export default function Button({
  variant = "secondary",
  size = "md",
  fullWidth = false,
  style,
  disabled,
  ...rest
}: ButtonProps) {
  return (
    <button
      disabled={disabled}
      style={{
        fontFamily: "var(--uf-font)",
        fontWeight: 700,
        borderRadius: "var(--uf-r-pill)",
        border: "1px solid transparent",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "var(--uf-s2)",
        whiteSpace: "nowrap",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.45 : 1,
        transition: "filter 120ms ease, background 120ms ease",
        width: fullWidth ? "100%" : undefined,
        ...SIZES[size],
        ...VARIANTS[variant],
        ...style,
      }}
      {...rest}
    />
  );
}
