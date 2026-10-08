"use client";

import { InfoTip } from "@/components/ui";
import { type BankStatus, fmtSynced } from "./PlaidConnect";

const mono: React.CSSProperties = { fontFamily: "var(--uf-font-mono)", fontVariantNumeric: "tabular-nums" };

/**
 * One bar for the cleanup work (D-31): what is filed, and what still needs
 * the person. The green part is the button. Bank sync is a line under it,
 * which opens the full bank list when tapped.
 */
export default function ReviewPill({ filed, need, busy, onReview, bank, banksOpen, onToggleBanks, free = null, spentThisMonth = 0, fmt }: {
  filed: number; need: number; busy: boolean; onReview: () => void;
  bank: BankStatus | null; banksOpen: boolean; onToggleBanks: () => void;
  /** Free to spend until payday (D-29), shown in place of the review bar once everything is filed. */
  free?: { amount: number; untilIso: string } | null; spentThisMonth?: number; fmt: (usd: number) => string;
}) {
  const total = filed + need;
  // Everything filed: the bar answers "how much can I still spend", the same
  // Free to spend figure as Home, with this month's expenses beside it.
  const split = need === 0 && free != null;
  const until = free ? new Date(`${free.untilIso}T00:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "";
  if (total === 0 && !bank?.banks) return null;
  return (
    <div style={{ display: "grid", gap: 4 }}>
      {split && free && (
        <div style={{ display: "flex", height: 44, borderRadius: 999, overflow: "hidden", gap: 3 }}>
          {spentThisMonth > 0 && (
            <div style={{ flex: "1 1 0", minWidth: 0, overflow: "hidden", background: "var(--uf-surface-2)", color: "var(--uf-ink-2)", display: "flex", alignItems: "center", gap: 8, padding: "0 16px", whiteSpace: "nowrap" }}>
              <span className="uf-t-small uf-free-until">Expenses</span><b style={{ ...mono, fontSize: 15, color: "var(--uf-ink)" }}>{fmt(spentThisMonth)}</b>
            </div>
          )}
          <div style={{ flex: "0 0 auto", background: free.amount < 0 ? "var(--uf-warn-bg)" : "var(--uf-ink)", color: free.amount < 0 ? "var(--uf-warn-ink)" : "var(--uf-card)",
            display: "flex", alignItems: "center", gap: 8, padding: "0 16px", whiteSpace: "nowrap" }}>
            <span className="uf-t-small">{free.amount < 0 ? "Over by" : "Free to spend"}</span>
            <b style={{ ...mono, fontSize: 15 }}>{fmt(Math.abs(free.amount))}</b>
            <span className="uf-t-small uf-free-until" style={{ opacity: 0.75 }}>until {until}</span>
            <style>{`@media (max-width: 480px){.uf-free-until{display:none}}`}</style>
            <InfoTip label="About free to spend">The same number as on Home: the lower of your cash after bills and your budget left, until payday.</InfoTip>
          </div>
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
