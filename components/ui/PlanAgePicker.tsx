"use client";

import { useEffect, useId, useRef } from "react";

const ages = Array.from({ length: 83 }, (_, i) => i + 18);
const rowHeight = 44;

/** Preserve Plan's existing 18–100 range; phone scrolls, desktop selects. */
export default function PlanAgePicker({ value, onChange }: { value: number; onChange: (age: number) => void }) {
  const id = useId();
  const wheel = useRef<HTMLDivElement>(null);
  const interacted = useRef(false);
  const latest = useRef({ value, onChange });
  latest.current = { value, onChange };
  const valid = ages.includes(value);
  useEffect(() => {
    const element = wheel.current;
    if (!element) return;
    const observer = new ResizeObserver(() => {
      if (element.clientHeight) element.scrollTop = Math.max(0, ages.indexOf(latest.current.value)) * rowHeight;
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  const choose = (age: number) => {
    onChange(age);
    wheel.current?.scrollTo({ top: ages.indexOf(age) * rowHeight, behavior: "instant" });
  };
  return <>
    <div className="uf-pill-age-desktop"><label htmlFor={id}>Current age</label>
      <select id={id} value={valid ? value : ""} onChange={e => choose(Number(e.target.value))} style={{ width: "100%", padding: 12, marginTop: 8, color: "var(--uf-ink)", background: "var(--uf-surface-2)", border: "1px solid var(--uf-border)" }}>
        <option value="" disabled>Choose your age</option>
        {ages.map(age => <option value={age} key={age}>{age} years</option>)}
      </select>
    </div>
    <div className="uf-pill-age-phone"><p className="uf-hint">Scroll to your age. Tap a number to select it directly.</p>
      {!valid && <p role="status">Choose an age below; your saved age has not been changed.</p>}
      <div style={{ position: "relative", borderRadius: 20, background: "var(--uf-surface-2)" }}>
        <div aria-hidden="true" style={{ position: "absolute", top: 88, height: 44, left: 8, right: 8, background: "var(--uf-card)", borderRadius: 999 }} />
        <div ref={wheel} role="spinbutton" tabIndex={0} aria-label="Current age" aria-valuemin={18} aria-valuemax={100} aria-valuenow={valid ? value : undefined} aria-valuetext={valid ? `${value} years` : "Not selected"}
          style={{ position: "relative", height: 220, overflowY: "auto", scrollSnapType: "y mandatory", scrollbarWidth: "none", paddingBlock: 88 }}
          onPointerDown={() => { interacted.current = true; }}
          onWheel={() => { interacted.current = true; }}
          onScroll={() => { const el = wheel.current; if (!interacted.current || !el?.clientHeight) return; const age = ages[Math.max(0, Math.min(82, Math.round(el.scrollTop / rowHeight)))]; if (age !== latest.current.value) latest.current.onChange(age); }}
          onKeyDown={e => { const delta = e.key === "ArrowUp" ? -1 : e.key === "ArrowDown" ? 1 : e.key === "PageUp" ? -10 : e.key === "PageDown" ? 10 : 0;
            if (delta || e.key === "Home" || e.key === "End") { e.preventDefault(); choose(e.key === "Home" ? 18 : e.key === "End" ? 100 : Math.min(100, Math.max(18, (valid ? value : 18) + delta))); } }}>
          {ages.map(age => <div key={age} onClick={() => choose(age)} style={{ height: 44, scrollSnapAlign: "center", display: "grid", placeItems: "center", cursor: "pointer", fontSize: age === value ? 28 : 20, fontWeight: age === value ? 800 : 500, color: age === value ? "var(--uf-ink)" : "var(--uf-ink-3)" }}>{age}</div>)}
        </div>
      </div>
      <p role="status">{valid ? `${value} years old` : "No age selected"}</p>
    </div>
  </>;
}
