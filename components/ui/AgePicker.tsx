"use client";
import { useEffect, useId, useRef } from 'react';

const AGES = ['', ...Array.from({ length: 75 }, (_, i) => String(i + 16))];
const ROW = 44;

/** Native touch scrolling and CSS snapping; desktop keeps its native select. */
export default function AgePicker({ value, onChange, id }: { value: string; onChange: (age: string) => void; id: string }) {
  const wheel = useRef<HTMLDivElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const internal = useRef(false);
  const optionId = useId();
  const index = Math.max(0, AGES.indexOf(value));
  const latestIndex = useRef(index);
  latestIndex.current = index;
  const latest = useRef(onChange);
  latest.current = onChange;

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    if (internal.current) { internal.current = false; return; }
    const element = wheel.current;
    if (element) element.scrollTop = index * ROW;
  }, [index]);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  useEffect(() => {
    const element = wheel.current;
    if (!element) return;
    const observer = new ResizeObserver(() => {
      if (element.clientHeight > 0) element.scrollTop = latestIndex.current * ROW;
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const commitScroll = () => {
    const element = wheel.current;
    if (!element || element.clientHeight === 0) return;
    const next = Math.max(0, Math.min(AGES.length - 1, Math.round(element.scrollTop / ROW)));
    if (AGES[next] !== value) { internal.current = true; latest.current(AGES[next]); }
  };
  const settle = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(commitScroll, 140);
  };

  return <>
    <select id={id} className="uf-age-select uf-age-desktop" value={value} onChange={e => onChange(e.target.value)}>
      {AGES.map(age => <option key={age} value={age}>{age || 'Choose age (optional)'}</option>)}
    </select>
    <div className="uf-age-mobile">
      <p className="uf-hint">Swipe up or down. The centre row is your age.</p>
      <div className="uf-age-wheel-frame">
        <div className="uf-age-wheel-selection" aria-hidden="true" />
        <div className="uf-age-wheel" ref={wheel} role="listbox" tabIndex={0} aria-label="Your current age" aria-activedescendant={`${optionId}-${index}`} onScroll={settle}
          onBlur={() => { if (timer.current) clearTimeout(timer.current); commitScroll(); }}
          onKeyDown={e => {
            const delta = e.key === 'ArrowDown' ? 1 : e.key === 'ArrowUp' ? -1 : e.key === 'PageDown' ? 10 : e.key === 'PageUp' ? -10 : 0;
            if (!delta && e.key !== 'Home' && e.key !== 'End') return;
            e.preventDefault();
            if (timer.current) clearTimeout(timer.current);
            internal.current = false;
            const next = e.key === 'Home' ? 0 : e.key === 'End' ? AGES.length - 1 : Math.max(0, Math.min(AGES.length - 1, index + delta));
            latest.current(AGES[next]);
          }}>
          {AGES.map((age, i) => <div key={age} id={`${optionId}-${i}`} role="option" aria-selected={value === age} className="uf-age-wheel-row" onClick={() => {
            if (timer.current) clearTimeout(timer.current);
            internal.current = true;
            latest.current(age);
            // Commit taps immediately, including a quick tap on Continue.
            // Finger scrolling still uses native momentum and scroll snapping.
            wheel.current?.scrollTo({ top: i * ROW, behavior: 'instant' });
          }}>{age || 'Not set'}</div>)}
        </div>
      </div>
      <p className="uf-age-current" role="status">{value ? `${value} years old` : 'Age is optional — no age selected'}</p>
    </div>
  </>;
}
