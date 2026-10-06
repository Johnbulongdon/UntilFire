"use client";

import { useState } from "react";
import { InfoTip } from "@/components/ui";
import { formatMoney } from "@/lib/money";
import { FLAG_ORDER, type FlagKind } from "@/lib/transaction-flags";

type Row = { id: string; date: string; description: string; amount: number; currency: string };
const mono: React.CSSProperties = { fontFamily: "var(--uf-font-mono)", fontVariantNumeric: "tabular-nums" };

const COPY: Record<FlagKind, { label: string; tip: string; yes: string; no: string }> = {
  card_payment: {
    label: "Card payment",
    tip: "Paying a credit card bill moves money; the purchases on the card were the spending. Counting both doubles it.",
    yes: "It's a card payment", no: "No, it's spending",
  },
  duplicate: {
    label: "Possible duplicate",
    tip: "Same merchant and amount within two days of another row. Overlapping imports and re-posted charges do this.",
    yes: "Delete this one", no: "Keep both",
  },
  large: {
    label: "Unusually large",
    tip: "Well above what this merchant usually costs, or among your largest expenses.",
    yes: "", no: "Looks right",
  },
};

/**
 * Rows that may be making the numbers wrong (D-31), as chips that only
 * appear when something is there. Opening one lists those rows with a
 * one-tap answer; nothing is changed without the person choosing.
 */
export default function WorthALook({ flags, rows, fmt, toUSD, displayCurrency, onYes, onNo }: {
  flags: Map<string, FlagKind>; rows: Row[]; fmt: (usd: number) => string; displayCurrency: string;
  toUSD: (amount: number, currency: string) => number;
  onYes: (row: Row, kind: FlagKind) => void; onNo: (row: Row, kind: FlagKind) => void;
}) {
  const [open, setOpen] = useState<FlagKind | null>(null);
  const counts = FLAG_ORDER.map((k) => ({ k, n: [...flags.values()].filter((v) => v === k).length })).filter((c) => c.n > 0);
  if (!counts.length) return null;
  const listed = open ? rows.filter((r) => flags.get(r.id) === open) : [];
  const btn = (primary: boolean): React.CSSProperties => ({
    border: primary ? "none" : "1px solid var(--uf-border-2)", borderRadius: 999, padding: "6px 12px", cursor: "pointer", font: "inherit", fontSize: 13, fontWeight: 700,
    background: primary ? "var(--uf-green)" : "var(--uf-card)", color: primary ? "#fff" : "var(--uf-ink-2)", whiteSpace: "nowrap",
  });

  return (
    <div style={{ display: "grid", gap: 8 }}>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        {counts.map(({ k, n }) => (
          <button key={k} type="button" aria-expanded={open === k} onClick={() => setOpen(open === k ? null : k)} className="uf-t-small" style={{
            display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 999, cursor: "pointer", fontFamily: "inherit", fontWeight: 600,
            border: `1px solid ${open === k ? "var(--uf-warn)" : "var(--uf-border)"}`, background: open === k ? "var(--uf-warn-bg)" : "var(--uf-card)", color: "var(--uf-warn-ink)" }}>
            <span aria-hidden>⚑</span>{COPY[k].label}<b style={mono}>{n}</b>
          </button>
        ))}
      </div>
      {open && (
        <div style={{ border: "1px solid var(--uf-border)", borderRadius: 12, background: "var(--uf-card)", overflow: "hidden" }}>
          <div className="uf-t-small" style={{ display: "flex", alignItems: "center", gap: 4, padding: "10px 16px", color: "var(--uf-ink-3)", borderBottom: "1px solid var(--uf-border)" }}>
            {COPY[open].label}<InfoTip label={`About ${COPY[open].label.toLowerCase()}`}>{COPY[open].tip}</InfoTip>
          </div>
          {listed.map((r, i) => (
            <div key={r.id} style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", padding: "10px 16px", borderTop: i ? "1px solid var(--uf-border)" : "none" }}>
              <span className="uf-t-small" style={{ ...mono, color: "var(--uf-ink-3)", width: 48 }}>{r.date.slice(5, 10)}</span>
              <span style={{ flex: 1, minWidth: 120, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.description}</span>
              {/* The amount as it was charged, so the row is recognisable; converted alongside when it differs. */}
              <span style={{ ...mono, fontWeight: 600, textAlign: "right" }}>
                {formatMoney(r.amount, { currency: r.currency, decimals: 2 })}
                {r.currency !== displayCurrency && <span style={{ fontWeight: 400, color: "var(--uf-ink-3)" }}> · {fmt(toUSD(r.amount, r.currency))}</span>}
              </span>
              <span style={{ display: "flex", gap: 6 }}>
                {COPY[open].yes && <button type="button" style={btn(true)} onClick={() => onYes(r, open)}>{COPY[open].yes}</button>}
                <button type="button" style={btn(false)} onClick={() => onNo(r, open)}>{COPY[open].no}</button>
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
