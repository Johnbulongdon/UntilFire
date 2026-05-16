"use client";

import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { CITIES } from "@/lib/fire-data";
import { SUPPORTED_CURRENCIES, CURRENCY_NAMES } from "@/lib/currency";

interface PlaidItem {
  id: string;
  institution_name: string;
  last_synced_at: string | null;
}

function fmtSynced(ts: string | null): string {
  if (!ts) return "never synced";
  const diff = Date.now() - new Date(ts).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

interface Props {
  userId: string;
  userEmail: string;
  defaultCurrency: string;
  onDefaultCurrencyChange: (currency: string) => void;
  onPreferredCurrenciesChange: (currencies: string[]) => void;
  onTabChange: (tab: string) => void;
}

export default function ProfileTab({ userId, userEmail, defaultCurrency: initialDefaultCurrency, onDefaultCurrencyChange, onPreferredCurrenciesChange, onTabChange }: Props) {
  const [displayName, setDisplayName] = useState("");
  const [citySearch, setCitySearch] = useState("");
  const [selectedCity, setSelectedCity] = useState<{ name: string; key: string } | null>(null);
  const [showCityDropdown, setShowCityDropdown] = useState(false);
  const [defaultCurrency, setDefaultCurrency] = useState(initialDefaultCurrency || "USD");
  const [preferredCurrencies, setPreferredCurrencies] = useState<string[]>([]);
  const [saving, setSaving] = useState<Record<"name" | "city" | "currency", boolean>>({
    name: false,
    city: false,
    currency: false,
  });
  const [saved, setSaved] = useState<Record<"name" | "city" | "currency", boolean>>({
    name: false,
    city: false,
    currency: false,
  });
  const [plaidItems, setPlaidItems] = useState<PlaidItem[]>([]);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const cityDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function load() {
      const [profileRes, userRes] = await Promise.all([
        supabase.from("profiles").select("display_name, jurisdiction, default_currency, preferred_currencies").eq("user_id", userId).single(),
        supabase.auth.getUser(),
      ]);

      const p = profileRes.data;
      const user = userRes.data.user;

      if (p?.display_name) {
        setDisplayName(p.display_name);
      } else if (user?.user_metadata?.full_name) {
        setDisplayName(user.user_metadata.full_name as string);
      }

      if (p?.jurisdiction) {
        const city = CITIES.find((c) => c.key === p.jurisdiction);
        if (city) {
          setSelectedCity({ name: city.name, key: city.key });
          setCitySearch(city.name);
        }
      }

      if (p?.default_currency) {
        setDefaultCurrency(p.default_currency);
        onDefaultCurrencyChange(p.default_currency);
      }

      if (p?.preferred_currencies) {
        setPreferredCurrencies(p.preferred_currencies as string[]);
        onPreferredCurrenciesChange(p.preferred_currencies as string[]);
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        fetch("/api/plaid/items", {
          headers: { Authorization: `Bearer ${session.access_token}` },
        })
          .then((r) => r.json())
          .then((d) => setPlaidItems(d.items ?? []))
          .catch(() => {});
      }
    }
    load();
  }, [userId, onDefaultCurrencyChange]);

  useEffect(() => {
    setDefaultCurrency(initialDefaultCurrency || "USD");
  }, [initialDefaultCurrency]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (cityDropdownRef.current && !cityDropdownRef.current.contains(e.target as Node)) {
        setShowCityDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const filteredCities = citySearch.length >= 2
    ? CITIES.filter((c) => c.name.toLowerCase().includes(citySearch.toLowerCase())).slice(0, 8)
    : [];

  function flash(key: "name" | "city" | "currency") {
    setSaved((prev) => ({ ...prev, [key]: true }));
    setTimeout(() => setSaved((prev) => ({ ...prev, [key]: false })), 2000);
  }

  async function saveName() {
    if (!displayName.trim()) return;
    setSaving((s) => ({ ...s, name: true }));
    await Promise.all([
      supabase.auth.updateUser({ data: { full_name: displayName.trim() } }),
      supabase.from("profiles").upsert(
        { user_id: userId, display_name: displayName.trim(), updated_at: new Date().toISOString() },
        { onConflict: "user_id" }
      ),
    ]);
    setSaving((s) => ({ ...s, name: false }));
    flash("name");
  }

  async function saveCity() {
    if (!selectedCity) return;
    setSaving((s) => ({ ...s, city: true }));

    await supabase.from("profiles").upsert(
      { user_id: userId, jurisdiction: selectedCity.key, updated_at: new Date().toISOString() },
      { onConflict: "user_id" }
    );

    // Keep user_budget _fire_profile.cityName in sync
    const { data: ub } = await supabase.from("user_budget").select("expenses").eq("user_id", userId).single();
    if (ub) {
      const expenses = ub.expenses as Record<string, unknown> || {};
      const fp = (expenses._fire_profile as Record<string, unknown>) || {};
      await supabase.from("user_budget").update({
        expenses: { ...expenses, _fire_profile: { ...fp, cityName: selectedCity.name } },
        updated_at: new Date().toISOString(),
      }).eq("user_id", userId);
    }

    setSaving((s) => ({ ...s, city: false }));
    flash("city");
  }

  async function saveCurrency() {
    setSaving((s) => ({ ...s, currency: true }));
    await supabase.from("profiles").upsert(
      { user_id: userId, default_currency: defaultCurrency, preferred_currencies: preferredCurrencies, updated_at: new Date().toISOString() },
      { onConflict: "user_id" }
    );
    setSaving((s) => ({ ...s, currency: false }));
    onDefaultCurrencyChange(defaultCurrency);
    onPreferredCurrenciesChange(preferredCurrencies);
    flash("currency");
  }

  function toggleCurrency(c: string) {
    setPreferredCurrencies(prev =>
      prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c]
    );
  }

  async function handleDelete() {
    if (deleteConfirm !== userEmail) return;
    setDeleting(true);
    setDeleteError("");

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setDeleting(false); setDeleteError("Session expired. Please refresh."); return; }

    const res = await fetch("/api/user/delete", {
      method: "DELETE",
      headers: { authorization: `Bearer ${session.access_token}` },
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setDeleting(false);
      setDeleteError(body.error || "Failed to delete account. Please try again.");
      return;
    }

    await supabase.auth.signOut();
    window.location.href = "/";
  }

  const cardStyle: React.CSSProperties = {
    background: "#fff",
    borderRadius: 12,
    border: "1px solid #E2E8F0",
    padding: "24px 28px",
    marginBottom: 20,
  };

  const labelStyle: React.CSSProperties = {
    display: "block",
    fontSize: 13,
    fontWeight: 600,
    color: "#374151",
    marginBottom: 6,
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "9px 12px",
    border: "1px solid #E2E8F0",
    borderRadius: 8,
    fontSize: 14,
    color: "#1a1a2e",
    background: "#fff",
    outline: "none",
    boxSizing: "border-box",
  };

  const btnStyle = (variant: "primary" | "danger" | "disabled"): React.CSSProperties => ({
    padding: "9px 20px",
    borderRadius: 8,
    fontSize: 14,
    fontWeight: 600,
    border: "none",
    cursor: variant === "disabled" ? "not-allowed" : "pointer",
    background: variant === "primary" ? "#059669" : variant === "danger" ? "#dc2626" : "#E2E8F0",
    color: variant === "primary" || variant === "danger" ? "#fff" : "#9ca3af",
    opacity: variant === "disabled" ? 0.6 : 1,
    whiteSpace: "nowrap",
  });

  return (
    <div style={{ maxWidth: 600, padding: "32px 24px" }}>
      <h2 style={{ fontSize: 22, fontWeight: 700, color: "#064E3B", marginBottom: 24, marginTop: 0 }}>
        Profile &amp; Settings
      </h2>

      {/* Account */}
      <div style={cardStyle}>
        <h3 style={{ fontSize: 15, fontWeight: 700, color: "#064E3B", margin: "0 0 16px" }}>Account</h3>
        <label style={labelStyle}>Display name</label>
        <div style={{ display: "flex", gap: 10 }}>
          <input
            style={inputStyle}
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Your name"
            onKeyDown={(e) => e.key === "Enter" && saveName()}
          />
          <button
            style={btnStyle(saving.name ? "disabled" : "primary")}
            onClick={saveName}
            disabled={saving.name || !displayName.trim()}
          >
            {saving.name ? "Saving…" : saved.name ? "Saved ✓" : "Save"}
          </button>
        </div>
        <p style={{ fontSize: 12, color: "#94a3b8", marginTop: 6, marginBottom: 0 }}>
          This is how your name appears in the dashboard greeting.
        </p>
      </div>

      {/* Location */}
      <div style={cardStyle}>
        <h3 style={{ fontSize: 15, fontWeight: 700, color: "#064E3B", margin: "0 0 16px" }}>Location</h3>
        <label style={labelStyle}>City</label>
        <div ref={cityDropdownRef} style={{ position: "relative", marginBottom: 10 }}>
          <input
            style={inputStyle}
            value={citySearch}
            onChange={(e) => {
              setCitySearch(e.target.value);
              setSelectedCity(null);
              setShowCityDropdown(true);
            }}
            onFocus={() => setShowCityDropdown(true)}
            placeholder="Search 263 cities…"
          />
          {showCityDropdown && filteredCities.length > 0 && (
            <div style={{
              position: "absolute", top: "100%", left: 0, right: 0, zIndex: 50,
              background: "#fff", border: "1px solid #E2E8F0", borderRadius: 8,
              boxShadow: "0 4px 16px rgba(0,0,0,0.1)", maxHeight: 220, overflowY: "auto",
              marginTop: 4,
            }}>
              {filteredCities.map((c) => (
                <div
                  key={c.key}
                  onMouseDown={() => {
                    setSelectedCity({ name: c.name, key: c.key });
                    setCitySearch(c.name);
                    setShowCityDropdown(false);
                  }}
                  style={{
                    padding: "10px 14px", cursor: "pointer", fontSize: 14,
                    borderBottom: "1px solid #f1f5f9",
                    background: selectedCity?.key === c.key ? "#f0fdf4" : undefined,
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "#f8fafc")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = selectedCity?.key === c.key ? "#f0fdf4" : "")}
                >
                  {c.flag} {c.name}
                </div>
              ))}
            </div>
          )}
        </div>
        <button
          style={btnStyle(!selectedCity || saving.city ? "disabled" : "primary")}
          onClick={saveCity}
          disabled={!selectedCity || saving.city}
        >
          {saving.city ? "Saving…" : saved.city ? "Saved ✓" : "Save city"}
        </button>
        <p style={{ fontSize: 12, color: "#94a3b8", marginTop: 8, marginBottom: 0 }}>
          Used to set your cost-of-living baseline in FIRE calculations.
        </p>
      </div>

      {/* Preferences */}
      <div style={cardStyle}>
        <h3 style={{ fontSize: 15, fontWeight: 700, color: "#064E3B", margin: "0 0 16px" }}>Preferences</h3>
        <label style={labelStyle}>Default currency</label>
        <div style={{ display: "flex", gap: 10 }}>
          <select
            style={{ ...inputStyle, width: "auto", minWidth: 120, cursor: "pointer" }}
            value={defaultCurrency}
            onChange={(e) => setDefaultCurrency(e.target.value)}
          >
            {SUPPORTED_CURRENCIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <button
            style={btnStyle(saving.currency ? "disabled" : "primary")}
            onClick={saveCurrency}
            disabled={saving.currency}
          >
            {saving.currency ? "Saving…" : saved.currency ? "Saved ✓" : "Save"}
          </button>
        </div>
        <p style={{ fontSize: 12, color: "#94a3b8", marginTop: 6, marginBottom: 0 }}>
          Sets the dashboard display currency and pre-fills new transaction entries.
        </p>

        <div style={{ marginTop: 20 }}>
          <label style={labelStyle}>Preferred currencies</label>
          <p style={{ fontSize: 12, color: "#94a3b8", margin: "0 0 10px" }}>
            Only checked currencies appear in dropdowns. Leave all unchecked to show every currency.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 6 }}>
            {SUPPORTED_CURRENCIES.map((c) => {
              const checked = preferredCurrencies.includes(c);
              return (
                <label key={c} style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", padding: "5px 8px", borderRadius: 8, background: checked ? "#F0FDF4" : "#F8FAFC", border: `1px solid ${checked ? "#BBF7D0" : "#E2E8F0"}`, transition: "all 0.15s" }}>
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleCurrency(c)}
                    style={{ accentColor: "#059669", width: 14, height: 14, flexShrink: 0 }}
                  />
                  <span style={{ fontSize: 12, fontWeight: 700, color: "#19181E", fontFamily: "DM Mono, monospace" }}>{c}</span>
                  <span style={{ fontSize: 11, color: "#64748B", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{CURRENCY_NAMES[c]}</span>
                </label>
              );
            })}
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
            <button onClick={() => setPreferredCurrencies([...SUPPORTED_CURRENCIES])} style={{ fontSize: 12, color: "#059669", background: "none", border: "1px solid #D1FAE5", borderRadius: 6, padding: "4px 10px", cursor: "pointer", fontFamily: "inherit" }}>
              Select all
            </button>
            <button onClick={() => setPreferredCurrencies([])} style={{ fontSize: 12, color: "#64748B", background: "none", border: "1px solid #E2E8F0", borderRadius: 6, padding: "4px 10px", cursor: "pointer", fontFamily: "inherit" }}>
              Clear all
            </button>
          </div>
        </div>
      </div>

      {/* Connected Banks */}
      <div style={cardStyle}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: "#064E3B", margin: 0 }}>Connected Banks</h3>
          <button
            onClick={() => onTabChange("cashflow")}
            style={{ fontSize: 13, fontWeight: 600, color: "#047857", background: "none", border: "1px solid #D1FAE5", borderRadius: 8, padding: "5px 12px", cursor: "pointer" }}
          >
            Manage →
          </button>
        </div>
        {plaidItems.length === 0 ? (
          <div style={{ fontSize: 13, color: "#94A3B8" }}>
            No banks connected yet.{" "}
            <button onClick={() => onTabChange("cashflow")} style={{ background: "none", border: "none", color: "#047857", fontWeight: 600, cursor: "pointer", padding: 0, fontSize: 13 }}>
              Connect one →
            </button>
          </div>
        ) : (
          plaidItems.map((item, i) => (
            <div key={item.id} style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              padding: "10px 0",
              borderBottom: i < plaidItems.length - 1 ? "1px solid #F1F5F9" : "none",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 16 }}>🏦</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: "#19181E" }}>{item.institution_name}</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 12, color: "#94A3B8" }}>
                <span style={{ color: "#059669", fontWeight: 600 }}>● Connected</span>
                <span>{fmtSynced(item.last_synced_at)}</span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Danger zone */}
      <div style={{ ...cardStyle, borderColor: "#fecaca", background: "#fff" }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, color: "#dc2626", margin: "0 0 8px" }}>Danger Zone</h3>
        <p style={{ fontSize: 14, color: "#6b7280", margin: "0 0 16px" }}>
          Permanently deletes your account, all transactions, and FIRE data. This cannot be undone.
        </p>
        <label style={{ ...labelStyle, color: "#6b7280" }}>
          Type your email address to confirm: <strong>{userEmail}</strong>
        </label>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <input
            style={{ ...inputStyle, borderColor: deleteConfirm && deleteConfirm !== userEmail ? "#fca5a5" : "#E2E8F0" }}
            type="email"
            value={deleteConfirm}
            onChange={(e) => { setDeleteConfirm(e.target.value); setDeleteError(""); }}
            placeholder={userEmail}
          />
          <button
            style={btnStyle(deleting || deleteConfirm !== userEmail ? "disabled" : "danger")}
            onClick={handleDelete}
            disabled={deleting || deleteConfirm !== userEmail}
          >
            {deleting ? "Deleting…" : "Delete account"}
          </button>
        </div>
        {deleteError && (
          <p style={{ fontSize: 13, color: "#dc2626", marginTop: 8, marginBottom: 0 }}>{deleteError}</p>
        )}
      </div>
    </div>
  );
}
