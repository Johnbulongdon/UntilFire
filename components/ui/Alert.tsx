"use client";

import React from "react";
import Icon from "./Icon";

/**
 * A thing that happened and needs a decision.
 *
 * An alert is not a badge. A badge labels a state you are already looking at;
 * an alert interrupts to say something occurred, and it is useless without the
 * three facts that let you judge it: how much, when, and where. A row reading
 * "Unusual activity detected" is decoration — it tells the reader nothing they
 * can act on.
 *
 * The icon is not ornament either: it is the part that survives being read at
 * a glance, and it is what carries severity to a reader who cannot separate
 * the tones by colour.
 */

export type AlertTone = "critical" | "warning" | "info" | "positive";

const TONES: Record<AlertTone, { fg: string; bg: string; ring: string }> = {
  critical: { fg: "var(--uf-neg-ink)",  bg: "var(--uf-neg-bg)",    ring: "var(--uf-neg)" },
  warning:  { fg: "var(--uf-warn-ink)", bg: "var(--uf-warn-bg)",   ring: "var(--uf-warn)" },
  info:     { fg: "var(--uf-ink-2)",    bg: "var(--uf-surface-2)", ring: "var(--uf-border-2)" },
  positive: { fg: "var(--uf-pos-ink)",  bg: "var(--uf-green-50)",  ring: "var(--uf-pos)" },
};

export interface AlertProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  tone?: AlertTone;
  title: string;
  /** How much. Pass a <Money> for anything denominated. */
  amount?: React.ReactNode;
  /** When. */
  when?: string;
  /** Where — merchant, account, city. */
  where?: string;
  action?: React.ReactNode;
}

export default function Alert({
  tone = "warning", title, amount, when, where, action, style, ...rest
}: AlertProps) {
  const t = TONES[tone];
  const facts = [when, where].filter(Boolean);
  return (
    <div
      role={tone === "critical" ? "alert" : "status"}
      style={{
        display: "flex", alignItems: "flex-start", gap: "var(--uf-s3)",
        background: t.bg, border: `1px solid ${t.ring}33`,
        borderRadius: "var(--uf-r-control)", padding: "13px 15px", ...style,
      }}
      {...rest}
    >
      <span style={{ color: t.fg, display: "flex", flexShrink: 0, marginTop: 1 }}><Icon name={tone} size={16} /></span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: "var(--uf-ink)", lineHeight: 1.35 }}>{title}</div>
        {facts.length > 0 && (
          <div style={{ fontSize: 12.5, color: "var(--uf-ink-2)", marginTop: 3 }}>{facts.join(" · ")}</div>
        )}
      </div>
      {amount != null && <div style={{ flexShrink: 0, marginLeft: "var(--uf-s2)" }}>{amount}</div>}
      {action && <div style={{ flexShrink: 0, marginLeft: "var(--uf-s2)" }}>{action}</div>}
    </div>
  );
}
