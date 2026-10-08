"use client";

import { useEffect, useState } from "react";
import { CITIES } from "@/lib/fire-data";
import { formatMoney } from "@/lib/money";

export interface CityState {
  name: string;
  col: number;
  stateKey: string;
  isCustom: boolean;
}

/** A best guess at the city from the device's time zone; nothing leaves the device. */
const ZONE: Record<string, string> = {
  "America/Chicago": "Chicago, IL",
  "America/New_York": "New York City, NY",
  "America/Los_Angeles": "Los Angeles, CA",
  "Europe/London": "London, UK",
  "Asia/Singapore": "Singapore",
  "Australia/Sydney": "Sydney, Australia",
  "America/Toronto": "Toronto, Canada",
};
const POPULAR = ["Austin, TX", "New York City, NY", "London, UK", "Singapore"];

/** Where you live (D-50): search, a near-you guess, a few popular cities. */
export default function CityScreen({
  onNext,
  onAnswer,
  initialCity,
}: {
  onNext: (c: CityState) => void;
  /** The current pick, for the scene's answer tag. */
  onAnswer?: (name: string) => void;
  initialCity?: CityState | null;
}) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<CityState | null>(initialCity ?? null);
  const [near, setNear] = useState<string | undefined>(undefined);

  useEffect(() => {
    try { setNear(ZONE[Intl.DateTimeFormat().resolvedOptions().timeZone]); } catch { /* no time zone */ }
  }, []);
  useEffect(() => { onAnswer?.(selected?.name ?? ""); }, [selected, onAnswer]);

  const q = query.trim().toLowerCase();
  const matches = q ? CITIES.filter((c) => c.name.toLowerCase().includes(q)).slice(0, 5) : [];

  const row = (name: string, tag?: string) => {
    const c = CITIES.find((x) => x.name === name);
    if (!c) return null;
    const on = selected?.name === c.name;
    return (
      <button key={c.key} type="button" className="uf-tile" aria-pressed={on} style={{ display: "flex", alignItems: "center", gap: 12 }}
        onClick={() => { setSelected({ name: c.name, col: c.col, stateKey: c.state, isCustom: false }); setQuery(""); }}>
        <span aria-hidden="true" style={{ fontSize: 20 }}>{c.flag}</span>
        <span style={{ flex: 1, minWidth: 0 }}>
          <span style={{ display: "block", fontWeight: 600 }}>{c.name}</span>
          <span className="uf-tile-sub">Living costs about {formatMoney(c.col / 12)} a month</span>
        </span>
        {tag && <span className="uf-tile-tag" style={{ position: "static" }}>{tag}</span>}
      </button>
    );
  };

  return (
    <div className="uf-screen" style={{ paddingTop: 16 }}>
      <h2 className="uf-ob-q">Where do you live?</h2>
      <p className="uf-ob-hint">It sets the taxes. Skip it and we use your own spending.</p>

      <div style={{ display: "grid", gap: 8 }}>
        <label className="uf-tile" style={{ display: "flex", alignItems: "center", gap: 10, cursor: "text" }}>
          <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden><circle cx="11" cy="11" r="7" fill="none" stroke="var(--uf-ink-3)" strokeWidth="2" /><path d="M20 20l-4-4" stroke="var(--uf-ink-3)" strokeWidth="2" strokeLinecap="round" /></svg>
          <input aria-label="Search cities" placeholder={`Search ${Math.floor(CITIES.length / 10) * 10}+ cities`} value={query} autoComplete="off"
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.nativeEvent.isComposing && matches.length) {
                e.preventDefault();
                e.stopPropagation();
                const c = matches[0];
                setSelected({ name: c.name, col: c.col, stateKey: c.state, isCustom: false });
                setQuery("");
              }
            }}
            style={{ flex: 1, minWidth: 0, border: 0, outline: 0, background: "transparent", font: "inherit", fontSize: 16, color: "var(--uf-ink)", padding: 0 }} />
        </label>

        {q ? (
          matches.length ? matches.map((c) => row(c.name)) : (
            <button type="button" className="uf-tile" aria-pressed={selected?.isCustom && selected.name === query.trim()}
              onClick={() => setSelected({ name: query.trim(), col: 0, stateKey: "custom", isCustom: true })}>
              <span style={{ display: "block", fontWeight: 600 }}>Use &ldquo;{query.trim()}&rdquo;</span>
              <span className="uf-tile-sub">Not in our list yet. We&apos;ll use your own spending instead.</span>
            </button>
          )
        ) : (
          <>
            {selected && selected.name !== near && !POPULAR.slice(0, 3).includes(selected.name) && (
              selected.isCustom
                ? <button type="button" className="uf-tile" aria-pressed><span style={{ fontWeight: 600 }}>{selected.name}</span><span className="uf-tile-sub">Using your own spending</span></button>
                : row(selected.name)
            )}
            {near && row(near, "NEAR YOU")}
            <span className="uf-ob-section">Popular</span>
            {POPULAR.filter((n) => n !== near).slice(0, 3).map((n) => row(n))}
          </>
        )}
      </div>

      <div className="uf-ob-foot">
        <button data-primary-next className="uf-btn uf-btn-primary" disabled={!selected} onClick={() => selected && onNext(selected)}>
          Continue
        </button>
      </div>
    </div>
  );
}
