"use client";

import { Card } from "@/components/ui";
import type { FreeToSpend, SpendAccount } from "@/lib/free-to-spend";
import { countsByDefault } from "@/lib/free-to-spend";

const mono: React.CSSProperties = { fontFamily: "var(--uf-font-mono)", fontVariantNumeric: "tabular-nums" };
const DAY_MS = 86_400_000;
const dateOf = (iso: string) => { const [y, m, d] = iso.split("-").map(Number); return new Date(y, m - 1, d); };
const short = (iso: string) => dateOf(iso).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });

/**
 * Free to spend in Money (D-29): the number, then why. The runway is the
 * balance stepping down on the day each bill leaves, ending at what is
 * left at payday, so "$2,400 in the bank" visibly isn't $2,400 to spend.
 * The bills are listed under it as the table behind the picture, and the
 * accounts that count are chosen here.
 */
export default function FreeToSpendRunway({ result, fmt, allAccounts, toggles, onToggle }: {
  result: FreeToSpend;
  fmt: (usd: number) => string;
  allAccounts: SpendAccount[];
  toggles: Record<string, boolean>;
  onToggle: (id: string, on: boolean) => void;
}) {
  const { free, perDay, days, payday, cash, budget, limitedBy, cards } = result;
  const until = payday.source === "paycheck" ? `until ${short(payday.iso)}'s paycheck` : `until the end of the month`;
  const why = limitedBy === "budget" && budget
    ? budget.tightest && budget.tightest.left <= budget.tightest.budget * 0.35
      ? `Your budget is the tighter limit; ${budget.tightest.label.toLowerCase()} has ${fmt(Math.max(0, budget.tightest.left))} left.`
      : "Your budget is the tighter limit."
    : cash && cash.bills.length > 0
      ? `Bills before payday are already set aside.`
      : "Nothing is due before payday.";

  return (
    <Card style={{ display: "grid", gap: "var(--uf-s4)", gridColumn: "1 / -1" }}>
      <div style={{ display: "grid", gap: 6 }}>
        <span className="uf-t-small" style={{ color: "var(--uf-ink-3)" }}>Free to spend {until}</span>
        <span style={{ ...mono, fontSize: 48, lineHeight: 1, fontWeight: 600, letterSpacing: "-0.02em", color: free < 0 ? "var(--uf-neg-ink)" : "var(--uf-ink)" }}>
          {free < 0 ? "−" : ""}{fmt(Math.abs(free))}
        </span>
        <span className="uf-t-small" style={{ color: "var(--uf-ink-2)" }}>
          {free > 0 ? `About ${fmt(perDay)} a day for ${days} ${days === 1 ? "day" : "days"}. ` : free < 0 ? "Bills before payday are more than you have. " : ""}{why}
        </span>
      </div>

      {cash && <Runway cash={cash} paydayIso={payday.iso} fmt={fmt} />}

      {cash && cash.bills.length > 0 && (
        <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 4 }} aria-label="Set aside before payday">
          {cash.bills.map((b, i) => (
            <li key={`${b.iso}-${b.description}-${i}`} className="uf-t-small" style={{ display: "flex", justifyContent: "space-between", gap: "var(--uf-s3)", color: "var(--uf-ink-2)" }}>
              <span>{b.description} · {b.overdue ? "overdue" : short(b.iso)}</span>
              <span style={mono}>−{fmt(Math.abs(b.amount))}</span>
            </li>
          ))}
        </ul>
      )}

      {budget && cash && (
        <p className="uf-t-small" style={{ margin: 0, color: "var(--uf-ink-3)" }}>
          Cash after bills <b style={{ ...mono, color: limitedBy === "cash" ? "var(--uf-ink)" : undefined }}>{fmt(cash.free)}</b>
          {" · "}Budget left <b style={{ ...mono, color: limitedBy === "budget" ? "var(--uf-ink)" : undefined }}>{fmt(budget.left)}</b>
          {" · "}the lower one is yours.
        </p>
      )}
      {!cash && <p className="uf-t-small" style={{ margin: 0, color: "var(--uf-ink-3)" }}>From your budget only. Link a checking account to set bills against your real balance.</p>}

      {cards.map((c) => (
        <p key={c.name} className="uf-t-small" style={{ margin: 0, color: "var(--uf-ink-3)" }}>
          {c.name}: <span style={mono}>{fmt(c.owedUSD)}</span> owed. Its payment counts once it&apos;s in Upcoming.
        </p>
      ))}

      {allAccounts.some((a) => a.type === "depository") && (
        <details>
          <summary className="uf-t-small" style={{ cursor: "pointer", color: "var(--uf-ink-2)" }}>Which accounts count</summary>
          <div style={{ display: "grid", gap: 6, marginTop: "var(--uf-s2)" }}>
            {allAccounts.filter((a) => a.type === "depository").map((a) => (
              <label key={a.id} className="uf-t-small" style={{ display: "flex", gap: "var(--uf-s2)", alignItems: "center", color: "var(--uf-ink-2)" }}>
                <input type="checkbox" checked={toggles[a.id] ?? countsByDefault(a)} onChange={(e) => onToggle(a.id, e.target.checked)} />
                <span>{a.name}</span>
                <span style={{ ...mono, marginLeft: "auto" }}>{fmt(a.balanceUSD)}</span>
              </label>
            ))}
          </div>
        </details>
      )}
    </Card>
  );
}

/** The balance from today to payday, stepping down on each bill's day. */
function Runway({ cash, paydayIso, fmt }: { cash: NonNullable<FreeToSpend["cash"]>; paydayIso: string; fmt: (n: number) => string }) {
  const W = 360, H = 110, base = H - 6;
  const start = new Date(); start.setHours(0, 0, 0, 0);
  const span = Math.max(1, (dateOf(paydayIso).getTime() - start.getTime()) / DAY_MS);
  const x = (iso: string) => 4 + (Math.min(span, Math.max(0, (dateOf(iso).getTime() - start.getTime()) / DAY_MS)) / span) * (W - 8);
  const top = Math.max(cash.balance, 1);
  const y = (v: number) => base - (Math.max(0, v) / top) * (base - 14);

  let bal = cash.balance;
  const pts: [number, number][] = [[4, y(bal)]];
  for (const b of cash.bills) { const bx = b.overdue ? 4 : x(b.iso); pts.push([bx, y(bal)]); bal += b.amount; pts.push([bx, y(bal)]); }
  pts.push([W - 4, y(bal)]);
  const line = pts.map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(" ");
  const end = pts[pts.length - 1];

  const label: React.CSSProperties = { ...mono, position: "absolute", fontSize: 11, whiteSpace: "nowrap" };
  // The drawing stretches to any width; labels sit outside it so they never distort.
  return (
    <figure style={{ margin: 0 }}>
      <div style={{ position: "relative", height: H }}>
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ width: "100%", height: H, display: "block", overflow: "visible" }} role="img"
          aria-label={`Balance goes from ${fmt(cash.balance)} today to ${fmt(cash.free)} at payday as ${cash.bills.length} bills leave`}>
          <path d={`${line} L${W - 4} ${base} L4 ${base} Z`} fill="var(--uf-surface)" />
          <path d={line} fill="none" stroke="var(--uf-ink)" strokeWidth={2} strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
          <line x1={4} x2={W - 4} y1={base} y2={base} stroke="var(--uf-border-2)" vectorEffect="non-scaling-stroke" />
          {cash.bills.map((b, i) => (
            <line key={i} x1={b.overdue ? 4 : x(b.iso)} x2={b.overdue ? 4 : x(b.iso)} y1={base} y2={base + 5} stroke="var(--uf-ink-3)" vectorEffect="non-scaling-stroke">
              <title>{`${b.description} · ${fmt(Math.abs(b.amount))}`}</title>
            </line>
          ))}
        </svg>
        <span aria-hidden style={{ position: "absolute", right: -4, top: end[1] - 5, width: 10, height: 10, borderRadius: 99, background: cash.free < 0 ? "var(--uf-neg)" : "var(--uf-ink)", boxShadow: "0 0 0 2px var(--uf-card)" }} />
        <span aria-hidden style={{ ...label, left: 8, top: y(cash.balance) + 2, color: "var(--uf-ink-3)" }}>{fmt(cash.balance)} today</span>
        <span aria-hidden style={{ ...label, right: 0, top: end[1] - 24, color: "var(--uf-ink)" }}>{fmt(cash.free)} at payday</span>
      </div>
      <figcaption className="uf-t-small" style={{ display: "flex", justifyContent: "space-between", color: "var(--uf-ink-3)", marginTop: 2 }}>
        <span>Today</span><span>Payday</span>
      </figcaption>
    </figure>
  );
}
