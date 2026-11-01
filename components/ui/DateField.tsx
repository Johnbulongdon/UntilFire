"use client";

import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Icon from "./Icon";
import { inputStyle } from "./Field";

/**
 * The house date picker. Replaces the browser's `<input type="date">`, whose
 * popup ignores our type, corners and dark mode.
 *
 * Value in and out is the same "YYYY-MM-DD" string a date input uses (or ""),
 * so call sites swap without touching their data. Sunday-first, matching the
 * Calendar month (docs/design/design-system.md, "Date picker").
 */

export interface DateFieldProps {
  value: string;
  onChange: (value: string) => void;
  min?: string;
  max?: string;
  /** Show a Clear button so the date can be left empty. */
  clearable?: boolean;
  placeholder?: string;
  id?: string;
  "aria-label"?: string;
  disabled?: boolean;
  style?: React.CSSProperties;
}

const pad = (n: number) => String(n).padStart(2, "0");
const toYmd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parse = (s: string): Date | null => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null;
};
const addDays = (s: string, n: number) => {
  const d = parse(s)!;
  d.setDate(d.getDate() + n);
  return toYmd(d);
};
const addMonths = (s: string, n: number) => {
  const d = parse(s)!;
  const day = d.getDate();
  d.setDate(1);
  d.setMonth(d.getMonth() + n);
  d.setDate(Math.min(day, new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()));
  return toYmd(d);
};
const WEEK = ["S", "M", "T", "W", "T", "F", "S"];
const WIDTH = 304;

export default function DateField({
  value, onChange, min, max, clearable = false, placeholder = "Pick a date",
  id, disabled, style, ...rest
}: DateFieldProps) {
  const today = toYmd(new Date());
  const [open, setOpen] = useState(false);
  const [focus, setFocus] = useState(value || today);
  const [pos, setPos] = useState<{ top: number; left: number; width: number } | null>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const pop = useRef<HTMLDivElement>(null);

  const allowed = (s: string) => (!min || s >= min) && (!max || s <= max);
  const close = (refocus = true) => { setOpen(false); if (refocus) trigger.current?.focus(); };
  const pick = (s: string) => { if (!allowed(s)) return; onChange(s); close(); };

  const place = useCallback(() => {
    const r = trigger.current?.getBoundingClientRect();
    if (!r) return;
    const width = Math.min(WIDTH, window.innerWidth - 16);
    const h = pop.current?.offsetHeight ?? 380;
    const below = r.bottom + 8 + h <= window.innerHeight || r.top - 8 - h < 0;
    const left = Math.max(8, Math.min(r.left, window.innerWidth - width - 8));
    setPos({ top: below ? r.bottom + 8 : r.top - 8 - h, left, width });
  }, []);

  useLayoutEffect(() => { if (open) place(); }, [open, focus, place]);
  useEffect(() => {
    if (!open) return;
    const outside = (e: PointerEvent) => {
      const t = e.target as Node;
      if (!pop.current?.contains(t) && !trigger.current?.contains(t)) close(false);
    };
    document.addEventListener("pointerdown", outside);
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      document.removeEventListener("pointerdown", outside);
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open, place]);
  // Move focus into the grid once the popup is placed (it is hidden until then).
  const placed = pos !== null;
  useEffect(() => {
    if (open && placed) pop.current?.querySelector<HTMLButtonElement>('[data-focus="true"]')?.focus();
  }, [open, focus, placed]);
  useEffect(() => { if (!open) setPos(null); }, [open]);

  const onKey = (e: React.KeyboardEvent) => {
    const step: Record<string, () => string> = {
      ArrowLeft: () => addDays(focus, -1), ArrowRight: () => addDays(focus, 1),
      ArrowUp: () => addDays(focus, -7), ArrowDown: () => addDays(focus, 7),
      PageUp: () => addMonths(focus, -1), PageDown: () => addMonths(focus, 1),
    };
    if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); close(); }
    else if (step[e.key]) { e.preventDefault(); setFocus(step[e.key]()); }
  };

  const f = parse(focus)!;
  const y = f.getFullYear(), m = f.getMonth();
  const lead = new Date(y, m, 1).getDay();
  const days = new Date(y, m + 1, 0).getDate();
  const label = parse(value)?.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });

  return (
    <>
      <button
        ref={trigger} id={id} type="button" disabled={disabled}
        aria-label={rest["aria-label"] ? `${rest["aria-label"]}${label ? `, ${label}` : ""}` : undefined}
        aria-haspopup="dialog" aria-expanded={open}
        className="uf-date-trigger"
        onClick={() => { setFocus(value || (max && today > max ? max : today)); setOpen(o => !o); }}
        style={{ ...inputStyle(true), display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, textAlign: "left", cursor: disabled ? "not-allowed" : "pointer", ...style }}
      >
        <span style={{ color: label ? "var(--uf-ink)" : "var(--uf-ink-3)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{label ?? placeholder}</span>
        <Icon name="calendar" size={18} style={{ color: "var(--uf-ink-2)", flexShrink: 0 }} />
      </button>
      {open && typeof document !== "undefined" && createPortal(
        <div
          ref={pop} role="dialog" aria-label="Choose a date" className="uf-date-pop" onKeyDown={onKey}
          style={{ position: "fixed", top: pos?.top ?? -9999, left: pos?.left ?? 0, width: pos?.width ?? WIDTH, visibility: pos ? "visible" : "hidden" }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <span aria-live="polite" style={{ fontSize: 16, fontWeight: 700 }}>
              {f.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
            </span>
            <span style={{ display: "flex", gap: 6 }}>
              <button type="button" className="uf-date-nav" aria-label="Previous month" onClick={() => setFocus(addMonths(focus, -1))}>
                <Chevron dir="left" />
              </button>
              <button type="button" className="uf-date-nav" aria-label="Next month" onClick={() => setFocus(addMonths(focus, 1))}>
                <Chevron dir="right" />
              </button>
            </span>
          </div>
          <div role="grid" style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4 }}>
            {WEEK.map((d, i) => (
              <span key={i} aria-hidden style={{ fontSize: 12, fontWeight: 600, color: "var(--uf-ink-3)", textAlign: "center", padding: "2px 0 6px" }}>{d}</span>
            ))}
            {Array.from({ length: lead }, (_, i) => <span key={`b${i}`} />)}
            {Array.from({ length: days }, (_, i) => {
              const s = `${y}-${pad(m + 1)}-${pad(i + 1)}`;
              const ok = allowed(s);
              return (
                <button
                  key={s} type="button" className="uf-date-day" tabIndex={s === focus ? 0 : -1}
                  data-focus={s === focus} data-selected={s === value} data-today={s === today}
                  disabled={!ok} aria-pressed={s === value}
                  aria-label={parse(s)!.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" }) + (s === today ? ", today" : "")}
                  onClick={() => pick(s)}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); pick(s); } }}
                >{i + 1}</button>
              );
            })}
          </div>
          <div style={{ display: "flex", justifyContent: clearable ? "space-between" : "flex-end", gap: 8, marginTop: 14 }}>
            {clearable && (
              <button type="button" className="uf-date-link" onClick={() => { onChange(""); close(); }}>Clear</button>
            )}
            <button type="button" className="uf-date-today" disabled={!allowed(today)} onClick={() => pick(today)}>Today</button>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}

function Chevron({ dir }: { dir: "left" | "right" }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={dir === "left" ? "M15 6l-6 6 6 6" : "M9 6l6 6-6 6"} />
    </svg>
  );
}
