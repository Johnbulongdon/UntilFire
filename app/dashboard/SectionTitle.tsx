"use client";

import { Icon, type IconName } from "@/components/ui";

/**
 * A Profile card's heading: a small icon chip and the title, so each section
 * is recognisable at a glance rather than a column of bold words.
 */
export default function SectionTitle({
  icon,
  children,
  danger = false,
  style,
}: {
  icon: IconName;
  children: React.ReactNode;
  danger?: boolean;
  style?: React.CSSProperties;
}) {
  return (
    <h3 style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 15, fontWeight: 700, color: danger ? "var(--uf-neg)" : "var(--uf-ink)", margin: "0 0 16px", ...style }}>
      <span
        aria-hidden="true"
        style={{
          display: "inline-flex", alignItems: "center", justifyContent: "center", width: 30, height: 30, borderRadius: 8, flexShrink: 0,
          background: danger ? "var(--uf-neg-bg)" : "var(--uf-green-50)", color: danger ? "var(--uf-neg)" : "var(--uf-green)",
        }}
      >
        <Icon name={icon} size={17} />
      </span>
      {children}
    </h3>
  );
}
