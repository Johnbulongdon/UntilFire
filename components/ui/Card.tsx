"use client";

import React from "react";

/**
 * The surface. Three elevations, and that's all there is:
 *   flat   — lists, nested content, anything already inside a card
 *   raised — the default card
 *   float  — popovers, drawers, modals
 *
 * See docs/design/design-system.md.
 */

export type CardElevation = "flat" | "raised" | "float";

const SHADOWS: Record<CardElevation, string> = {
  flat: "none",
  raised: "var(--uf-e1)",
  float: "var(--uf-e2)",
};

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  elevation?: CardElevation;
  padded?: boolean;
}

export default function Card({
  elevation = "raised",
  padded = true,
  style,
  ...rest
}: CardProps) {
  return (
    <div
      style={{
        background: "var(--uf-card)",
        border: "1px solid var(--uf-border)",
        borderRadius: "var(--uf-r-card)",
        boxShadow: SHADOWS[elevation],
        padding: padded ? "var(--uf-s5)" : undefined,
        ...style,
      }}
      {...rest}
    />
  );
}
