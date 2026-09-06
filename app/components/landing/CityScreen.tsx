"use client";

import { useEffect, useRef, useState } from "react";
import { CITIES, City, STATE_TAX } from "@/lib/fire-data";

export interface CityState {
  name: string;
  col: number;
  stateKey: string;
  isCustom: boolean;
}

function fmtUSD(n: number) {
  return "$" + Math.round(n).toLocaleString();
}

export default function CityScreen({
  onNext,
  onBack,
  onSkip,
}: {
  onNext: (c: CityState) => void;
  onBack: () => void;
  onSkip?: () => void;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<CityState | null>(null);
  const [showCustom, setShowCustom] = useState(false);
  const [customMonthly, setCustomMonthly] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);

  const matches = query.trim()
    ? CITIES.filter((c) => c.name.toLowerCase().includes(query.toLowerCase())).slice(0, 8)
    : [];

  function pickCity(city: City) {
    setSelected({
      name: city.name,
      col: city.col,
      stateKey: city.state,
      isCustom: false,
    });
    setQuery(city.name);
    setOpen(false);
    setShowCustom(false);
  }

  function openCustom() {
    setOpen(false);
    setShowCustom(true);
    setSelected(null);
    setTimeout(() => document.getElementById("customMonthly")?.focus(), 80);
  }

  function confirmCustom() {
    const monthly = parseInt(customMonthly) || 0;
    if (monthly < 100) return;
    setSelected({
      name: query || "Custom City",
      col: monthly * 12,
      stateKey: "custom",
      isCustom: true,
    });
    setShowCustom(false);
  }

  function skipLocation() {
    onNext({
      name: "Your current lifestyle",
      col: 0,
      stateKey: "custom",
      isCustom: true,
    });
  }

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        dropRef.current &&
        !dropRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const diff = selected ? selected.col - 52000 : 0;

  return (
    <div className="uf-screen">
      <p className="uf-step-label">Step 1 of 4</p>
      <div className="uf-eyebrow">Location</div>
      <h2 className="uf-h2">
        Where do you live
        <br />
        or plan to <span className="uf-accent">live?</span>
      </h2>
      <p className="uf-body" style={{ marginBottom: 32 }}>
        Cost of living and taxes change your freedom date. Pick a city if you know it, or use a rough expense estimate.
      </p>

      <label className="uf-label">Start typing your city or country</label>
      <div style={{ position: "relative" }}>
        <input
          ref={inputRef}
          type="text"
          className="uf-input"
          placeholder="e.g. Austin, Tokyo, London..."
          value={query}
          autoComplete="off"
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
            setSelected(null);
            setShowCustom(false);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.repeat && !e.nativeEvent.isComposing && open && query.trim() && !selected) {
              e.preventDefault();
              if (matches.length) pickCity(matches[0]); else openCustom();
            }
          }}
          onFocus={() => {
            if (query.trim()) setOpen(true);
          }}
        />
        <svg
          className="uf-search-icon"
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <circle cx="11" cy="11" r="8" />
          <path d="M21 21l-4.35-4.35" />
        </svg>

        {open && query.trim() && (
          <div ref={dropRef} className="uf-dropdown">
            {matches.map((c) => (
              <button key={c.key} className="uf-dropdown-item" onClick={() => pickCity(c)}>
                <span className="uf-dropdown-flag">{c.flag}</span>
                <div>
                  <div className="uf-dropdown-name">{c.name}</div>
                  <div className="uf-dropdown-sub">
                    Est. {fmtUSD(c.col)}/yr · Freedom target {fmtUSD(c.col * 25)}
                  </div>
                </div>
              </button>
            ))}
            <button className="uf-dropdown-custom" onClick={openCustom}>
              <span className="uf-dropdown-flag">📍</span>
              <div>
                <div className="uf-dropdown-custom-title">
                  &ldquo;{query}&rdquo; - enter my monthly expenses
                </div>
                <div className="uf-dropdown-sub">
                  My city isn&apos;t in the list - I&apos;ll set it manually
                </div>
              </div>
            </button>
          </div>
        )}
      </div>

      {showCustom && (
        <div className="uf-custom-city">
          <label className="uf-label">
            About how much do you spend each month? (USD)
          </label>
          <p className="uf-hint" style={{ marginTop: -4, marginBottom: 14, lineHeight: 1.6 }}>
            Include housing, food, transport, bills, subscriptions, insurance, debt payments, and everyday spending.
            Don&apos;t worry about being exact — a rough monthly average is fine.
          </p>
          <div className="uf-custom-row">
            <div style={{ position: "relative", flex: 1 }}>
              <span className="uf-input-prefix">$</span>
              <input
                id="customMonthly"
                type="number"
                className="uf-input uf-input-mono"
                style={{ paddingLeft: 28 }}
                placeholder="e.g. 2800"
                min={100}
                value={customMonthly}
                onChange={(e) => setCustomMonthly(e.target.value)}
              />
            </div>
            <span className="uf-unit">/month</span>
            <button
              data-primary-next className="uf-btn uf-btn-primary"
              disabled={!customMonthly || parseInt(customMonthly) < 100}
              onClick={confirmCustom}
            >
              Use this
            </button>
          </div>
          <p className="uf-hint">
            We&apos;ll estimate your freedom target using the 25x rule on your annual expenses.
          </p>
        </div>
      )}

      {selected && (
        <div className="uf-city-info">
          <div className="uf-city-info-label">
            {selected.isCustom
              ? "📍 Custom city - using your manual monthly expense figure"
              : `${CITIES.find((c) => c.name === selected.name)?.flag ?? ""} ${
                  STATE_TAX[selected.stateKey]?.label ?? "Local tax rates apply"
                }`}
          </div>
          <div className="uf-info-card">
            <div className="uf-info-col">
              <div className="uf-info-val">{fmtUSD(selected.col)}</div>
              <div className="uf-info-lab">Est. annual expenses</div>
            </div>
            <div className="uf-info-divider" />
            <div className="uf-info-col">
              <div className="uf-info-val">{fmtUSD(selected.col * 25)}</div>
              <div className="uf-info-lab">FIRE target (25x rule)</div>
            </div>
            <div className="uf-info-divider" />
            <div className="uf-info-col">
              <div
                className="uf-info-val"
                style={{ color: diff > 0 ? "var(--danger)" : "var(--teal)" }}
              >
                {diff >= 0 ? "+" : ""}
                {fmtUSD(diff)}
              </div>
              <div className="uf-info-lab">vs. US avg</div>
            </div>
          </div>
        </div>
      )}

      <div className="uf-nav-row">
        <button className="uf-btn uf-btn-ghost" onClick={onBack}>
          Back
        </button>
        <button className="uf-btn uf-btn-ghost" onClick={skipLocation}>
          Skip for now
        </button>
        <button
          data-primary-next className="uf-btn uf-btn-primary"
          style={{ flex: 1 }}
          disabled={!selected}
          onClick={() => selected && onNext(selected)}
        >
          Continue {"->"}
        </button>
      </div>
    </div>
  );
}