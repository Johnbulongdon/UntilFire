"use client";
import { useEffect, useRef, useState } from 'react';

/** Digits and one decimal point, without leading zeros ("0140000" → "140000", "0" and "0.5" stay). */
export function cleanAmount(text: string): string {
  const [whole, ...rest] = text.replace(/[^\d.]/g, '').split('.');
  const digits = whole.replace(/^0+(?=\d)/, '');
  return rest.length ? `${digits || '0'}.${rest.join('').slice(0, 2)}` : digits;
}

const format = (value: string) => {
  if (value === '') return '';
  const [whole, cents] = value.split('.');
  return `${Number(whole).toLocaleString('en-US')}${cents !== undefined ? `.${cents}` : ''}`;
};

/**
 * A money amount typed as text: numeric keyboard on phones, empty stays
 * empty (never a silent zero), and thousands separators appear when the
 * field loses focus. What you type is left alone while you type, so the
 * caret never jumps and a select-all or paste replaces it cleanly.
 */
export default function MoneyField({ value, onChange, label, placeholder = 'Other amount' }: {
  /** The amount as cleaned text; '' means not answered. */
  value: string; onChange: (value: string) => void; label: string; placeholder?: string;
}) {
  const [text, setText] = useState(() => format(value));
  const focused = useRef(false);
  // A tile pick or a converted amount shows up unless you are mid-edit.
  useEffect(() => { if (!focused.current) setText(format(value)); }, [value]);
  return <input type="text" inputMode="decimal" autoComplete="off" aria-label={label} placeholder={placeholder} value={text}
    onFocus={() => { focused.current = true; }}
    onBlur={() => { focused.current = false; setText(format(value)); }}
    onChange={e => { const typed = e.target.value.replace(/[^\d.,]/g, ''); setText(typed); onChange(cleanAmount(typed)); }} />;
}
