"use client";

import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import { FALLBACK_RATES, SUPPORTED_CURRENCIES, formatUSDInCurrency } from "@/lib/currency";
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES, ALL_CATEGORIES, loadCatCustomizations, resolveDisplay } from "@/lib/categories";

const toUSD = (amount: number, currency: string, rates: Record<string, number>): number => {
  if (!currency || currency === "USD") return amount;
  const rate = rates[currency];
  return rate ? amount / rate : amount;
};

// ─── Types ────────────────────────────────────────────────────────────────────
type RawTx = {
  id: string;
  date: string;
  amount: number;
  currency: string;
  description: string;
  category: string;
  transaction_type: "expense" | "income";
};

type FrequencyLabel = "weekly" | "biweekly" | "monthly" | "quarterly" | "annual" | "irregular";

type DetectedItem = {
  key: string;
  description: string;
  category: string;
  transaction_type: "expense" | "income";
  avgAmountUSD: number;
  frequency: FrequencyLabel;
  monthCount: number;
  lastSeenDate: string;
  nextDueDate: string;
  daysUntilDue: number;
  occurrences: number;
};

type ManualItem = {
  id: string;
  description: string;
  amount: number;
  currency: string;
  frequency: FrequencyLabel;
  transaction_type: "expense" | "income";
  category: string;
  included: boolean;
  createdAt: string;
};

// ─── Detection helpers ────────────────────────────────────────────────────────
function inferFrequency(avgDays: number): FrequencyLabel {
  if (avgDays >= 5  && avgDays <= 9)   return "weekly";
  if (avgDays >= 10 && avgDays <= 18)  return "biweekly";
  if (avgDays >= 19 && avgDays <= 45)  return "monthly";
  if (avgDays >= 46 && avgDays <= 105) return "quarterly";
  if (avgDays > 105)                   return "annual";
  return "irregular";
}

function frequencyToDays(f: FrequencyLabel): number {
  return ({ weekly: 7, biweekly: 14, monthly: 30, quarterly: 91, annual: 365, irregular: 30 } as Record<FrequencyLabel, number>)[f];
}

function toMonthly(amount: number, f: FrequencyLabel): number {
  return ({ weekly: amount * 4.33, biweekly: amount * 2.17, monthly: amount,
            quarterly: amount / 3, annual: amount / 12, irregular: amount } as Record<FrequencyLabel, number>)[f];
}

function detectRecurring(txns: RawTx[], rates: Record<string, number>): { expenses: DetectedItem[]; income: DetectedItem[] } {
  const groups = new Map<string, RawTx[]>();
  for (const tx of txns) {
    const key = tx.description.toLowerCase().trim();
    if (!key) continue;
    const arr = groups.get(key) ?? [];
    arr.push(tx);
    groups.set(key, arr);
  }

  const results: DetectedItem[] = [];

  for (const [key, group] of groups) {
    const distinctMonths = new Set(group.map(t => t.date.slice(0, 7)));
    if (distinctMonths.size < 2) continue;

    const sortedDates = [...group.map(t => t.date)].sort();
    let totalGap = 0, gapCount = 0;
    for (let i = 1; i < sortedDates.length; i++) {
      const diff = (new Date(sortedDates[i] + "T00:00:00").getTime() -
                    new Date(sortedDates[i - 1] + "T00:00:00").getTime()) / 86_400_000;
      if (diff > 0) { totalGap += diff; gapCount++; }
    }
    const avgGap = gapCount > 0 ? totalGap / gapCount : 30;
    const frequency = inferFrequency(avgGap);
    if (frequency === "irregular" && avgGap < 5) continue;

    const amounts = group.map(t => toUSD(t.amount, t.currency, rates));
    const avgAmountUSD = amounts.reduce((s, a) => s + a, 0) / amounts.length;
    if (avgAmountUSD > 0) {
      const stdDev = Math.sqrt(amounts.reduce((s, a) => s + (a - avgAmountUSD) ** 2, 0) / amounts.length);
      if (stdDev / avgAmountUSD > 0.2) continue; // skip if amounts vary more than 20%
    }
    const lastSeenDate = sortedDates[sortedDates.length - 1];
    const mostRecent = group.find(t => t.date === lastSeenDate)!;

    const nextDate = new Date(new Date(lastSeenDate + "T00:00:00").getTime() + frequencyToDays(frequency) * 86_400_000);
    const nextDueDate = nextDate.toISOString().split("T")[0];
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const daysUntilDue = Math.round((nextDate.getTime() - today.getTime()) / 86_400_000);

    results.push({
      key, description: mostRecent.description, category: mostRecent.category,
      transaction_type: mostRecent.transaction_type, avgAmountUSD, frequency,
      monthCount: distinctMonths.size, lastSeenDate, nextDueDate, daysUntilDue,
      occurrences: group.length,
    });
  }

  const sorted = results.sort((a, b) => b.avgAmountUSD - a.avgAmountUSD);
  return {
    expenses: sorted.filter(r => r.transaction_type !== "income"),
    income:   sorted.filter(r => r.transaction_type === "income"),
  };
}

// ─── localStorage helpers ─────────────────────────────────────────────────────
function loadManual(): ManualItem[] {
  try { return JSON.parse(localStorage.getItem("uf_recurring_manual") || "[]"); }
  catch { return []; }
}
function saveManual(items: ManualItem[]) {
  localStorage.setItem("uf_recurring_manual", JSON.stringify(items));
}
function loadExcluded(): string[] {
  try { return JSON.parse(localStorage.getItem("uf_recurring_excluded") || "[]"); }
  catch { return []; }
}
function saveExcluded(keys: string[]) {
  localStorage.setItem("uf_recurring_excluded", JSON.stringify(keys));
}

// ─── Pill badges ──────────────────────────────────────────────────────────────
function FrequencyBadge({ frequency }: { frequency: FrequencyLabel }) {
  const label = { weekly: "Weekly", biweekly: "Bi-weekly", monthly: "Monthly",
                  quarterly: "Quarterly", annual: "Annual", irregular: "Irregular" }[frequency];
  return (
    <span style={{
      background: "rgba(32,212,191,0.12)", color: "#20D4BF",
      border: "1px solid rgba(32,212,191,0.25)",
      borderRadius: 999, padding: "2px 9px", fontSize: 11, fontWeight: 700,
    }}>
      {label}
    </span>
  );
}

function SubscriptionBadge() {
  return (
    <span style={{
      background: "rgba(167,139,250,0.12)", color: "#a78bfa",
      border: "1px solid rgba(167,139,250,0.25)",
      borderRadius: 999, padding: "2px 9px", fontSize: 11, fontWeight: 700,
    }}>
      Subscription
    </span>
  );
}

function DueBadge({ daysUntilDue }: { daysUntilDue: number }) {
  let bg: string, color: string, label: string;
  if (daysUntilDue < 0) {
    bg = "rgba(220,38,38,0.10)"; color = "#DC2626";
    label = `Overdue by ${Math.abs(daysUntilDue)}d`;
  } else if (daysUntilDue <= 3) {
    bg = "rgba(220,38,38,0.08)"; color = "#DC2626";
    label = daysUntilDue === 0 ? "Due today" : `Due in ${daysUntilDue}d`;
  } else if (daysUntilDue <= 7) {
    bg = "rgba(245,158,11,0.10)"; color = "#D97706";
    label = `Due in ${daysUntilDue}d`;
  } else {
    bg = "rgba(5,150,105,0.08)"; color = "#059669";
    label = `Due in ${daysUntilDue}d`;
  }
  return (
    <span style={{ background: bg, color, borderRadius: 999, padding: "2px 10px", fontSize: 11, fontWeight: 700 }}>
      {label}
    </span>
  );
}

// ─── Card components ──────────────────────────────────────────────────────────
function CategoryCircle({ categoryKey }: { categoryKey: string }) {
  const baseCat = ALL_CATEGORIES.find(c => c.key === categoryKey)
    ?? { color: "#6b7280", emoji: "📦" };
  const customs = loadCatCustomizations();
  const { color, emoji } = resolveDisplay({ color: baseCat.color, emoji: baseCat.emoji }, customs, categoryKey);
  return (
    <div style={{
      width: 40, height: 40, borderRadius: "50%", flexShrink: 0,
      background: color, display: "flex", alignItems: "center",
      justifyContent: "center", fontSize: 20,
    }}>
      {emoji}
    </div>
  );
}

function CategoryPill({ categoryKey }: { categoryKey: string }) {
  const baseCat = ALL_CATEGORIES.find(c => c.key === categoryKey)
    ?? { label: categoryKey, color: "#6b7280", emoji: "📦" };
  const customs = loadCatCustomizations();
  const { color } = resolveDisplay({ color: baseCat.color, emoji: baseCat.emoji }, customs, categoryKey);
  return (
    <span style={{
      background: color + "18", color,
      borderRadius: 999, padding: "2px 10px", fontSize: 11, fontWeight: 700,
    }}>
      {baseCat.label}
    </span>
  );
}

function ManualCard({
  item, onToggle, onEdit, onDelete,
}: {
  item: ManualItem;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const isIncome = item.transaction_type === "income";

  return (
    <div style={{
      background: "var(--uf-card)", border: "1px solid var(--uf-border)", borderRadius: 12,
      padding: "14px 18px", display: "grid",
      gridTemplateColumns: "40px 1fr auto", gap: 14, alignItems: "center",
      opacity: item.included ? 1 : 0.5,
      transition: "opacity 0.2s",
    }}>
      <CategoryCircle categoryKey={item.category} />

      <div>
        <div style={{ fontSize: 14, fontWeight: 700, color: "var(--uf-text)", marginBottom: 5 }}>
          {item.description}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
          <CategoryPill categoryKey={item.category} />
          <FrequencyBadge frequency={item.frequency} />
          {item.category === "subscriptions" && <SubscriptionBadge />}
          {!item.included && (
            <span style={{ background: "var(--uf-surface-2)", color: "var(--uf-text-3)", borderRadius: 999, padding: "2px 9px", fontSize: 11, fontWeight: 700 }}>
              Excluded
            </span>
          )}
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8 }}>
        <div style={{
          fontSize: 16, fontWeight: 800, fontFamily: "Manrope, sans-serif",
          color: item.included ? (isIncome ? "#059669" : "#19181E") : "#94A3B8",
        }}>
          {isIncome ? "+" : "−"}{item.currency !== "USD" ? `${item.currency} ` : "$"}{item.amount.toLocaleString()}
        </div>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          {/* Include/Exclude toggle */}
          <button
            onClick={onToggle}
            style={{
              background: item.included ? "rgba(220,38,38,0.08)" : "rgba(5,150,105,0.08)",
              color: item.included ? "#DC2626" : "#059669",
              border: "none", borderRadius: 8, padding: "4px 10px",
              fontSize: 11, fontWeight: 700, cursor: "pointer",
            }}
          >
            {item.included ? "Exclude" : "Include"}
          </button>
          {/* Edit */}
          <button
            onClick={onEdit}
            style={{
              background: "rgba(100,116,139,0.08)", color: "var(--uf-text-2)",
              border: "none", borderRadius: 8, padding: "4px 8px",
              fontSize: 13, cursor: "pointer", lineHeight: 1,
            }}
            title="Edit"
          >
            ✏️
          </button>
          {/* Delete */}
          <button
            onClick={onDelete}
            style={{
              background: "rgba(220,38,38,0.06)", color: "#DC2626",
              border: "none", borderRadius: 8, padding: "4px 8px",
              fontSize: 13, cursor: "pointer", lineHeight: 1,
            }}
            title="Delete"
          >
            🗑️
          </button>
        </div>
      </div>
    </div>
  );
}

function AutoCard({
  item, onRemove, formatAmount,
}: {
  item: DetectedItem;
  onRemove: () => void;
  formatAmount: (value: number) => string;
}) {
  const isIncome = item.transaction_type === "income";

  return (
    <div style={{
      background: "var(--uf-card)", border: "1px solid var(--uf-border)", borderRadius: 12,
      padding: "14px 18px", display: "grid",
      gridTemplateColumns: "40px 1fr auto", gap: 14, alignItems: "center",
    }}>
      <CategoryCircle categoryKey={item.category} />

      <div>
        <div style={{ fontSize: 14, fontWeight: 700, color: "var(--uf-text)", marginBottom: 5 }}>
          {item.description}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
          <CategoryPill categoryKey={item.category} />
          <FrequencyBadge frequency={item.frequency} />
          {item.category === "subscriptions" && <SubscriptionBadge />}
          <span style={{ fontSize: 11, color: "var(--uf-text-3)" }}>
            seen {item.monthCount} months
          </span>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8 }}>
        <div style={{
          fontSize: 16, fontWeight: 800, fontFamily: "Manrope, sans-serif",
          color: isIncome ? "#059669" : "#19181E",
        }}>
          {isIncome ? "+" : "−"}{formatAmount(item.avgAmountUSD)}
        </div>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <DueBadge daysUntilDue={item.daysUntilDue} />
          <button
            onClick={onRemove}
            style={{
              background: "rgba(100,116,139,0.08)", color: "var(--uf-text-2)",
              border: "none", borderRadius: 8, padding: "4px 10px",
              fontSize: 11, fontWeight: 700, cursor: "pointer",
            }}
          >
            Remove
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Section label ────────────────────────────────────────────────────────────
function SectionLabel({ label }: { label: string }) {
  return (
    <div style={{
      fontSize: 11, fontWeight: 800, color: "var(--uf-text-3)",
      textTransform: "uppercase", letterSpacing: "0.09em",
      marginBottom: 10,
    }}>
      {label}
    </div>
  );
}

// ─── Root Component ───────────────────────────────────────────────────────────
export default function RecurringTab({ defaultCurrency = "USD", displayCurrency = "USD", displayRates = FALLBACK_RATES, preferredCurrencies = [] }: {
  defaultCurrency?: string;
  displayCurrency?: string;
  displayRates?: Record<string, number>;
  preferredCurrencies?: string[];
}) {
  const [transactions, setTransactions] = useState<RawTx[]>([]);
  const [rates, setRates] = useState<Record<string, number>>(FALLBACK_RATES);
  const [loading, setLoading] = useState(true);

  const [manualItems, setManualItems] = useState<ManualItem[]>([]);
  const [excluded, setExcluded] = useState<string[]>([]);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formDesc, setFormDesc] = useState("");
  const [formAmount, setFormAmount] = useState("");
  const [formCurrency, setFormCurrency] = useState(defaultCurrency);
  const [formFreq, setFormFreq] = useState<FrequencyLabel>("monthly");
  const [formType, setFormType] = useState<"expense" | "income">("expense");
  const [formCategory, setFormCategory] = useState("other");
  const fmtDisplay = (n: number) => formatUSDInCurrency(n, displayCurrency, displayRates);

  useEffect(() => {
    if (!editingId && !showForm) {
      setFormCurrency(defaultCurrency);
    }
  }, [defaultCurrency, editingId, showForm]);

  useEffect(() => {
    setManualItems(loadManual());
    setExcluded(loadExcluded());

    fetch("https://api.frankfurter.app/latest?from=USD")
      .then(r => r.json())
      .then(d => { if (d.rates) setRates(d.rates); })
      .catch(() => {});

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { setLoading(false); return; }
      supabase
        .from("expenses")
        .select("id, date, amount, currency, description, category, transaction_type")
        .eq("user_id", session.user.id)
        .order("date", { ascending: false })
        .then(({ data }) => {
          if (data) setTransactions(data as RawTx[]);
          setLoading(false);
        });
    });
  }, []);

  // Auto-detected, filtered by exclusions
  const { expenses: autoExpenses, income: autoIncome } = useMemo(
    () => detectRecurring(transactions, rates),
    [transactions, rates]
  );
  const visibleAutoExpenses = useMemo(
    () => autoExpenses.filter(r => !excluded.includes(r.key)),
    [autoExpenses, excluded]
  );
  const visibleAutoIncome = useMemo(
    () => autoIncome.filter(r => !excluded.includes(r.key)),
    [autoIncome, excluded]
  );

  // KPI totals — included items only
  const monthlyOut = useMemo(() => {
    const fromManual = manualItems
      .filter(i => i.included && i.transaction_type === "expense")
      .reduce((s, i) => s + toMonthly(toUSD(i.amount, i.currency, rates), i.frequency), 0);
    const fromAuto = visibleAutoExpenses
      .reduce((s, r) => s + toMonthly(r.avgAmountUSD, r.frequency), 0);
    return fromManual + fromAuto;
  }, [manualItems, visibleAutoExpenses, rates]);

  const monthlyIn = useMemo(() => {
    const fromManual = manualItems
      .filter(i => i.included && i.transaction_type === "income")
      .reduce((s, i) => s + toMonthly(toUSD(i.amount, i.currency, rates), i.frequency), 0);
    const fromAuto = visibleAutoIncome
      .reduce((s, r) => s + toMonthly(r.avgAmountUSD, r.frequency), 0);
    return fromManual + fromAuto;
  }, [manualItems, visibleAutoIncome, rates]);

  // Form actions
  function openAddForm() {
    setEditingId(null);
    setFormDesc(""); setFormAmount(""); setFormCurrency(defaultCurrency);
    setFormFreq("monthly"); setFormType("expense"); setFormCategory("other");
    setShowForm(true);
  }

  function openEditForm(item: ManualItem) {
    setEditingId(item.id);
    setFormDesc(item.description);
    setFormAmount(String(item.amount));
    setFormCurrency(item.currency);
    setFormFreq(item.frequency);
    setFormType(item.transaction_type);
    setFormCategory(item.category);
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditingId(null);
  }

  function saveForm() {
    if (!formDesc.trim() || !formAmount) return;
    const amount = parseFloat(formAmount);
    if (isNaN(amount) || amount <= 0) return;

    let updated: ManualItem[];
    if (editingId) {
      updated = manualItems.map(i =>
        i.id === editingId
          ? { ...i, description: formDesc.trim(), amount, currency: formCurrency,
              frequency: formFreq, transaction_type: formType, category: formCategory }
          : i
      );
    } else {
      const newItem: ManualItem = {
        id: crypto.randomUUID(),
        description: formDesc.trim(), amount, currency: formCurrency,
        frequency: formFreq, transaction_type: formType, category: formCategory,
        included: true, createdAt: new Date().toISOString(),
      };
      updated = [...manualItems, newItem];
    }
    setManualItems(updated);
    saveManual(updated);
    closeForm();
  }

  function toggleIncluded(id: string) {
    const updated = manualItems.map(i => i.id === id ? { ...i, included: !i.included } : i);
    setManualItems(updated);
    saveManual(updated);
  }

  function deleteManual(id: string) {
    const updated = manualItems.filter(i => i.id !== id);
    setManualItems(updated);
    saveManual(updated);
  }

  function removeAutoDetected(key: string) {
    const updated = [...excluded, key];
    setExcluded(updated);
    saveExcluded(updated);
  }

  // Sort subscriptions to top within each section
  const subFirst = (a: { category: string }, b: { category: string }) =>
    (b.category === "subscriptions" ? 1 : 0) - (a.category === "subscriptions" ? 1 : 0);

  const manualExpenses = [...manualItems.filter(i => i.transaction_type === "expense")].sort(subFirst);
  const manualIncome   = [...manualItems.filter(i => i.transaction_type === "income")].sort(subFirst);
  const sortedAutoExpenses = [...visibleAutoExpenses].sort(subFirst);
  const sortedAutoIncome   = [...visibleAutoIncome].sort(subFirst);

  const hasManual     = manualItems.length > 0;
  const hasAutoVisible = visibleAutoExpenses.length > 0 || visibleAutoIncome.length > 0;
  const hasAnything   = hasManual || hasAutoVisible;
  const formActive    = showForm || editingId !== null;
  const categoryOptions = formType === "expense" ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "10px 12px", borderRadius: 10,
    border: "1.5px solid var(--uf-border)", fontSize: 14, fontFamily: "inherit",
    outline: "none", background: "var(--uf-card)", boxSizing: "border-box",
  };
  const selectStyle: React.CSSProperties = { ...inputStyle, cursor: "pointer" };

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "80px 24px", color: "var(--uf-text-3)", fontSize: 14 }}>
        Loading…
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>

      {/* ── Header row ───────────────────────────────────────────────────── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <h2 style={{ fontFamily: "Manrope, sans-serif", fontSize: 22, fontWeight: 800, color: "var(--uf-text)", margin: "0 0 4px", letterSpacing: "-0.5px" }}>
            Recurring
          </h2>
          <p style={{ color: "var(--uf-text-2)", fontSize: 13, margin: 0 }}>
            Plan your regular income and bills. We&apos;ll also detect patterns from your transaction history.
          </p>
        </div>
        <button
          onClick={formActive ? closeForm : openAddForm}
          style={{
            background: formActive ? "#F1F5F9" : "linear-gradient(135deg, #059669, #064E3B)",
            color: formActive ? "#64748B" : "#fff",
            border: "none", borderRadius: 10, padding: "10px 18px",
            fontWeight: 700, fontSize: 14, cursor: "pointer", flexShrink: 0,
          }}
        >
          {formActive ? "✕ Cancel" : "+ Add item"}
        </button>
      </div>

      {/* ── Add / Edit form ───────────────────────────────────────────────── */}
      {formActive && (
        <div style={{
          background: "var(--uf-card)", border: "1.5px solid var(--uf-border)", borderRadius: 16,
          padding: "24px", display: "flex", flexDirection: "column", gap: 16,
        }}>
          <div style={{ fontWeight: 800, fontSize: 15, color: "var(--uf-text)" }}>
            {editingId ? "Edit recurring item" : "Add recurring item"}
          </div>

          {/* Description */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: "var(--uf-text-2)", display: "block", marginBottom: 6 }}>
              DESCRIPTION
            </label>
            <input
              type="text"
              value={formDesc}
              onChange={e => setFormDesc(e.target.value)}
              placeholder="e.g. Netflix, Rent, Salary"
              style={inputStyle}
            />
          </div>

          {/* Amount + Currency */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 120px", gap: 12 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: "var(--uf-text-2)", display: "block", marginBottom: 6 }}>
                AMOUNT
              </label>
              <input
                type="number"
                value={formAmount}
                onChange={e => setFormAmount(e.target.value)}
                placeholder="0"
                min="0"
                step="any"
                style={inputStyle}
              />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: "var(--uf-text-2)", display: "block", marginBottom: 6 }}>
                CURRENCY
              </label>
              <select value={formCurrency} onChange={e => setFormCurrency(e.target.value)} style={selectStyle}>
                {(preferredCurrencies.length > 0 ? preferredCurrencies : [...SUPPORTED_CURRENCIES]).map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Frequency + Type */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: "var(--uf-text-2)", display: "block", marginBottom: 6 }}>
                FREQUENCY
              </label>
              <select value={formFreq} onChange={e => setFormFreq(e.target.value as FrequencyLabel)} style={selectStyle}>
                <option value="monthly">Monthly</option>
                <option value="weekly">Weekly</option>
                <option value="biweekly">Bi-weekly</option>
                <option value="quarterly">Quarterly</option>
                <option value="annual">Annual</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: "var(--uf-text-2)", display: "block", marginBottom: 6 }}>
                TYPE
              </label>
              <div style={{ display: "flex", borderRadius: 10, overflow: "hidden", border: "1.5px solid var(--uf-border)" }}>
                {(["expense", "income"] as const).map(t => (
                  <button
                    key={t}
                    onClick={() => {
                      setFormType(t);
                      setFormCategory(t === "expense" ? "other" : "salary");
                    }}
                    style={{
                      flex: 1, padding: "10px 0", border: "none", cursor: "pointer", fontSize: 13, fontWeight: 700,
                      background: formType === t
                        ? (t === "expense" ? "#DC2626" : "#059669")
                        : "#fff",
                      color: formType === t ? "#fff" : "#64748B",
                    }}
                  >
                    {t === "expense" ? "Expense" : "Income"}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Category */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: "var(--uf-text-2)", display: "block", marginBottom: 6 }}>
              CATEGORY
            </label>
            <select value={formCategory} onChange={e => setFormCategory(e.target.value)} style={selectStyle}>
              {categoryOptions.map(c => (
                <option key={c.key} value={c.key}>{c.label}</option>
              ))}
            </select>
          </div>

          {/* Save button */}
          <button
            onClick={saveForm}
            disabled={!formDesc.trim() || !formAmount}
            style={{
              background: (!formDesc.trim() || !formAmount) ? "#E2E8F0" : "linear-gradient(135deg, #059669, #064E3B)",
              color: (!formDesc.trim() || !formAmount) ? "#94A3B8" : "#fff",
              border: "none", borderRadius: 10, padding: "12px 0",
              fontWeight: 700, fontSize: 14, cursor: (!formDesc.trim() || !formAmount) ? "default" : "pointer",
            }}
          >
            {editingId ? "Save changes" : "Add item"}
          </button>
        </div>
      )}

      {/* ── Empty state ───────────────────────────────────────────────────── */}
      {!hasAnything && !formActive && (
        <div style={{
          background: "var(--uf-card)", border: "1px solid var(--uf-border)", borderRadius: 16,
          padding: "64px 32px", textAlign: "center",
        }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🔄</div>
          <div style={{ fontWeight: 700, fontSize: 18, color: "var(--uf-text)", marginBottom: 8 }}>
            Plan your recurring income and bills
          </div>
          <div style={{ fontSize: 14, color: "var(--uf-text-2)", maxWidth: 380, margin: "0 auto 24px", lineHeight: 1.7 }}>
            Add your rent, salary, subscriptions, and regular payments. Auto-detection kicks in once you have 2+ months of transaction data.
          </div>
          <button
            onClick={openAddForm}
            style={{
              background: "linear-gradient(135deg, #059669, #064E3B)",
              color: "#fff", border: "none", borderRadius: 10,
              padding: "12px 24px", fontWeight: 700, fontSize: 14, cursor: "pointer",
            }}
          >
            Add your first item
          </button>
        </div>
      )}

      {/* ── Summary KPI row ───────────────────────────────────────────────── */}
      {hasAnything && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <div style={{ background: "#003527", borderRadius: 16, padding: "20px 24px" }}>
            <div style={{ fontSize: 10, letterSpacing: "1px", textTransform: "uppercase", color: "rgba(255,255,255,0.5)", fontWeight: 700, marginBottom: 6 }}>
              Monthly Out
            </div>
            <div style={{ fontSize: 28, fontWeight: 800, color: "#FCA5A5", fontFamily: "Manrope, sans-serif", letterSpacing: "-1px" }}>
              {fmtDisplay(monthlyOut)}
            </div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginTop: 4 }}>
              {manualExpenses.filter(i => i.included).length + visibleAutoExpenses.length} included item{(manualExpenses.filter(i => i.included).length + visibleAutoExpenses.length) !== 1 ? "s" : ""}
            </div>
          </div>
          <div style={{ background: "#003527", borderRadius: 16, padding: "20px 24px" }}>
            <div style={{ fontSize: 10, letterSpacing: "1px", textTransform: "uppercase", color: "rgba(255,255,255,0.5)", fontWeight: 700, marginBottom: 6 }}>
              Monthly In
            </div>
            <div style={{ fontSize: 28, fontWeight: 800, color: "#62FAE3", fontFamily: "Manrope, sans-serif", letterSpacing: "-1px" }}>
              {fmtDisplay(monthlyIn)}
            </div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginTop: 4 }}>
              {manualIncome.filter(i => i.included).length + visibleAutoIncome.length} included item{(manualIncome.filter(i => i.included).length + visibleAutoIncome.length) !== 1 ? "s" : ""}
            </div>
          </div>
        </div>
      )}

      {/* ── Your recurring items (manual) ─────────────────────────────────── */}
      {hasManual && (
        <div>
          <SectionLabel label="Your recurring items" />
          {/* Expenses */}
          {manualExpenses.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 11, color: "#DC2626", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>
                Expenses
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {manualExpenses.map(item => (
                  <ManualCard
                    key={item.id}
                    item={item}
                    onToggle={() => toggleIncluded(item.id)}
                    onEdit={() => openEditForm(item)}
                    onDelete={() => deleteManual(item.id)}
                  />
                ))}
              </div>
            </div>
          )}
          {/* Income */}
          {manualIncome.length > 0 && (
            <div>
              <div style={{ fontSize: 11, color: "#059669", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>
                Income
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {manualIncome.map(item => (
                  <ManualCard
                    key={item.id}
                    item={item}
                    onToggle={() => toggleIncluded(item.id)}
                    onEdit={() => openEditForm(item)}
                    onDelete={() => deleteManual(item.id)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Auto-detected ─────────────────────────────────────────────────── */}
      {!hasAutoVisible && hasManual && (
        <div style={{ fontSize: 13, color: "var(--uf-text-3)", textAlign: "center", padding: "16px 0" }}>
          Auto-detection needs 2+ months of Cashflow transactions to find patterns.
        </div>
      )}
      {hasAutoVisible && (
        <div>
          <SectionLabel label="Detected from your transactions" />
          {/* Auto expenses */}
          {sortedAutoExpenses.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 11, color: "#DC2626", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>
                Expenses
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {sortedAutoExpenses.map(item => (
                  <AutoCard
                    key={item.key}
                    item={item}
                    onRemove={() => removeAutoDetected(item.key)}
                    formatAmount={fmtDisplay}
                  />
                ))}
              </div>
            </div>
          )}
          {/* Auto income */}
          {sortedAutoIncome.length > 0 && (
            <div>
              <div style={{ fontSize: 11, color: "#059669", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>
                Income
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {sortedAutoIncome.map(item => (
                  <AutoCard
                    key={item.key}
                    item={item}
                    onRemove={() => removeAutoDetected(item.key)}
                    formatAmount={fmtDisplay}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

    </div>
  );
}
