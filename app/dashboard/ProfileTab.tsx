"use client";

import { useState, useEffect } from "react";
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
  subscription: { plan: "free" | "pro" } | null;
  onUpgradeClick: () => void;
  onManageBilling: () => void;
  fireAge: number;
  onFireAgeChange: (age: number) => void;
  retirementCityName: string;
  retirementCityCol: number;
  lifestyleMultiplier: number;
  onRetirementCityChange: (name: string, col: number) => void;
  onLifestyleChange: (multiplier: number) => void;
}

export default function ProfileTab({
  userId,
  userEmail,
  defaultCurrency: initialDefaultCurrency,
  onDefaultCurrencyChange,
  onPreferredCurrenciesChange,
  onTabChange,
  subscription,
  onUpgradeClick,
  onManageBilling,
  fireAge,
  onFireAgeChange,
  retirementCityName,
  retirementCityCol,
  lifestyleMultiplier,
  onRetirementCityChange,
  onLifestyleChange,
}: Props) {
  const [displayName, setDisplayName] = useState("");
  const [retirementCitySearch, setRetirementCitySearch] = useState(retirementCityName);
  const [showRetirementCityDropdown, setShowRetirementCityDropdown] = useState(false);
  const [fireProfileSaved, setFireProfileSaved] = useState(false);
  const [fireTypeResult, setFireTypeResult] = useState<{ code: string; name: string } | null>(null);
  const [defaultCurrency, setDefaultCurrency] = useState(initialDefaultCurrency || "USD");
  const [preferredCurrencies, setPreferredCurrencies] = useState<string[]>([]);
  const [saving, setSaving] = useState<Record<"name" | "currency", boolean>>({
    name: false,
    currency: false,
  });
  const [saved, setSaved] = useState<Record<"name" | "currency", boolean>>({
    name: false,
    currency: false,
  });
  const [plaidItems, setPlaidItems] = useState<PlaidItem[]>([]);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  useEffect(() => {
    async function load() {
      const [profileRes, userRes] = await Promise.all([
        supabase.from("profiles").select("display_name, default_currency, preferred_currencies").eq("user_id", userId).single(),
        supabase.auth.getUser(),
      ]);

      const p = profileRes.data;
      const user = userRes.data.user;

      if (p?.display_name) {
        setDisplayName(p.display_name);
      } else if (user?.user_metadata?.full_name) {
        setDisplayName(user.user_metadata.full_name as string);
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
  }, [userId, onDefaultCurrencyChange, onPreferredCurrenciesChange]);

  useEffect(() => {
    setDefaultCurrency(initialDefaultCurrency || "USD");
  }, [initialDefaultCurrency]);

  useEffect(() => {
    setRetirementCitySearch(retirementCityName);
  }, [retirementCityName]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("uf_fire_type_result");
      if (raw) setFireTypeResult(JSON.parse(raw));
    } catch { /* ignore */ }
  }, []);

  const retirementCitySearchTrimmed = retirementCitySearch.trim();
  const filteredRetirementCities = retirementCitySearchTrimmed.length >= 2
    ? CITIES.filter((c) => c.name.toLowerCase().includes(retirementCitySearchTrimmed.toLowerCase())).slice(0, 8)
    : [];
  const canUseTypedRetirementCity = retirementCitySearchTrimmed.length >= 2
    && !filteredRetirementCities.some((c) => c.name.toLowerCase() === retirementCitySearchTrimmed.toLowerCase());

  const lifestyleTiers = [
    { label: "Frugal", multiplier: 0.7, icon: "🌱" },
    { label: "Standard", multiplier: 1.0, icon: "🏡" },
    { label: "Lavish", multiplier: 1.5, icon: "💎" },
  ];

  const selectedLifestyle = lifestyleTiers.find(t => t.multiplier === lifestyleMultiplier) ?? lifestyleTiers[1];
  const targetAnnualSpend = retirementCityCol > 0 ? retirementCityCol * lifestyleMultiplier : 0;
  const targetFireNumber = targetAnnualSpend * 25;
  const formatMoney = (n: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: defaultCurrency, maximumFractionDigits: 0 }).format(n);

  function markFireProfileSaved() {
    setFireProfileSaved(true);
    setTimeout(() => setFireProfileSaved(false), 2000);
  }

  function updateFireAge(nextAge: number) {
    onFireAgeChange(nextAge);
    markFireProfileSaved();
  }

  function updateRetirementCity(name: string, col: number) {
    onRetirementCityChange(name, col);
    setRetirementCitySearch(name);
    setShowRetirementCityDropdown(false);
    markFireProfileSaved();
  }

  function flash(key: "name" | "currency") {
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
    background: "var(--uf-card)",
    borderRadius: 12,
    border: "1px solid var(--uf-border)",
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
    border: "1px solid var(--uf-border)",
    borderRadius: 8,
    fontSize: 14,
    color: "#1a1a2e",
    background: "var(--uf-card)",
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
                  <span style={{ fontSize: 12, fontWeight: 700, color: "var(--uf-text)", fontFamily: "DM Mono, monospace" }}>{c}</span>
                  <span style={{ fontSize: 11, color: "var(--uf-text-2)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{CURRENCY_NAMES[c]}</span>
                </label>
              );
            })}
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
            <button onClick={() => setPreferredCurrencies([...SUPPORTED_CURRENCIES])} style={{ fontSize: 12, color: "#059669", background: "none", border: "1px solid #D1FAE5", borderRadius: 6, padding: "4px 10px", cursor: "pointer", fontFamily: "inherit" }}>
              Select all
            </button>
            <button onClick={() => setPreferredCurrencies([])} style={{ fontSize: 12, color: "var(--uf-text-2)", background: "none", border: "1px solid var(--uf-border)", borderRadius: 6, padding: "4px 10px", cursor: "pointer", fontFamily: "inherit" }}>
              Clear all
            </button>
          </div>
        </div>
      </div>

      {/* FIRE profile */}
      <div style={cardStyle}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 14 }}>
          <div>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: "#064E3B", margin: "0 0 6px" }}>FIRE profile</h3>
            <p style={{ fontSize: 13, color: "var(--uf-text-2)", lineHeight: 1.6, margin: 0 }}>
              These assumptions personalize your freedom date across the dashboard.
            </p>
          </div>
          {fireProfileSaved && <span style={{ fontSize: 12, color: "#059669", fontWeight: 700 }}>Saved ✓</span>}
        </div>

        <label style={labelStyle}>Current age</label>
        <input
          type="number"
          min={18}
          max={100}
          value={fireAge || ""}
          onChange={(e) => updateFireAge(Number(e.target.value))}
          style={{ ...inputStyle, maxWidth: 140, marginBottom: 16 }}
          placeholder="30"
        />

        <label style={labelStyle}>Retirement target city</label>
        <div style={{ position: "relative", marginBottom: 12 }}>
          <input
            style={inputStyle}
            value={retirementCitySearch}
            onChange={(e) => {
              setRetirementCitySearch(e.target.value);
              setShowRetirementCityDropdown(true);
            }}
            onFocus={() => setShowRetirementCityDropdown(true)}
            placeholder="Where should freedom be priced?"
          />
          {showRetirementCityDropdown && retirementCitySearchTrimmed.length >= 2 && (filteredRetirementCities.length > 0 || canUseTypedRetirementCity) && (
            <div style={{
              position: "absolute", top: "100%", left: 0, right: 0, zIndex: 50,
              background: "var(--uf-card)", border: "1px solid var(--uf-border)", borderRadius: 8,
              boxShadow: "0 4px 16px rgba(0,0,0,0.1)", maxHeight: 220, overflowY: "auto",
              marginTop: 4,
            }}>
              {filteredRetirementCities.map((c) => (
                <div
                  key={c.key}
                  onMouseDown={() => updateRetirementCity(c.name, c.col)}
                  style={{ padding: "10px 14px", cursor: "pointer", fontSize: 14, borderBottom: "1px solid #f1f5f9" }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "#f8fafc")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "")}
                >
                  {c.flag} {c.name}
                </div>
              ))}
              {canUseTypedRetirementCity && (
                <div
                  onMouseDown={() => updateRetirementCity(retirementCitySearchTrimmed, 0)}
                  style={{ padding: "10px 14px", cursor: "pointer", fontSize: 14, color: "#047857", fontWeight: 700 }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "#f0fdf4")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "")}
                >
                  📍 Use “{retirementCitySearchTrimmed}”
                  <div style={{ fontSize: 12, color: "var(--uf-text-2)", fontWeight: 500, marginTop: 2 }}>
                    We’ll save the city name even if it is not in our estimate list yet.
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <label style={labelStyle}>Lifestyle target</label>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginBottom: 14 }}>
          {lifestyleTiers.map((tier) => (
            <button
              key={tier.label}
              onClick={() => { onLifestyleChange(tier.multiplier); markFireProfileSaved(); }}
              style={{
                padding: "10px 8px", borderRadius: 10, cursor: "pointer", fontFamily: "inherit",
                border: lifestyleMultiplier === tier.multiplier ? "1.5px solid #059669" : "1px solid #E2E8F0",
                background: lifestyleMultiplier === tier.multiplier ? "#F0FDF4" : "#fff",
                color: lifestyleMultiplier === tier.multiplier ? "#047857" : "#374151",
                fontWeight: 700,
              }}
            >
              <span style={{ display: "block", fontSize: 18 }}>{tier.icon}</span>
              <span style={{ fontSize: 12 }}>{tier.label}</span>
            </button>
          ))}
        </div>

        <div style={{ background: "var(--uf-surface)", border: "1px solid var(--uf-border)", borderRadius: 10, padding: "12px 14px", marginBottom: 14 }}>
          <div style={{ fontSize: 12, color: "var(--uf-text-2)", marginBottom: 4 }}>Current target</div>
          <div style={{ fontSize: 14, fontWeight: 800, color: "var(--uf-text)" }}>
            {retirementCityName ? `${retirementCityName} · ${selectedLifestyle.label}` : "Choose a city to price your freedom date"}
          </div>
          {targetFireNumber > 0 && (
            <div style={{ fontSize: 12, color: "var(--uf-text-2)", marginTop: 4 }}>
              Rough target: {formatMoney(targetAnnualSpend)}/yr × 25 = {formatMoney(targetFireNumber)}
            </div>
          )}
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", maxWidth: "100%" }}>
          <a
            href={`/fire-type?source=dashboard-profile${fireTypeResult ? `&type=${fireTypeResult.code}` : ""}`}
            style={{
              ...btnStyle("primary"),
              textDecoration: "none",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              flex: "1 1 260px",
              minWidth: 0,
              maxWidth: "100%",
              boxSizing: "border-box",
              textAlign: "center",
              whiteSpace: "normal",
              overflowWrap: "anywhere",
            }}
          >
            {fireTypeResult ? `FIRE type: ${fireTypeResult.name} →` : "Find my FIRE type →"}
          </a>
          <button
            onClick={() => onTabChange("fire-calculator")}
            style={{
              padding: "9px 16px",
              borderRadius: 8,
              fontSize: 14,
              fontWeight: 700,
              border: "1px solid #BBF7D0",
              background: "#F0FDF4",
              color: "#047857",
              cursor: "pointer",
              fontFamily: "inherit",
              flex: "1 1 180px",
              minWidth: 0,
              maxWidth: "100%",
              boxSizing: "border-box",
            }}
          >
            View freedom date →
          </button>
        </div>
      </div>

      {/* Subscription */}
      <div style={cardStyle}>
        <h3 style={{ fontSize: 15, fontWeight: 700, color: "#064E3B", margin: "0 0 16px" }}>Subscription</h3>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{
              display: "inline-block", padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700,
              background: subscription?.plan === "pro" ? "#f0fdf4" : "#f1f5f9",
              color: subscription?.plan === "pro" ? "#059669" : "#64748b",
              border: `1px solid ${subscription?.plan === "pro" ? "#bbf7d0" : "#e2e8f0"}`,
            }}>
              {subscription?.plan === "pro" ? "Pro" : "Free"}
            </span>
            <span style={{ fontSize: 13, color: "#6b7280" }}>
              {subscription?.plan === "pro"
                ? "UntilFire Pro — $4.99/month"
                : "Free plan — limited features"}
            </span>
          </div>
          {subscription?.plan === "pro" ? (
            <button
              onClick={onManageBilling}
              style={{ padding: "7px 16px", borderRadius: 8, border: "1px solid var(--uf-border)", background: "transparent", color: "#374151", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" }}
            >
              Manage billing
            </button>
          ) : (
            <button
              onClick={onUpgradeClick}
              style={{ padding: "7px 16px", borderRadius: 8, border: "none", background: "#059669", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" }}
            >
              Upgrade to Pro
            </button>
          )}
        </div>
        {subscription?.plan !== "pro" && (
          <p style={{ fontSize: 12, color: "#94a3b8", marginTop: 10, marginBottom: 0 }}>
            Unlock unlimited bank connections and priority access to the AI adviser.
          </p>
        )}
      </div>

      {/* Connected Banks */}
      <div style={cardStyle}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: "#064E3B", margin: 0 }}>Connected Banks</h3>
          <button
            onClick={() => onTabChange("assets")}
            style={{ fontSize: 13, fontWeight: 600, color: "#047857", background: "none", border: "1px solid #D1FAE5", borderRadius: 8, padding: "5px 12px", cursor: "pointer" }}
          >
            Manage →
          </button>
        </div>
        {plaidItems.length === 0 ? (
          <div style={{ fontSize: 13, color: "var(--uf-text-3)" }}>
            No banks connected yet.{" "}
            <button onClick={() => onTabChange("assets")} style={{ background: "none", border: "none", color: "#047857", fontWeight: 600, cursor: "pointer", padding: 0, fontSize: 13 }}>
              Connect one →
            </button>
          </div>
        ) : (
          plaidItems.map((item, i) => (
            <div key={item.id} style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              padding: "10px 0",
              borderBottom: i < plaidItems.length - 1 ? "1px solid var(--uf-border)" : "none",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 16 }}>🏦</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: "var(--uf-text)" }}>{item.institution_name}</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 12, color: "var(--uf-text-3)" }}>
                <span style={{ color: "#059669", fontWeight: 600 }}>● Connected</span>
                <span>{fmtSynced(item.last_synced_at)}</span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Danger zone */}
      <div style={{ ...cardStyle, borderColor: "#fecaca", background: "var(--uf-card)" }}>
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
