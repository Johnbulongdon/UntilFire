"use client";
import { useId, useState, type ReactNode } from 'react';
import SettlingNumber from './SettlingNumber';

/** Exact tap targets, not income bands silently converted to their midpoints. */
export default function AmountChoice({ value, options, onChange, symbol, unit = '', children }: {
  value: number | null; options: number[]; onChange: (value: number) => void;
  symbol: string; unit?: string; children: ReactNode;
}) {
  const [editing, setEditing] = useState(false);
  const id = useId();
  const choices = [...new Set(options.map(n => Math.max(0, Math.round(n))))];
  const longAmounts = choices.some(amount => symbol.length + amount.toLocaleString().length > 12);
  return <div className="uf-amount-picker">
    <p className="uf-amount-readout">{value === null ? 'Choose an amount' : <>{symbol}<SettlingNumber value={value} /><span>{unit}</span></>}</p>
    <div className={`uf-amount-options${longAmounts ? ' uf-amount-options-long' : ''}`} role="group" aria-label="Choose an approximate amount">
      {choices.map(amount => <button type="button" key={amount} className="uf-amount-choice" aria-pressed={value === amount} onClick={() => onChange(amount)}>
        <span>{symbol}{amount.toLocaleString()}</span>
        <span className="uf-choice-check" aria-hidden="true">{value === amount ? '✓' : ''}</span>
      </button>)}
    </div>
    <p className="uf-hint">Choose a close estimate, or enter your own amount.</p>
    <button type="button" className="uf-exact-toggle" aria-expanded={editing} aria-controls={id} onClick={() => setEditing(v => !v)}>{editing ? 'Done editing' : 'Enter a different amount'}</button>
    <div id={id} hidden={!editing} inert={!editing}>{children}</div>
  </div>;
}
