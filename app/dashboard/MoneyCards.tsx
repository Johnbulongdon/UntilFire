"use client";

/**
 * The calm Money pieces (D-40), shared by Budget, Upcoming, Net worth and Debts.
 *
 * Every Money page has the same shape: one headline card with a big number and
 * the bar it fills, then a list of rows, each a dot, a name with one line of
 * detail, the value on the right and, where there is something to fill, a bar
 * under the name. Colour is the category or account-type colour on the dot and
 * bar; teal is progress; red is only for over and owed-past-limit.
 */

import { useEffect, useRef, useState } from "react";
import { Card } from "@/components/ui";
import { occurrences, type Bill } from "@/lib/spend-forecast";
import { EXPENSE_CATEGORIES } from "@/lib/categories";

export const moneyMono: React.CSSProperties = { fontFamily: "var(--uf-font-mono)", fontVariantNumeric: "tabular-nums" };
const muted: React.CSSProperties = { color: "var(--uf-ink-3)" };

/** Pill switch for sub-pages and ranges. Scrolls sideways rather than wrapping on a phone. */
export function PillTabs<K extends string>({ options, value, onChange, label }: {
  options: { key: K; label: string }[];
  value: K;
  onChange: (k: K) => void;
  label: string;
}) {
  // On a narrow phone four tabs can be wider than the screen: the strip
  // scrolls, fades at the side with more, and keeps the chosen tab in view (D-54).
  const ref = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ left: false, right: false });
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const read = () => setEdges({ left: el.scrollLeft > 2, right: el.scrollLeft + el.clientWidth < el.scrollWidth - 2 });
    read();
    el.addEventListener("scroll", read, { passive: true });
    const observer = new ResizeObserver(read);
    observer.observe(el);
    return () => { el.removeEventListener("scroll", read); observer.disconnect(); };
  }, []);
  useEffect(() => {
    ref.current?.querySelector<HTMLElement>('[aria-selected="true"]')?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [value]);
  const fade = edges.left || edges.right
    ? `linear-gradient(to right, ${edges.left ? "transparent, black 24px" : "black"}, ${edges.right ? "black calc(100% - 24px), transparent" : "black"})` : undefined;
  return (
    <div ref={ref} role="tablist" aria-label={label} style={{ display: "flex", width: "fit-content", gap: 4, background: "var(--uf-surface-2)", borderRadius: 999, padding: 3, overflowX: "auto", maxWidth: "100%", scrollbarWidth: "none", maskImage: fade, WebkitMaskImage: fade }}>
      {options.map((o) => {
        const on = o.key === value;
        return (
          <button key={o.key} type="button" role="tab" aria-selected={on} onClick={() => onChange(o.key)}
            style={{ flex: "none", border: "none", borderRadius: 999, padding: "6px clamp(8px, 2vw, 14px)", font: "inherit", fontSize: "clamp(12px, 3.2vw, 13px)", fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap",
              background: on ? "var(--uf-card)" : "transparent", color: on ? "var(--uf-ink)" : "var(--uf-ink-3)", boxShadow: on ? "var(--uf-e1)" : "none" }}>
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/** A bar filled to `share`, with an optional striped `due` section after it (promised, not yet paid). */
export function MoneyTrack({ share, color = "var(--uf-teal)", due = 0, label }: { share: number; color?: string; due?: number; label?: string }) {
  const s = Math.max(0, Math.min(1, share));
  const d = Math.max(0, Math.min(1 - s, due));
  return (
    <div role={label ? "img" : undefined} aria-label={label} style={{ position: "relative", height: 8, borderRadius: 4, background: "var(--uf-surface-2)", overflow: "hidden" }}>
      <i style={{ position: "absolute", top: 0, bottom: 0, left: 0, width: `${s * 100}%`, background: color }} />
      {d > 0 && <i style={{ position: "absolute", top: 0, bottom: 0, left: `${s * 100}%`, width: `${d * 100}%`, background: `repeating-linear-gradient(135deg, ${color} 0 3px, transparent 3px 6px)`, opacity: 0.6 }} />}
    </div>
  );
}

/** One stacked bar, each part sized by value and coloured by its key. */
export function StackBar({ parts, total, label }: { parts: { key: string; color: string; value: number }[]; total?: number; label: string }) {
  const scale = Math.max(total ?? 0, parts.reduce((s, p) => s + Math.max(0, p.value), 0), 1);
  return (
    <div role="img" aria-label={label} style={{ display: "flex", height: 10, borderRadius: 5, overflow: "hidden", gap: 2, background: "var(--uf-surface-2)" }}>
      {parts.filter((p) => p.value > 0).map((p) => <i key={p.key} style={{ width: `${(p.value / scale) * 100}%`, background: p.color }} />)}
    </div>
  );
}

/** The page's headline: a small label, one big number, a line under it, and an optional control on the right. */
export function MoneyHead({ label, value, sub, aside, children }: {
  /** Words, or words with a small mark such as a flag. */
  label: React.ReactNode;
  value: React.ReactNode;
  sub?: React.ReactNode;
  aside?: React.ReactNode;
  /** The bar and key under the number. */
  children?: React.ReactNode;
}) {
  return (
    <Card style={{ display: "grid", gap: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "flex-end" }}>
        <div style={{ display: "grid", gap: 2, minWidth: 0 }}>
          <span className="uf-t-small" style={muted}>{label}</span>
          <span style={{ ...moneyMono, fontSize: 30, fontWeight: 600, lineHeight: 1.15 }}>{value}</span>
          {sub && <span className="uf-t-small" style={{ color: "var(--uf-ink-2)" }}>{sub}</span>}
        </div>
        {aside}
      </div>
      {children}
    </Card>
  );
}

/** Figures under a headline bar, e.g. "$3,000 income · $740 on track to save". */
export function MoneyKey({ items }: { items: React.ReactNode[] }) {
  return (
    <div className="uf-t-small" style={{ display: "flex", gap: 14, flexWrap: "wrap", color: "var(--uf-ink-2)" }}>
      {items.map((it, i) => <span key={i}>{it}</span>)}
    </div>
  );
}

/** A figure in a key or sub line: mono and full-strength ink. */
export const Fig = ({ children, tone }: { children: React.ReactNode; tone?: string }) =>
  <b style={{ ...moneyMono, color: tone ?? "var(--uf-ink)" }}>{children}</b>;

/**
 * Rows sit on the page, not in a card (D-41): the headline is the one card, and
 * a soft divider between rows is enough to separate them.
 */
export function MoneyList({ children, footer }: { children: React.ReactNode; footer?: React.ReactNode }) {
  return (
    <div className="uf-money-list" style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr)" }}>
      {children}
      {footer && <div style={{ padding: "12px 0 4px" }}>{footer}</div>}
    </div>
  );
}

/** A soft circle in the row's colour, with its emoji or a small dot inside, as on Transactions. */
export function RowIcon({ color, emoji, size = 36 }: { color: string; emoji?: React.ReactNode; size?: number }) {
  return (
    <span aria-hidden style={{ flex: "none", width: size, height: size, borderRadius: 999, display: "grid", placeItems: "center",
      background: `color-mix(in srgb, ${color} 16%, transparent)`, fontSize: size * 0.48, lineHeight: 1 }}>
      {emoji ?? <i style={{ width: 10, height: 10, borderRadius: 999, background: color }} />}
    </span>
  );
}

/**
 * A bank's own logo from Plaid, on a white disc so dark marks stay visible in
 * dark mode; the bank's initial on its colour when Plaid has no logo.
 */
export function BankLogo({ logo, name, color, size = 36 }: { logo?: string | null; name: string; color?: string | null; size?: number }) {
  return (
    <span aria-hidden style={{ width: size, height: size, flex: "none", borderRadius: 999, display: "grid", placeItems: "center", overflow: "hidden",
      background: logo ? "#fff" : color || "var(--uf-ink-3)", boxShadow: "inset 0 0 0 1px color-mix(in srgb, var(--uf-ink) 10%, transparent)" }}>
      {logo
        // eslint-disable-next-line @next/next/no-img-element -- a data: URL from Plaid; next/image has nothing to optimise
        ? <img src={logo} alt="" width={size - 8} height={size - 8} style={{ objectFit: "contain" }} />
        : <b style={{ color: "#fff", fontSize: Math.round(size * 0.42) }}>{name.charAt(0).toUpperCase()}</b>}
    </span>
  );
}

const ICON = 36, GAP = 12;

export function MoneyRow({ dot, icon, name, meta, value, valueTone, strong, bar, onClick, after, wrap }: {
  /** The row's colour: its category or account type. */
  dot: string;
  /** An emoji for the circle; without one the circle holds a dot. */
  icon?: React.ReactNode;
  name: React.ReactNode;
  /** One quiet line in the body font. */
  meta?: React.ReactNode;
  value: React.ReactNode;
  valueTone?: string;
  /** Bold the value: status words like "$8 over" or "$154 left". Plain amounts stay regular. */
  strong?: boolean;
  /** A MoneyTrack, drawn under the name. */
  bar?: React.ReactNode;
  onClick?: () => void;
  /** Anything that opens under the row: an editor, a note. */
  after?: React.ReactNode;
  /** Let a long name (an article title) wrap instead of truncating. */
  wrap?: boolean;
}) {
  const head = (
    <div style={{ display: "flex", alignItems: "center", gap: GAP }}>
      <RowIcon color={dot} emoji={icon} size={ICON} />
      <span style={{ minWidth: 0, flex: 1, textAlign: "left" }}>
        <span className="uf-t-body" style={{ display: "block", fontWeight: 600, color: "var(--uf-ink)", ...(wrap ? {} : { whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }) }}>{name}</span>
        {meta && <span className="uf-t-small" style={{ display: "block", ...muted }}>{meta}</span>}
      </span>
      {/* Amounts in DM Mono; a word value ("Lisbon ›", "Standard ›") in the body font (D-42). */}
      <span className="uf-t-small" style={{ ...(typeof value === "string" && !/\d/.test(value) ? {} : moneyMono), flex: "none", fontWeight: strong ? 700 : 500, color: valueTone ?? "var(--uf-ink)" }}>{value}</span>
    </div>
  );
  const under = bar && <div style={{ paddingLeft: ICON + GAP }}>{bar}</div>;
  return (
    <div className="uf-money-row" style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr)", gap: 8, padding: "12px 0" }}>
      {onClick
        ? <button type="button" onClick={onClick} style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr)", gap: 8, width: "100%", padding: 0, border: "none", background: "none", font: "inherit", color: "inherit", textAlign: "left", cursor: "pointer" }}>{head}{under}</button>
        : <>{head}{under}</>}
      {after && <div style={{ paddingLeft: ICON + GAP }}>{after}</div>}
    </div>
  );
}

const isoOf = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/**
 * Everyday spending against an even pace (D-41). The line is where spending
 * would be today if the everyday budget went out evenly across the month.
 * Bills are left out: they are already set aside, and rent on the 1st is not a
 * pace. Ahead of pace is amber, never red; red is for over budget. In the first
 * five days the line is too noisy to judge, so no verdict is given.
 */
export function PaceBar({ spent, budget, day, daysInMonth, fmt }: {
  spent: number;
  budget: number;
  day: number;
  daysInMonth: number;
  fmt: (n: number) => string;
}) {
  const share = budget > 0 ? spent / budget : 0;
  const pace = day / daysInMonth;
  const gap = spent - budget * pace;
  const judge = day > 5 && budget > 0 && Math.abs(gap) >= Math.max(5, budget * 0.03);
  const over = share > 1;
  return (
    <div style={{ display: "grid", gap: 6 }}>
      <div role="img" aria-label={`Everyday spending ${fmt(spent)} of ${fmt(budget)}; an even pace would be ${fmt(budget * pace)} by today`}
        style={{ position: "relative", height: 14, borderRadius: 7, background: "var(--uf-surface-2)" }}>
        <i style={{ position: "absolute", top: 0, bottom: 0, left: 0, width: `${Math.min(1, share) * 100}%`, borderRadius: 7, background: over ? "var(--uf-neg)" : "var(--uf-teal)" }} />
        <i title="Where an even pace would be today" style={{ position: "absolute", top: -5, bottom: -5, left: `calc(${pace * 100}% - 1px)`, width: 2, background: "var(--uf-ink)" }} />
      </div>
      <div className="uf-t-small" style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap", color: "var(--uf-ink-2)" }}>
        <span>Everyday <b style={{ ...moneyMono, color: "var(--uf-ink)" }}>{fmt(spent)}</b> of <span style={moneyMono}>{fmt(budget)}</span></span>
        {judge && (gap > 0
          ? <b style={{ color: "var(--uf-warn-ink)" }}>▲ {fmt(gap)} ahead of pace</b>
          : <b style={{ color: "var(--uf-pos-ink)" }}>▼ {fmt(-gap)} under pace</b>)}
      </div>
    </div>
  );
}

/**
 * The month as a calendar, opened from the Budget headline (D-41). Days gone
 * are shaded by what was spent; days ahead show their even share of what is
 * left; bills sit on the day they fall due. Today is solid teal.
 */
export function MonthCalendar({ today, spentByDay, bills, perDay, fmt }: {
  today: Date;
  /** USD of everyday spending per ISO day this month; bills show as dots instead. */
  spentByDay: Record<string, number>;
  bills: Bill[];
  perDay: number;
  fmt: (n: number) => string;
}) {
  const y = today.getFullYear(), m = today.getMonth();
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const lead = (new Date(y, m, 1).getDay() + 6) % 7; // Monday first
  const first = isoOf(new Date(y, m, 1)), last = isoOf(new Date(y, m, daysInMonth));
  const billOn = new Map<string, Bill[]>();
  for (const b of bills) for (const iso of occurrences(b, first, last)) billOn.set(iso, [...(billOn.get(iso) ?? []), b]);
  const maxSpend = Math.max(1, ...Object.values(spentByDay));
  const color = (b: Bill) => EXPENSE_CATEGORIES.find((c) => c.key === b.category)?.color ?? "var(--uf-ink-3)";
  return (
    <div style={{ display: "grid", gap: 8, maxWidth: 420 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, minmax(0, 1fr))", gap: 4 }}>
        {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => <span key={i} style={{ fontSize: 11, textAlign: "center", color: "var(--uf-ink-3)" }}>{d}</span>)}
        {Array.from({ length: lead }, (_, i) => <span key={`lead${i}`} />)}
        {Array.from({ length: daysInMonth }, (_, i) => {
          const d = i + 1, iso = isoOf(new Date(y, m, d));
          const isToday = d === today.getDate(), past = d < today.getDate();
          const spend = spentByDay[iso] ?? 0, due = billOn.get(iso);
          const label = past ? `${fmt(spend)} spent` : `about ${fmt(perDay)}`;
          return (
            <span key={iso} title={`${new Date(y, m, d).toLocaleDateString("en-US", { month: "short", day: "numeric" })}: ${label}${due ? ` · ${due.map((b) => `${b.description ?? "Bill"} ${fmt(b.usd)}`).join(", ")}` : ""}`}
              style={{ position: "relative", aspectRatio: "1", borderRadius: 8, display: "grid", placeItems: "center", fontFamily: "var(--uf-font-mono)", fontSize: 11,
                background: isToday ? "var(--uf-teal)" : past ? `color-mix(in srgb, var(--uf-ink-3) ${Math.round(8 + (spend / maxSpend) * 52)}%, transparent)` : "color-mix(in srgb, var(--uf-teal) 18%, transparent)",
                color: isToday ? "var(--uf-card)" : "var(--uf-ink-2)" }}>
              {d}
              {due && <i style={{ position: "absolute", top: 3, right: 3, width: 6, height: 6, borderRadius: 999, background: color(due[0]) }} />}
            </span>
          );
        })}
      </div>
      <div className="uf-t-small" style={{ display: "flex", gap: 14, flexWrap: "wrap", color: "var(--uf-ink-3)" }}>
        <span>Darker = more everyday spending</span>
        <span>Days ahead ≈ <b style={{ ...moneyMono, color: "var(--uf-ink-2)" }}>{fmt(Math.max(0, perDay))}</b> each</span>
        <span>Dot = bill due</span>
      </div>
    </div>
  );
}
