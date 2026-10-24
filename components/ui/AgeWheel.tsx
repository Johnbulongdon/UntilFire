"use client";
import { useEffect, useRef } from 'react';

const ROW = 46, MIN_AGE = 16, MAX_AGE = 85;
const AGES = Array.from({ length: MAX_AGE - MIN_AGE + 1 }, (_, i) => MIN_AGE + i);
const clamp = (n: number) => Math.min(MAX_AGE, Math.max(MIN_AGE, n));

/**
 * Age as a wheel (D-50). Swipe on a phone; on a computer the mouse wheel or
 * trackpad turns it, a click picks a number, and the arrow keys or two typed
 * digits work too. Scroll snapping keeps one age in the band.
 */
export default function AgeWheel({ value, onChange }: { value: number; onChange: (age: number) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const typed = useRef({ s: '', t: 0 });
  const latest = useRef({ value, onChange });
  latest.current = { value, onChange };
  const go = (n: number, smooth = true) => ref.current?.scrollTo({ top: (clamp(n) - MIN_AGE) * ROW, behavior: smooth ? 'smooth' : 'auto' });

  // Land on the starting age, including when the step first becomes visible.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new ResizeObserver(() => { if (el.clientHeight > 0) go(latest.current.value, false); });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const onScroll = () => {
    const el = ref.current;
    if (!el || el.clientHeight === 0) return;
    const n = clamp(MIN_AGE + Math.round(el.scrollTop / ROW));
    if (n !== latest.current.value) latest.current.onChange(n);
  };
  const onKey = (e: React.KeyboardEvent) => {
    const step = e.key === 'ArrowUp' ? -1 : e.key === 'ArrowDown' ? 1 : e.key === 'PageUp' ? -10 : e.key === 'PageDown' ? 10 : 0;
    if (step) { e.preventDefault(); go(value + step); return; }
    if (e.key === 'Home' || e.key === 'End') { e.preventDefault(); go(e.key === 'Home' ? MIN_AGE : MAX_AGE); return; }
    if (/^\d$/.test(e.key)) {
      const now = Date.now(), t = typed.current;
      t.s = now - t.t < 900 ? (t.s + e.key).slice(-2) : e.key;
      t.t = now;
      const n = Number(t.s);
      if (n >= MIN_AGE && n <= MAX_AGE) go(n);
    }
  };

  const fade = 'linear-gradient(transparent, black 30%, black 70%, transparent)';
  return (
    <div style={{ position: 'relative', height: ROW * 5, borderRadius: 18, background: 'var(--uf-card)', border: '1px solid var(--uf-border)' }}>
      <div aria-hidden="true" style={{ position: 'absolute', left: 10, right: 10, top: ROW * 2, height: ROW, borderRadius: 12,
        background: 'color-mix(in srgb, var(--uf-green) 9%, transparent)', border: '1px solid color-mix(in srgb, var(--uf-green) 30%, transparent)' }} />
      <div ref={ref} role="spinbutton" tabIndex={0} aria-label="Your age" aria-valuemin={MIN_AGE} aria-valuemax={MAX_AGE} aria-valuenow={value}
        aria-valuetext={`${value} years old`} onScroll={onScroll} onKeyDown={onKey} className="uf-wheel"
        style={{ position: 'relative', height: '100%', overflowY: 'scroll', scrollSnapType: 'y mandatory', outline: 'none', scrollbarWidth: 'none', maskImage: fade, WebkitMaskImage: fade }}>
        <div style={{ height: ROW * 2 }} />
        {AGES.map(n => {
          const d = Math.abs(n - value);
          return (
            <div key={n} onClick={() => go(n)} style={{ height: ROW, scrollSnapAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              cursor: 'pointer', userSelect: 'none', fontFamily: 'var(--uf-font-display)', fontSize: d === 0 ? 34 : d === 1 ? 24 : 20,
              color: d === 0 ? 'var(--uf-ink)' : 'var(--uf-ink-3)', transition: 'font-size 120ms, color 120ms' }}>
              {n}{d === 0 && <span style={{ font: '500 13px var(--uf-font)', color: 'var(--uf-ink-3)' }}>years old</span>}
            </div>
          );
        })}
        <div style={{ height: ROW * 2 }} />
      </div>
    </div>
  );
}
