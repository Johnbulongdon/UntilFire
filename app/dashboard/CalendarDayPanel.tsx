"use client";

import { Button } from "@/components/ui";
import { moneyMono } from "./MoneyCards";

export type DayLine = { id?: string; label: string; amount: number; income: boolean; category?: string | null; repeats?: boolean; status?: string };

/**
 * One day of the Calendar (D-64), beside the month on a computer and as a
 * sheet on a phone. A past day lists what was recorded, read-only: recording
 * belongs to Transactions, so nothing is entered twice. A future day lists
 * what is expected, the cash left at its end, and adds an upcoming payment
 * in place, with the month still in view.
 */
export default function CalendarDayPanel({ iso, todayIso, lines, cash, invest, addForm, onAdd, onEdit, onClose, onOpenTransactions, emojiFor, fmt, sheet, scheduled = false }: {
  iso: string;
  todayIso: string;
  lines: DayLine[];
  /** Cash at the day's end, when the forecast reaches it. */
  cash: number | null;
  /** The invest day's line, when this is it. */
  invest: string | null;
  /** The add form, while it is open. */
  addForm: React.ReactNode;
  onAdd: () => void;
  /** Open a saved bill or payday's Edit form, from its line. */
  onEdit?: (id: string) => void;
  onClose: () => void;
  onOpenTransactions?: () => void;
  emojiFor: (category: string | null | undefined, income: boolean) => string;
  fmt: (usd: number) => string;
  /** A phone's bottom sheet rather than a side panel. */
  sheet?: boolean;
  scheduled?: boolean;
}) {
  const past = iso < todayIso;
  const title = new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
  return (
    <section aria-label={title} style={{
      background: "var(--uf-card)", display: "grid", gridTemplateColumns: "minmax(0, 1fr)", gap: 10, alignContent: "start", minWidth: 0,
      ...(sheet
        ? { position: "fixed", left: 0, right: 0, bottom: 0, zIndex: 1000, maxHeight: "78vh", overflowY: "auto", borderRadius: "22px 22px 0 0", padding: "10px 16px 24px", boxShadow: "0 -14px 34px -12px rgba(0,0,0,.35)" }
        : { position: "sticky", top: 16, border: "1px solid var(--uf-border)", borderRadius: 20, padding: 18, boxShadow: "0 18px 40px -24px rgba(60,40,10,.35)" }),
    }}>
      {sheet && <i aria-hidden style={{ width: 40, height: 4, borderRadius: 9, background: "var(--uf-surface-2)", margin: "0 auto 4px" }} />}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
        <div>
          <span className="uf-t-small" style={{ color: "var(--uf-ink-3)", fontWeight: 700 }}>
            {scheduled ? "Scheduled" : past ? "Recorded" : iso === todayIso ? "Today" : "Expected"}
          </span>
          <div className="uf-t-h3" style={{ margin: 0 }}>{title}</div>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose} aria-label="Close day">×</Button>
      </div>

      {cash !== null && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "var(--uf-surface)", borderRadius: 12, padding: "9px 12px" }}>
          <span className="uf-t-small" style={{ color: "var(--uf-ink-2)", fontWeight: 700 }}>Cash at day end</span>
          <span style={{ ...moneyMono, fontSize: 15, color: cash < 0 ? "var(--uf-neg-ink)" : "var(--uf-ink)" }}>{cash < 0 ? "−" : ""}{fmt(Math.abs(cash))}</span>
        </div>
      )}
      {invest && <span className="uf-t-small" style={{ color: "var(--uf-teal-deep)", fontWeight: 800 }}>◆ {invest}</span>}

      <div>
        {lines.length === 0 && (
          <p className="uf-t-small" style={{ color: "var(--uf-ink-3)", margin: "6px 0" }}>{scheduled ? "No bills or payday scheduled." : past ? "Nothing recorded." : "Nothing expected."}</p>
        )}
        {lines.map((l, i) => {
          const edit = l.id && onEdit ? () => onEdit(l.id!) : undefined;
          const Row = edit ? "button" : "div";
          return (
          <Row key={i} {...(edit ? { type: "button" as const, onClick: edit, "aria-label": `Edit ${l.label}` } : {})}
            style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 0", borderTop: i ? "1px solid var(--uf-border)" : "none",
              ...(edit ? { width: "100%", background: "transparent", borderLeft: "none", borderRight: "none", borderBottom: "none", textAlign: "left", font: "inherit", color: "inherit", cursor: "pointer" } : {}) }}>
            <span aria-hidden style={{ width: 30, height: 30, borderRadius: 10, display: "grid", placeItems: "center", flexShrink: 0,
              background: l.income ? "color-mix(in srgb, var(--uf-pos-ink) 14%, var(--uf-card))" : "var(--uf-surface)" }}>{emojiFor(l.category, l.income)}</span>
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={{ display: "block", fontWeight: 700, fontSize: 14, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{l.label}</span>
              {(scheduled || !past) && <span className="uf-t-small" style={{ color: "var(--uf-ink-3)" }}>{[l.status,l.repeats ? "Repeats" : "One-off"].filter(Boolean).join(" · ")}</span>}
            </span>
            <span style={{ ...moneyMono, fontSize: 14, color: l.income ? "var(--uf-pos-ink)" : "var(--uf-ink)" }}>{l.income ? "+" : "−"}{fmt(l.amount)}</span>
            {edit && <span aria-hidden className="uf-t-small" style={{ color: "var(--uf-ink-2)", fontWeight: 700 }}>Edit ›</span>}
          </Row>
          );
        })}
      </div>

      {/* An open form shows on any day: editing an overdue bill happens on a past day. */}
      {addForm ?? (past
        ? onOpenTransactions && <Button variant="ghost" size="sm" onClick={onOpenTransactions}>Open in Transactions</Button>
        : <Button variant="secondary" size="sm" onClick={onAdd}>+ Add upcoming</Button>)}
    </section>
  );
}
