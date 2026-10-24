"use client";

import { useEffect, useState } from "react";
import { addMonths, type RangePreset, rangeFor } from "@/lib/spend-range";

const PRESETS: { k: RangePreset; l: string }[] = [
  { k: 1, l: "This month" }, { k: 3, l: "Last 3 months" }, { k: 6, l: "Last 6 months" }, { k: 12, l: "Last 12 months" }, { k: "ytd", l: "This year" },
];
const short = (ym: string, year = false) => {
  const [y, m] = ym.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("en-US", year ? { month: "long", year: "numeric" } : { month: "short" });
};

export function rangeLabel(preset: RangePreset, endMonth: string) {
  const { months } = rangeFor(preset, endMonth);
  if (months.length === 1) return short(endMonth, true);
  const [y0, y1] = [months[0].slice(0, 4), endMonth.slice(0, 4)];
  return `${short(months[0])}${y0 !== y1 ? ` ${y0}` : ""} – ${short(endMonth)} ${y1}`;
}

/**
 * The one date control for Transactions: ‹ Jul – Sep 2026 ▾ ›. The arrows
 * move the range by its own length; the middle opens presets and a custom
 * span. A sheet from the bottom on phones, a menu on wider screens.
 */
export default function SpendRangePill({ preset, endMonth, currentMonth, onChange }: {
  preset: RangePreset; endMonth: string; currentMonth: string;
  onChange: (preset: RangePreset, endMonth: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [custom, setCustom] = useState<{ from: string; to: string } | null>(null);
  const [phone, setPhone] = useState(false);
  useEffect(() => {
    const q = matchMedia("(max-width: 600px)");
    const set = () => setPhone(q.matches);
    set(); q.addEventListener("change", set);
    return () => q.removeEventListener("change", set);
  }, []);
  useEffect(() => {
    if (!open) return;
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("keydown", esc);
    return () => document.removeEventListener("keydown", esc);
  }, [open]);

  const span = rangeFor(preset, endMonth).months.length;
  const step = (dir: -1 | 1) => {
    const next = addMonths(endMonth, dir * (preset === "ytd" ? 12 : span));
    if (next <= currentMonth) onChange(preset, next);
  };
  const canNext = endMonth < currentMonth;
  const isPreset = (k: RangePreset) => k === preset && (k === "ytd" || endMonth === currentMonth);
  const arrow: React.CSSProperties = { width: 36, height: 36, border: "none", background: "transparent", borderRadius: 999, fontSize: 18, cursor: "pointer", color: "var(--uf-ink-2)" };
  const item = (on: boolean): React.CSSProperties => ({
    display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, border: "none", borderRadius: 8, padding: phone ? "14px 12px" : "9px 12px",
    font: "inherit", textAlign: "left", cursor: "pointer", background: on ? "var(--uf-green-50)" : "transparent", color: on ? "var(--uf-green-700)" : "var(--uf-ink)", fontWeight: on ? 700 : 500,
  });

  return (
    <div style={{ position: "relative", display: "inline-flex", width: "fit-content", alignItems: "center", background: "var(--uf-card)", border: "1px solid var(--uf-border)", borderRadius: 999, padding: 2 }}>
      <button type="button" aria-label="Previous period" onClick={() => step(-1)} style={arrow}>‹</button>
      <button type="button" aria-haspopup="menu" aria-expanded={open} onClick={() => { setOpen(!open); setCustom(null); }}
        style={{ border: "none", background: "transparent", cursor: "pointer", font: "inherit", fontWeight: 700, color: "var(--uf-ink)", padding: "0 6px", display: "flex", gap: 6, alignItems: "center", whiteSpace: "nowrap" }}>
        {rangeLabel(preset, endMonth)}<span aria-hidden style={{ fontSize: 11, color: "var(--uf-ink-3)" }}>▾</span>
      </button>
      <button type="button" aria-label="Next period" disabled={!canNext} onClick={() => step(1)} style={{ ...arrow, color: canNext ? "var(--uf-ink-2)" : "var(--uf-border-2)", cursor: canNext ? "pointer" : "default" }}>›</button>

      {open && (
        <>
          <div aria-hidden onClick={() => setOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 49, background: phone ? "var(--uf-scrim)" : "transparent" }} />
          <div role="menu" style={{
            zIndex: 50, display: "grid", gap: 2, background: "var(--uf-card)", border: "1px solid var(--uf-border)", boxShadow: "var(--uf-e2)",
            ...(phone ? { position: "fixed", left: 0, right: 0, bottom: 0, borderRadius: "16px 16px 0 0", padding: "12px 12px calc(20px + env(safe-area-inset-bottom, 0px))" }
              : { position: "absolute", top: 44, left: 0, minWidth: 240, borderRadius: 12, padding: 6 }),
          }}>
            {!custom ? (
              <>
                {PRESETS.map((p) => (
                  <button key={String(p.k)} role="menuitemradio" aria-checked={isPreset(p.k)} type="button" style={item(isPreset(p.k))}
                    onClick={() => { onChange(p.k, currentMonth); setOpen(false); }}>
                    {p.l}{isPreset(p.k) && <span aria-hidden>✓</span>}
                  </button>
                ))}
                <button role="menuitem" type="button" style={item(false)} onClick={() => setCustom({ from: rangeFor(preset, endMonth).months[0], to: endMonth })}>Custom range…</button>
              </>
            ) : (
              <form style={{ display: "grid", gap: 10, padding: 6 }} onSubmit={(e) => {
                e.preventDefault();
                const [from, to] = custom.from <= custom.to ? [custom.from, custom.to] : [custom.to, custom.from];
                const [fy, fm] = from.split("-").map(Number), [ty, tm] = to.split("-").map(Number);
                onChange((ty - fy) * 12 + (tm - fm) + 1, to); setOpen(false);
              }}>
                {(["from", "to"] as const).map((k) => (
                  <label key={k} className="uf-t-small" style={{ display: "grid", gap: 4, color: "var(--uf-ink-2)" }}>
                    {k === "from" ? "From" : "To"}
                    <input type="month" required max={currentMonth} value={custom[k]} onChange={(e) => setCustom({ ...custom, [k]: e.target.value })}
                      style={{ font: "inherit", padding: "8px 10px", borderRadius: "var(--uf-r-control)", border: "1px solid var(--uf-border-2)", background: "var(--uf-card)", color: "var(--uf-ink)" }} />
                  </label>
                ))}
                <button type="submit" style={{ ...item(true), justifyContent: "center", background: "var(--uf-green)", color: "#fff" }}>Show</button>
              </form>
            )}
          </div>
        </>
      )}
    </div>
  );
}
