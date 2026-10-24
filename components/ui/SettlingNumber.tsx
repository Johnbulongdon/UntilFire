"use client";
import { useContext, useLayoutEffect, useRef } from 'react';
import { MotionPreviewPreference } from '@/lib/motion-preview-preference';

/** Animate presentation only; expose the exact current result to screen readers. */
export default function SettlingNumber({ value, format = (n: number) => Math.round(n).toLocaleString() }: { value: number; format?: (n: number) => string }) {
  const output = useRef<HTMLSpanElement>(null);
  const forceMotion = useContext(MotionPreviewPreference);
  const shown = useRef(value);
  const formatter = useRef(format);
  formatter.current = format;
  useLayoutEffect(() => {
    const node = output.current;
    if (!node) return;
    const pref = matchMedia('(prefers-reduced-motion: reduce)');
    let frame = 0;
    const finish = () => { cancelAnimationFrame(frame); shown.current = value; node.textContent = formatter.current(value); };
    if (pref.matches && !forceMotion) { finish(); return; }
    const from = shown.current, start = performance.now();
    node.textContent = formatter.current(from);
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / 280);
      shown.current = from + (value - from) * (1 - Math.pow(1 - t, 3));
      node.textContent = formatter.current(shown.current);
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    const changed = () => { if (pref.matches && !forceMotion) finish(); };
    pref.addEventListener('change', changed);
    frame = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(frame); pref.removeEventListener('change', changed); };
  }, [value, forceMotion]);
  return <span><span className="uf-motion-sr">{format(value)}</span><span aria-hidden="true" ref={output}>{format(value)}</span></span>;
}
