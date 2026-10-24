"use client";
import type { ReactNode } from 'react';

export type AmountOption = { value: number; sub: string; tag?: string };

/**
 * Four suggestions worked out from earlier answers, then the screen's own
 * number field as a fifth, full-width tile (D-50). The field always shows the
 * amount in use, so a picked tile and a typed amount read the same way.
 */
export default function AmountTiles({ value, options, onChange, symbol, unit, label, children }: {
  value: number | null; options: AmountOption[]; onChange: (value: number) => void;
  symbol: string; unit?: string; label: string; children: ReactNode;
}) {
  const seen = new Set<number>();
  const choices = options.map(o => ({ ...o, value: Math.max(0, Math.round(o.value)) })).filter(o => !seen.has(o.value) && seen.add(o.value));
  const custom = value !== null && !choices.some(o => o.value === value);
  return <div className="uf-tiles" role="group" aria-label={label}>
    {choices.map(o => <button type="button" key={o.value} className="uf-tile" aria-pressed={value === o.value} onClick={() => onChange(o.value)}>
      <span className="uf-tile-v">{symbol}{o.value.toLocaleString()}</span>
      <span className="uf-tile-sub">{o.sub}</span>
      {o.tag && <span className="uf-tile-tag">{o.tag}</span>}
    </button>)}
    <label className={`uf-tile uf-tile-other${custom ? ' on' : ''}`}>
      <span className="uf-tile-v" style={{ color: 'var(--uf-ink-3)' }} aria-hidden="true">{symbol}</span>
      {children}
      {unit && <span className="uf-ob-small">{unit}</span>}
    </label>
  </div>;
}
