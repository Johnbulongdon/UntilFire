"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { PieChart, Pie, Cell, Tooltip as ChartTooltip, ResponsiveContainer } from "recharts";

// ─── Categories ───────────────────────────────────────────────────────────────
const EXPENSE_CATEGORIES = [
  { key: "food",          label: "Food",          code: "FD", color: "#f97316" },
  { key: "transport",     label: "Transport",     code: "TR", color: "#22d3a5" },
  { key: "housing",       label: "Housing",       code: "HO", color: "#818cf8" },
  { key: "travel",        label: "Travel",        code: "TV", color: "#0ea5e9" },
  { key: "subscriptions", label: "Subscriptions", code: "SB", color: "#a78bfa" },
  { key: "healthcare",    label: "Healthcare",    code: "HC", color: "#ef4444" },
  { key: "entertainment", label: "Entertain",     code: "EN", color: "#fbbf24" },
  { key: "shopping",      label: "Shopping",      code: "SH", color: "#ec4899" },
  { key: "work",          label: "Work",          code: "WK", color: "#6366f1" },
  { key: "other",         label: "Other",         code: "OT", color: "#6b7280" },
];

const SUB_CATEGORIES: Record<string, string[]> = {
  travel:        ["Hotels", "Flights", "Food & Drink", "Transport", "Activities", "Shopping", "Other"],
  food:          ["Groceries", "Restaurants", "Coffee", "Takeout", "Alcohol", "Other"],
  transport:     ["Gas", "Parking", "Public Transit", "Ride Share", "Car Maintenance", "Other"],
  housing:       ["Rent/Mortgage", "Utilities", "Insurance", "Maintenance", "Furnishing", "Other"],
  subscriptions: ["Streaming", "Software", "Gym", "News", "Health", "Other"],
  healthcare:    ["Doctor", "Pharmacy", "Dental", "Vision", "Mental Health", "Other"],
  entertainment: ["Movies", "Events", "Sports", "Games", "Hobbies", "Other"],
  shopping:      ["Clothing", "Electronics", "Home Goods", "Gifts", "Beauty", "Other"],
  work:          ["Equipment", "Software", "Travel", "Training", "Meals", "Other"],
};

const INCOME_CATEGORIES = [
  { key: "salary",       label: "Salary",     code: "SA", color: "#22d3a5" },
  { key: "freelance",    label: "Freelance",  code: "FR", color: "#34d399" },
  { key: "investment",   label: "Investment", code: "IV", color: "#818cf8" },
  { key: "gift",         label: "Gift",       code: "GF", color: "#a78bfa" },
  { key: "other_income", label: "Other",      code: "OI", color: "#6b7280" },
];

const ALL_CATEGORIES = [...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES];
const CURRENCIES = ["USD", "EUR", "GBP", "JPY", "CNY", "AUD", "CAD", "SGD", "HKD"];

const FALLBACK_RATES: Record<string, number> = {
  EUR: 0.92, GBP: 0.79, JPY: 149.5, CNY: 7.27,
  AUD: 1.56, CAD: 1.36, SGD: 1.30, HKD: 7.78,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt = (n: number, currency = "USD") =>
  new Intl.NumberFormat("en-US", { style: "currency", currency, minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(n);

const toUSD = (amount: number, currency: string, rates: Record<string, number>): number => {
  if (!currency || currency === "USD") return amount;
  const rate = rates[currency];
  return rate ? amount / rate : amount;
};

function dayLabel(ymd: string, todayYmd: string): string {
  if (ymd === todayYmd) return "Today";
  const y = new Date(todayYmd);
  y.setDate(y.getDate() - 1);
  const yesterdayYmd = y.toISOString().split("T")[0];
  if (ymd === yesterdayYmd) return "Yesterday";
  const d = new Date(ymd + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// ─── Types ────────────────────────────────────────────────────────────────────
type Transaction = {
  id: string;
  date: string;
  amount: number;
  currency: string;
  description: string;
  category: string;
  tags: string[];
  is_work_related: boolean;
  transaction_type: "expense" | "income";
  sub_category: string | null;
};

type DraftTransaction = {
  id: string | null;
  transaction_type: "expense" | "income";
  amount: string;
  currency: string;
  description: string;
  date: string;
  category: string;
  sub_category: string;
  tags: string[];
  is_work_related: boolean;
  aiSuggestion: string | null;
};

const EMPTY_DRAFT = (): DraftTransaction => ({
  id: null,
  transaction_type: "expense",
  amount: "",
  currency: "USD",
  description: "",
  date: new Date().toISOString().split("T")[0],
  category: "",
  sub_category: "",
  tags: [],
  is_work_related: false,
  aiSuggestion: null,
});

// ─── AI Categorization ────────────────────────────────────────────────────────
async function aiCategorize(
  description: string,
  type: "expense" | "income"
): Promise<{ category: string; tags: string[]; is_work_related: boolean }> {
  const categories =
    type === "income"
      ? "salary, freelance, investment, gift, other_income"
      : "food, transport, housing, travel, subscriptions, healthcare, entertainment, shopping, work, other";
  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 200,
        messages: [
          {
            role: "user",
            content: `Categorize this ${type} transaction and respond ONLY with valid JSON, no markdown:
Description: "${description}"
Categories: ${categories}
Respond with exactly: {"category": "...", "tags": ["tag1"], "is_work_related": false}
Rules: tags: 1-3 short tags; is_work_related: true only for expense type work items; pick most specific category`,
          },
        ],
      }),
    });
    const data = await response.json();
    return JSON.parse(data.content[0].text.trim());
  } catch {
    return { category: type === "income" ? "other_income" : "other", tags: [], is_work_related: false };
  }
}

// ─── ProjectInput ─────────────────────────────────────────────────────────────
function ProjectInput({
  existingTags,
  currentTags,
  onAdd,
}: {
  existingTags: string[];
  currentTags: string[];
  onAdd: (tag: string) => void;
}) {
  const [value, setValue] = useState("");
  const [focused, setFocused] = useState(false);

  const suggestions = existingTags.filter(
    (t) => t.toLowerCase().includes(value.toLowerCase().trim()) && !currentTags.includes(t)
  );

  const commit = () => {
    const v = value.trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
    if (v) { onAdd(v); setValue(""); }
  };

  return (
    <div style={{ position: "relative" }}>
      <div style={{ display: "flex", gap: 6 }}>
        <input
          type="text"
          placeholder="e.g. japan-2025, nyc-conference"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); commit(); } }}
          onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => setFocused(false), 120)}
          style={{ flex: 1, border: "1px solid #E2E8F0", borderRadius: 8, padding: "9px 12px", fontSize: 13, color: "#19181E", background: "#fff", outline: "none", fontFamily: "inherit" }}
        />
        {value.trim() && (
          <button
            type="button"
            onClick={commit}
            style={{ background: "#ECFDF5", border: "1px solid #6EE7B7", borderRadius: 8, padding: "0 14px", fontSize: 12, fontWeight: 700, color: "#047857", cursor: "pointer", whiteSpace: "nowrap", fontFamily: "inherit" }}
          >
            + Add
          </button>
        )}
      </div>
      {focused && value.trim() && suggestions.length > 0 && (
        <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, zIndex: 30, background: "#fff", border: "1px solid #E2E8F0", borderRadius: 8, boxShadow: "0 4px 12px rgba(0,0,0,0.08)", overflow: "hidden" }}>
          {suggestions.slice(0, 6).map((t) => (
            <button
              key={t}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => { onAdd(t); setValue(""); }}
              style={{ width: "100%", textAlign: "left", padding: "8px 14px", fontSize: 13, color: "#19181E", background: "none", border: "none", borderBottom: "1px solid #F1F5F9", cursor: "pointer", fontFamily: "inherit" }}
            >
              <span style={{ color: "#94A3B8" }}>#</span>{t}
            </button>
          ))}
        </div>
      )}
      {focused && !value.trim() && existingTags.filter(t => !currentTags.includes(t)).length > 0 && (
        <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, zIndex: 30, background: "#fff", border: "1px solid #E2E8F0", borderRadius: 8, boxShadow: "0 4px 12px rgba(0,0,0,0.08)", overflow: "hidden" }}>
          {existingTags.filter(t => !currentTags.includes(t)).slice(0, 6).map((t) => (
            <button
              key={t}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => { onAdd(t); setValue(""); }}
              style={{ width: "100%", textAlign: "left", padding: "8px 14px", fontSize: 13, color: "#19181E", background: "none", border: "none", borderBottom: "1px solid #F1F5F9", cursor: "pointer", fontFamily: "inherit" }}
            >
              <span style={{ color: "#94A3B8" }}>#</span>{t}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── QuickAddForm ─────────────────────────────────────────────────────────────
function QuickAddForm({
  draft,
  setDraft,
  onSave,
  editing,
  onCancelEdit,
  existingTags,
}: {
  draft: DraftTransaction;
  setDraft: React.Dispatch<React.SetStateAction<DraftTransaction>>;
  onSave: (keepOpen: boolean) => void;
  editing: boolean;
  onCancelEdit: () => void;
  existingTags: string[];
}) {
  const amountRef = useRef<HTMLInputElement>(null);
  const [categorizing, setCategorizing] = useState(false);
  const [saveAndAddAnother, setSaveAndAddAnother] = useState(true);
  const [saving, setSavingLocal] = useState(false);

  const categories = draft.transaction_type === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
  const catInfo = ALL_CATEGORIES.find((c) => c.key === draft.category);

  const setField = useCallback(<K extends keyof DraftTransaction>(k: K, v: DraftTransaction[K]) => {
    setDraft((d) => ({ ...d, [k]: v }));
  }, [setDraft]);

  const handleDescriptionBlur = async () => {
    if (!draft.description || draft.category) return;
    setCategorizing(true);
    const result = await aiCategorize(draft.description, draft.transaction_type);
    setDraft((d) => ({ ...d, category: result.category, tags: result.tags, is_work_related: result.is_work_related, aiSuggestion: result.category }));
    setCategorizing(false);
  };

  const applyAiSuggestion = () => {
    if (draft.aiSuggestion) setField("category", draft.aiSuggestion);
  };

  const canSave = parseFloat(draft.amount) > 0 && draft.category;

  const handleSubmit = async (forceKeepOpen?: boolean) => {
    if (!canSave || saving) return;
    setSavingLocal(true);
    const keepOpen = forceKeepOpen ?? saveAndAddAnother;
    await onSave(keepOpen);
    setSavingLocal(false);
    if (keepOpen) {
      setTimeout(() => amountRef.current?.focus(), 50);
    }
  };

  // ⌘/Ctrl+Enter to save
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        handleSubmit(true);
      }
      if (e.key === "Escape" && editing) {
        e.preventDefault();
        onCancelEdit();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft, editing]);

  const isIncome = draft.transaction_type === "income";
  const aiSuggestedCat = ALL_CATEGORIES.find((c) => c.key === draft.aiSuggestion);
  const showAiPill = !!draft.aiSuggestion && draft.aiSuggestion !== draft.category && !isIncome;

  return (
    <div style={{
      background: "#fff",
      border: "1px solid #E2E8F0",
      borderRadius: 12,
      overflow: "hidden",
      position: "sticky",
      top: 24,
      alignSelf: "start",
      boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
    }}>
      {/* Header */}
      <div style={{ padding: "14px 20px 12px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid #E2E8F0" }}>
        <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: "1.1px", textTransform: "uppercase", color: "#047857" }}>
          {editing ? "Edit transaction" : "Quick add"}
        </div>
        {editing ? (
          <button onClick={onCancelEdit} style={{ background: "transparent", border: "1px solid #E2E8F0", borderRadius: 6, padding: "4px 10px", fontSize: 12, fontWeight: 600, color: "#64748B", cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}>
            ✕ Cancel
          </button>
        ) : (
          <div style={{ fontSize: 10.5, fontWeight: 700, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.5px" }}>Pinned</div>
        )}
      </div>

      {/* Body */}
      <div style={{ padding: "18px 20px 20px", display: "flex", flexDirection: "column", gap: 14, overflowY: "auto", maxHeight: "calc(100vh - 220px)" }}>
        {/* Type toggle */}
        <div style={{ display: "inline-flex", background: "#F1F5F9", borderRadius: 999, padding: 3, alignSelf: "flex-start" }}>
          {(["expense", "income"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setDraft((d) => ({ ...d, transaction_type: t, category: t === "income" ? "salary" : "", sub_category: "", aiSuggestion: null }))}
              style={{
                background: draft.transaction_type === t ? (t === "income" ? "#ECFDF5" : "#fff") : "transparent",
                color: draft.transaction_type === t ? (t === "income" ? "#047857" : "#19181E") : "#64748B",
                border: "none", borderRadius: 999, padding: "5px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer",
                boxShadow: draft.transaction_type === t && t === "expense" ? "0 1px 2px rgba(0,0,0,0.06)" : "none",
              }}
            >
              {t === "expense" ? "Expense" : "Income"}
            </button>
          ))}
        </div>

        {/* Amount input */}
        <div style={{
          border: `1.5px solid #E2E8F0`,
          borderRadius: 8,
          padding: "12px 14px 14px",
          background: "#fff",
          display: "flex", alignItems: "baseline", gap: 6,
          transition: "border-color 0.15s",
        }}
          onFocus={(e) => (e.currentTarget.style.borderColor = "#047857")}
          onBlur={(e) => (e.currentTarget.style.borderColor = "#E2E8F0")}
        >
          <span style={{ fontSize: 26, fontWeight: 700, color: "#94A3B8", letterSpacing: "-0.6px" }}>$</span>
          <input
            ref={amountRef}
            type="text"
            inputMode="decimal"
            placeholder="0.00"
            value={draft.amount}
            onChange={(e) => {
              const v = e.target.value.replace(/[^0-9.]/g, "").replace(/(\..*?)\./g, "$1");
              setField("amount", v);
            }}
            autoFocus
            style={{ flex: 1, border: "none", outline: "none", background: "transparent", fontSize: 34, fontWeight: 800, color: isIncome ? "#059669" : "#064E3B", letterSpacing: "-1px", fontVariantNumeric: "tabular-nums", minWidth: 0, width: "100%", fontFamily: "inherit" }}
          />
          <select
            value={draft.currency}
            onChange={(e) => setField("currency", e.target.value)}
            style={{ fontSize: 11, fontWeight: 700, color: "#64748B", padding: "4px 8px", background: "#F1F5F9", border: "none", borderRadius: 999, cursor: "pointer", fontFamily: "inherit" }}
          >
            {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        {/* Description */}
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <label style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.4px", textTransform: "uppercase", color: "#64748B" }}>
            Description
            {categorizing && <span style={{ color: "#f97316", marginLeft: 8, fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>categorizing…</span>}
          </label>
          <input
            type="text"
            placeholder={isIncome ? "e.g. Monthly salary, Freelance…" : "e.g. Whole Foods, Uber…"}
            value={draft.description}
            onChange={(e) => { setField("description", e.target.value); setField("aiSuggestion", null); setField("category", ""); setField("sub_category", ""); }}
            onBlur={handleDescriptionBlur}
            style={{ width: "100%", border: "1px solid #E2E8F0", borderRadius: 8, padding: "9px 12px", fontSize: 14, color: "#19181E", background: "#fff", outline: "none", fontFamily: "inherit" }}
          />
        </div>

        {/* AI suggestion pill */}
        {showAiPill && (
          <button
            type="button"
            onClick={applyAiSuggestion}
            style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              background: "linear-gradient(95deg, rgba(32,212,191,0.12), rgba(98,250,227,0.12))",
              border: "1px solid #6EE7B7", color: "#047857",
              borderRadius: 999, padding: "6px 12px 6px 10px",
              fontSize: 12, fontWeight: 700, cursor: "pointer", alignSelf: "flex-start",
            }}
          >
            <span style={{ color: "#20D4BF" }}>✦</span>
            Looks like {aiSuggestedCat?.label} — use it?
          </button>
        )}

        {/* Date + Work expense */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.4px", textTransform: "uppercase", color: "#64748B" }}>Date</label>
            <input
              type="date"
              value={draft.date}
              max={new Date().toISOString().split("T")[0]}
              onChange={(e) => setField("date", e.target.value)}
              style={{ border: "1px solid #E2E8F0", borderRadius: 8, padding: "9px 10px", fontSize: 13, color: "#19181E", background: "#fff", outline: "none", fontFamily: "inherit" }}
            />
          </div>
          {!isIncome && (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.4px", textTransform: "uppercase", color: "#64748B" }}>Work expense</label>
              <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", paddingTop: 10 }}>
                <input type="checkbox" checked={draft.is_work_related} onChange={(e) => setField("is_work_related", e.target.checked)} style={{ accentColor: "#059669", width: 16, height: 16 }} />
                <span style={{ fontSize: 13, color: draft.is_work_related ? "#059669" : "#64748B" }}>Yes</span>
              </label>
            </div>
          )}
        </div>

        {/* Category grid */}
        {!isIncome && (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.4px", textTransform: "uppercase", color: "#64748B" }}>Category</label>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6 }}>
              {categories.map((c) => {
                const isSelected = draft.category === c.key;
                return (
                  <button
                    key={c.key}
                    type="button"
                    onClick={() => { setField("category", c.key); setField("sub_category", ""); }}
                    style={{
                      background: isSelected ? "#ECFDF5" : "transparent",
                      border: `1px solid ${isSelected ? "#047857" : "#E2E8F0"}`,
                      borderRadius: 8, padding: "8px 4px 6px",
                      display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
                      cursor: "pointer", transition: "all 0.12s",
                    }}
                  >
                    <div style={{ background: c.color, borderRadius: "50%", width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 800, color: "#fff", letterSpacing: "-0.5px" }}>{c.code}</div>
                    <span style={{ fontSize: 10, fontWeight: 600, color: isSelected ? "#047857" : "#64748B", textAlign: "center", lineHeight: 1.2 }}>{c.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Sub-category picker */}
        {!isIncome && draft.category && SUB_CATEGORIES[draft.category] && (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.4px", textTransform: "uppercase", color: "#64748B" }}>
              Sub-Category <span style={{ color: "#94A3B8", fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>optional</span>
            </label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {SUB_CATEGORIES[draft.category].map((sc) => {
                const isSelected = draft.sub_category === sc;
                return (
                  <button key={sc} type="button"
                    onClick={() => setField("sub_category", isSelected ? "" : sc)}
                    style={{
                      background: isSelected ? "#ECFDF5" : "#F1F5F9",
                      border: `1px solid ${isSelected ? "#047857" : "transparent"}`,
                      borderRadius: 999, padding: "5px 12px",
                      fontSize: 12, fontWeight: 600,
                      color: isSelected ? "#047857" : "#64748B",
                      cursor: "pointer", fontFamily: "inherit",
                    }}>
                    {sc}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Project / Event */}
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <label style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.4px", textTransform: "uppercase", color: "#64748B" }}>
            Project / Event <span style={{ color: "#94A3B8", fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>optional</span>
          </label>
          {draft.tags.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {draft.tags.map((tag) => (
                <span key={tag} style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "#ECFDF5", border: "1px solid #6EE7B7", borderRadius: 999, padding: "4px 10px", fontSize: 12, fontWeight: 600, color: "#047857" }}>
                  #{tag}
                  <button
                    type="button"
                    onClick={() => setField("tags", draft.tags.filter((t) => t !== tag))}
                    style={{ background: "none", border: "none", cursor: "pointer", color: "#6EE7B7", fontSize: 16, lineHeight: 1, padding: "0 0 0 2px", display: "flex", alignItems: "center" }}
                  >×</button>
                </span>
              ))}
            </div>
          )}
          <ProjectInput
            existingTags={existingTags}
            currentTags={draft.tags}
            onAdd={(tag) => { if (!draft.tags.includes(tag)) setField("tags", [...draft.tags, tag]); }}
          />
        </div>

        {/* Income category dropdown */}
        {isIncome && (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.4px", textTransform: "uppercase", color: "#64748B" }}>Category</label>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6 }}>
              {INCOME_CATEGORIES.map((c) => {
                const isSelected = draft.category === c.key;
                return (
                  <button
                    key={c.key}
                    type="button"
                    onClick={() => setField("category", c.key)}
                    style={{
                      background: isSelected ? "#ECFDF5" : "transparent",
                      border: `1px solid ${isSelected ? "#047857" : "#E2E8F0"}`,
                      borderRadius: 8, padding: "8px 4px 6px",
                      display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
                      cursor: "pointer",
                    }}
                  >
                    <div style={{ background: c.color, borderRadius: "50%", width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 800, color: "#fff" }}>{c.code}</div>
                    <span style={{ fontSize: 10, fontWeight: 600, color: isSelected ? "#047857" : "#64748B", textAlign: "center" }}>{c.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{ padding: "14px 20px 18px", borderTop: "1px solid #E2E8F0", background: "linear-gradient(180deg, transparent, #FAFBFC)", display: "flex", flexDirection: "column", gap: 10 }}>
        {!editing && (
          <label style={{ display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer", fontSize: 12 }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
              <span
                role="switch"
                aria-checked={saveAndAddAnother}
                onClick={() => setSaveAndAddAnother((v) => !v)}
                style={{
                  display: "inline-block", width: 32, height: 18,
                  background: saveAndAddAnother ? "#059669" : "#CBD5E1",
                  borderRadius: 999, position: "relative", cursor: "pointer", transition: "background 0.12s", flexShrink: 0,
                }}
              >
                <span style={{
                  position: "absolute", width: 14, height: 14, background: "#fff", borderRadius: "50%",
                  top: 2, left: saveAndAddAnother ? 16 : 2, transition: "left 0.14s",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
                }} />
              </span>
              <strong style={{ color: "#19181E" }}>Save &amp; add another</strong>
            </span>
            <span style={{ color: "#94A3B8", fontSize: 11 }}>
              <span style={{ border: "1px solid #E2E8F0", borderBottomWidth: 2, borderRadius: 4, padding: "0 4px", fontSize: 10, fontWeight: 600, color: "#64748B", background: "#FAFBFC" }}>⌘</span>
              {" "}
              <span style={{ border: "1px solid #E2E8F0", borderBottomWidth: 2, borderRadius: 4, padding: "0 4px", fontSize: 10, fontWeight: 600, color: "#64748B", background: "#FAFBFC" }}>↵</span>
            </span>
          </label>
        )}
        <button
          onClick={() => handleSubmit()}
          disabled={!canSave || saving}
          style={{
            background: canSave ? "#047857" : "#CBD5E1",
            color: "#fff", border: "none", borderRadius: 8,
            padding: "12px 16px", fontSize: 14, fontWeight: 700,
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            cursor: canSave ? "pointer" : "not-allowed",
            width: "100%", fontFamily: "inherit",
          }}
        >
          {saving ? "Saving…" : editing ? "Save changes" : "Save transaction"}
        </button>
      </div>

      {/* Mobile: shown via drawer */}
      <style>{`
        @media (max-width: 1024px) { .cf-form-pane { display: none; } }
        .cf-form-pane { display: flex; flex-direction: column; }
      `}</style>
    </div>
  );
}

// ─── Transaction List ─────────────────────────────────────────────────────────
function TransactionList({
  transactions,
  editingId,
  justAddedId,
  onEdit,
  onDelete,
  rates,
}: {
  transactions: Transaction[];
  editingId: string | null;
  justAddedId: string | null;
  onEdit: (tx: Transaction) => void;
  onDelete: (tx: Transaction) => void;
  rates: Record<string, number>;
}) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "expense" | "income">("all");
  const todayYmd = new Date().toISOString().split("T")[0];

  const filtered = useMemo(() => {
    return transactions.filter((t) => {
      if (filter !== "all" && t.transaction_type !== filter) return false;
      if (search) {
        const s = search.toLowerCase();
        const cat = ALL_CATEGORIES.find((c) => c.key === t.category);
        return (
          t.description.toLowerCase().includes(s) ||
          (cat?.label || "").toLowerCase().includes(s) ||
          (t.tags || []).some((tag) => tag.toLowerCase().includes(s))
        );
      }
      return true;
    });
  }, [transactions, search, filter]);

  const groups = useMemo(() => {
    const byDate: Record<string, Transaction[]> = {};
    filtered.forEach((t) => {
      if (!byDate[t.date]) byDate[t.date] = [];
      byDate[t.date].push(t);
    });
    return Object.entries(byDate).sort(([a], [b]) => b.localeCompare(a));
  }, [filtered]);

  return (
    <div style={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 12, overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
      {/* List header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px", borderBottom: "1px solid #E2E8F0", gap: 12, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 0 }}>
          <span style={{ fontSize: 15, fontWeight: 700, color: "#064E3B", letterSpacing: "-0.2px" }}>Transactions</span>
          <span style={{ fontSize: 12, color: "#94A3B8", fontWeight: 600, marginLeft: 8 }}>{filtered.length}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {/* Search */}
          <div style={{ position: "relative" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}>
              <circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" />
            </svg>
            <input
              type="text"
              placeholder="Search…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ background: "#F2F4F6", border: "1px solid transparent", borderRadius: 999, padding: "6px 12px 6px 30px", fontSize: 13, color: "#19181E", width: 180, outline: "none", fontFamily: "inherit" }}
            />
          </div>
          {/* Filter pills */}
          {(["all", "expense", "income"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                background: filter === f ? "#ECFDF5" : "#F2F4F6",
                border: `1px solid ${filter === f ? "#6EE7B7" : "transparent"}`,
                borderRadius: 999, padding: "6px 14px",
                fontSize: 12, fontWeight: 600,
                color: filter === f ? "#047857" : "#64748B",
                cursor: "pointer", fontFamily: "inherit",
              }}
            >
              {f === "all" ? "All" : f === "expense" ? "Out" : "In"}
            </button>
          ))}
        </div>
      </div>

      {/* Scrollable list */}
      <div style={{ overflowY: "auto", maxHeight: "calc(100vh - 340px)", minHeight: 200 }}>
        {groups.length === 0 ? (
          <div style={{ padding: "60px 24px", display: "flex", flexDirection: "column", alignItems: "center", gap: 12, color: "#94A3B8", textAlign: "center" }}>
            <div style={{ width: 64, height: 64, borderRadius: "50%", background: "#ECFDF5", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 17 9 13l3 3 7-7" /><path d="M14 6h5v5" />
              </svg>
            </div>
            <div style={{ fontWeight: 700, fontSize: 16, color: "#064E3B" }}>No transactions yet</div>
            <div style={{ fontSize: 13, maxWidth: 280 }}>
              {search ? "Try a different search or clear filters." : "Add your first transaction with the form on the right."}
            </div>
          </div>
        ) : (
          groups.map(([date, txns]) => {
            const dayNet = txns.reduce((s, t) => { const usd = toUSD(t.amount, t.currency, rates); return s + (t.transaction_type === "income" ? usd : -usd); }, 0);
            return (
              <div key={date}>
                <div style={{ padding: "14px 20px 6px", display: "flex", alignItems: "baseline", justifyContent: "space-between", fontSize: 10, fontWeight: 700, letterSpacing: "1.1px", textTransform: "uppercase", color: "#94A3B8" }}>
                  <span>{dayLabel(date, todayYmd)}</span>
                  <span style={{ color: "#64748B", fontVariantNumeric: "tabular-nums" }}>
                    {dayNet >= 0 ? "+" : "−"}{fmt(Math.abs(dayNet))}
                  </span>
                </div>
                {txns
                  .sort((a, b) => b.date.localeCompare(a.date))
                  .map((tx) => {
                    const isIncome = tx.transaction_type === "income";
                    const cat = ALL_CATEGORIES.find((c) => c.key === tx.category);
                    const isEditing = editingId === tx.id;
                    const wasJustAdded = justAddedId === tx.id;

                    return (
                      <div
                        key={tx.id}
                        onClick={() => onEdit(tx)}
                        style={{
                          display: "grid", gridTemplateColumns: "36px 1fr auto 28px",
                          gap: 14, alignItems: "center", padding: "12px 20px",
                          borderTop: "1px solid #F1F5F9", cursor: "pointer",
                          background: isEditing ? "#ECFDF5" : wasJustAdded ? "#DCFCE7" : "transparent",
                          transition: "background 0.12s",
                        }}
                        onMouseEnter={(e) => { if (!isEditing) (e.currentTarget as HTMLDivElement).style.background = "#F8FAFC"; }}
                        onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = isEditing ? "#ECFDF5" : "transparent"; }}
                      >
                        {/* Category chip */}
                        <div style={{ width: 36, height: 36, borderRadius: "50%", background: cat?.color || "#6b7280", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 800, color: "#fff", letterSpacing: "-0.5px", flexShrink: 0 }}>
                          {cat?.code || (isIncome ? "IN" : "EX")}
                        </div>

                        {/* Description + meta */}
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: 14, fontWeight: 600, color: "#19181E", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{tx.description}</div>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginTop: 2 }}>
                            <span style={{ fontSize: 11.5, color: "#94A3B8" }}>{cat?.label || tx.category}</span>
                            {tx.sub_category && <span style={{ fontSize: 11, color: "#64748B" }}>· {tx.sub_category}</span>}
                            {tx.is_work_related && <span style={{ background: "rgba(99,102,241,0.12)", color: "#6366f1", borderRadius: 4, padding: "1px 6px", fontSize: 10.5, fontWeight: 600 }}>work</span>}
                            {(tx.tags || []).slice(0, 2).map((t) => (
                              <span key={t} style={{ background: "#F1F5F9", color: "#64748B", borderRadius: 999, padding: "1px 8px", fontSize: 10.5, fontWeight: 600 }}>#{t}</span>
                            ))}
                          </div>
                        </div>

                        {/* Amount */}
                        <div style={{ fontSize: 14, fontWeight: 700, color: isIncome ? "#059669" : "#19181E", whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums" }}>
                          {isIncome ? "+" : "−"}{fmt(tx.amount, tx.currency).replace(/^−/, "").replace(/^\+/, "")}
                        </div>

                        {/* Delete */}
                        <button
                          onClick={(e) => { e.stopPropagation(); onDelete(tx); }}
                          style={{ width: 28, height: 28, borderRadius: "50%", background: "transparent", border: "none", color: "#94A3B8", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", opacity: 0, transition: "opacity 0.12s, background 0.12s" }}
                          className="tx-delete-btn"
                          aria-label="delete"
                        >
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M4 7h16M10 11v6M14 11v6M6 7l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13M9 7V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v3" />
                          </svg>
                        </button>
                      </div>
                    );
                  })}
              </div>
            );
          })
        )}
      </div>

      <style>{`
        div:hover > .tx-delete-btn, tr:hover .tx-delete-btn { opacity: 1 !important; }
        [data-row]:hover .tx-delete-btn { opacity: 1; }
      `}</style>
    </div>
  );
}

// ─── Monthly Summary ──────────────────────────────────────────────────────────
function MonthlySummary({
  transactions,
  viewMonth,
  onPrevMonth,
  onNextMonth,
  budgetExpenses,
  rates,
}: {
  transactions: Transaction[];
  viewMonth: string;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  budgetExpenses: Record<string, number> | null;
  rates: Record<string, number>;
}) {
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const isCurrentMonth = viewMonth === currentMonth;
  const [y, m] = viewMonth.split("-").map(Number);
  const monthLabel = new Date(y, m - 1, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" });

  const monthTxns = transactions.filter((t) => t.date.startsWith(viewMonth));
  const currencies = [...new Set(monthTxns.map((t) => t.currency).filter(Boolean))];
  const isMixed = currencies.length > 1;

  const incomeTotal = monthTxns.filter((t) => t.transaction_type === "income").reduce((s, t) => s + toUSD(t.amount, t.currency, rates), 0);
  const expenseTotal = monthTxns.filter((t) => t.transaction_type !== "income").reduce((s, t) => s + toUSD(t.amount, t.currency, rates), 0);
  const net = incomeTotal - expenseTotal;
  const workTotal = monthTxns.filter((t) => t.is_work_related).reduce((s, t) => s + toUSD(t.amount, t.currency, rates), 0);

  const byCat = EXPENSE_CATEGORIES.map((cat) => ({
    ...cat,
    total: monthTxns.filter((t) => t.transaction_type !== "income" && t.category === cat.key).reduce((s, t) => s + toUSD(t.amount, t.currency, rates), 0),
  }))
    .filter((c) => c.total > 0)
    .sort((a, b) => b.total - a.total);

  const prevMonth = (() => {
    const [py, pm] = viewMonth.split("-").map(Number);
    const d = new Date(py, pm - 2, 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  })();
  const prevTxns = transactions.filter((t) => t.date.startsWith(prevMonth));
  const prevIncome = prevTxns.filter((t) => t.transaction_type === "income").reduce((s, t) => s + toUSD(t.amount, t.currency, rates), 0);
  const prevSpent = prevTxns.filter((t) => t.transaction_type !== "income").reduce((s, t) => s + toUSD(t.amount, t.currency, rates), 0);

  const kpiCard = (label: string, value: number, color: string, hint: string) => (
    <div style={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 10, padding: "18px 22px", boxShadow: "0 1px 2px rgba(0,0,0,0.04)" }}>
      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "1.1px", textTransform: "uppercase", color: "#64748B", marginBottom: 8 }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 800, color, letterSpacing: "-0.5px", fontVariantNumeric: "tabular-nums", lineHeight: 1.05 }}>
        {label === "Net" && value >= 0 ? "+" : ""}{fmt(value)}
      </div>
      <div style={{ fontSize: 12, color: "#94A3B8", marginTop: 10, fontVariantNumeric: "tabular-nums" }}>{hint}</div>
    </div>
  );

  return (
    <div style={{ marginBottom: 20 }}>
      {/* Header row: month label + nav */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 22, color: "#064E3B", letterSpacing: "-0.4px" }}>{monthLabel}</div>
          {isMixed && <div style={{ fontSize: 11, color: "#94A3B8", marginTop: 2 }}>Totals converted to USD · live rates</div>}
        </div>
        <div style={{ display: "flex", alignItems: "center", background: "#fff", border: "1px solid #E2E8F0", borderRadius: 8, overflow: "hidden", boxShadow: "0 1px 2px rgba(0,0,0,0.04)" }}>
          <button onClick={onPrevMonth} style={{ background: "transparent", border: "none", padding: "9px 12px", color: "#64748B", cursor: "pointer", display: "flex", alignItems: "center" }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="m14 6-6 6 6 6" /></svg>
          </button>
          <div style={{ padding: "0 8px", fontSize: 14, fontWeight: 700, color: "#064E3B", minWidth: 130, textAlign: "center", letterSpacing: "-0.2px" }}>{monthLabel}</div>
          <button onClick={onNextMonth} disabled={isCurrentMonth} style={{ background: "transparent", border: "none", padding: "9px 12px", color: isCurrentMonth ? "#CBD5E1" : "#64748B", cursor: isCurrentMonth ? "not-allowed" : "pointer", display: "flex", alignItems: "center" }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="m10 6 6 6-6 6" /></svg>
          </button>
        </div>
      </div>

      {/* KPI grid */}
      <div style={{ display: "grid", gridTemplateColumns: byCat.length > 0 ? "repeat(3, 1fr) 220px" : workTotal > 0 ? "repeat(4, 1fr)" : "repeat(3, 1fr)", gap: 16, marginBottom: 20 }}>
        {kpiCard("Income", incomeTotal, "#059669", prevIncome > 0 ? `vs ${fmt(prevIncome)} last month` : "No prior month data")}
        {kpiCard("Spent", expenseTotal, "#19181E", prevSpent > 0 ? `vs ${fmt(prevSpent)} last month` : "No prior month data")}
        {kpiCard("Net", net, net >= 0 ? "#047857" : "#DC2626", net >= 0 && incomeTotal > 0 ? `${((net / incomeTotal) * 100).toFixed(1)}% savings rate` : "Spending exceeds income")}
        {workTotal > 0 && kpiCard("Work", workTotal, "#6366f1", "work-related expenses")}

        {/* Donut card */}
        {byCat.length > 0 && (
          <div style={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 10, padding: "14px 16px", display: "flex", alignItems: "center", gap: 14, boxShadow: "0 1px 2px rgba(0,0,0,0.04)" }}>
            <div style={{ flexShrink: 0 }}>
              <ResponsiveContainer width={88} height={88}>
                <PieChart>
                  <Pie data={byCat} cx="50%" cy="50%" innerRadius={26} outerRadius={40} paddingAngle={2} dataKey="total">
                    {byCat.map((cat) => <Cell key={cat.key} fill={cat.color} />)}
                  </Pie>
                  <ChartTooltip
                    formatter={(v) => [fmt(Number(v ?? 0)), ""]}
                    contentStyle={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 8, fontFamily: "inherit", fontSize: 12 }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 4, minWidth: 0 }}>
              {byCat.slice(0, 4).map((cat) => (
                <div key={cat.key} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, fontWeight: 600 }}>
                  <span style={{ width: 8, height: 8, borderRadius: 2, background: cat.color, flexShrink: 0 }} />
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1, color: "#19181E" }}>{cat.label}</span>
                  <span style={{ color: "#94A3B8", fontVariantNumeric: "tabular-nums" }}>{expenseTotal ? Math.round((cat.total / expenseTotal) * 100) : 0}%</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Budget bars */}
      {byCat.length > 0 && budgetExpenses && (
        <div className="uf-card" style={{ marginBottom: 0 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {byCat.map((cat) => {
              const budget = budgetExpenses[cat.key] || 0;
              const over = budget > 0 && cat.total > budget;
              const barPct = budget > 0 ? Math.min(100, (cat.total / budget) * 100) : (cat.total / expenseTotal) * 100;
              return (
                <div key={cat.key}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 3 }}>
                    <span style={{ color: "#64748B" }}>{cat.label}</span>
                    <span style={{ fontVariantNumeric: "tabular-nums", fontWeight: 600, color: over ? "#DC2626" : cat.color }}>
                      {fmt(cat.total)}
                      {budget > 0 ? <span style={{ color: "#94A3B8", fontWeight: 400 }}> / {fmt(budget)}</span> : <span style={{ color: "#94A3B8", fontWeight: 400 }}> ({((cat.total / expenseTotal) * 100).toFixed(0)}%)</span>}
                    </span>
                  </div>
                  <div style={{ height: 4, background: "#E2E8F0", borderRadius: 4, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${barPct}%`, background: over ? "#DC2626" : cat.color, borderRadius: 4, transition: "width 0.4s" }} />
                  </div>
                  {over && <div style={{ fontSize: 11, color: "#DC2626", marginTop: 2 }}>over by {fmt(cat.total - budget)}</div>}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Toast ────────────────────────────────────────────────────────────────────
function Toast({
  toast,
  onUndo,
}: {
  toast: { msg: string; undoId?: string; _removed?: Transaction } | null;
  onUndo: () => void;
}) {
  return (
    <div style={{
      position: "fixed", bottom: 28, left: "50%",
      transform: `translateX(-50%) translateY(${toast ? 0 : 20}px)`,
      opacity: toast ? 1 : 0, transition: "all 220ms",
      background: "#064E3B", color: "#fff", borderRadius: 999,
      padding: "10px 16px 10px 14px", fontSize: 13, fontWeight: 600,
      display: "flex", alignItems: "center", gap: 12, zIndex: 50,
      pointerEvents: toast ? "auto" : "none",
      boxShadow: "0 12px 32px rgba(15,23,42,0.14)",
    }}>
      <span style={{ width: 18, height: 18, background: "#10B981", borderRadius: "50%", display: "inline-flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 12 }}>✓</span>
      <span>{toast?.msg}</span>
      {toast?.undoId && (
        <button onClick={onUndo} style={{ background: "transparent", border: "none", color: "#62FAE3", fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.4px", cursor: "pointer", padding: 0 }}>
          Undo
        </button>
      )}
    </div>
  );
}

// ─── Mobile components ────────────────────────────────────────────────────────
function MobileBar({ onOpen }: { onOpen: () => void }) {
  return (
    <div style={{ display: "none" }} className="cf-mobile-bar">
      <button onClick={onOpen} style={{ flex: 1, color: "#94A3B8", fontSize: 14, border: "none", background: "transparent", textAlign: "left", padding: "6px 4px", cursor: "pointer", fontFamily: "inherit" }}>
        + Add a transaction…
      </button>
      <button onClick={onOpen} style={{ width: 40, height: 40, background: "#047857", color: "#fff", border: "none", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", boxShadow: "0 4px 10px rgba(6,78,59,0.35)", flexShrink: 0 }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14" /></svg>
      </button>
    </div>
  );
}

function MobileDrawer({ open, onClose, children }: { open: boolean; onClose: () => void; children: React.ReactNode }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.5)", zIndex: 40, opacity: open ? 1 : 0, pointerEvents: open ? "auto" : "none", transition: "opacity 200ms" }} />
      <div style={{ position: "fixed", left: 0, right: 0, bottom: 0, background: "#fff", borderTopLeftRadius: 18, borderTopRightRadius: 18, zIndex: 50, transform: `translateY(${open ? 0 : "100%"})`, transition: "transform 240ms cubic-bezier(0.2,0,0,1)", maxHeight: "92vh", display: "flex", flexDirection: "column", boxShadow: "0 -10px 32px rgba(15,23,42,0.2)" }}>
        <div onClick={onClose} style={{ width: 44, height: 5, borderRadius: 99, background: "#CBD5E1", margin: "10px auto 6px", cursor: "pointer" }} />
        <div style={{ flex: 1, overflowY: "auto" }}>{children}</div>
      </div>
    </>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────
export default function TransactionsTab() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const [viewMonth, setViewMonth] = useState(currentMonth);
  const [budgetExpenses, setBudgetExpenses] = useState<Record<string, number> | null>(null);
  const [rates, setRates] = useState<Record<string, number>>(FALLBACK_RATES);

  // Form state (lifted so edit can populate it)
  const [draft, setDraft] = useState<DraftTransaction>(EMPTY_DRAFT);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [justAddedId, setJustAddedId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; undoId?: string; _removed?: Transaction } | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    fetch("https://api.frankfurter.app/latest?from=USD")
      .then((r) => r.json())
      .then((d) => setRates(d.rates ?? {}))
      .catch(() => {});

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) return;
      supabase
        .from("expenses")
        .select("*")
        .eq("user_id", session.user.id)
        .order("date", { ascending: false })
        .then(({ data }) => {
          if (data) setTransactions(data);
          setLoading(false);
        });
      supabase
        .from("user_budget")
        .select("income, expenses")
        .eq("user_id", session.user.id)
        .maybeSingle()
        .then(({ data }) => {
          if (data?.expenses) {
            const { _fire_profile: _, ...budgetCats } = data.expenses as Record<string, unknown>;
            setBudgetExpenses(budgetCats as Record<string, number>);
          }
        });
    });
  }, []);

  const monthTxns = useMemo(
    () => transactions.filter((t) => t.date.startsWith(viewMonth)),
    [transactions, viewMonth]
  );

  const existingTags = useMemo(
    () => [...new Set(transactions.flatMap((t) => t.tags || []))].sort(),
    [transactions]
  );

  const showToast = useCallback((msg: string, undoId?: string, removed?: Transaction) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ msg, undoId, _removed: removed });
    toastTimer.current = setTimeout(() => setToast(null), undoId ? 4000 : 3200);
  }, []);

  const handleSave = useCallback(async (keepOpen: boolean) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const payload = {
      user_id: session.user.id,
      date: draft.date,
      amount: parseFloat(draft.amount),
      currency: draft.currency,
      description: draft.description,
      category: draft.category || (draft.transaction_type === "income" ? "other_income" : "other"),
      sub_category: draft.sub_category || null,
      tags: draft.tags,
      is_work_related: draft.is_work_related,
      transaction_type: draft.transaction_type,
    };

    if (draft.id) {
      // Edit existing
      const { data, error } = await supabase.from("expenses").update(payload).eq("id", draft.id).select().single();
      if (!error && data) {
        setTransactions((prev) => prev.map((t) => (t.id === draft.id ? data : t)));
        setEditingId(null);
        setDraft(EMPTY_DRAFT());
        showToast("Transaction updated");
      }
    } else {
      // Insert new
      const { data, error } = await supabase.from("expenses").insert(payload).select().single();
      if (!error && data) {
        setTransactions((prev) => [data, ...prev]);
        setJustAddedId(data.id);
        setTimeout(() => setJustAddedId(null), 1600);
        if (viewMonth !== data.date.slice(0, 7)) setViewMonth(data.date.slice(0, 7));
        showToast(`Added — ${data.description || `$${data.amount}`}`, data.id);
        if (!keepOpen) {
          setDraft(EMPTY_DRAFT());
        } else {
          setDraft((d) => ({ ...EMPTY_DRAFT(), date: d.date, transaction_type: d.transaction_type, currency: d.currency, sub_category: "", tags: d.tags }));
        }
        if (drawerOpen && !keepOpen) setDrawerOpen(false);
      }
    }
  }, [draft, drawerOpen, viewMonth, showToast]);

  const handleEdit = useCallback((tx: Transaction) => {
    setEditingId(tx.id);
    setDraft({
      id: tx.id,
      transaction_type: tx.transaction_type,
      amount: String(tx.amount),
      currency: tx.currency,
      description: tx.description,
      date: tx.date,
      category: tx.category,
      sub_category: tx.sub_category || "",
      tags: [...(tx.tags || [])],
      is_work_related: tx.is_work_related,
      aiSuggestion: null,
    });
    // On mobile, open drawer
    if (typeof window !== "undefined" && window.matchMedia("(max-width: 1024px)").matches) {
      setDrawerOpen(true);
    }
  }, []);

  const handleCancelEdit = useCallback(() => {
    setEditingId(null);
    setDraft(EMPTY_DRAFT());
    if (drawerOpen) setDrawerOpen(false);
  }, [drawerOpen]);

  const handleDelete = useCallback(async (tx: Transaction) => {
    if (!window.confirm(`Delete "${tx.description}"?`)) return;
    await supabase.from("expenses").delete().eq("id", tx.id);
    setTransactions((prev) => prev.filter((t) => t.id !== tx.id));
    if (editingId === tx.id) { setEditingId(null); setDraft(EMPTY_DRAFT()); }
    showToast(`Deleted "${tx.description}"`, "undo:" + tx.id, tx);
  }, [editingId, showToast]);

  const handleUndo = useCallback(() => {
    if (!toast) return;
    if (toast._removed) {
      // Re-insert
      supabase.from("expenses").insert({ ...toast._removed }).then(({ data }) => {
        if (data) setTransactions((prev) => [toast._removed!, ...prev]);
        else setTransactions((prev) => [toast._removed!, ...prev]);
      });
      setTransactions((prev) => [toast._removed!, ...prev]);
    } else if (toast.undoId && !toast.undoId.startsWith("undo:")) {
      // Undo add: delete the just-added transaction
      supabase.from("expenses").delete().eq("id", toast.undoId);
      setTransactions((prev) => prev.filter((t) => t.id !== toast.undoId));
    }
    setToast(null);
  }, [toast]);

  const handlePrevMonth = () => {
    const [py, pm] = viewMonth.split("-").map(Number);
    const d = new Date(py, pm - 2, 1);
    setViewMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  };

  const handleNextMonth = () => {
    const [py, pm] = viewMonth.split("-").map(Number);
    const d = new Date(py, pm, 1);
    const next = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    if (next <= currentMonth) setViewMonth(next);
  };

  if (loading) {
    return <div style={{ textAlign: "center", padding: "60px 0", color: "#94A3B8" }}>Loading transactions…</div>;
  }

  return (
    <>
      <style>{`
        @media (max-width: 1024px) {
          .cf-split { grid-template-columns: 1fr !important; }
          .cf-form-col { display: none; }
          .cf-mobile-bar { display: flex !important; position: fixed; bottom: 16px; left: 16px; right: 16px; background: #fff; border: 1px solid #E2E8F0; border-radius: 14px; padding: 10px 10px 10px 16px; box-shadow: 0 4px 12px rgba(0,0,0,0.08); align-items: center; gap: 10px; z-index: 30; }
        }
      `}</style>

      <MonthlySummary
        transactions={transactions}
        viewMonth={viewMonth}
        onPrevMonth={handlePrevMonth}
        onNextMonth={handleNextMonth}
        budgetExpenses={budgetExpenses}
        rates={rates}
      />

      <div className="cf-split" style={{ display: "grid", gridTemplateColumns: "1fr 360px", gap: 16, alignItems: "start" }}>
        <TransactionList
          transactions={monthTxns}
          editingId={editingId}
          justAddedId={justAddedId}
          onEdit={handleEdit}
          onDelete={handleDelete}
          rates={rates}
        />
        <div className="cf-form-col">
          <QuickAddForm
            draft={draft}
            setDraft={setDraft}
            onSave={handleSave}
            editing={!!editingId}
            onCancelEdit={handleCancelEdit}
            existingTags={existingTags}
          />
        </div>
      </div>

      <MobileBar onOpen={() => { setEditingId(null); setDraft(EMPTY_DRAFT()); setDrawerOpen(true); }} />
      <MobileDrawer open={drawerOpen} onClose={() => { setDrawerOpen(false); if (editingId) handleCancelEdit(); }}>
        <QuickAddForm
          draft={draft}
          setDraft={setDraft}
          onSave={handleSave}
          editing={!!editingId}
          onCancelEdit={handleCancelEdit}
        />
      </MobileDrawer>

      <Toast toast={toast} onUndo={handleUndo} />
    </>
  );
}
