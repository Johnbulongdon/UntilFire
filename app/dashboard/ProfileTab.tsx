"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { SUPPORTED_CURRENCIES, CURRENCY_NAMES } from "@/lib/currency";
import { PRO_ANNUAL_LABEL, PRO_MONTHLY_LABEL, TRIAL_LABEL, REFERRED_TRIAL_LABEL } from "@/lib/pricing";
import { Button } from "@/components/ui";
import { MoneyHead, MoneyList, MoneyRow } from "./MoneyCards";
import GiveAMonthCard from "./GiveAMonthCard";
import CreatorCard from "./CreatorCard";
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
  const [openRow, setOpenRow] = useState<string | null>(null);
  const [householdSummary, setHouseholdSummary] = useState("Set up");

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

  const inputStyle: React.CSSProperties = {
    flex: 1,
    minWidth: 0,
    padding: "9px 12px",
    border: "1px solid var(--uf-border-2)",
    borderRadius: 10,
    font: "inherit",
    fontSize: 14,
    color: "var(--uf-ink)",
    background: "var(--uf-bg)",
    outline: "none",
    boxSizing: "border-box",
  };
  const isPro = subscription?.plan === "pro";
  const toggle = (k: string) => setOpenRow((o) => (o === k ? null : k));
  const fireTypeHref = `/fire-type?source=dashboard-profile${fireTypeResult ? `&type=${fireTypeResult.code}` : ""}`;

  // Calm Profile (D-48): who you are and your plan first, then settings as
  // rows that open their editor in place.
  return (
    <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr)", gap: 12, maxWidth: 760 }}>
      <MoneyHead
        label="Your account"
        value={<span style={{ fontFamily: "var(--uf-font-display)", fontSize: 34 }}>{displayName.trim() || "Add your name"}</span>}
        sub={isPro ? <>{userEmail} · <b style={{ color: "var(--uf-ink)" }}>Pro</b> · {PRO_MONTHLY_LABEL} a month</> : <>{userEmail} · Free plan</>}
        aside={<span aria-hidden style={{ width: 56, height: 56, borderRadius: 99, display: "grid", placeItems: "center", background: "color-mix(in srgb, var(--uf-teal) 18%, transparent)", color: "var(--uf-ink)", fontFamily: "var(--uf-font-display)", fontSize: 24 }}>
          {(displayName.trim() || userEmail || "?").charAt(0).toUpperCase()}
        </span>}
      >
        {isPro ? (
          <div><Button variant="secondary" size="sm" onClick={onManageBilling}>Manage billing</Button></div>
        ) : (
          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <Button variant="primary" size="sm" onClick={onUpgradeClick}>Try Pro, {trialLabel}</Button>
            <span className="uf-t-small" style={{ color: "var(--uf-ink-3)" }}>Then {PRO_MONTHLY_LABEL} a month or {PRO_ANNUAL_LABEL} a year. Unlimited bank connections and priority AI.</span>
          </div>
        )}
      </MoneyHead>

      <Section t="Account" />
      <MoneyList>
        <MoneyRow dot="#2a78d6" icon="👤" name="Name" meta="How the dashboard greets you" value={`${displayName.trim() || "Add"} ›`} onClick={() => toggle("name")}
          after={openRow === "name" && (
            <div style={{ display: "flex", gap: 8 }}>
              <input aria-label="Display name" style={inputStyle} value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Your name" onKeyDown={(e) => e.key === "Enter" && saveName()} />
              <Button variant="primary" size="sm" onClick={saveName} disabled={saving.name || !displayName.trim()}>{saving.name ? "Saving…" : saved.name ? "Saved ✓" : "Save"}</Button>
            </div>
          )} />
        <MoneyRow dot="#e87ba4" icon="👥" name="Household" meta="Plan together with a partner" value={`${householdSummary} ›`} onClick={() => toggle("household")}
          after={<div style={{ display: openRow === "household" ? "block" : "none" }}><HouseholdSection bare onSummary={setHouseholdSummary} /></div>} />
        <MoneyRow dot="#1baf7a" icon="💱" name="Currency" meta="Amounts show in this; new entries start in it" value={`${defaultCurrency} ›`} onClick={() => toggle("currency")}
          after={openRow === "currency" && (
            <div style={{ display: "flex", gap: 8 }}>
              <select aria-label="Default currency" style={{ ...inputStyle, flex: "none", minWidth: 120, cursor: "pointer" }} value={defaultCurrency} onChange={(e) => setDefaultCurrency(e.target.value)}>
                {SUPPORTED_CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              <Button variant="primary" size="sm" onClick={saveCurrency} disabled={saving.currency}>{saving.currency ? "Saving…" : saved.currency ? "Saved ✓" : "Save"}</Button>
            </div>
          )} />
        <MoneyRow dot="#6b5bd2" icon="🗂️" name="Currency shortlist" meta="Only these appear in currency menus; empty shows all"
          value={`${preferredCurrencies.length ? preferredCurrencies.slice(0, 3).join(", ") + (preferredCurrencies.length > 3 ? ` +${preferredCurrencies.length - 3}` : "") : "All"} ›`}
          onClick={() => toggle("shortlist")}
          after={openRow === "shortlist" && (
            <div style={{ display: "grid", gap: 8 }}>
              {preferredCurrencies.length > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {preferredCurrencies.map((c) => (
                    <span key={c} style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 10px 3px 8px", borderRadius: 20, background: "var(--uf-surface-2)", fontSize: 13, fontWeight: 600, color: "var(--uf-ink)" }}>
                      {c}
                      <button onClick={() => toggleCurrency(c)} aria-label={`Remove ${c}`} style={{ background: "none", border: "none", padding: "0 0 0 2px", cursor: "pointer", color: "var(--uf-ink-2)", fontSize: 14, lineHeight: 1 }}>×</button>
                    </span>
                  ))}
                </div>
              )}
              <div style={{ position: "relative", display: "flex" }}>
                <input aria-label="Add a currency" style={inputStyle} value={currencySearch}
                  onChange={(e) => { setCurrencySearch(e.target.value); setShowCurrencyDropdown(true); }}
                  onFocus={() => setShowCurrencyDropdown(true)}
                  onBlur={() => setTimeout(() => setShowCurrencyDropdown(false), 150)}
                  placeholder="Search to add a currency…" />
                {showCurrencyDropdown && currencySearch.trim().length >= 1 && (() => {
                  const q = currencySearch.trim().toLowerCase();
                  const matches = SUPPORTED_CURRENCIES.filter((c) => !preferredCurrencies.includes(c) && (c.toLowerCase().includes(q) || (CURRENCY_NAMES[c] || "").toLowerCase().includes(q))).slice(0, 8);
                  if (!matches.length) return null;
                  return (
                    <div style={{ position: "absolute", top: "100%", left: 0, right: 0, zIndex: 50, background: "var(--uf-card)", border: "1px solid var(--uf-border)", borderRadius: 10, boxShadow: "var(--uf-e2)", overflow: "hidden" }}>
                      {matches.map((c) => (
                        <button key={c} type="button" onMouseDown={() => { toggleCurrency(c); setCurrencySearch(""); setShowCurrencyDropdown(false); }}
                          style={{ display: "flex", gap: 8, width: "100%", padding: "8px 14px", border: "none", borderBottom: "1px solid var(--uf-border)", background: "none", font: "inherit", fontSize: 13, color: "var(--uf-ink)", cursor: "pointer", textAlign: "left" }}>
                          <b style={{ fontFamily: "var(--uf-font-mono)", minWidth: 36 }}>{c}</b>
                          <span style={{ color: "var(--uf-ink-2)", fontSize: 12 }}>{CURRENCY_NAMES[c]}</span>
                        </button>
                      ))}
                    </div>
                  );
                })()}
              </div>
              <div><Button variant="primary" size="sm" onClick={saveCurrency} disabled={saving.currency}>{saving.currency ? "Saving…" : saved.currency ? "Saved ✓" : "Save shortlist"}</Button></div>
            </div>
          )} />
      </MoneyList>

      <Section t="Banks" />
      <MoneyList footer={<Button variant="secondary" size="sm" onClick={() => onTabChange("assets")}>{plaidItems.length ? "Connect another bank" : "Connect a bank"}</Button>}>
        {plaidItems.length === 0
          ? <MoneyRow dot="var(--uf-ink-3)" icon="🏦" name="No banks connected" meta="Connect one to fill Money in automatically" value="" />
          : plaidItems.map((item) => (
            <MoneyRow key={item.id} dot="#1baf7a" icon="🏦" name={item.institution_name} meta={`Connected · synced ${fmtSynced(item.last_synced_at)}`} value="Manage ›" onClick={() => onTabChange("assets")} />
          ))}
      </MoneyList>

      {/* FIRE type is a personality result, not a projection input (app-structure rule 2). */}
      <Section t="You and FIRE" />
      <MoneyList>
        <MoneyRow dot="#eda100" icon="🧬" name="FIRE type" meta={fireTypeResult ? "Your result from the FIRE type quiz" : "A short quiz about how you want freedom to look"}
          value={fireTypeResult ? `${fireTypeResult.name} ›` : "Find yours ›"} onClick={() => { window.location.href = fireTypeHref; }} />
        <MoneyRow dot="var(--uf-teal)" icon="📅" name="Planning assumptions" meta="Age, city, lifestyle and tax live in Plan, next to your freedom date" value="Open ›" onClick={() => onTabChange("fire-calculator")} />
      </MoneyList>

      <Section t="Share UntilFire" />
      <MoneyList>
        <MoneyRow dot="#e34948" icon="🎁" name="Give a month, get a month" meta={`Friends get Pro ${REFERRED_TRIAL_LABEL}; you get a month when one subscribes`} value="Get link ›" onClick={() => toggle("give")}
          after={openRow === "give" && <GiveAMonthCard cardStyle={{}} bare />} />
        <MoneyRow dot="#2a78d6" icon="📣" name="Creator program" meta="Earn from readers who subscribe" value="Learn more ›" onClick={() => toggle("creator")}
          after={openRow === "creator" && <CreatorCard cardStyle={{}} bare />} />
      </MoneyList>

      <Section t="Account removal" />
      <MoneyList>
        <MoneyRow dot="#e34948" icon="🗑️" name="Delete account" meta="Removes your account, transactions and plan for good" value="Delete…" valueTone="var(--uf-neg-ink)" onClick={() => toggle("delete")}
          after={openRow === "delete" && (
            <div style={{ display: "grid", gap: 8 }}>
              <span className="uf-t-small" style={{ color: "var(--uf-ink-2)" }}>Type <b>{userEmail}</b> to confirm. This can&apos;t be undone.</span>
              <div style={{ display: "flex", gap: 8 }}>
                <input aria-label="Confirm your email" type="email" style={{ ...inputStyle, borderColor: deleteConfirm && deleteConfirm !== userEmail ? "var(--uf-neg)" : "var(--uf-border-2)" }}
                  value={deleteConfirm} onChange={(e) => { setDeleteConfirm(e.target.value); setDeleteError(""); }} placeholder={userEmail} />
                <Button variant="danger" size="sm" onClick={handleDelete} disabled={deleting || deleteConfirm !== userEmail}>{deleting ? "Deleting…" : "Delete account"}</Button>
              </div>
              {deleteError && <span role="alert" className="uf-t-small" style={{ color: "var(--uf-neg-ink)" }}>{deleteError}</span>}
            </div>
          )} />
      </MoneyList>
    </div>
  );
}

function Section({ t }: { t: string }) {
  return <div className="uf-t-small" style={{ color: "var(--uf-ink-3)", fontWeight: 700, marginTop: 8 }}>{t}</div>;
}
