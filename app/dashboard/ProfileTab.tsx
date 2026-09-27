"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { SUPPORTED_CURRENCIES, CURRENCY_NAMES } from "@/lib/currency";
import { PRO_ANNUAL_LABEL, PRO_MONTHLY_LABEL, TRIAL_LABEL } from "@/lib/pricing";
import { REFERRAL_RATE_LABEL } from "@/lib/referrals";
import GiveAMonthCard from "./GiveAMonthCard";
import CreatorArea from "@/app/invite/CreatorArea";
import SectionTitle from "./SectionTitle";
import HouseholdSection from "./HouseholdSection";

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
  /** "60 days free" for an account a creator referred (D-27). */
  trialLabel?: string;
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
  trialLabel = TRIAL_LABEL,
}: Props) {
  const [displayName, setDisplayName] = useState("");

  const [currencySearch, setCurrencySearch] = useState("");
  const [showCurrencyDropdown, setShowCurrencyDropdown] = useState(false);
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
  const [creatorOpen, setCreatorOpen] = useState(false);

  // /invite sends signed-in users here with ?creator=1: open the section and bring it into view.
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("creator") !== "1") return;
    setCreatorOpen(true);
    requestAnimationFrame(() => document.getElementById("creator-program")?.scrollIntoView({ block: "start" }));
  }, []);

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
    try {
      const raw = localStorage.getItem("uf_fire_type_result");
      if (raw) setFireTypeResult(JSON.parse(raw));
    } catch { /* ignore */ }
  }, []);

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
    color: "var(--uf-ink-2)",
    marginBottom: 6,
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "9px 12px",
    border: "1px solid var(--uf-border)",
    borderRadius: 8,
    fontSize: 14,
    color: "var(--uf-ink)",
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
    background: variant === "primary" ? "var(--uf-green)" : variant === "danger" ? "var(--uf-neg)" : "var(--uf-border)",
    color: variant === "primary" || variant === "danger" ? "var(--uf-card)" : "var(--uf-ink-3)",
    opacity: variant === "disabled" ? 0.6 : 1,
    whiteSpace: "nowrap",
  });

  return (
    <div style={{ maxWidth: 600, padding: "32px 24px" }}>
      <h2 style={{ fontSize: 22, fontWeight: 700, color: "var(--uf-ink)", marginBottom: 24, marginTop: 0 }}>
        Profile &amp; Settings
      </h2>

      {/* Account */}
      <div style={cardStyle}>
        <SectionTitle icon="profile">Account</SectionTitle>
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
        <p style={{ fontSize: 12, color: "var(--uf-ink-3)", marginTop: 6, marginBottom: 0 }}>
          This is how your name appears in the dashboard greeting.
        </p>
      </div>

      {/* Household — account, not money (app-structure rule 4). */}
      <HouseholdSection />

      {/* Preferences */}
      <div style={cardStyle}>
        <SectionTitle icon="sliders">Preferences</SectionTitle>
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
        <p style={{ fontSize: 12, color: "var(--uf-ink-3)", marginTop: 6, marginBottom: 0 }}>
          Sets the dashboard display currency and pre-fills new transaction entries.
        </p>

        <div style={{ marginTop: 20 }}>
          <label style={labelStyle}>Preferred currencies</label>
          <p style={{ fontSize: 12, color: "var(--uf-ink-3)", margin: "0 0 10px" }}>
            Add currencies to filter dropdowns. Leave empty to show all.
          </p>
          {preferredCurrencies.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
              {preferredCurrencies.map(c => (
                <span key={c} style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 10px 3px 8px", borderRadius: 20, background: "var(--uf-green-50)", border: "1px solid var(--uf-green-100)", fontSize: 12, fontWeight: 700, color: "var(--uf-green-700)", fontFamily: "DM Mono, monospace" }}>
                  {c}
                  <button
                    onClick={() => toggleCurrency(c)}
                    style={{ background: "none", border: "none", padding: "0 0 0 2px", cursor: "pointer", color: "var(--uf-ink-2)", fontSize: 14, lineHeight: 1, display: "flex", alignItems: "center" }}
                    aria-label={`Remove ${c}`}
                  >×</button>
                </span>
              ))}
            </div>
          )}
          <div style={{ position: "relative" }}>
            <input
              style={inputStyle}
              value={currencySearch}
              onChange={e => { setCurrencySearch(e.target.value); setShowCurrencyDropdown(true); }}
              onFocus={() => setShowCurrencyDropdown(true)}
              onBlur={() => setTimeout(() => setShowCurrencyDropdown(false), 150)}
              placeholder="Search to add a currency…"
            />
            {showCurrencyDropdown && currencySearch.trim().length >= 1 && (() => {
              const q = currencySearch.trim().toLowerCase();
              const matches = SUPPORTED_CURRENCIES.filter(c =>
                !preferredCurrencies.includes(c) &&
                (c.toLowerCase().includes(q) || (CURRENCY_NAMES[c] || "").toLowerCase().includes(q))
              ).slice(0, 8);
              if (!matches.length) return null;
              return (
                <div style={{ position: "absolute", top: "100%", left: 0, right: 0, zIndex: 50, background: "var(--uf-card)", border: "1px solid var(--uf-border)", borderRadius: 8, boxShadow: "0 4px 16px rgba(0,0,0,0.1)", maxHeight: 220, overflowY: "auto", marginTop: 4 }}>
                  {matches.map(c => (
                    <div
                      key={c}
                      onMouseDown={() => { toggleCurrency(c); setCurrencySearch(""); setShowCurrencyDropdown(false); }}
                      style={{ padding: "8px 14px", cursor: "pointer", fontSize: 13, borderBottom: "1px solid var(--uf-border)", display: "flex", alignItems: "center", gap: 8 }}
                      onMouseEnter={e => (e.currentTarget.style.background = "var(--uf-surface)")}
                      onMouseLeave={e => (e.currentTarget.style.background = "")}
                    >
                      <span style={{ fontWeight: 700, fontFamily: "DM Mono, monospace", minWidth: 36 }}>{c}</span>
                      <span style={{ color: "var(--uf-text-2)", fontSize: 12 }}>{CURRENCY_NAMES[c]}</span>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
        </div>
      </div>

      {/* FIRE type — a personality result, not a projection input, so it stays
          here. The assumptions that drive the freedom date moved to Plan on
          18 Sep 2026 (app-structure rule 2). */}
      <div style={cardStyle}>
        <div style={{ marginBottom: 14 }}>
          <SectionTitle icon="target" style={{ margin: "0 0 6px" }}>FIRE type</SectionTitle>
          <p style={{ fontSize: 13, color: "var(--uf-text-2)", lineHeight: 1.6, margin: 0 }}>
            Your age, target city, lifestyle and tax home now live with your plan,
            next to the freedom date they produce.
          </p>
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
              border: "1px solid var(--uf-green-100)",
              background: "var(--uf-green-50)",
              color: "var(--uf-green-700)",
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
        <SectionTitle icon="card">Subscription</SectionTitle>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{
              display: "inline-block", padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700,
              background: subscription?.plan === "pro" ? "var(--uf-green-50)" : "var(--uf-surface)",
              color: subscription?.plan === "pro" ? "var(--uf-green)" : "var(--uf-ink-2)",
              border: `1px solid ${subscription?.plan === "pro" ? "var(--uf-green-100)" : "var(--uf-border)"}`,
            }}>
              {subscription?.plan === "pro" ? "Pro" : "Free"}
            </span>
            <span style={{ fontSize: 13, color: "var(--uf-ink-2)" }}>
              {subscription?.plan === "pro"
                ? `UntilFire Pro — ${PRO_MONTHLY_LABEL}/month`
                : "Free plan — limited features"}
            </span>
          </div>
          {subscription?.plan === "pro" ? (
            <button
              onClick={onManageBilling}
              style={{ padding: "7px 16px", borderRadius: 8, border: "1px solid var(--uf-border)", background: "transparent", color: "var(--uf-ink-2)", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" }}
            >
              Manage billing
            </button>
          ) : (
            <button
              onClick={onUpgradeClick}
              style={{ padding: "7px 16px", borderRadius: 8, border: "none", background: "var(--uf-green)", color: "var(--uf-card)", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" }}
            >
              Try {trialLabel}
            </button>
          )}
        </div>
        {subscription?.plan !== "pro" && (
          <p style={{ fontSize: 12, color: "var(--uf-ink-3)", marginTop: 10, marginBottom: 0 }}>
            {trialLabel} — then {PRO_MONTHLY_LABEL}/mo, or {PRO_ANNUAL_LABEL}/yr. Unlimited bank connections and priority AI access.
          </p>
        )}
      </div>

      <GiveAMonthCard cardStyle={cardStyle} />

      {/* Creator program (D-27): opens here, so using it never leaves the app. */}
      <section id="creator-program" style={cardStyle}>
        <button
          type="button"
          aria-expanded={creatorOpen}
          aria-controls="creator-program-body"
          onClick={() => setCreatorOpen((o) => !o)}
          style={{ all: "unset", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, width: "100%" }}
        >
          <span>
            <SectionTitle icon="megaphone" style={{ margin: "0 0 4px" }}>Creator program</SectionTitle>
            <span style={{ display: "block", fontSize: 13, color: "var(--uf-ink-2)", paddingLeft: 40 }}>Share UntilFire and earn {REFERRAL_RATE_LABEL} of what your readers pay for a year.</span>
          </span>
          <span aria-hidden="true" style={{ color: "var(--uf-green)", fontWeight: 700, transform: creatorOpen ? "rotate(90deg)" : "none", transition: "transform 0.15s" }}>→</span>
        </button>
        {creatorOpen && (
          <div id="creator-program-body" style={{ marginTop: 16, display: "grid", gap: 12 }}>
            <CreatorArea />
            <a href="/invite" className="uf-t-small" style={{ color: "var(--uf-ink-3)" }}>How the program works</a>
          </div>
        )}
      </section>

      {/* Connected Banks */}
      <div style={cardStyle}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <SectionTitle icon="bank" style={{ margin: 0 }}>Connected banks</SectionTitle>
          <button
            onClick={() => onTabChange("assets")}
            style={{ fontSize: 13, fontWeight: 600, color: "var(--uf-green-700)", background: "none", border: "1px solid var(--uf-green-100)", borderRadius: 8, padding: "5px 12px", cursor: "pointer" }}
          >
            Manage →
          </button>
        </div>
        {plaidItems.length === 0 ? (
          <div style={{ fontSize: 13, color: "var(--uf-text-3)" }}>
            No banks connected yet.{" "}
            <button onClick={() => onTabChange("assets")} style={{ background: "none", border: "none", color: "var(--uf-green-700)", fontWeight: 600, cursor: "pointer", padding: 0, fontSize: 13 }}>
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
                <span style={{ color: "var(--uf-green)", fontWeight: 600 }}>{"●"} Connected</span>
                <span>{fmtSynced(item.last_synced_at)}</span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Danger zone */}
      <div style={{ ...cardStyle, borderColor: "var(--uf-neg-bg)", background: "var(--uf-card)" }}>
        <SectionTitle icon="warning" danger style={{ margin: "0 0 8px" }}>Danger zone</SectionTitle>
        <p style={{ fontSize: 14, color: "var(--uf-ink-2)", margin: "0 0 16px" }}>
          Permanently deletes your account, all transactions, and FIRE data. This cannot be undone.
        </p>
        <label style={{ ...labelStyle, color: "var(--uf-ink-2)" }}>
          Type your email address to confirm: <strong>{userEmail}</strong>
        </label>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <input
            style={{ ...inputStyle, borderColor: deleteConfirm && deleteConfirm !== userEmail ? "var(--uf-neg)" : "var(--uf-border)" }}
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
          <p style={{ fontSize: 13, color: "var(--uf-neg)", marginTop: 8, marginBottom: 0 }}>{deleteError}</p>
        )}
      </div>
    </div>
  );
}
