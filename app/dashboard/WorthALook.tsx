"use client";

import { useEffect, useState } from "react";
import { InfoTip } from "@/components/ui";
import { formatMoney } from "@/lib/money";
import { FLAG_ORDER, type FlagKind } from "@/lib/transaction-flags";

type Row = { id: string; date: string; description: string; amount: number; currency: string; occurred_at?: string | null; source_file?: string | null };
const mono: React.CSSProperties = { fontFamily: "var(--uf-font-mono)", fontVariantNumeric: "tabular-nums" };

const COPY: Record<FlagKind, { label: string; tip: string; yes: string; no: string }> = {
  bill: {
    label: "Upcoming bill?",
    tip: "Close in amount, category and date to a bill in Upcoming. Linking them means the bill counts once, and next time it is matched by name.",
    yes: "Yes, link it", no: "Not this bill",
  },
  card_payment: {
    label: "Card payment",
    tip: "Paying a credit card bill moves money; the purchases on the card were the spending. Counting both doubles it.",
    yes: "It's a card payment", no: "No, it's spending",
  },
  duplicate: {
    label: "Possible duplicate",
    tip: "Same amount as another row a day or two apart, one you typed in that your bank has now sent, or a card line for an Alipay or WeChat buy you also imported from the wallet. Deleting keeps the bank's or wallet's copy.",
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
export default function WorthALook({ flags, notes, rows, fmt, toUSD, displayCurrency, onYes, onNo, twins, onDeleteCopies }: {
  flags: Map<string, FlagKind>;
  /** A word under a row's name, e.g. "→ Rent" for the bill it may be. */
  notes?: Map<string, string>; rows: Row[]; fmt: (usd: number) => string; displayCurrency: string;
  toUSD: (amount: number, currency: string) => number;
  onYes: (row: Row, kind: FlagKind) => void; onNo: (row: Row, kind: FlagKind) => void;
  /** Card copies of wallet purchases: card row id → the wallet row it copies. */
  twins?: Map<string, Row>; onDeleteCopies?: (ids: string[]) => void;
}) {
  const [open, setOpen] = useState<FlagKind | null>(null);
  // Rows on their way out: they fade at once, so a tap answers before the
  // save does. A row the save could not delete comes back after a few seconds.
  const [leaving, setLeaving] = useState<Set<string>>(new Set());
  useEffect(() => {
    if (!leaving.size) return;
    const t = setTimeout(() => setLeaving(new Set()), 5000);
    return () => clearTimeout(t);
  }, [leaving]);
  const leave = (ids: string[]) => setLeaving((prev) => new Set([...prev, ...ids]));
  // Deleted pairs stay in place for a few seconds as a green "Deleted" line,
  // so the person sees the delete worked instead of a row just vanishing.
  const [gone, setGone] = useState<Map<string, { row: Row; twin: Row }>>(new Map());
  useEffect(() => {
    if (!gone.size) return;
    const t = setTimeout(() => setGone(new Map()), 6000);
    return () => clearTimeout(t);
  }, [gone]);
  const markGone = (ids: string[]) => setGone((prev) => {
    const next = new Map(prev);
    for (const id of ids) { const row = rows.find((r) => r.id === id), twin = pairs.get(id); if (row && twin) next.set(id, { row, twin }); }
    return next;
  });
  // Same shop, same amount, close dates: show the earlier payment too, so the
  // pair is visible like a card copy is (John, 31 Oct 2026).
  const pairs = new Map(twins ?? []);
  for (const r of rows) {
    if (flags.get(r.id) !== "duplicate" || pairs.has(r.id)) continue;
    const day = Date.parse(r.date.slice(0, 10));
    const twin = rows.find((o) => o.id !== r.id && o.description === r.description && o.amount === r.amount && o.currency === r.currency
      && Math.abs(Date.parse(o.date.slice(0, 10)) - day) <= 2 * 864e5 && (o.date < r.date || (o.date === r.date && o.id < r.id)));
    if (twin) pairs.set(r.id, twin);
  }
  const counts = FLAG_ORDER.map((k) => ({ k, n: [...flags.values()].filter((v) => v === k).length })).filter((c) => c.n > 0);
  if (!counts.length && !gone.size) return null;
  const doneRows = open === "duplicate" ? [...gone.values()].filter(({ row }) => !flags.has(row.id)).map(({ row }) => row) : [];
  const listed = open ? [...rows.filter((r) => flags.get(r.id) === open), ...doneRows].sort((a, b) => b.date.localeCompare(a.date) || a.id.localeCompare(b.id)) : [];
  const copies = open === "duplicate" && twins ? listed.filter((r) => twins.has(r.id) && flags.has(r.id)) : [];
  const btn = (primary: boolean): React.CSSProperties => ({
    border: primary ? "none" : "1px solid var(--uf-border-2)", borderRadius: 999, padding: "6px 12px", cursor: "pointer", font: "inherit", fontSize: 13, fontWeight: 700,
    background: primary ? "var(--uf-green)" : "var(--uf-card)", color: primary ? "var(--uf-card)" : "var(--uf-ink-2)", whiteSpace: "nowrap",
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
            <span style={{ flex: 1, display: "inline-flex", alignItems: "center", gap: 4 }}>
              {COPY[open].label}<InfoTip label={`About ${COPY[open].label.toLowerCase()}`}>{COPY[open].tip}</InfoTip>
            </span>
            {copies.length > 1 && onDeleteCopies && (
              <button type="button" style={{ ...btn(true), background: "var(--uf-ink)" }} disabled={leaving.size > 0}
                onClick={() => { const ids = copies.map((r) => r.id); leave(ids); markGone(ids); onDeleteCopies(ids); }}>
                {copies.every((r) => leaving.has(r.id)) ? `Deleting ${copies.length}…` : `Delete all ${copies.length} card copies`}
              </button>
            )}
          </div>
          {listed.map((r, i) => open === "duplicate" && !flags.has(r.id) && gone.has(r.id) ? (
            <div key={r.id} role="status" style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 16px", borderTop: i ? "1px solid var(--uf-border)" : "none", background: "var(--uf-mint)" }}>
              <span aria-hidden style={{ color: "var(--uf-pos-ink)", fontWeight: 800 }}>✓</span>
              <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                <b style={{ color: "var(--uf-pos-ink)" }}>Deleted</b>{" "}
                <span style={{ textDecoration: "line-through", color: "var(--uf-ink-3)" }}>{r.description} {formatMoney(r.amount, { currency: r.currency, decimals: 2 })}</span>
                <span className="uf-t-small" style={{ color: "var(--uf-ink-3)" }}> · kept {gone.get(r.id)!.twin.description}</span>
              </span>
            </div>
          ) : pairs.has(r.id) && open === "duplicate" ? (
            <div key={r.id} aria-busy={leaving.has(r.id)} style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", padding: "10px 16px", borderTop: i ? "1px solid var(--uf-border)" : "none",
              opacity: leaving.has(r.id) ? 0.35 : 1, transform: leaving.has(r.id) ? "translateX(12px)" : "none", transition: "opacity var(--uf-dur-2, 220ms), transform var(--uf-dur-2, 220ms)" }}>
              <div style={{ flex: 1, minWidth: 220, display: "grid", gap: 6 }}>
                <PairLine tag="Delete" row={r} />
                <PairLine tag="Keep" row={pairs.get(r.id)!} />
              </div>
              <span style={{ display: "flex", gap: 6 }}>
                <button type="button" style={{ ...btn(true), background: "var(--uf-ink)" }} disabled={leaving.has(r.id)}
                  onClick={() => { leave([r.id]); markGone([r.id]); onYes(r, "duplicate"); }}>{leaving.has(r.id) ? "Deleting…" : twins?.has(r.id) ? "Delete card copy" : "Delete this one"}</button>
                <button type="button" style={btn(false)} disabled={leaving.has(r.id)} onClick={() => { leave([r.id]); onNo(r, "duplicate"); }}>Keep both</button>
              </span>
            </div>
          ) : (
            <div key={r.id} style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", padding: "10px 16px", borderTop: i ? "1px solid var(--uf-border)" : "none" }}>
              <span className="uf-t-small" style={{ ...mono, color: "var(--uf-ink-3)", width: 48 }}>{r.date.slice(5, 10)}</span>
              <span style={{ flex: 1, minWidth: 120, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {r.description}{notes?.get(r.id) && <span className="uf-t-small" style={{ fontWeight: 400, color: "var(--uf-ink-3)" }}> → {notes.get(r.id)}</span>}
              </span>
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

// One side of a card-copy pair: what goes, and the wallet row that stays.
function PairLine({ tag, row }: { tag: "Delete" | "Keep"; row: Row }) {
  const del = tag === "Delete";
  const time = row.occurred_at && /T\d\d:\d\d/.test(row.occurred_at)
    ? new Date(row.occurred_at).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" }) : "";
  // The file it came from, without dates and extensions: "支付宝交易明细", "etherfi-card-statement".
  const from = (row.source_file ?? "").split(/[_(（.]/)[0];
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
      <span className="uf-t-small" style={{ fontWeight: 700, borderRadius: 6, padding: "1px 6px", minWidth: 52, textAlign: "center", flexShrink: 0,
        background: del ? "var(--uf-neg-bg)" : "var(--uf-mint)", color: del ? "var(--uf-neg-ink)" : "var(--uf-pos-ink)" }}>{tag}</span>
      <span style={{ flex: 1, minWidth: 0, display: "grid" }}>
        <span style={{ fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{row.description || "No name"}</span>
        <span className="uf-t-small" style={{ color: "var(--uf-ink-3)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {row.date.slice(5, 10)}{time && ` ${time}`}{from && ` · ${from}`}
        </span>
      </span>
      <span style={{ ...mono, fontWeight: 600, whiteSpace: "nowrap" }}>{formatMoney(row.amount, { currency: row.currency, decimals: 2 })}</span>
    </div>
  );
}
