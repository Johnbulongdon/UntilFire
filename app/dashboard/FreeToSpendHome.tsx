"use client";

import { Card } from "@/components/ui";
import type { FreeToSpend } from "@/lib/free-to-spend";

const mono: React.CSSProperties = { fontFamily: "var(--uf-font-mono)", fontVariantNumeric: "tabular-nums" };
const weekday = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", { weekday: "long" });
};

/**
 * Free to spend on Home (D-29): one sentence, then where the balance goes.
 * Home has no inputs, so this only reads; the runway, the bills and the
 * accounts that count are one tap away in Money.
 */
export default function FreeToSpendHome({ result, fmt, onOpen }: {
  result: FreeToSpend;
  fmt: (usd: number) => string;
  onOpen?: () => void;
}) {
  const { free, cash, budget, payday, limitedBy, perDay, days } = result;
  const when = payday.source === "paycheck"
    ? (days <= 6 ? `before ${weekday(payday.iso)}` : "before your next paycheck")
    : "this month";
  // A shortfall is said in words ("$470 more than"), so it never carries a minus sign too.
  const amount = <span style={{ ...mono, borderBottom: "2px solid var(--uf-ink)", color: free < 0 ? "var(--uf-neg-ink)" : undefined }}>{fmt(Math.abs(free))}</span>;

  // Where the balance goes: each bill before payday, then what is yours.
  const parts = cash
    ? [...cash.bills.map((b) => ({ name: b.description, amt: Math.abs(b.amount), mine: false })), { name: "Yours", amt: Math.max(0, cash.free), mine: true }]
    : [];
  const total = parts.reduce((s, p) => s + p.amt, 0);
  const named = parts.filter((p) => p.mine || (total > 0 && p.amt / total > 0.3));
  const rest = cash ? cash.bills.filter((b) => total > 0 && Math.abs(b.amount) / total <= 0.3) : [];

  return (
    <Card style={{ display: "grid", gap: "var(--uf-s4)" }}>
      <p className="uf-t-h2" style={{ margin: 0, fontFamily: "var(--uf-font-display)", fontWeight: 500, lineHeight: 1.3 }}>
        {cash
          ? free < 0
            ? <>Bills before payday are {amount} more than the <span style={mono}>{fmt(cash.balance)}</span> in your account.</>
            : <>Of the <span style={mono}>{fmt(cash.balance)}</span> in your account, {amount} is yours to spend {when}.</>
          : <>You have {amount} left to spend {when}.</>}
      </p>

      {cash && total > 0 && (
        <div style={{ display: "grid", gap: 6 }}>
          <div style={{ display: "flex", gap: 2 }} aria-hidden>
            {parts.map((p, i) => p.amt > 0 && (
              <i key={i} style={{ flex: p.amt, height: 10, borderRadius: 3, background: p.mine ? "var(--uf-ink)" : "var(--uf-surface-2)" }} />
            ))}
          </div>
          <div className="uf-t-small" style={{ display: "flex", justifyContent: "space-between", gap: "var(--uf-s3)", flexWrap: "wrap", color: "var(--uf-ink-3)" }}>
            <span>
              {named.filter((p) => !p.mine).map((p) => <span key={p.name}>{p.name} <span style={mono}>{fmt(p.amt)}</span>{" · "}</span>)}
              {rest.length > 0 && <>{rest.length === 1 ? rest[0].description : `${rest.length} more bills`} <span style={mono}>{fmt(rest.reduce((s, b) => s + Math.abs(b.amount), 0))}</span></>}
            </span>
            {cash.free > 0 && <b style={{ color: "var(--uf-ink)" }}>Yours <span style={mono}>{fmt(cash.free)}</span></b>}
          </div>
        </div>
      )}

      {budget && budget.categories.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: "var(--uf-s4)" }}>
          {budget.categories.slice(0, 3).map((c) => (
            <div key={c.key} style={{ display: "grid", gap: 4 }}>
              <span className="uf-t-small" style={{ color: "var(--uf-ink-3)" }}>{c.label}</span>
              <span style={{ ...mono, fontSize: 16, color: c.left < 0 ? "var(--uf-neg-ink)" : "var(--uf-ink)" }}>{c.left < 0 ? "−" : ""}{fmt(Math.abs(c.left))}</span>
              <i aria-hidden style={{ display: "block", height: 3, borderRadius: 2, background: `linear-gradient(90deg, var(--uf-ink) ${Math.max(0, Math.min(1, c.left / c.budget)) * 100}%, var(--uf-surface-2) 0)` }} />
            </div>
          ))}
        </div>
      )}

      <div className="uf-t-small" style={{ display: "flex", justifyContent: "space-between", gap: "var(--uf-s3)", flexWrap: "wrap", color: "var(--uf-ink-3)" }}>
        <span>
          {free > 0 && <>About <span style={mono}>{fmt(perDay)}</span> a day. </>}
          {cash && budget && (limitedBy === "budget" ? "Your budget is the tighter limit." : "Your cash is the tighter limit.")}
        </span>
        {onOpen && (
          <button type="button" onClick={onOpen} style={{ background: "none", border: "none", padding: 0, font: "inherit", fontWeight: 700, color: "var(--uf-green)", cursor: "pointer" }}>
            See how →
          </button>
        )}
      </div>
    </Card>
  );
}
