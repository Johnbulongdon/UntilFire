"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import CsvImportModal from "./CsvImportModal";
import { PieChart, Pie, Cell, Tooltip as ChartTooltip, ResponsiveContainer } from "recharts";
import { formatUSDInCurrency, SUPPORTED_CURRENCIES, FALLBACK_RATES as LIB_FALLBACK_RATES } from "@/lib/currency";
import {
  EXPENSE_CATEGORIES, INCOME_CATEGORIES, ALL_CATEGORIES as ALL_CATEGORIES_BASE,
  COLOR_PALETTE, EMOJI_PALETTE,
  loadCatCustomizations, saveCatCustomizations, CatCustomizations, resolveDisplay,
} from "@/lib/categories";

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

type CustomCategory = { key: string; label: string; code: string; color: string; emoji?: string };

const ALL_CATEGORIES = ALL_CATEGORIES_BASE;
const FALLBACK_RATES = LIB_FALLBACK_RATES;

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
  aiSuggestion: null,
});

// ─── AI Categorization ────────────────────────────────────────────────────────
async function aiCategorize(
  description: string,
  type: "expense" | "income"
): Promise<{ category: string; tags: string[] }> {
  try {
    const res = await fetch("/api/categorise", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ description, type }),
    });
    if (!res.ok) throw new Error("categorise failed");
    return res.json();
  } catch {
    return { category: type === "income" ? "other_income" : "other", tags: [] };
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
  allExpenseCats,
  allSubCats,
  colorPalette,
  emojiPalette,
  preferredCurrencies,
  onAddCategory,
  onAddSubCategory,
}: {
  draft: DraftTransaction;
  setDraft: React.Dispatch<React.SetStateAction<DraftTransaction>>;
  onSave: (keepOpen: boolean) => void;
  editing: boolean;
  onCancelEdit: () => void;
  existingTags: string[];
  allExpenseCats: { key: string; label: string; code: string; color: string; emoji?: string }[];
  allSubCats: Record<string, string[]>;
  colorPalette: string[];
  emojiPalette: string[];
  preferredCurrencies: string[];
  onAddCategory: (cat: CustomCategory) => void;
  onAddSubCategory: (catKey: string, sub: string) => void;
}) {
  const amountRef = useRef<HTMLInputElement>(null);
  const [categorizing, setCategorizing] = useState(false);
  const [saveAndAddAnother, setSaveAndAddAnother] = useState(true);
  const [saving, setSavingLocal] = useState(false);
  const [showCatForm, setShowCatForm] = useState(false);
  const [newCatLabel, setNewCatLabel] = useState("");
  const [newCatColor, setNewCatColor] = useState(colorPalette[0]);
  const [newCatEmoji, setNewCatEmoji] = useState("");
  const [showSubForm, setShowSubForm] = useState(false);
  const [newSubLabel, setNewSubLabel] = useState("");

  const categories = draft.transaction_type === "income" ? INCOME_CATEGORIES : allExpenseCats;

  const setField = useCallback(<K extends keyof DraftTransaction>(k: K, v: DraftTransaction[K]) => {
    setDraft((d) => ({ ...d, [k]: v }));
  }, [setDraft]);

  const handleDescriptionBlur = async () => {
    const desc = draft.description.trim();
    if (desc.length < 4 || draft.transaction_type === "income") return;
    setCategorizing(true);
    try {
      const { category, tags } = await aiCategorize(desc, "expense");
      setField("aiSuggestion", category);
      if (tags.length > 0) {
        setField("tags", [...new Set([...draft.tags, ...tags])]);
      }
    } finally {
      setCategorizing(false);
    }
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
    <div className="cf-quick-form" style={{
      background: "#fff",
      border: "1px solid #E2E8F0",
      borderRadius: 12,
      overflow: "hidden",
      position: "sticky",
      top: 24,
      height: "calc(100vh - 48px)",
      display: "flex",
      flexDirection: "column",
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
      <div className="cf-quick-form-body" style={{ padding: "18px 20px 20px", display: "flex", flexDirection: "column", gap: 14, overflowY: "auto", flex: 1, minHeight: 0 }}>
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
            {(preferredCurrencies.length > 0 ? preferredCurrencies : [...SUPPORTED_CURRENCIES]).map((c) => <option key={c} value={c}>{c}</option>)}
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
            onChange={(e) => {
              const wasAiCategory = draft.aiSuggestion && draft.aiSuggestion === draft.category;
              setField("description", e.target.value);
              setField("aiSuggestion", null);
              if (wasAiCategory) { setField("category", ""); setField("sub_category", ""); }
            }}
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

        {/* Date */}
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
                    onClick={() => { setField("category", c.key); setField("sub_category", ""); setShowSubForm(false); }}
                    style={{
                      background: isSelected ? "#ECFDF5" : "transparent",
                      border: `1px solid ${isSelected ? "#047857" : "#E2E8F0"}`,
                      borderRadius: 8, padding: "8px 4px 6px",
                      display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
                      cursor: "pointer", transition: "all 0.12s",
                    }}
                  >
                    <div style={{ background: c.color, borderRadius: "50%", width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>{c.emoji}</div>
                    <span style={{ fontSize: 10, fontWeight: 600, color: isSelected ? "#047857" : "#64748B", textAlign: "center", lineHeight: 1.2 }}>{c.label}</span>
                  </button>
                );
              })}
            </div>
            {/* Add custom category */}
            {!showCatForm ? (
              <button
                type="button"
                onClick={() => setShowCatForm(true)}
                style={{ background: "none", border: "none", cursor: "pointer", fontSize: 12, color: "#94A3B8", padding: "2px 0", fontFamily: "inherit", textAlign: "left", alignSelf: "flex-start" }}
              >
                + Add category
              </button>
            ) : (
              <div style={{ border: "1px solid #E2E8F0", borderRadius: 10, padding: "12px", background: "#F8FAFC", display: "flex", flexDirection: "column", gap: 10 }}>
                <input
                  autoFocus
                  placeholder="Category name"
                  value={newCatLabel}
                  onChange={(e) => setNewCatLabel(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      const label = newCatLabel.trim();
                      if (!label) return;
                      const key = label.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
                      const code = label.replace(/[^a-zA-Z]/g, "").slice(0, 2).toUpperCase() || "CU";
                      onAddCategory({ key, label, code, color: newCatColor, emoji: newCatEmoji || undefined });
                      setField("category", key); setField("sub_category", "");
                      setShowCatForm(false); setNewCatLabel(""); setNewCatColor(colorPalette[0]); setNewCatEmoji("");
                    }
                    if (e.key === "Escape") { setShowCatForm(false); setNewCatLabel(""); }
                  }}
                  style={{ border: "1px solid #E2E8F0", borderRadius: 6, padding: "7px 10px", fontSize: 13, outline: "none", fontFamily: "inherit", background: "#fff" }}
                />
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {colorPalette.map((c) => (
                    <button
                      key={c} type="button"
                      onClick={() => setNewCatColor(c)}
                      style={{ width: 22, height: 22, borderRadius: "50%", background: c, border: "none", cursor: "pointer", outline: newCatColor === c ? "2.5px solid #047857" : "2px solid transparent", outlineOffset: 2 }}
                    />
                  ))}
                </div>
                <div style={{ fontSize: 11, color: "#64748B", fontWeight: 600, marginBottom: 4, marginTop: 2 }}>Emoji <span style={{ fontWeight: 400, color: "#94A3B8" }}>optional</span></div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 3, marginBottom: 4 }}>
                  {emojiPalette.map((em) => (
                    <button key={em} type="button" onClick={() => setNewCatEmoji(newCatEmoji === em ? "" : em)}
                      style={{ width: 28, height: 28, background: newCatEmoji === em ? "#DCFCE7" : "transparent", border: `1.5px solid ${newCatEmoji === em ? "#059669" : "#E2E8F0"}`, borderRadius: 5, cursor: "pointer", fontSize: 15, lineHeight: 1 }}>
                      {em}
                    </button>
                  ))}
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  <button
                    type="button"
                    onClick={() => {
                      const label = newCatLabel.trim();
                      if (!label) return;
                      const key = label.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
                      const code = label.replace(/[^a-zA-Z]/g, "").slice(0, 2).toUpperCase() || "CU";
                      onAddCategory({ key, label, code, color: newCatColor, emoji: newCatEmoji || undefined });
                      setField("category", key); setField("sub_category", "");
                      setShowCatForm(false); setNewCatLabel(""); setNewCatColor(colorPalette[0]); setNewCatEmoji("");
                    }}
                    style={{ flex: 1, background: "#047857", color: "#fff", border: "none", borderRadius: 6, padding: "7px", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}
                  >
                    Add
                  </button>
                  <button
                    type="button"
                    onClick={() => { setShowCatForm(false); setNewCatLabel(""); }}
                    style={{ flex: 1, background: "#F1F5F9", color: "#64748B", border: "none", borderRadius: 6, padding: "7px", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Sub-category picker */}
        {!isIncome && draft.category && (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.4px", textTransform: "uppercase", color: "#64748B" }}>
              Sub-Category <span style={{ color: "#94A3B8", fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>optional</span>
            </label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {(allSubCats[draft.category] || []).map((sc) => {
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
              {/* Add custom sub-category */}
              {showSubForm ? (
                <input
                  autoFocus
                  placeholder="New sub-category"
                  value={newSubLabel}
                  onChange={(e) => setNewSubLabel(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      const v = newSubLabel.trim();
                      if (v) { onAddSubCategory(draft.category, v); setField("sub_category", v); }
                      setNewSubLabel(""); setShowSubForm(false);
                    }
                    if (e.key === "Escape") { setShowSubForm(false); setNewSubLabel(""); }
                  }}
                  onBlur={() => { setShowSubForm(false); setNewSubLabel(""); }}
                  style={{ border: "1px solid #E2E8F0", borderRadius: 999, padding: "5px 12px", fontSize: 12, outline: "none", fontFamily: "inherit", width: 150, background: "#fff" }}
                />
              ) : (
                <button
                  type="button"
                  onClick={() => setShowSubForm(true)}
                  style={{ background: "none", border: "1px dashed #CBD5E1", borderRadius: 999, padding: "5px 12px", fontSize: 12, color: "#94A3B8", cursor: "pointer", fontFamily: "inherit" }}
                >
                  + Add
                </button>
              )}
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
                    <div style={{ background: c.color, borderRadius: "50%", width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>{c.emoji}</div>
                    <span style={{ fontSize: 10, fontWeight: 600, color: isSelected ? "#047857" : "#64748B", textAlign: "center" }}>{c.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="cf-quick-form-footer" style={{ padding: "14px 20px 18px", borderTop: "1px solid #E2E8F0", background: "linear-gradient(180deg, transparent, #FAFBFC)", display: "flex", flexDirection: "column", gap: 10 }}>
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
        @media (max-width: 1024px) {
          .cf-mobile-drawer {
            max-height: calc(100dvh - env(safe-area-inset-top, 0px) - 8px) !important;
            padding-bottom: env(safe-area-inset-bottom, 0px);
            z-index: 220 !important;
          }
          .cf-quick-form {
            position: relative !important;
            top: auto !important;
            height: auto !important;
            max-height: none !important;
            border: none !important;
            border-radius: 0 !important;
            box-shadow: none !important;
          }
          .cf-quick-form-body {
            overflow-y: visible !important;
            padding-bottom: calc(120px + env(safe-area-inset-bottom, 0px)) !important;
          }
          .cf-quick-form-footer {
            position: sticky;
            bottom: 0;
            z-index: 2;
            padding-bottom: calc(18px + env(safe-area-inset-bottom, 0px)) !important;
            background: linear-gradient(180deg, rgba(250,251,252,0.92), #fff 24%) !important;
          }
        }
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
  formatAmount,
  catCustomizations,
  expenseCategories,
}: {
  transactions: Transaction[];
  editingId: string | null;
  justAddedId: string | null;
  onEdit: (tx: Transaction) => void;
  onDelete: (tx: Transaction) => void;
  rates: Record<string, number>;
  formatAmount: (value: number) => string;
  catCustomizations: CatCustomizations;
  expenseCategories: CustomCategory[];
}) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "expense" | "income">("all");
  const todayYmd = new Date().toISOString().split("T")[0];
  const allCategories = useMemo(() => [...expenseCategories, ...INCOME_CATEGORIES], [expenseCategories]);

  const filtered = useMemo(() => {
    return transactions.filter((t) => {
      if (filter !== "all" && t.transaction_type !== filter) return false;
      if (search) {
        const s = search.toLowerCase();
        const cat = allCategories.find((c) => c.key === t.category);
        return (
          t.description.toLowerCase().includes(s) ||
          (cat?.label || "").toLowerCase().includes(s) ||
          (t.tags || []).some((tag) => tag.toLowerCase().includes(s))
        );
      }
      return true;
    });
  }, [transactions, search, filter, allCategories]);

  const groups = useMemo(() => {
    const byDate: Record<string, Transaction[]> = {};
    filtered.forEach((t) => {
      if (!byDate[t.date]) byDate[t.date] = [];
      byDate[t.date].push(t);
    });
    return Object.entries(byDate).sort(([a], [b]) => b.localeCompare(a));
  }, [filtered]);

  return (
    <div style={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 12, overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.04)", display: "flex", flexDirection: "column", height: "calc(100vh - 48px)" }}>
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
      <div style={{ overflowY: "auto", flex: 1, minHeight: 0 }}>
        {groups.length === 0 ? (
          <div style={{ padding: "60px 24px", display: "flex", flexDirection: "column", alignItems: "center", gap: 12, color: "#94A3B8", textAlign: "center" }}>
            <div style={{ width: 64, height: 64, borderRadius: "50%", background: "#ECFDF5", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 17 9 13l3 3 7-7" /><path d="M14 6h5v5" />
              </svg>
            </div>
            <div style={{ fontWeight: 700, fontSize: 16, color: "#064E3B" }}>No transactions yet</div>
            <div style={{ fontSize: 13, maxWidth: 280 }}>
              {search ? "Try a different search or clear filters." : "Use the + button to add your first transaction."}
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
                    {dayNet > 0 ? "+" : dayNet < 0 ? "−" : ""}{formatAmount(Math.abs(dayNet))}
                  </span>
                </div>
                {txns
                  .sort((a, b) => b.date.localeCompare(a.date))
                  .map((tx) => {
                    const isIncome = tx.transaction_type === "income";
                    const cat = allCategories.find((c) => c.key === tx.category);
                    const isEditing = editingId === tx.id;
                    const wasJustAdded = justAddedId === tx.id;
                    const baseDisplay = { color: cat?.color || "#6b7280", emoji: (cat as {emoji?: string})?.emoji || "📦" };
                    const { color: chipColor, emoji: chipEmoji } = resolveDisplay(baseDisplay, catCustomizations, tx.category);

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
                        <div style={{ width: 36, height: 36, borderRadius: "50%", background: chipColor, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>
                          {chipEmoji}
                        </div>

                        {/* Description + meta */}
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: 14, fontWeight: 600, color: "#19181E", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{tx.description}</div>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginTop: 2 }}>
                            <span style={{ fontSize: 11.5, color: "#94A3B8" }}>{cat?.label || tx.category}</span>
                            {tx.sub_category && <span style={{ fontSize: 11, color: "#64748B" }}>· {tx.sub_category}</span>}
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
                          style={{ width: 28, height: 28, borderRadius: "50%", background: "transparent", border: "none", color: "#94A3B8", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", opacity: 0.35, transition: "opacity 0.12s, background 0.12s" }}
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
  ratesFallback,
  formatAmount,
  displayCurrency,
  expenseCategories,
  catCustomizations,
}: {
  transactions: Transaction[];
  viewMonth: string;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  budgetExpenses: Record<string, number> | null;
  rates: Record<string, number>;
  ratesFallback: boolean;
  formatAmount: (value: number) => string;
  displayCurrency: string;
  expenseCategories: CustomCategory[];
  catCustomizations: CatCustomizations;
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
  const byCat = expenseCategories.map((cat) => {
    const base = { color: cat.color, emoji: cat.emoji ?? "📦" };
    const { color, emoji } = resolveDisplay(base, catCustomizations, cat.key);
    return {
      ...cat,
      color,
      emoji,
      total: monthTxns.filter((t) => t.transaction_type !== "income" && t.category === cat.key).reduce((s, t) => s + toUSD(t.amount, t.currency, rates), 0),
    };
  })
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
        {label === "Net" && value >= 0 ? "+" : ""}{formatAmount(value)}
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
          {isMixed && (
            <div style={{ fontSize: 11, color: ratesFallback ? "#D97706" : "#94A3B8", marginTop: 2 }}>
              Totals shown in {displayCurrency} · {ratesFallback ? "⚠ estimated rates (live fetch failed)" : "live rates"}
            </div>
          )}
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
      <div className="uf-kpi-grid" style={{ display: "grid", gridTemplateColumns: byCat.length > 0 ? "repeat(3, 1fr) 220px" : "repeat(3, 1fr)", gap: 16, marginBottom: 20 }}>
        {kpiCard("Income", incomeTotal, "#059669", prevIncome > 0 ? `vs ${formatAmount(prevIncome)} last month` : "No prior month data")}
        {kpiCard("Spent", expenseTotal, "#19181E", prevSpent > 0 ? `vs ${formatAmount(prevSpent)} last month` : "No prior month data")}
        {kpiCard("Net", net, net >= 0 ? "#047857" : "#DC2626", net >= 0 && incomeTotal > 0 ? `${((net / incomeTotal) * 100).toFixed(1)}% savings rate` : "Spending exceeds income")}

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
                    formatter={(v) => [formatAmount(Number(v ?? 0)), ""]}
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
                      {formatAmount(cat.total)}
                      {budget > 0 ? <span style={{ color: "#94A3B8", fontWeight: 400 }}> / {formatAmount(budget)}</span> : <span style={{ color: "#94A3B8", fontWeight: 400 }}> ({((cat.total / expenseTotal) * 100).toFixed(0)}%)</span>}
                    </span>
                  </div>
                  <div style={{ height: 4, background: "#E2E8F0", borderRadius: 4, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${barPct}%`, background: over ? "#DC2626" : cat.color, borderRadius: 4, transition: "width 0.4s" }} />
                  </div>
                  {over && <div style={{ fontSize: 11, color: "#DC2626", marginTop: 2 }}>over by {formatAmount(cat.total - budget)}</div>}
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
  toast: { msg: string; undoId?: string; _removed?: Transaction; isError?: boolean } | null;
  onUndo: () => void;
}) {
  const isErr = toast?.isError;
  return (
    <div style={{
      position: "fixed", bottom: 28, left: "50%",
      transform: `translateX(-50%) translateY(${toast ? 0 : 20}px)`,
      opacity: toast ? 1 : 0, transition: "all 220ms",
      background: isErr ? "#7F1D1D" : "#064E3B", color: "#fff", borderRadius: 999,
      padding: "10px 16px 10px 14px", fontSize: 13, fontWeight: 600,
      display: "flex", alignItems: "center", gap: 12, zIndex: 50,
      pointerEvents: toast ? "auto" : "none",
      boxShadow: "0 12px 32px rgba(15,23,42,0.14)",
    }}>
      <span style={{ width: 18, height: 18, background: isErr ? "#EF4444" : "#10B981", borderRadius: "50%", display: "inline-flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 12 }}>
        {isErr ? "✕" : "✓"}
      </span>
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
      <button
        onClick={onOpen}
        aria-label="Add transaction"
        style={{ flex: 1, background: "#047857", color: "#fff", border: "none", borderRadius: 999, padding: "12px 20px", fontSize: 14, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, cursor: "pointer", boxShadow: "0 4px 10px rgba(6,78,59,0.35)", fontFamily: "inherit" }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14" /></svg>
        Add transaction
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
      <div className="cf-mobile-drawer" style={{ position: "fixed", left: 0, right: 0, bottom: 0, background: "#fff", borderTopLeftRadius: 18, borderTopRightRadius: 18, zIndex: 50, transform: `translateY(${open ? 0 : "100%"})`, transition: "transform 240ms cubic-bezier(0.2,0,0,1)", maxHeight: "92vh", display: "flex", flexDirection: "column", boxShadow: "0 -10px 32px rgba(15,23,42,0.2)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "10px 16px 4px", position: "relative" }}>
          <div onClick={onClose} style={{ width: 44, height: 5, borderRadius: 99, background: "#CBD5E1", cursor: "pointer" }} />
          <button onClick={onClose} style={{ position: "absolute", right: 16, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", fontSize: 20, color: "#94A3B8", cursor: "pointer", lineHeight: 1, padding: "4px 8px" }}>✕</button>
        </div>
        <div style={{ flex: 1, overflowY: "auto", overscrollBehavior: "contain" }}>{children}</div>
      </div>
    </>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────
export default function TransactionsTab({ defaultCurrency = "USD", displayCurrency = "USD", displayRates = FALLBACK_RATES, preferredCurrencies = [] }: {
  defaultCurrency?: string;
  displayCurrency?: string;
  displayRates?: Record<string, number>;
  preferredCurrencies?: string[];
}) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [showImport, setShowImport] = useState(false);
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const [viewMonth, setViewMonth] = useState(currentMonth);
  const [budgetExpenses, setBudgetExpenses] = useState<Record<string, number> | null>(null);
  const [rates, setRates] = useState<Record<string, number>>(FALLBACK_RATES);
  const [ratesFallback, setRatesFallback] = useState(false);

  // Custom categories / sub-categories (persisted in localStorage)
  const [catCustomizations] = useState<CatCustomizations>(loadCatCustomizations);

  const [customCats, setCustomCats] = useState<CustomCategory[]>(() => {
    try { return JSON.parse(localStorage.getItem("uf_custom_cats") || "[]"); } catch { return []; }
  });
  const [customSubCats, setCustomSubCats] = useState<Record<string, string[]>>(() => {
    try { return JSON.parse(localStorage.getItem("uf_custom_subcats") || "{}"); } catch { return {}; }
  });
  useEffect(() => { localStorage.setItem("uf_custom_cats", JSON.stringify(customCats)); }, [customCats]);
  useEffect(() => { localStorage.setItem("uf_custom_subcats", JSON.stringify(customSubCats)); }, [customSubCats]);

  // Stable Supabase write — called by the debounce and by the flush-on-unmount effect
  const syncCatsToSupabase = useCallback((cats: CustomCategory[], subCats: Record<string, string[]>) => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) return;
      supabase.from("user_budget").select("expenses").eq("user_id", session.user.id).maybeSingle()
        .then(({ data }) => {
          const cur = (data?.expenses as Record<string, unknown>) || {};
          supabase.from("user_budget").upsert({
            user_id: session.user.id,
            expenses: { ...cur, _custom_cats: cats, _custom_subcats: subCats },
            updated_at: new Date().toISOString(),
          }, { onConflict: "user_id" });
        });
    });
  }, []);

  // Track whether a sync is pending so we can flush it on unmount
  const pendingSyncRef = useRef<{ cats: CustomCategory[]; subCats: Record<string, string[]> } | null>(null);

  // Sync custom cats to Supabase whenever they change (debounced 600ms)
  useEffect(() => {
    pendingSyncRef.current = { cats: customCats, subCats: customSubCats };
    const id = setTimeout(() => {
      syncCatsToSupabase(customCats, customSubCats);
      pendingSyncRef.current = null;
    }, 600);
    return () => clearTimeout(id); // cancels the debounce timer only; unmount flush handled below
  }, [customCats, customSubCats, syncCatsToSupabase]);

  // Flush any pending sync immediately when this tab unmounts (prevents clearTimeout from swallowing it)
  useEffect(() => {
    return () => {
      if (pendingSyncRef.current) {
        syncCatsToSupabase(pendingSyncRef.current.cats, pendingSyncRef.current.subCats);
      }
    };
  }, [syncCatsToSupabase]);

  // Re-fetch custom categories when the browser tab regains focus (cross-device sync)
  useEffect(() => {
    const refetch = () => {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (!session) return;
        supabase.from("user_budget").select("expenses").eq("user_id", session.user.id).maybeSingle()
          .then(({ data }) => {
            if (!data?.expenses) return;
            const { _custom_cats, _custom_subcats } = data.expenses as Record<string, unknown>;
            if (Array.isArray(_custom_cats)) {
              setCustomCats(_custom_cats as CustomCategory[]);
              localStorage.setItem("uf_custom_cats", JSON.stringify(_custom_cats));
            }
            if (_custom_subcats && typeof _custom_subcats === "object") {
              setCustomSubCats(_custom_subcats as Record<string, string[]>);
              localStorage.setItem("uf_custom_subcats", JSON.stringify(_custom_subcats));
            }
          });
      });
    };
    const onVisible = () => { if (document.visibilityState === "visible") refetch(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, []);

  const allExpenseCats = useMemo(() => [...EXPENSE_CATEGORIES, ...customCats], [customCats]);
  const allSubCats = useMemo(() => {
    const merged: Record<string, string[]> = { ...SUB_CATEGORIES };
    Object.entries(customSubCats).forEach(([k, extras]) => {
      merged[k] = [...(merged[k] || []), ...extras];
    });
    return merged;
  }, [customSubCats]);

  const handleAddCategory = useCallback((cat: CustomCategory) => {
    setCustomCats((prev) => [...prev, cat]);
  }, []);
  const handleDeleteCategory = useCallback((key: string) => {
    setCustomCats((prev) => prev.filter((c) => c.key !== key));
    setCustomSubCats((prev) => { const n = { ...prev }; delete n[key]; return n; });
  }, []);
  const handleAddSubCategory = useCallback((catKey: string, sub: string) => {
    setCustomSubCats((prev) => ({ ...prev, [catKey]: [...(prev[catKey] || []), sub] }));
  }, []);

  // Form state (lifted so edit can populate it)
  const [draft, setDraft] = useState<DraftTransaction>(() => ({ ...EMPTY_DRAFT(), currency: defaultCurrency }));
  const [editingId, setEditingId] = useState<string | null>(null);
  const [justAddedId, setJustAddedId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; undoId?: string; _removed?: Transaction; isError?: boolean } | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fmtDisplay = useCallback(
    (n: number) => formatUSDInCurrency(n, displayCurrency, displayRates),
    [displayCurrency, displayRates],
  );

  useEffect(() => {
    setDraft((current) =>
      current.id || current.amount || current.description || current.currency !== "USD"
        ? current
        : { ...current, currency: defaultCurrency },
    );
  }, [defaultCurrency]);

  useEffect(() => {
    fetch("https://api.frankfurter.app/latest?from=USD")
      .then((r) => r.json())
      .then((d) => { if (d.rates) setRates(d.rates); else setRatesFallback(true); })
      .catch(() => setRatesFallback(true));

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
            const { _fire_profile: _, _custom_cats, _custom_subcats, ...budgetCats } = data.expenses as Record<string, unknown>;
            setBudgetExpenses(budgetCats as Record<string, number>);
            if (Array.isArray(_custom_cats)) {
              setCustomCats(_custom_cats as CustomCategory[]);
              localStorage.setItem("uf_custom_cats", JSON.stringify(_custom_cats));
            }
            if (_custom_subcats && typeof _custom_subcats === "object") {
              setCustomSubCats(_custom_subcats as Record<string, string[]>);
              localStorage.setItem("uf_custom_subcats", JSON.stringify(_custom_subcats));
            }
          }
        });
      supabase
        .from("profiles")
        .select("default_currency")
        .eq("user_id", session.user.id)
        .single()
        .then(({ data }) => {
          if (data?.default_currency) {
            setDraft((prev) => ({ ...prev, currency: data.default_currency }));
          }
        });
    });
  }, [refreshKey]);

  const monthTxns = useMemo(
    () => transactions.filter((t) => t.date.startsWith(viewMonth)),
    [transactions, viewMonth]
  );

  const existingTags = useMemo(
    () => [...new Set(transactions.flatMap((t) => t.tags || []))].sort(),
    [transactions]
  );

  const showToast = useCallback((msg: string, undoId?: string, removed?: Transaction, isError?: boolean) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ msg, undoId, _removed: removed, isError });
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
      transaction_type: draft.transaction_type,
    };

    if (draft.id) {
      // Edit existing
      const { data, error } = await supabase.from("expenses").update(payload).eq("id", draft.id).select().single();
      if (error || !data) {
        showToast("Failed to save changes — please try again", undefined, undefined, true);
        return;
      }
      setTransactions((prev) => prev.map((t) => (t.id === draft.id ? data : t)));
      setEditingId(null);
      setDraft({ ...EMPTY_DRAFT(), currency: defaultCurrency });
      showToast("Transaction updated");
    } else {
      // Insert new
      const { data, error } = await supabase.from("expenses").insert(payload).select().single();
      if (error || !data) {
        showToast("Failed to add transaction — please try again", undefined, undefined, true);
        return;
      }
      setTransactions((prev) => [data, ...prev]);
      setJustAddedId(data.id);
      setTimeout(() => setJustAddedId(null), 1600);
      if (viewMonth !== data.date.slice(0, 7)) setViewMonth(data.date.slice(0, 7));
      showToast(`Added — ${data.description || fmt(data.amount, data.currency)}`, data.id);
      if (!keepOpen) {
        setDraft({ ...EMPTY_DRAFT(), currency: defaultCurrency });
      } else {
        setDraft((d) => ({ ...EMPTY_DRAFT(), date: d.date, transaction_type: d.transaction_type, currency: d.currency, sub_category: "", tags: d.tags }));
      }
      if (drawerOpen && !keepOpen) setDrawerOpen(false);
    }
  }, [defaultCurrency, draft, drawerOpen, viewMonth, showToast]);

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
      aiSuggestion: null,
    });
    // On mobile, open drawer
    if (typeof window !== "undefined" && window.matchMedia("(max-width: 1024px)").matches) {
      setDrawerOpen(true);
    }
  }, []);

  const handleCancelEdit = useCallback(() => {
    setEditingId(null);
    setDraft({ ...EMPTY_DRAFT(), currency: defaultCurrency });
    if (drawerOpen) setDrawerOpen(false);
  }, [defaultCurrency, drawerOpen]);

  const handleDelete = useCallback(async (tx: Transaction) => {
    if (!window.confirm(`Delete "${tx.description}"?`)) return;
    const { error } = await supabase.from("expenses").delete().eq("id", tx.id);
    if (error) {
      showToast("Failed to delete — please try again", undefined, undefined, true);
      return;
    }
    setTransactions((prev) => prev.filter((t) => t.id !== tx.id));
    if (editingId === tx.id) { setEditingId(null); setDraft({ ...EMPTY_DRAFT(), currency: defaultCurrency }); }
    showToast(`Deleted "${tx.description}"`, "undo:" + tx.id, tx);
  }, [defaultCurrency, editingId, showToast]);

  const handleUndo = useCallback(() => {
    if (!toast) return;
    if (toast._removed) {
      // Re-insert: only update UI state after DB confirms success
      supabase.from("expenses")
        .insert({ ...toast._removed })
        .select()
        .single()
        .then(({ data, error }) => {
          if (!error && data) {
            setTransactions((prev) => [data as Transaction, ...prev]);
          } else {
            showToast("Couldn't restore transaction — please re-add manually", undefined, undefined, true);
          }
        });
    } else if (toast.undoId && !toast.undoId.startsWith("undo:")) {
      // Undo add: delete the just-added transaction
      supabase.from("expenses").delete().eq("id", toast.undoId);
      setTransactions((prev) => prev.filter((t) => t.id !== toast.undoId));
    }
    setToast(null);
  }, [showToast, toast]);

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
          .cf-mobile-bar { display: flex !important; position: fixed; bottom: calc(80px + env(safe-area-inset-bottom, 0px)); left: 16px; right: 16px; background: transparent; border-radius: 999px; padding: 0; align-items: center; z-index: 30; }
        }
      `}</style>

      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 4 }}>
        <button
          onClick={() => setShowImport(true)}
          style={{
            padding: "7px 14px", borderRadius: 8, border: "1px solid #23232d",
            background: "transparent", color: "#94a3b8", fontSize: 12, fontWeight: 600,
            cursor: "pointer", fontFamily: "Manrope, sans-serif", display: "flex", alignItems: "center", gap: 6,
          }}
        >
          ↑ Import CSV
        </button>
      </div>

      <MonthlySummary
        transactions={transactions}
        viewMonth={viewMonth}
        onPrevMonth={handlePrevMonth}
        onNextMonth={handleNextMonth}
        budgetExpenses={budgetExpenses}
        rates={rates}
        ratesFallback={ratesFallback}
        formatAmount={fmtDisplay}
        displayCurrency={displayCurrency}
        expenseCategories={allExpenseCats}
        catCustomizations={catCustomizations}
      />

      <div className="cf-split" style={{ display: "grid", gridTemplateColumns: "1fr 360px", gap: 16, alignItems: "stretch" }}>
        <TransactionList
          transactions={monthTxns}
          editingId={editingId}
          justAddedId={justAddedId}
          onEdit={handleEdit}
          onDelete={handleDelete}
          rates={rates}
          formatAmount={fmtDisplay}
          catCustomizations={catCustomizations}
          expenseCategories={allExpenseCats}
        />
        <div className="cf-form-col">
          <QuickAddForm
            draft={draft}
            setDraft={setDraft}
            onSave={handleSave}
            editing={!!editingId}
            onCancelEdit={handleCancelEdit}
            existingTags={existingTags}
            allExpenseCats={allExpenseCats}
            allSubCats={allSubCats}
            colorPalette={COLOR_PALETTE}
            emojiPalette={EMOJI_PALETTE}
            preferredCurrencies={preferredCurrencies}
            onAddCategory={handleAddCategory}
            onAddSubCategory={handleAddSubCategory}
          />
        </div>
      </div>

      <MobileBar onOpen={() => { setEditingId(null); setDraft({ ...EMPTY_DRAFT(), currency: defaultCurrency }); setDrawerOpen(true); }} />
      <MobileDrawer open={drawerOpen} onClose={() => { setDrawerOpen(false); if (editingId) handleCancelEdit(); }}>
        <QuickAddForm
          draft={draft}
          setDraft={setDraft}
          onSave={handleSave}
          editing={!!editingId}
          onCancelEdit={handleCancelEdit}
          existingTags={existingTags}
          allExpenseCats={allExpenseCats}
          allSubCats={allSubCats}
          colorPalette={COLOR_PALETTE}
          emojiPalette={EMOJI_PALETTE}
          onAddCategory={handleAddCategory}
          onAddSubCategory={handleAddSubCategory}
          preferredCurrencies={preferredCurrencies}
        />
      </MobileDrawer>

      <Toast toast={toast} onUndo={handleUndo} />

      {showImport && (
        <CsvImportModal
          onClose={() => setShowImport(false)}
          onImported={(count) => {
            setShowImport(false);
            setRefreshKey((k) => k + 1);
          }}
          defaultCurrency={defaultCurrency}
          transactions={transactions}
          viewMonth={viewMonth}
          rates={rates}
          formatAmount={fmtDisplay}
          displayCurrency={displayCurrency}
        />
      )}
    </>
  );
}
