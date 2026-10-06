"use client";

import { InfoTip } from "@/components/ui";
import { type BankStatus, fmtSynced } from "./PlaidConnect";

const mono: React.CSSProperties = { fontFamily: "var(--uf-font-mono)", fontVariantNumeric: "tabular-nums" };

/**
 * One bar for the cleanup work (D-31): what is filed, and what still needs
 * the person. The green part is the button. Bank sync is a line under it,
 * which opens the full bank list when tapped.
 */
export default function ReviewPill({ filed, need, busy, onReview, bank, banksOpen, onToggleBanks, needsUSD = 0, wantsUSD = 0, fmt }: {
  filed: number; need: number; busy: boolean; onReview: () => void;
  bank: BankStatus | null; banksOpen: boolean; onToggleBanks: () => void;
  /** Needs and wants over the range; shown in place of the review bar once everything is filed. */
  needsUSD?: number; wantsUSD?: number; fmt: (usd: number) => string;
}) {
  const total = filed + need;
  // Everything filed: the bar turns into what the filing was for, the split
  // between needs and wants, which no other card on the page shows.
  const split = need === 0 && needsUSD + wantsUSD > 0;
  if (total === 0 && !bank?.banks) return null;
  return (
    <div style={{ display: "grid", gap: 4 }}>
      {split && (
        <div role="img" aria-label={`Needs ${fmt(needsUSD)}, wants ${fmt(wantsUSD)}`} style={{ display: "flex", height: 44, borderRadius: 999, overflow: "hidden", gap: 3 }}>
          {[{ k: "Needs", v: needsUSD, bg: "var(--uf-ink)", fg: "var(--uf-card)" }, { k: "Wants", v: wantsUSD, bg: "var(--uf-surface-2)", fg: "var(--uf-ink)" }].filter((p) => p.v > 0).map((p) => (
            <div key={p.k} style={{ flex: `${p.v} 1 0`, minWidth: 120, background: p.bg, color: p.fg, display: "flex", alignItems: "center", gap: 8, padding: "0 16px", whiteSpace: "nowrap" }}>
              <span className="uf-t-small" style={{ fontWeight: 600 }}>{p.k}</span>
              <b style={{ ...mono, fontSize: 15 }}>{fmt(p.v)}</b>
              <span className="uf-t-small" style={{ ...mono, opacity: 0.7 }}>{Math.round((p.v / (needsUSD + wantsUSD)) * 100)}%</span>
            </div>
          ))}
        </div>
      )}
      {total > 0 && !split && (
        <div style={{ display: "flex", height: 44, borderRadius: 999, overflow: "hidden", gap: need && filed ? 3 : 0 }}>
          {filed > 0 && (
            <div style={{ flex: filed, minWidth: 0, background: "var(--uf-surface-2)", color: "var(--uf-ink-2)", display: "flex", alignItems: "center", gap: 6, padding: "0 16px" }}>
              <b style={{ ...mono, fontSize: 16, color: "var(--uf-ink)" }}>{filed}</b>
              <span className="uf-t-small" style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>filed</span>
              <span aria-hidden>✓</span>
              <InfoTip label="About filed">Has a category and a need or want tag. What you approve is remembered for that merchant next time.</InfoTip>
            </div>
          )}
          {need > 0 && (
            <button type="button" onClick={onReview} disabled={busy} aria-label={`Review ${need} transactions`} style={{
              flex: filed ? `0 0 max(${(need / total) * 100}%, 140px)` : 1, border: "none", cursor: busy ? "wait" : "pointer", background: "var(--uf-green)", color: "#fff",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8, font: "inherit", fontWeight: 700, opacity: busy ? 0.7 : 1 }}>
              <b style={{ ...mono, fontSize: 16 }}>{need}</b>{busy ? "checking…" : <>to review <span aria-hidden>→</span></>}
            </button>
          )}
        </div>
      )}
      {!!bank?.banks && (
        <button type="button" onClick={onToggleBanks} aria-expanded={banksOpen} className="uf-t-small"
          style={{ justifySelf: "start", border: "none", background: "none", padding: "4px 16px", cursor: "pointer", color: "var(--uf-ink-3)", font: "inherit", fontSize: 13 }}>
          {bank.banks} {bank.banks === 1 ? "bank" : "banks"} · synced {fmtSynced(bank.lastSynced)} <span aria-hidden>{banksOpen ? "▴" : "▾"}</span>
        </button>
      )}
    </div>
  );
}
