"use client";

import { useState, useEffect, useRef, useMemo, useCallback, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { supabase } from "@/lib/supabase";
import { fetchAllPages } from "@/lib/supabase-pages";
import CsvImportModal from "./CsvImportModal";
import PlaidConnect, { type BankStatus } from "./PlaidConnect";
import SpendRangePill, { rangeLabel } from "./SpendRangePill";
import TransactionsLoading from "./TransactionsLoading";
import type { ScheduledCalendarItem } from "@/lib/marked-calendar";
import SpendCard, { type CatDisplay } from "./SpendCard";
import ReviewPill from "./ReviewPill";
import WorthALook from "./WorthALook";
import { findFlags, type FlagKind, cardRates, isSystemTag, looksLikeRefund, okTag, pendingUncounted, walletTwins } from "@/lib/transaction-flags";
import { rangeFor, type RangePreset } from "@/lib/spend-range";
import { type Bill, guessBillCategory, mergeBills, presumePaid, settleBill, unlinkedBillPayments } from "@/lib/spend-forecast";
import type { FreeToSpend } from "@/lib/free-to-spend";
import { detectRecurring, type Recurrence } from "@/lib/recurring-detect";
import { SUPPORTED_CURRENCIES, FALLBACK_RATES as LIB_FALLBACK_RATES } from "@/lib/currency";
import { formatMoney, formatUSDInCurrency } from "@/lib/money";

/* Transactions show cents: these are reconciled against a statement. */
// The category picker renders in a portal: the row clips its overflow. Desktop anchors it to the icon; phones show a bottom sheet.
function PickerHost({ children }: { children: ReactNode }) {
  return typeof document !== "undefined" ? createPortal(children, document.body) : null;
}

const txMoney = (n: number, currency = "USD") => formatMoney(n, { currency, decimals: 2 });
import {
  EXPENSE_CATEGORIES, INCOME_CATEGORIES, ALL_CATEGORIES as ALL_CATEGORIES_BASE,
  COLOR_PALETTE, EMOJI_PALETTE, SUB_CATEGORIES,
  loadCatCustomizations, saveCatCustomizations, CatCustomizations, resolveDisplay,
} from "@/lib/categories";
import { useCustomCategories } from "@/lib/useCustomCategories";
import { combineDateAndTime, formatTime, timeInputValue } from "@/lib/transaction-time";
import { buildMerchantMemory, merchantKey, suggestFromHistory } from "@/lib/merchant-memory";
import { transactionNeed, type NeedOverrides } from "@/lib/needs";
import { Button, SegmentedControl } from "@/components/ui";
import { readMerchantRules } from "@/lib/merchant-rules";
import { trackTxFlagResolved, trackTxRangeChanged, trackTxReviewOpened } from "@/lib/analytics";

type CustomCategory = { key: string; label: string; code: string; color: string; emoji?: string };

const ALL_CATEGORIES = ALL_CATEGORIES_BASE;
const FALLBACK_RATES = LIB_FALLBACK_RATES;
const DEFAULT_CAT_KEYS = new Set(EXPENSE_CATEGORIES.map((e) => e.key));

// ─── Helpers ──────────────────────────────────────────────────────────────────

const toUSD = (amount: number, currency: string, rates: Record<string, number>): number => {
  if (!currency || currency === "USD") return amount;
  const rate = rates[currency];
  return rate ? amount / rate : amount;
};

const netAmt = (t: { amount: number; refund_amount: number }) =>
  Math.max(0, t.amount - (t.refund_amount || 0));

// The person's own calendar day, not UTC's: in China, toISOString() still
// says yesterday until 8 am, so "Today" and a new row's date were a day off.
const localYmd = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

function dayLabel(ymd: string, todayYmd: string): string {
  if (ymd === todayYmd) return "Today";
  const y = new Date(todayYmd + "T00:00:00");
  y.setDate(y.getDate() - 1);
  const yesterdayYmd = localYmd(y);
  if (ymd === yesterdayYmd) return "Yesterday";
  const d = new Date(ymd + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// ─── Types ────────────────────────────────────────────────────────────────────
type Transaction = {
  id: string;
  date: string;
  amount: number;
  refund_amount: number;
  currency: string;
  description: string;
  notes?: string;
  category: string;
  tags: string[];
  transaction_type: "expense" | "income" | "transfer";
  sub_category: string | null;
  source_file?: string | null;
  source?: string | null;
  // Optional: most rows have no time. date stays authoritative for grouping.
  occurred_at?: string | null;
};

// Where a row came from, in words: the wallet or bank behind an imported
// file ("支付宝交易明细(2026…).csv" → Alipay), a linked bank, or typed in.
function sourceLabel(t: { source?: string | null; source_file?: string | null }): string {
  if (t.source === "plaid") return "Linked bank";
  const f = t.source_file ?? "";
  if (!f) return t.source === "csv" ? "Imported file" : "Typed in";
  if (/支付宝|alipay/i.test(f)) return "Alipay";
  if (/微信|wechat|weixin/i.test(f)) return "WeChat Pay";
  if (/ether\.?fi/i.test(f)) return "ether.fi";
  // Otherwise the file's name without dates, numbers or extension.
  const name = f.replace(/\.[a-z0-9]+$/i, "").replace(/[_\-\s(（]*\d[\d\-_)）]*.*$/, "")
    .replace(/[_]+/g, " ").replace(/\b(statement|transactions?|export|history|csv)\b/gi, "").replace(/\s+/g, " ").trim();
  return name || "Imported file";
}

type ClassificationRule = {
  id: string;
  category: string;
  sub_category: string | null;
  classification: "need" | "want";
};

type DraftTransaction = {
  id: string | null;
  transaction_type: "expense" | "income" | "transfer";
  amount: string;
  refund_amount: string;
  currency: string;
  description: string;
  notes: string;
  date: string;
  time: string;
  category: string;
  sub_category: string;
  tags: string[];
  aiSuggestion: string | null;
};

const EMPTY_DRAFT = (): DraftTransaction => ({
  id: null,
  transaction_type: "expense",
  amount: "",
  refund_amount: "",
  currency: "USD",
  description: "",
  notes: "",
  date: localYmd(),
  time: "",
  category: "",
  sub_category: "",
  tags: [],
  aiSuggestion: null,
});

// ─── AI Categorization ────────────────────────────────────────────────────────
async function aiCategorize(
  description: string,
  type: "expense" | "income" | "transfer"
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
          style={{ flex: 1, border: "1px solid var(--uf-border)", borderRadius: 8, padding: "9px 12px", fontSize: 13, color: "var(--uf-text)", background: "var(--uf-card)", outline: "none", fontFamily: "inherit" }}
        />
        {value.trim() && (
          <button
            type="button"
            onClick={commit}
            style={{ background: "var(--uf-mint)", border: "1px solid var(--uf-border)", borderRadius: 8, padding: "0 14px", fontSize: 12, fontWeight: 700, color: "var(--uf-ink)", cursor: "pointer", whiteSpace: "nowrap", fontFamily: "inherit" }}
          >
            + Add
          </button>
        )}
      </div>
      {focused && value.trim() && suggestions.length > 0 && (
        <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, zIndex: 30, background: "var(--uf-card)", border: "1px solid var(--uf-border)", borderRadius: 8, boxShadow: "0 4px 12px rgba(0,0,0,0.08)", overflow: "hidden" }}>
          {suggestions.slice(0, 6).map((t) => (
            <button
              key={t}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => { onAdd(t); setValue(""); }}
              style={{ width: "100%", textAlign: "left", padding: "8px 14px", fontSize: 13, color: "var(--uf-text)", background: "none", border: "none", borderBottom: "1px solid var(--uf-border)", cursor: "pointer", fontFamily: "inherit" }}
            >
              <span style={{ color: "var(--uf-text-3)" }}>#</span>{t}
            </button>
          ))}
        </div>
      )}
      {focused && !value.trim() && existingTags.filter(t => !currentTags.includes(t)).length > 0 && (
        <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, zIndex: 30, background: "var(--uf-card)", border: "1px solid var(--uf-border)", borderRadius: 8, boxShadow: "0 4px 12px rgba(0,0,0,0.08)", overflow: "hidden" }}>
          {existingTags.filter(t => !currentTags.includes(t)).slice(0, 6).map((t) => (
            <button
              key={t}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => { onAdd(t); setValue(""); }}
              style={{ width: "100%", textAlign: "left", padding: "8px 14px", fontSize: 13, color: "var(--uf-text)", background: "none", border: "none", borderBottom: "1px solid var(--uf-border)", cursor: "pointer", fontFamily: "inherit" }}
            >
              <span style={{ color: "var(--uf-text-3)" }}>#</span>{t}
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
  onDelete,
  existingTags,
  allExpenseCats,
  allSubCats,
  colorPalette,
  emojiPalette,
  preferredCurrencies,
  onAddCategory,
  onAddSubCategory,
  alwaysShop = false,
  onAlwaysShop,
  categoryNeeds = {},
}: {
  draft: DraftTransaction;
  setDraft: React.Dispatch<React.SetStateAction<DraftTransaction>>;
  onSave: (keepOpen: boolean) => void;
  editing: boolean;
  onCancelEdit: () => void;
  /** Delete the row being edited: the row's own bin is hidden on touch screens. */
  onDelete?: () => void;
  existingTags: string[];
  allExpenseCats: { key: string; label: string; code: string; color: string; emoji?: string }[];
  allSubCats: Record<string, string[]>;
  colorPalette: string[];
  emojiPalette: string[];
  preferredCurrencies: string[];
  onAddCategory: (cat: CustomCategory) => void;
  onAddSubCategory: (catKey: string, sub: string) => void;
  /** "Always for this shop" (D-106), offered when editing a saved spend. */
  alwaysShop?: boolean;
  onAlwaysShop?: (on: boolean) => void;
  categoryNeeds?: NeedOverrides;
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
  const [showDescription, setShowDescription] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const [showRefund, setShowRefund] = useState(false);
  const [showProject, setShowProject] = useState(false);

  const categories = draft.transaction_type === "income" ? INCOME_CATEGORIES : draft.transaction_type === "transfer" ? [] : allExpenseCats;

  const setField = useCallback(<K extends keyof DraftTransaction>(k: K, v: DraftTransaction[K]) => {
    setDraft((d) => ({ ...d, [k]: v }));
  }, [setDraft]);

  const handleDescriptionBlur = async () => {
    const desc = draft.description.trim();
    if (desc.length < 4 || draft.transaction_type !== "expense") return;
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

  const canSave = parseFloat(draft.amount) > 0 && (draft.transaction_type === "transfer" || draft.category);

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
    <div className="cf-quick-form" style={{ display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <div style={{ padding: "14px 20px 12px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid var(--uf-border)" }}>
        <h2 id="cf-quick-form-title" style={{ margin: 0, fontSize: 17, fontWeight: 800, color: "var(--uf-ink)" }}>
          {editing ? "Edit transaction" : "Add a transaction"}
        </h2>
      </div>

      {/* Body */}
      <div className="cf-quick-form-body" style={{ padding: "18px 20px 20px", display: "flex", flexDirection: "column", gap: 14, overflowY: "visible", flex: 1, minHeight: 0, paddingBottom: "calc(120px + env(safe-area-inset-bottom, 0px))" }}>
        {/* Type toggle */}
        <div style={{ display: "inline-flex", background: "var(--uf-surface-2)", borderRadius: 999, padding: 3, alignSelf: "flex-start" }}>
          {(["expense", "income", "transfer"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setDraft((d) => ({ ...d, transaction_type: t, category: t === "income" ? "salary" : "", sub_category: "", aiSuggestion: null }))}
              style={{
                background: draft.transaction_type === t ? (t === "income" ? "var(--uf-mint)" : t === "transfer" ? "#F3F4F6" : "var(--uf-card)") : "transparent",
                color: draft.transaction_type === t ? (t === "income" ? "var(--uf-ink)" : t === "transfer" ? "#6B7280" : "var(--uf-text)") : "var(--uf-text-2)",
                border: "none", borderRadius: 999, padding: "5px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer",
                boxShadow: draft.transaction_type === t && t === "expense" ? "0 1px 2px rgba(0,0,0,0.06)" : "none",
              }}
            >
              {t === "expense" ? "Expense" : t === "income" ? "Income" : "Transfer"}
            </button>
          ))}
        </div>

        {/* Amount input */}
        <div style={{
          border: `1.5px solid var(--uf-border)`,
          borderRadius: 8,
          padding: "12px 14px 14px",
          background: "var(--uf-card)",
          display: "flex", alignItems: "baseline", gap: 6,
          transition: "border-color 0.15s",
        }}
          onFocus={(e) => (e.currentTarget.style.borderColor = "var(--uf-ink)")}
          onBlur={(e) => (e.currentTarget.style.borderColor = "var(--uf-border)")}
        >
          <span style={{ fontSize: 26, fontWeight: 700, color: "var(--uf-text-3)", letterSpacing: "-0.6px" }}>$</span>
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
            data-drawer-autofocus
            style={{ flex: 1, border: "none", outline: "none", background: "transparent", fontSize: 34, fontWeight: 800, color: "var(--uf-ink)", letterSpacing: "-1px", fontVariantNumeric: "tabular-nums", minWidth: 0, width: "100%", fontFamily: "inherit" }}
          />
          <select
            value={draft.currency}
            onChange={(e) => setField("currency", e.target.value)}
            style={{ fontSize: 11, fontWeight: 700, color: "var(--uf-text-2)", padding: "4px 8px", background: "var(--uf-surface-2)", border: "none", borderRadius: 999, cursor: "pointer", fontFamily: "inherit" }}
          >
            {(preferredCurrencies.length > 0 ? preferredCurrencies : [...SUPPORTED_CURRENCIES]).map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        {/* Optional field toggles: Description + Notes */}
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={() => setShowDescription((v) => !v)}
            style={{
              display: "inline-flex", alignItems: "center", gap: 4,
              background: (showDescription || !!draft.description) ? "#EEE9FA" : "var(--uf-surface-2)",
              border: `1px solid ${(showDescription || !!draft.description) ? "#D9CEF3" : "var(--uf-border)"}`,
              borderRadius: 999, padding: "5px 10px",
              fontSize: 11, fontWeight: 700, color: (showDescription || !!draft.description) ? "var(--uf-ink)" : "var(--uf-text-2)",
              cursor: "pointer", fontFamily: "inherit",
            }}
          >
            📝 Description{draft.description ? " ✓" : ""}
          </button>
          <button
            type="button"
            onClick={() => setShowNotes((v) => !v)}
            style={{
              display: "inline-flex", alignItems: "center", gap: 4,
              background: (showNotes || !!draft.notes) ? "#EEE9FA" : "var(--uf-surface-2)",
              border: `1px solid ${(showNotes || !!draft.notes) ? "#D9CEF3" : "var(--uf-border)"}`,
              borderRadius: 999, padding: "5px 10px",
              fontSize: 11, fontWeight: 700, color: (showNotes || !!draft.notes) ? "var(--uf-ink)" : "var(--uf-text-2)",
              cursor: "pointer", fontFamily: "inherit",
            }}
          >
            📌 Notes{draft.notes ? " ✓" : ""}
          </button>
        </div>

        {/* Description */}
        {(showDescription || !!draft.description) && (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.4px", textTransform: "uppercase", color: "var(--uf-text-2)" }}>
              Description
              {categorizing && <span style={{ color: "var(--uf-warn)", marginLeft: 8, fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>categorizing…</span>}
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
              style={{ width: "100%", border: "1px solid var(--uf-border)", borderRadius: 8, padding: "9px 12px", fontSize: 14, color: "var(--uf-text)", background: "var(--uf-card)", outline: "none", fontFamily: "inherit" }}
            />
          </div>
        )}

        {/* Notes */}
        {(showNotes || !!draft.notes) && (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.4px", textTransform: "uppercase", color: "var(--uf-text-2)" }}>
              Notes <span style={{ color: "var(--uf-text-3)", fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>optional</span>
            </label>
            <textarea
              placeholder="Add a note…"
              value={draft.notes}
              onChange={(e) => setField("notes", e.target.value)}
              rows={2}
              style={{ width: "100%", border: "1px solid var(--uf-border)", borderRadius: 8, padding: "9px 12px", fontSize: 13, color: "var(--uf-text)", background: "var(--uf-card)", outline: "none", fontFamily: "inherit", resize: "vertical", lineHeight: 1.5 }}
            />
          </div>
        )}

        {/* AI suggestion pill */}
        {showAiPill && (
          <button
            type="button"
            onClick={applyAiSuggestion}
            style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              background: "linear-gradient(95deg, rgba(32,212,191,0.12), rgba(98,250,227,0.12))",
              border: "1px solid var(--uf-border)", color: "var(--uf-ink)",
              borderRadius: 999, padding: "6px 12px 6px 10px",
              fontSize: 12, fontWeight: 700, cursor: "pointer", alignSelf: "flex-start",
            }}
          >
            <span style={{ color: "#20D4BF" }}>✦</span>
            Looks like {aiSuggestedCat?.label} — use it?
          </button>
        )}

        {/* Date, and optionally the time of day */}
        <div style={{ display: "flex", gap: 8 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, flex: 2, minWidth: 0 }}>
            <label style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.4px", textTransform: "uppercase", color: "var(--uf-text-2)" }}>Date</label>
            <input
              type="date"
              value={draft.date}
              max={localYmd()}
              onChange={(e) => setField("date", e.target.value)}
              style={{ border: "1px solid var(--uf-border)", borderRadius: 8, padding: "9px 10px", fontSize: 13, color: "var(--uf-text)", background: "var(--uf-card)", outline: "none", fontFamily: "inherit" }}
            />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, flex: 1, minWidth: 0 }}>
            <label style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.4px", textTransform: "uppercase", color: "var(--uf-text-2)" }}>Time <span style={{ fontWeight: 600, textTransform: "none", letterSpacing: 0, opacity: 0.7 }}>optional</span></label>
            <input
              type="time"
              value={draft.time}
              onChange={(e) => setField("time", e.target.value)}
              style={{ border: "1px solid var(--uf-border)", borderRadius: 8, padding: "9px 10px", fontSize: 13, color: "var(--uf-text)", background: "var(--uf-card)", outline: "none", fontFamily: "inherit" }}
            />
          </div>
        </div>

        {/* Category grid */}
        {!isIncome && (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.4px", textTransform: "uppercase", color: "var(--uf-text-2)" }}>Category</label>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6 }}>
              {categories.map((c) => {
                const isSelected = draft.category === c.key;
                const isCustom = !DEFAULT_CAT_KEYS.has(c.key);
                return (
                  <button
                    key={c.key}
                    type="button"
                    onClick={() => { setField("category", c.key); setField("sub_category", ""); setShowSubForm(false); }}
                    style={{
                      background: isSelected ? "var(--uf-mint)" : "transparent",
                      border: `1px solid ${isSelected ? "var(--uf-ink)" : "var(--uf-border)"}`,
                      borderRadius: 8, padding: "8px 4px 6px",
                      display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
                      cursor: "pointer", transition: "all 0.12s",
                      position: "relative",
                    }}
                  >
                    {isCustom && (
                      <span style={{ position: "absolute", top: 4, right: 4, width: 6, height: 6, borderRadius: "50%", background: "#FFD4B8", flexShrink: 0 }} title="Custom category" />
                    )}
                    <div style={{ background: c.color, borderRadius: "50%", width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>{c.emoji}</div>
                    <span style={{ fontSize: 10, fontWeight: 600, color: isSelected ? "var(--uf-ink)" : "var(--uf-text-2)", textAlign: "center", lineHeight: 1.2 }}>{c.label}</span>
                  </button>
                );
              })}
            </div>
            {/* Add custom category */}
            {!showCatForm ? (
              <button
                type="button"
                onClick={() => setShowCatForm(true)}
                style={{ background: "none", border: "none", cursor: "pointer", fontSize: 12, color: "var(--uf-text-3)", padding: "2px 0", fontFamily: "inherit", textAlign: "left", alignSelf: "flex-start" }}
              >
                + Add category
              </button>
            ) : (
              <div style={{ border: "1px solid var(--uf-border)", borderRadius: 10, padding: "12px", background: "var(--uf-surface)", display: "flex", flexDirection: "column", gap: 10 }}>
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
                  style={{ border: "1px solid var(--uf-border)", borderRadius: 6, padding: "7px 10px", fontSize: 13, outline: "none", fontFamily: "inherit", background: "var(--uf-card)", color: "var(--uf-text)" }}
                />
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {colorPalette.map((c) => (
                    <button
                      key={c} type="button"
                      onClick={() => setNewCatColor(c)}
                      style={{ width: 22, height: 22, borderRadius: "50%", background: c, border: "none", cursor: "pointer", outline: newCatColor === c ? "2.5px solid #151719" : "2px solid transparent", outlineOffset: 2 }}
                    />
                  ))}
                </div>
                <div style={{ fontSize: 11, color: "var(--uf-text-2)", fontWeight: 600, marginBottom: 4, marginTop: 2 }}>Emoji <span style={{ fontWeight: 400, color: "var(--uf-text-3)" }}>optional</span></div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 3, marginBottom: 4 }}>
                  {emojiPalette.map((em) => (
                    <button key={em} type="button" onClick={() => setNewCatEmoji(newCatEmoji === em ? "" : em)}
                      style={{ width: 28, height: 28, background: newCatEmoji === em ? "var(--uf-mint)" : "transparent", border: `1.5px solid ${newCatEmoji === em ? "var(--uf-ink)" : "var(--uf-border)"}`, borderRadius: 5, cursor: "pointer", fontSize: 15, lineHeight: 1 }}>
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
                    style={{ flex: 1, background: "var(--uf-ink)", color: "var(--uf-card)", border: "none", borderRadius: 6, padding: "7px", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}
                  >
                    Add
                  </button>
                  <button
                    type="button"
                    onClick={() => { setShowCatForm(false); setNewCatLabel(""); }}
                    style={{ flex: 1, background: "var(--uf-surface-2)", color: "var(--uf-text-2)", border: "none", borderRadius: 6, padding: "7px", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}
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
            <label style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.4px", textTransform: "uppercase", color: "var(--uf-text-2)" }}>
              Sub-Category <span style={{ color: "var(--uf-text-3)", fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>optional</span>
            </label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {(allSubCats[draft.category] || []).map((sc) => {
                const isSelected = draft.sub_category === sc;
                return (
                  <button key={sc} type="button"
                    onClick={() => setField("sub_category", isSelected ? "" : sc)}
                    style={{
                      background: isSelected ? "var(--uf-mint)" : "var(--uf-surface-2)",
                      border: `1px solid ${isSelected ? "var(--uf-ink)" : "transparent"}`,
                      borderRadius: 999, padding: "5px 12px",
                      fontSize: 12, fontWeight: 600,
                      color: isSelected ? "var(--uf-ink)" : "var(--uf-text-2)",
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
                  style={{ border: "1px solid var(--uf-border)", borderRadius: 999, padding: "5px 12px", fontSize: 12, outline: "none", fontFamily: "inherit", width: 150, background: "var(--uf-card)", color: "var(--uf-text)" }}
                />
              ) : (
                <button
                  type="button"
                  onClick={() => setShowSubForm(true)}
                  style={{ background: "none", border: "1px dashed #CBD5E1", borderRadius: 999, padding: "5px 12px", fontSize: 12, color: "var(--uf-text-3)", cursor: "pointer", fontFamily: "inherit" }}
                >
                  + Add
                </button>
              )}
            </div>
          </div>
        )}

        {/* Need / Want / Work toggle */}
        {!isIncome && draft.transaction_type === "expense" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.4px", textTransform: "uppercase", color: "var(--uf-text-2)" }}>
              Classify
            </label>
            {/* One switch, Need or Want, the same pill as elsewhere (D-106); work costs keep their own tag. */}
            <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
              <SegmentedControl
                label="Need or want"
                value={draft.tags.includes("need") ? "need" : draft.tags.includes("want") ? "want" : transactionNeed({ category: draft.category, sub_category: draft.sub_category || null, tags: [] }, categoryNeeds)}
                onChange={(v) => setField("tags", [...draft.tags.filter((t) => t !== "need" && t !== "want"), v])}
                options={[{ value: "need", label: "Need" }, { value: "want", label: "Want" }]}
              />
              <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--uf-text-2)", cursor: "pointer" }}>
                <input type="checkbox" checked={draft.tags.includes("work")}
                  onChange={(e) => setField("tags", e.target.checked ? [...draft.tags.filter((t) => t !== "work"), "work"] : draft.tags.filter((t) => t !== "work"))} />
                Work cost
              </label>
            </div>
            {editing && onAlwaysShop && draft.description.trim() && (
              <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--uf-text-2)", cursor: "pointer" }}>
                <input type="checkbox" checked={alwaysShop} onChange={(e) => onAlwaysShop(e.target.checked)} />
                Always for {draft.description.trim()}
              </label>
            )}
          </div>
        )}

        {/* Optional field toggles: Refund + Project */}
        {draft.transaction_type === "expense" && (
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={() => setShowRefund((v) => !v)}
              style={{
                display: "inline-flex", alignItems: "center", gap: 4,
                background: (showRefund || !!(draft.refund_amount && parseFloat(draft.refund_amount) > 0)) ? "rgba(245,158,11,0.1)" : "var(--uf-surface-2)",
                border: `1px solid ${(showRefund || !!(draft.refund_amount && parseFloat(draft.refund_amount) > 0)) ? "#f59e0b" : "var(--uf-border)"}`,
                borderRadius: 999, padding: "5px 10px",
                fontSize: 11, fontWeight: 700,
                color: (showRefund || !!(draft.refund_amount && parseFloat(draft.refund_amount) > 0)) ? "#d97706" : "var(--uf-text-2)",
                cursor: "pointer", fontFamily: "inherit",
              }}
            >
              ↩ Refund{draft.refund_amount && parseFloat(draft.refund_amount) > 0 ? " ✓" : ""}
            </button>
            <button
              type="button"
              onClick={() => setShowProject((v) => !v)}
              style={{
                display: "inline-flex", alignItems: "center", gap: 4,
                background: (showProject || draft.tags.filter((t) => t !== "need" && t !== "want" && t !== "work").length > 0) ? "#EEE9FA" : "var(--uf-surface-2)",
                border: `1px solid ${(showProject || draft.tags.filter((t) => t !== "need" && t !== "want" && t !== "work").length > 0) ? "#D9CEF3" : "var(--uf-border)"}`,
                borderRadius: 999, padding: "5px 10px",
                fontSize: 11, fontWeight: 700,
                color: (showProject || draft.tags.filter((t) => t !== "need" && t !== "want" && t !== "work").length > 0) ? "var(--uf-ink)" : "var(--uf-text-2)",
                cursor: "pointer", fontFamily: "inherit",
              }}
            >
              🏷 Project{draft.tags.filter((t) => t !== "need" && t !== "want" && t !== "work").length > 0 ? " ✓" : ""}
            </button>
          </div>
        )}

        {/* Refund */}
        {draft.transaction_type === "expense" && (showRefund || !!(draft.refund_amount && parseFloat(draft.refund_amount) > 0)) && (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.4px", textTransform: "uppercase", color: "var(--uf-text-2)" }}>
              Refund <span style={{ color: "var(--uf-text-3)", fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>full or partial</span>
            </label>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input
                type="number"
                min="0"
                step="0.01"
                max={draft.amount || undefined}
                placeholder="0"
                value={draft.refund_amount}
                onChange={(e) => {
                  const v = e.target.value;
                  const max = draft.amount ? parseFloat(draft.amount) : Infinity;
                  if (v === "" || (parseFloat(v) >= 0 && parseFloat(v) <= max)) setField("refund_amount", v);
                }}
                style={{ flex: 1, border: "1px solid var(--uf-border)", borderRadius: 8, padding: "9px 12px", fontSize: 13, color: "var(--uf-text)", background: "var(--uf-card)", outline: "none", fontFamily: "inherit" }}
              />
              <span style={{ fontSize: 13, color: "var(--uf-text-2)", minWidth: 36 }}>{draft.currency}</span>
              {draft.refund_amount && parseFloat(draft.refund_amount) > 0 && (
                <button
                  type="button"
                  onClick={() => setField("refund_amount", "")}
                  style={{ background: "none", border: "none", cursor: "pointer", color: "var(--uf-text-3)", fontSize: 18, lineHeight: 1, padding: "0 4px", display: "flex", alignItems: "center" }}
                  title="Clear refund"
                >×</button>
              )}
            </div>
            {draft.refund_amount && parseFloat(draft.refund_amount) > 0 && draft.amount && parseFloat(draft.amount) > 0 && (
              <div style={{ fontSize: 12, color: "#17684B", fontWeight: 600 }}>
                {parseFloat(draft.refund_amount) >= parseFloat(draft.amount)
                  ? "✓ Fully refunded — net cost: 0"
                  : `Net cost: ${txMoney(parseFloat(draft.amount) - parseFloat(draft.refund_amount), draft.currency)}`}
              </div>
            )}
          </div>
        )}

        {/* Project / Event */}
        {(showProject || draft.tags.filter((t) => t !== "need" && t !== "want" && t !== "work").length > 0) && (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.4px", textTransform: "uppercase", color: "var(--uf-text-2)" }}>
              Project / Event <span style={{ color: "var(--uf-text-3)", fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>optional</span>
            </label>
            {draft.tags.filter((t) => t !== "need" && t !== "want" && t !== "work").length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {draft.tags.filter((t) => t !== "need" && t !== "want" && t !== "work").map((tag) => (
                  <span key={tag} style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "var(--uf-mint)", border: "1px solid var(--uf-border)", borderRadius: 999, padding: "4px 10px", fontSize: 12, fontWeight: 600, color: "var(--uf-ink)" }}>
                    #{tag}
                    <button
                      type="button"
                      onClick={() => setField("tags", draft.tags.filter((t) => t !== tag))}
                      style={{ background: "none", border: "none", cursor: "pointer", color: "#E3F7EF", fontSize: 16, lineHeight: 1, padding: "0 0 0 2px", display: "flex", alignItems: "center" }}
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
        )}

        {/* Income category dropdown */}
        {isIncome && (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.4px", textTransform: "uppercase", color: "var(--uf-text-2)" }}>Category</label>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6 }}>
              {INCOME_CATEGORIES.map((c) => {
                const isSelected = draft.category === c.key;
                return (
                  <button
                    key={c.key}
                    type="button"
                    onClick={() => setField("category", c.key)}
                    style={{
                      background: isSelected ? "var(--uf-mint)" : "transparent",
                      border: `1px solid ${isSelected ? "var(--uf-ink)" : "var(--uf-border)"}`,
                      borderRadius: 8, padding: "8px 4px 6px",
                      display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
                      cursor: "pointer",
                    }}
                  >
                    <div style={{ background: c.color, borderRadius: "50%", width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>{c.emoji}</div>
                    <span style={{ fontSize: 10, fontWeight: 600, color: isSelected ? "var(--uf-ink)" : "var(--uf-text-2)", textAlign: "center" }}>{c.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="cf-quick-form-footer" style={{ padding: "14px 20px 18px", paddingBottom: "calc(18px + env(safe-area-inset-bottom, 0px))", borderTop: "1px solid var(--uf-border)", background: "var(--uf-card)", display: "flex", flexDirection: "column", gap: 10, position: "sticky", bottom: 0, zIndex: 2 }}>
        {!editing && (
          <label style={{ display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer", fontSize: 12 }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
              <span
                role="switch"
                aria-checked={saveAndAddAnother}
                onClick={() => setSaveAndAddAnother((v) => !v)}
                style={{
                  display: "inline-block", width: 32, height: 18,
                  background: saveAndAddAnother ? "var(--uf-ink)" : "#CBD5E1",
                  borderRadius: 999, position: "relative", cursor: "pointer", transition: "background 0.12s", flexShrink: 0,
                }}
              >
                <span style={{
                  position: "absolute", width: 14, height: 14, background: "var(--uf-card)", borderRadius: "50%",
                  top: 2, left: saveAndAddAnother ? 16 : 2, transition: "left 0.14s",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
                }} />
              </span>
              <strong style={{ color: "var(--uf-text)" }}>Save &amp; add another</strong>
            </span>
            <span style={{ color: "var(--uf-text-3)", fontSize: 11 }}>
              <span style={{ border: "1px solid var(--uf-border)", borderBottomWidth: 2, borderRadius: 4, padding: "0 4px", fontSize: 10, fontWeight: 600, color: "var(--uf-text-2)", background: "var(--uf-surface)" }}>⌘</span>
              {" "}
              <span style={{ border: "1px solid var(--uf-border)", borderBottomWidth: 2, borderRadius: 4, padding: "0 4px", fontSize: 10, fontWeight: 600, color: "var(--uf-text-2)", background: "var(--uf-surface)" }}>↵</span>
            </span>
          </label>
        )}
        <button
          onClick={() => handleSubmit()}
          disabled={!canSave || saving}
          style={{
            background: canSave ? "var(--uf-ink)" : "var(--uf-surface-2)",
            color: canSave ? "var(--uf-card)" : "var(--uf-ink-3)", border: "none", borderRadius: 999,
            padding: "12px 16px", fontSize: 14, fontWeight: 700,
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            cursor: canSave ? "pointer" : "not-allowed",
            width: "100%", fontFamily: "inherit",
          }}
        >
          {saving ? "Saving…" : editing ? "Save changes" : "Save transaction"}
        </button>
        {editing && onDelete && (
          <button type="button" onClick={onDelete}
            style={{ marginTop: 8, background: "transparent", color: "var(--uf-neg-ink)", border: "1px solid var(--uf-border)", borderRadius: 999, padding: "10px 16px", fontSize: 14, fontWeight: 700, width: "100%", cursor: "pointer", fontFamily: "inherit" }}>
            Delete transaction
          </button>
        )}
      </div>

      {/* Always shown via drawer — tighten the drawer sheet for mobile safe areas */}
      <style>{`
        @media (max-width: 1024px) {
          .cf-mobile-drawer {
            max-height: calc(100dvh - env(safe-area-inset-top, 0px) - 8px) !important;
            padding-bottom: env(safe-area-inset-bottom, 0px);
            z-index: 220 !important;
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
  onCategoryChange,
  rates,
  formatAmount,
  catCustomizations,
  expenseCategories,
  categoryNeeds = {},
  uncounted,
}: {
  transactions: Transaction[];
  editingId: string | null;
  justAddedId: string | null;
  onEdit: (tx: Transaction) => void;
  onDelete: (tx: Transaction) => void;
  onCategoryChange: (tx: Transaction, category: string) => void;
  rates: Record<string, number>;
  formatAmount: (value: number) => string;
  catCustomizations: CatCustomizations;
  expenseCategories: CustomCategory[];
  /** The person's need/want per category, so every expense shows what it counts as (D-106). */
  categoryNeeds?: NeedOverrides;
  /** Rows waiting on a "card payment?" or "duplicate?" answer: listed, not added up (D-130). */
  uncounted?: Set<string>;
}) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "expense" | "income" | "transfer">("all");
  const [tagFilter, setTagFilter] = useState<"all" | "need" | "want" | "work">("all");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const clearFilters = () => { setFilter("all"); setTagFilter("all"); setSourceFilter("all"); };
  const TYPE_WORD = { expense: "Expenses", income: "Income", transfer: "Transfers" } as const;
  const TAG_WORD = { need: "Need", want: "Want", work: "Work" } as const;
  const active: [string, () => void][] = [
    ...(filter !== "all" ? [[TYPE_WORD[filter], () => setFilter("all")] as [string, () => void]] : []),
    ...(tagFilter !== "all" ? [[TAG_WORD[tagFilter], () => setTagFilter("all")] as [string, () => void]] : []),
    ...(sourceFilter !== "all" ? [[sourceFilter, () => setSourceFilter("all")] as [string, () => void]] : []),
  ];
  const activeCount = active.length;
  const sources = useMemo(() => {
    const n = new Map<string, number>();
    for (const t of transactions) n.set(sourceLabel(t), (n.get(sourceLabel(t)) ?? 0) + 1);
    return [...n].sort((a, b) => b[1] - a[1]);
  }, [transactions]);
  const [catPickerTxId, setCatPickerTxId] = useState<string | null>(null);
  const [pickerPos, setPickerPos] = useState<{ left: number; top?: number; bottom?: number }>({ left: 0 });
  const [swipedId, setSwipedId] = useState<string | null>(null);
  const touchStartX = useRef<number>(0);

  useEffect(() => {
    if (!catPickerTxId) return;
    const handler = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest("[data-cat-picker]")) setCatPickerTxId(null);
    };
    // Anchored to the icon, so it would drift when the page scrolls under it.
    const onScroll = () => { if (window.innerWidth > 700) setCatPickerTxId(null); };
    document.addEventListener("mousedown", handler);
    window.addEventListener("scroll", onScroll, true);
    return () => { document.removeEventListener("mousedown", handler); window.removeEventListener("scroll", onScroll, true); };
  }, [catPickerTxId]);
  const todayYmd = localYmd();
  const allCategories = useMemo(() => [...expenseCategories, ...INCOME_CATEGORIES], [expenseCategories]);

  const filtered = useMemo(() => {
    return transactions.filter((t) => {
      if (filter !== "all" && t.transaction_type !== filter) return false;
      if (tagFilter === "work" && !(t.tags || []).includes("work")) return false;
      if (sourceFilter !== "all" && sourceLabel(t) !== sourceFilter) return false;
      // Need or want is what the row counts as, sorted for you or tagged (D-106).
      if ((tagFilter === "need" || tagFilter === "want") && (t.transaction_type !== "expense" || transactionNeed(t, categoryNeeds) !== tagFilter)) return false;
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
  }, [transactions, search, filter, tagFilter, sourceFilter, allCategories, categoryNeeds]);

  // What the rows on screen add up to, so a filter (a tag, a search, the
  // work chip) answers "how much was that" without leaving the list. The
  // range's own totals and the review count live in the summary above.
  const counts = useCallback((t: Transaction) => t.transaction_type === "expense" && !uncounted?.has(t.id), [uncounted]);
  const shownSpent = useMemo(() => filtered
    .filter(counts)
    .reduce((s, t) => s + toUSD(netAmt(t), t.currency, rates), 0), [filtered, rates, counts]);
  const monthSpent = useMemo(() => {
    const out: Record<string, number> = {};
    for (const t of filtered) if (counts(t)) {
      const m = t.date.slice(0, 7);
      out[m] = (out[m] ?? 0) + toUSD(netAmt(t), t.currency, rates);
    }
    return out;
  }, [filtered, rates, counts]);

  const groups = useMemo(() => {
    const byDate: Record<string, Transaction[]> = {};
    filtered.forEach((t) => {
      if (!byDate[t.date]) byDate[t.date] = [];
      byDate[t.date].push(t);
    });
    return Object.entries(byDate).sort(([a], [b]) => b.localeCompare(a));
  }, [filtered]);

  return (
    <div style={{ background: "var(--uf-card)", border: "1px solid var(--uf-border)", borderRadius: "var(--uf-r-card)", overflow: "hidden", boxShadow: "var(--uf-e1)", display: "flex", flexDirection: "column", height: "calc(100vh - 48px)" }}>
      {/* List header: title, search and one Filter button. The filters live in
          a panel, so the list is not buried under rows of pills (John, 31 Oct 2026). */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px", borderBottom: "1px solid var(--uf-border)", gap: 12, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 0 }}>
          <span style={{ fontSize: 15, fontWeight: 700, color: "var(--uf-ink)", letterSpacing: "-0.2px" }}>Transactions</span>
          <span style={{ fontSize: 12, color: "var(--uf-text-3)", fontWeight: 600, marginLeft: 8 }}>{filtered.length}</span>
          {shownSpent > 0 && (
            <span style={{ fontSize: 12, color: "var(--uf-text-2)", fontWeight: 600, marginLeft: 12, fontFamily: "var(--uf-font-mono)", fontVariantNumeric: "tabular-nums" }}>
              <span style={{ fontFamily: "var(--uf-font-sans, inherit)", fontWeight: 500, color: "var(--uf-text-3)", marginRight: 4 }}>Expenses</span>{formatAmount(shownSpent)}
            </span>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flex: "1 1 240px", justifyContent: "flex-end", maxWidth: 420 }}>
          <div style={{ position: "relative", flex: 1, minWidth: 0 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--uf-ink-3)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}>
              <circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" />
            </svg>
            <input type="text" placeholder="Search…" aria-label="Search transactions" value={search} onChange={(e) => setSearch(e.target.value)}
              style={{ background: "var(--uf-surface-2)", border: "1px solid transparent", borderRadius: 999, padding: "8px 12px 8px 32px", fontSize: 13, color: "var(--uf-text)", width: "100%", outline: "none", fontFamily: "inherit" }} />
          </div>
          <button type="button" aria-expanded={filtersOpen} onClick={() => setFiltersOpen((v) => !v)}
            style={{ display: "inline-flex", alignItems: "center", gap: 6, flexShrink: 0, borderRadius: 999, padding: "8px 14px", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
              border: "1px solid var(--uf-border)", background: filtersOpen ? "var(--uf-ink)" : "var(--uf-card)", color: filtersOpen ? "var(--uf-card)" : "var(--uf-ink)" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden><path d="M4 6h16M7 12h10M10 18h4" /></svg>
            Filter
            {activeCount > 0 && (
              <span style={{ minWidth: 18, height: 18, borderRadius: 999, background: "var(--uf-yellow)", color: "var(--uf-on-accent)", fontSize: 11, display: "inline-grid", placeItems: "center", padding: "0 5px" }}>{activeCount}</span>
            )}
          </button>
        </div>
      </div>

      {/* The panel: one short group per question, each a single row. */}
      {filtersOpen && (
        <div style={{ display: "grid", gap: 14, padding: "14px 18px 16px", borderBottom: "1px solid var(--uf-border)", background: "var(--uf-surface)" }}>
          {([
            ["Show", [["all", "All"], ["expense", "Expenses"], ["income", "Income"], ["transfer", "Transfers"]], filter, (v: string) => setFilter(v as typeof filter)],
            ["Tag", [["all", "Any"], ["need", "✓ Need"], ["want", "✦ Want"], ["work", "💼 Work"]], tagFilter, (v: string) => setTagFilter(v as typeof tagFilter)],
            ...(sources.length > 1 ? [["From", [["all", "Anywhere"], ...sources.map(([l, n]) => [l, `${l} ${n}`])], sourceFilter, setSourceFilter]] : []),
          ] as [string, [string, string][], string, (v: string) => void][]).map(([label, options, value, set]) => (
            <div key={label} role="group" aria-label={label} style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
              <span className="uf-t-small" style={{ width: 44, flexShrink: 0, color: "var(--uf-ink-3)", fontWeight: 600 }}>{label}</span>
              <div style={{ display: "flex", gap: 6, overflowX: "auto", scrollbarWidth: "none", minWidth: 0, paddingBottom: 2 }}>
                {options.map(([v, text]) => (
                  <button key={v} type="button" aria-pressed={value === v} onClick={() => set(v)}
                    style={{ flexShrink: 0, whiteSpace: "nowrap", borderRadius: 999, padding: "6px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", border: "1px solid transparent",
                      background: value === v ? "var(--uf-ink)" : "var(--uf-card)", color: value === v ? "var(--uf-card)" : "var(--uf-text-2)" }}>
                    {text}
                  </button>
                ))}
              </div>
            </div>
          ))}
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            {activeCount > 0 && (
              <button type="button" onClick={clearFilters} style={{ border: "none", background: "transparent", color: "var(--uf-ink-2)", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", padding: "6px 10px" }}>Clear</button>
            )}
            <button type="button" onClick={() => setFiltersOpen(false)} style={{ border: "none", borderRadius: 999, background: "var(--uf-ink)", color: "var(--uf-card)", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", padding: "6px 16px" }}>Done</button>
          </div>
        </div>
      )}

      {/* What is on, as one row of chips; ✕ takes one off. Hidden when nothing is picked. */}
      {!filtersOpen && activeCount > 0 && (
        <div style={{ display: "flex", gap: 6, padding: "8px 18px", borderBottom: "1px solid var(--uf-border)", overflowX: "auto", scrollbarWidth: "none" }}>
          {active.map(([text, off]) => (
            <button key={text} type="button" onClick={off} aria-label={`Remove filter ${text}`}
              style={{ flexShrink: 0, display: "inline-flex", alignItems: "center", gap: 6, whiteSpace: "nowrap", borderRadius: 999, padding: "4px 10px", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", border: "none", background: "var(--uf-yellow)", color: "var(--uf-on-accent)" }}>
              {text} <span aria-hidden>✕</span>
            </button>
          ))}
        </div>
      )}

      {/* Scrollable list */}
      <div style={{ overflowY: "auto", flex: 1, minHeight: 0 }}>
        {groups.length === 0 ? (
          <div style={{ padding: "48px 24px", display: "flex", flexDirection: "column", alignItems: "center", gap: 16, textAlign: "center" }}>
            <div style={{ width: 56, height: 56, borderRadius: "50%", background: "#ECFDF5", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#17684B" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 17 9 13l3 3 7-7" /><path d="M14 6h5v5" />
              </svg>
            </div>
            {search || filter !== "all" || tagFilter !== "all" || sourceFilter !== "all" ? (
              <>
                <div style={{ fontWeight: 700, fontSize: 15, color: "var(--uf-text)" }}>No matches</div>
                <div style={{ fontSize: 13, color: "var(--uf-text-2)", maxWidth: 260 }}>Nothing matches these filters.</div>
                <button onClick={() => { setSearch(""); clearFilters(); }} style={{ background: "var(--uf-ink)", color: "var(--uf-card)", border: "none", borderRadius: 999, padding: "8px 18px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Clear filters</button>
              </>
            ) : (
              <>
                <div style={{ fontWeight: 700, fontSize: 15, color: "var(--uf-text)" }}>No transactions in this range</div>
                <div style={{ fontSize: 13, color: "var(--uf-text-2)", maxWidth: 260 }}>Add them by hand or import a file from your bank.</div>
              </>
            )}
          </div>
        ) : (
          groups.map(([date, txns], gi) => {
            const month = date.slice(0, 7);
            const newMonth = Object.keys(monthSpent).length > 1 && (gi === 0 || groups[gi - 1][0].slice(0, 7) !== month);
            // Spending only, like the month line: a payday netted against coffee read oddly ("+$3,163").
            const daySpent = txns.filter(counts).reduce((s, t) => s + toUSD(netAmt(t), t.currency, rates), 0);
            return (
              <div key={date}>
                {newMonth && (
                  <div style={{ position: "sticky", top: 0, zIndex: 2, padding: "12px 20px", display: "flex", justifyContent: "space-between", alignItems: "baseline",
                    background: "var(--uf-surface-2)", borderTop: gi ? "1px solid var(--uf-border)" : "none" }}>
                    <span className="uf-t-label" style={{ color: "var(--uf-ink-2)" }}>
                      {new Date(Number(month.slice(0, 4)), Number(month.slice(5, 7)) - 1, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" })}
                    </span>
                    {monthSpent[month] > 0 && (
                      <span className="uf-t-small" style={{ fontFamily: "var(--uf-font-mono)", fontVariantNumeric: "tabular-nums", color: "var(--uf-ink-2)" }}>−{formatAmount(monthSpent[month])}</span>
                    )}
                  </div>
                )}
                <div style={{ padding: "14px 20px 6px", display: "flex", alignItems: "baseline", justifyContent: "space-between", fontSize: 10, fontWeight: 700, letterSpacing: "1.1px", textTransform: "uppercase", color: "var(--uf-text-3)" }}>
                  <span>{dayLabel(date, todayYmd)}</span>
                  {daySpent > 0 && (
                    <span style={{ color: "var(--uf-text-2)", fontVariantNumeric: "tabular-nums" }}>−{formatAmount(daySpent)}</span>
                  )}
                </div>
                {txns
                  .slice()
                  .sort((a, b) => toUSD(b.amount, b.currency, rates) - toUSD(a.amount, a.currency, rates))
                  .map((tx) => {
                    const isIncome = tx.transaction_type === "income";
                    const cat = allCategories.find((c) => c.key === tx.category);
                    const isEditing = editingId === tx.id;
                    const wasJustAdded = justAddedId === tx.id;
                    const baseDisplay = { color: cat?.color || "#6b7280", emoji: (cat as {emoji?: string})?.emoji || "📦" };
                    const isTransfer = tx.transaction_type === "transfer";
                    // A transfer has no category: it shows as moving money, in the transfer blue.
                    const { color: chipColor, emoji: chipEmoji } = isTransfer ? { color: "var(--uf-blue)", emoji: "⇄" } : resolveDisplay(baseDisplay, catCustomizations, tx.category);
                    const txTags = tx.tags || [];
                    const needOrWant = transactionNeed(tx, categoryNeeds);
                    const isWorkCost = txTags.includes("work");
                    const displayTags = txTags.filter((t) => t !== "need" && t !== "want" && t !== "work" && !isSystemTag(t)).slice(0, 2);
                    // Null for most rows — only Plaid, an import that carried
                    // one, or a hand-typed time produces a time to show.
                    const txTime = formatTime(tx.occurred_at);

                    return (
                      <div key={tx.id} style={{ position: "relative", overflow: "hidden" }}>
                        {/* Swipe-to-delete background */}
                        {swipedId === tx.id && (
                          <div
                            onClick={(e) => { e.stopPropagation(); onDelete(tx); setSwipedId(null); }}
                            style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: 72, background: "#DC2626", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", zIndex: 2 }}
                          >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M4 7h16M10 11v6M14 11v6M6 7l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13M9 7V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v3" />
                            </svg>
                          </div>
                        )}
                      <div
                        className="tx-row"
                        title={tx.source_file ? `Imported from ${tx.source_file}` : undefined}
                        onClick={() => { if (swipedId === tx.id) { setSwipedId(null); return; } onEdit(tx); }}
                        style={{
                          display: "grid", gridTemplateColumns: "36px 1fr auto 28px",
                          gap: 14, alignItems: "center", padding: "12px 20px",
                          borderTop: "1px solid var(--uf-border)", cursor: "pointer",
                          background: isEditing ? "rgba(16,185,129,0.12)" : wasJustAdded ? "rgba(16,185,129,0.08)" : "transparent",
                          transition: "background 0.12s, transform 0.2s",
                          // No transform at rest: one would trap the phone category sheet (position: fixed) inside the row.
                          transform: swipedId === tx.id ? "translateX(-72px)" : "none",
                          position: "relative", zIndex: 1,
                        }}
                        onMouseEnter={(e) => { if (!isEditing && swipedId !== tx.id) (e.currentTarget as HTMLDivElement).style.background = "var(--uf-surface)"; }}
                        onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = isEditing ? "rgba(16,185,129,0.12)" : "transparent"; }}
                        onTouchStart={(e) => { touchStartX.current = e.touches[0].clientX; }}
                        onTouchEnd={(e) => {
                          const dx = touchStartX.current - e.changedTouches[0].clientX;
                          if (dx > 60) setSwipedId(tx.id);
                          else if (dx < -20) setSwipedId(null);
                        }}
                      >
                        {/* Category chip — click to change */}
                        <div style={{ position: "relative", flexShrink: 0 }} data-cat-picker>
                          <button
                            title="Change category"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (tx.transaction_type === "transfer") return;
                              const r = e.currentTarget.getBoundingClientRect();
                              const below = r.bottom + 6 + 300 <= window.innerHeight;
                              setPickerPos({ left: Math.max(8, Math.min(r.left, window.innerWidth - 292)), ...(below ? { top: r.bottom + 6 } : { bottom: window.innerHeight - r.top + 6 }) });
                              setCatPickerTxId(catPickerTxId === tx.id ? null : tx.id);
                            }}
                            style={{ width: 36, height: 36, borderRadius: "50%", background: chipColor, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, border: "none", cursor: tx.transaction_type === "transfer" ? "default" : "pointer", padding: 0, outline: catPickerTxId === tx.id ? `2px solid ${chipColor}` : "none", outlineOffset: 2, transition: "outline 0.1s" }}
                          >
                            {chipEmoji}
                          </button>
                          {catPickerTxId === tx.id && (
                            <PickerHost>
                            <div aria-hidden className="uf-cat-scrim" />
                            <div
                              data-cat-picker
                              className="uf-cat-picker"
                              style={{ position: "fixed", ...pickerPos, zIndex: 200, background: "var(--uf-card)", border: "1px solid var(--uf-border)", borderRadius: 14, padding: 12, boxShadow: "0 6px 24px rgba(0,0,0,0.14)", width: 284, display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 6 }}
                            >
                              <div style={{ gridColumn: "1/-1", fontSize: 10, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--uf-text-3)", marginBottom: 4 }}>
                                Change category
                              </div>
                              {(tx.transaction_type === "income" ? INCOME_CATEGORIES : expenseCategories).map((c) => {
                                const isCurrent = tx.category === c.key;
                                const baseC = { color: c.color, emoji: (c as {emoji?: string}).emoji || "📦" };
                                const { color: cColor, emoji: cEmoji } = resolveDisplay(baseC, catCustomizations, c.key);
                                return (
                                  <button
                                    key={c.key}
                                    data-cat-picker
                                    onClick={(e) => { e.stopPropagation(); onCategoryChange(tx, c.key); setCatPickerTxId(null); }}
                                    style={{ background: isCurrent ? "var(--uf-mint)" : "transparent", border: `1px solid ${isCurrent ? "var(--uf-ink)" : "var(--uf-border)"}`, borderRadius: 8, padding: "7px 3px 5px", display: "flex", flexDirection: "column", alignItems: "center", gap: 3, cursor: "pointer", transition: "all 0.1s" }}
                                    title={c.label}
                                  >
                                    <div style={{ width: 26, height: 26, borderRadius: "50%", background: cColor, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>{cEmoji}</div>
                                    <span style={{ fontSize: 9, fontWeight: 600, color: isCurrent ? "var(--uf-ink)" : "var(--uf-text-2)", textAlign: "center", lineHeight: 1.2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", width: "100%" }}>{c.label}</span>
                                  </button>
                                );
                              })}
                            </div>
                            </PickerHost>
                          )}
                        </div>

                        {/* Description + meta */}
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: 14, fontWeight: 600, color: "var(--uf-text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{tx.description}</div>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginTop: 2 }}>
                            {txTime && (
                              <span style={{ fontSize: 11.5, color: "var(--uf-text-3)", fontVariantNumeric: "tabular-nums", flexShrink: 0 }}>{txTime} ·</span>
                            )}
                            <span style={{ fontSize: 11.5, color: "var(--uf-text-3)" }}>{isTransfer ? "Transfer" : cat?.label || tx.category}</span>
                            {tx.sub_category && <span style={{ fontSize: 11, color: "var(--uf-text-2)" }}>· {tx.sub_category}</span>}
                            {tx.transaction_type === "expense" && needOrWant && (
                              <span
                                style={{
                                  background: needOrWant === "need" ? "color-mix(in srgb, var(--uf-pos) 15%, transparent)" : "color-mix(in srgb, var(--uf-warn) 15%, transparent)",
                                  color: needOrWant === "need" ? "var(--uf-pos)" : "var(--uf-warn)",
                                  border: "none", borderRadius: 999, padding: "1px 8px",
                                  fontSize: 10, fontWeight: 700, flexShrink: 0,
                                }}
                              >
                                {needOrWant === "need" ? "Need" : "Want"}
                              </span>
                            )}
                            {tx.transaction_type === "expense" && isWorkCost && (
                              <span
                                style={{
                                  background: "var(--uf-lilac)",
                                  color: "var(--uf-ink)",
                                  border: "none", borderRadius: 999, padding: "1px 8px",
                                  fontSize: 10, fontWeight: 700, flexShrink: 0,
                                }}
                              >
                                💼 work
                              </span>
                            )}
                            {displayTags.map((t) => (
                              <span key={t} style={{ background: "var(--uf-surface-2)", color: "var(--uf-text-2)", borderRadius: 999, padding: "1px 8px", fontSize: 10.5, fontWeight: 600 }}>#{t}</span>
                            ))}
                          </div>
                        </div>

                        {/* Amount */}
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 2 }}>
                          {tx.refund_amount > 0 ? (
                            <>
                              <div style={{ fontSize: 14, fontWeight: 700, color: tx.refund_amount >= tx.amount ? "#94A3B8" : "var(--uf-neg-ink)", whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums", textDecoration: tx.refund_amount >= tx.amount ? "line-through" : "none" }}>
                                −{txMoney(tx.amount, tx.currency).replace(/^−/, "").replace(/^\+/, "")}
                              </div>
                              {tx.refund_amount >= tx.amount ? (
                                <span style={{ fontSize: 10.5, fontWeight: 700, color: "var(--uf-pos-ink)", background: "rgba(5,150,105,0.1)", borderRadius: 999, padding: "1px 7px", whiteSpace: "nowrap" }}>↩ fully refunded</span>
                              ) : (
                                <span style={{ fontSize: 10.5, fontWeight: 700, color: "var(--uf-pos-ink)", background: "rgba(5,150,105,0.1)", borderRadius: 999, padding: "1px 7px", whiteSpace: "nowrap" }}>↩ −{txMoney(tx.refund_amount, tx.currency).replace(/^−/, "")} net {txMoney(netAmt(tx), tx.currency).replace(/^−/, "")}</span>
                              )}
                            </>
                          ) : (
                            <div style={{ fontSize: 14, fontWeight: 700, color: isIncome ? "var(--uf-pos-ink)" : tx.transaction_type === "transfer" ? "var(--uf-move-ink)" : "var(--uf-neg-ink)", whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums", opacity: uncounted?.has(tx.id) ? 0.5 : 1 }}>
                              {isIncome ? "+" : tx.transaction_type === "transfer" ? <span aria-label="Transfer">⇄ </span> : "−"}{txMoney(tx.amount, tx.currency).replace(/^−/, "").replace(/^\+/, "")}
                            </div>
                          )}
                          {looksLikeRefund(tx) && (
                            <span title="Money back, so it is not counted as income" style={{ fontSize: 10.5, fontWeight: 700, color: "var(--uf-ink-2)", background: "var(--uf-surface-2)", borderRadius: 999, padding: "1px 7px", whiteSpace: "nowrap" }}>↩ Refund</span>
                          )}
                          {uncounted?.has(tx.id) && (
                            <span title="Waiting on your answer in Worth a look" style={{ fontSize: 10.5, fontWeight: 700, color: "var(--uf-warn-ink)", background: "var(--uf-warn-bg)", borderRadius: 999, padding: "1px 7px", whiteSpace: "nowrap" }}>Not counted yet</span>
                          )}
                        </div>

                        {/* Delete */}
                        <button
                          onClick={(e) => { e.stopPropagation(); onDelete(tx); }}
                          style={{ width: 28, height: 28, borderRadius: "50%", background: "transparent", border: "none", color: "var(--uf-text-3)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", transition: "opacity 0.12s, background 0.12s" }}
                          className="tx-delete-btn"
                          aria-label={`Delete ${tx.description}`}
                        >
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M4 7h16M10 11v6M14 11v6M6 7l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13M9 7V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v3" />
                          </svg>
                        </button>
                      </div>
                      </div>
                    );
                  })}
              </div>
            );
          })
        )}
      </div>

      <style>{`
        /* The bin shows on hover or keyboard focus; on touch screens a swipe deletes, so it is not drawn. */
        .tx-delete-btn { opacity: 0; }
        .tx-row:hover .tx-delete-btn, .tx-delete-btn:focus-visible { opacity: 1; }
        @media (hover: none) {
          .tx-delete-btn { display: none !important; }
          .tx-row { grid-template-columns: 36px 1fr auto !important; }
        }
      `}</style>
    </div>
  );
}

// ─── Monthly Summary ──────────────────────────────────────────────────────────
function Toast({
  toast,
  onUndo,
}: {
  toast: { msg: string; undoId?: string; _removed?: Transaction; _removedMany?: Transaction[]; isError?: boolean } | null;
  onUndo: () => void;
}) {
  const isErr = toast?.isError;
  return (
    <div className="cf-toast" role="status" aria-live="polite" style={{
      position: "fixed", left: "50%",
      transform: `translateX(-50%) translateY(${toast ? 0 : 20}px)`,
      opacity: toast ? 1 : 0, transition: "opacity 200ms, transform 200ms",
      background: isErr ? "var(--uf-neg-bg)" : "var(--uf-ink)", color: isErr ? "var(--uf-neg-ink)" : "var(--uf-card)", borderRadius: 999,
      padding: "10px 16px 10px 14px", fontSize: 13, fontWeight: 600,
      display: "flex", alignItems: "center", gap: 12, zIndex: 60, maxWidth: "calc(100vw - 32px)",
      pointerEvents: toast ? "auto" : "none",
      boxShadow: "0 12px 32px rgba(15,23,42,0.14)",
    }}>
      <span aria-hidden style={{ width: 18, height: 18, background: isErr ? "var(--uf-neg)" : "var(--uf-pos)", borderRadius: "50%", display: "inline-flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 12, flexShrink: 0 }}>
        {isErr ? "✕" : "✓"}
      </span>
      <span>{toast?.msg}</span>
      {toast?.undoId && (
        <button type="button" onClick={onUndo} style={{ background: "transparent", border: "none", color: "inherit", fontSize: 13, fontWeight: 800, textDecoration: "underline", textUnderlineOffset: 3, cursor: "pointer", padding: "4px 0" }}>
          Undo
        </button>
      )}
    </div>
  );
}

// ─── Mobile components ────────────────────────────────────────────────────────
function MobileBar({ onOpen, onImport }: { onOpen: () => void; onImport: () => void }) {
  return (
    <div className="cf-mobile-bar">
      <button
        onClick={onOpen}
        aria-label="Add transaction"
        style={{ flex: 1, background: "#151719", color: "#fff", border: "none", borderRadius: "999px 0 0 999px", padding: "12px 20px", fontSize: 14, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, cursor: "pointer", boxShadow: "0 4px 10px rgba(6,78,59,0.35)", fontFamily: "inherit" }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14" /></svg>
        Add
      </button>
      <div style={{ width: 1, background: "rgba(255,255,255,0.2)", flexShrink: 0 }} />
      <button
        onClick={onImport}
        aria-label="Import bank file"
        style={{ background: "#151719", color: "#fff", border: "none", borderRadius: "0 999px 999px 0", padding: "12px 16px", fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", gap: 6, cursor: "pointer", boxShadow: "0 4px 10px rgba(6,78,59,0.35)", fontFamily: "inherit" }}
      >
        ↑ Import
      </button>
    </div>
  );
}

function MobileDrawer({ open, onClose, children }: { open: boolean; onClose: () => void; children: React.ReactNode }) {
  const panel = useRef<HTMLDivElement>(null);
  // The parent passes a new onClose each render; read it through a ref so
  // typing doesn't re-run the open/close effect (which returns focus).
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    if (!open) return;
    const back = document.activeElement as HTMLElement | null;
    // Typing straight away should go into the amount.
    const t = setTimeout(() => panel.current?.querySelector<HTMLElement>("[data-drawer-autofocus]")?.focus(), 60);
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") closeRef.current(); };
    window.addEventListener("keydown", onKey);
    return () => { clearTimeout(t); window.removeEventListener("keydown", onKey); back?.focus?.(); };
  }, [open]);

  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.5)", zIndex: 40, opacity: open ? 1 : 0, pointerEvents: open ? "auto" : "none", transition: "opacity 200ms" }} />
      <style>{`@media (min-width: 900px){.cf-mobile-drawer{left:50%!important;right:auto!important;top:50%;bottom:auto!important;width:min(560px,calc(100vw - 48px));max-height:88vh!important;border-radius:28px!important;transform:translate(-50%,-50%)!important;transition:opacity 180ms ease!important}.cf-mobile-drawer:not([data-open]){opacity:0;visibility:hidden}.cf-mobile-drawer .cf-drawer-handle{display:none}.cf-mobile-drawer > div:first-of-type{min-height:48px}}`}</style>
      <div ref={panel} className="cf-mobile-drawer" role="dialog" aria-modal="true" aria-labelledby="cf-quick-form-title"
        data-open={open ? "" : undefined} inert={!open} style={{ position: "fixed", left: 0, right: 0, bottom: 0, background: "var(--uf-card)", borderTopLeftRadius: 18, borderTopRightRadius: 18, zIndex: 50, transform: `translateY(${open ? 0 : "100%"})`, transition: "transform 240ms cubic-bezier(0.2,0,0,1)", maxHeight: "92vh", display: "flex", flexDirection: "column", boxShadow: "0 -10px 32px rgba(15,23,42,0.2)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "10px 16px 4px", position: "relative" }}>
          <div className="cf-drawer-handle" aria-hidden onClick={onClose} style={{ width: 44, height: 5, borderRadius: 99, background: "var(--uf-border-2)", cursor: "pointer" }} />
          <button type="button" aria-label="Close" onClick={onClose} style={{ position: "absolute", right: 16, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", fontSize: 20, color: "var(--uf-text-3)", cursor: "pointer", lineHeight: 1, padding: "4px 8px" }}>✕</button>
        </div>
        <div style={{ flex: 1, overflowY: "auto", overscrollBehavior: "contain" }}>
          <div style={{ maxWidth: 480, margin: "0 auto" }}>{children}</div>
        </div>
      </div>
    </>
  );
}

// ─── AI Review Modal ──────────────────────────────────────────────────────────
type ReviewItem = {
  tx: Transaction;
  suggestion: "need" | "want";
  wasTag?: "need" | "want";
  /** Suggested filing, from the person's own history for this merchant. */
  category?: string;
  sub_category?: string | null;
  source?: "history" | "ai";
  seen?: number;
};
type Filing = { category: string; sub_category: string | null };

/**
 * One card per merchant, not one row per payment: approving a card files
 * every payment in it. ✕ in its payment list moves one payment to its own
 * card. The category picker opens inside the card, so the scrolling list
 * never clips it. Mock: project files review-suggestions-2026-10-31.
 */
function AiReviewModal({
  pending,
  onApprove,
  onApproveAll,
  onSkip,
  onUndo,
  onClose,
  allExpenseCats,
  allSubCats,
}: {
  pending: ReviewItem[];
  onApprove: (items: { tx: Transaction; suggestion: "need" | "want"; filing?: Filing }[]) => void;
  onApproveAll: (resolved: { tx: Transaction; suggestion: "need" | "want"; filing?: Filing }[]) => void;
  onSkip: (txIds: string[]) => void;
  onUndo: (items: ReviewItem[]) => void;
  onClose: () => void;
  allExpenseCats: CustomCategory[];
  allSubCats: Record<string, string[]>;
}) {
  const [overrides, setOverrides] = useState<Record<string, "need" | "want">>({});
  const [filings, setFilings] = useState<Record<string, Filing>>({});
  const [pickerKey, setPickerKey] = useState<string | null>(null);
  const [pickerCat, setPickerCat] = useState<string | null>(null);
  const [openPays, setOpenPays] = useState<Record<string, boolean>>({});
  const [split, setSplit] = useState<Set<string>>(new Set());
  const [done, setDone] = useState<{ name: string; items: ReviewItem[] } | null>(null);
  const [total, setTotal] = useState(pending.length);
  useEffect(() => { setTotal((t) => Math.max(t, pending.length)); }, [pending.length]);
  useEffect(() => {
    if (!done) return;
    const t = setTimeout(() => setDone(null), 8000);
    return () => clearTimeout(t);
  }, [done]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const groups = useMemo(() => {
    const m = new Map<string, ReviewItem[]>();
    for (const item of pending) {
      const k = split.has(item.tx.id) ? `tx:${item.tx.id}` : (merchantKey(item.tx.description) || item.tx.description.toLowerCase());
      m.set(k, [...(m.get(k) ?? []), item]);
    }
    return [...m.entries()].map(([key, items]) => ({ key, items, lead: items[0] }));
  }, [pending, split]);
  if (!pending.length && !done) return null;

  const filingOf = (key: string, lead: ReviewItem): Filing | undefined =>
    filings[key] ?? (lead.category ? { category: lead.category, sub_category: lead.sub_category ?? null } : undefined);
  const needOf = (key: string, lead: ReviewItem) => overrides[key] ?? lead.suggestion;
  const catOf = (key: string) => [...allExpenseCats, ...INCOME_CATEGORIES].find((c) => c.key === key);
  const resolveGroup = (g: { key: string; items: ReviewItem[]; lead: ReviewItem }) => {
    const filing = filingOf(g.key, g.lead);
    const suggestion = needOf(g.key, g.lead);
    return g.items.map((p) => ({ tx: p.tx, suggestion, filing }));
  };
  const approve = (g: { key: string; items: ReviewItem[]; lead: ReviewItem }) => {
    onApprove(resolveGroup(g));
    setDone({ name: g.lead.tx.description, items: g.items });
  };
  const sumOf = (items: ReviewItem[]) => {
    const cur = items[0].tx.currency;
    const same = items.every((p) => p.tx.currency === cur);
    return same ? txMoney(items.reduce((s, p) => s + netAmt(p.tx), 0), cur) : `${items.length} currencies`;
  };
  const shortDate = (d: string) => new Date(`${d}T00:00:00`).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  const left = pending.length;
  const pct = total ? Math.round(((total - left) / total) * 100) : 0;

  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "var(--uf-scrim)", zIndex: 50 }} />
      <div role="dialog" aria-modal="true" aria-labelledby="uf-review-title" className="uf-review">
        <div className="uf-review-handle" aria-hidden onClick={onClose} />
        <div className="uf-review-head">
          <div className="uf-review-top">
            <h2 id="uf-review-title">Check categories</h2>
            <span className="uf-review-left">{left} left</span>
            <button type="button" className="uf-review-x" onClick={onClose} aria-label="Close">✕</button>
          </div>
          <div className="uf-review-bar" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Checked"><i style={{ width: `${pct}%` }} /></div>
          <div className="uf-review-memo"><b aria-hidden>↻</b>We&apos;ll remember your pick next time</div>
        </div>

        <div className="uf-review-list">
          {done && (
            <div className="uf-review-done" role="status">
              <i aria-hidden>✓</i>
              <span>Done · {done.items.length} from {done.name}</span>
              <button type="button" onClick={() => { onUndo(done.items); setDone(null); }}>Undo</button>
            </div>
          )}
          {groups.map((g) => {
            const { key, items, lead } = g;
            const tx = lead.tx;
            const filing = filingOf(key, lead);
            const need = needOf(key, lead);
            const shownCat = filing?.category ?? tx.category;
            const shownSub = filing ? filing.sub_category : tx.sub_category;
            const cat = catOf(shownCat);
            const { color, emoji } = resolveDisplay({ color: cat?.color ?? "#E9E6F0", emoji: (cat as { emoji?: string } | undefined)?.emoji || "📦" }, {}, shownCat);
            const n = items.length;
            const open = pickerKey === key;
            const paysOpen = openPays[key] ?? false;
            const cats = tx.transaction_type === "income" ? INCOME_CATEGORIES : allExpenseCats;
            return (
              <div key={key} className="uf-review-card">
                <div className="uf-review-row">
                  <div className="uf-review-ic" style={{ background: color }} aria-hidden>{emoji}</div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div className="uf-review-nm">{tx.description}</div>
                    <div className="uf-review-sub">
                      {n} payment{n === 1 ? "" : "s"} · {sumOf(items)}{n === 1 ? ` · ${shortDate(tx.date)}` : ""}
                    </div>
                  </div>
                  {lead.source === "history" && <span className="uf-review-usual" title={lead.seen ? `You picked this ${lead.seen}×` : undefined}>↻ Usual</span>}
                </div>

                <div className="uf-review-picks">
                  <button type="button" className="uf-review-chip" aria-expanded={open}
                    onClick={() => { setPickerKey(open ? null : key); setPickerCat(shownCat || null); }}>
                    <span className="d" style={{ background: color }} aria-hidden>{emoji}</span>
                    {shownSub || cat?.label || shownCat}
                    <span className="pen" aria-hidden>✎</span>
                  </button>
                  <div className="uf-review-seg" role="group" aria-label="Need or want">
                    {(["need", "want"] as const).map((v) => (
                      <button key={v} type="button" aria-pressed={need === v} data-v={v}
                        onClick={() => setOverrides((o) => ({ ...o, [key]: v }))}>
                        {v === "need" ? "Need" : "Want"}
                      </button>
                    ))}
                  </div>
                </div>

                {open && (
                  <div className="uf-review-picker">
                    <div className="uf-review-cats">
                      {cats.map((c) => {
                        const d = resolveDisplay({ color: c.color, emoji: (c as { emoji?: string }).emoji || "📦" }, {}, c.key);
                        const active = (pickerCat ?? shownCat) === c.key;
                        return (
                          <button key={c.key} type="button" aria-pressed={active} onClick={() => {
                            setPickerCat(c.key);
                            if (!(allSubCats[c.key]?.length)) { setFilings((f) => ({ ...f, [key]: { category: c.key, sub_category: null } })); setPickerKey(null); }
                          }}>
                            <span style={{ background: d.color }} aria-hidden>{d.emoji}</span>
                            {c.label}
                          </button>
                        );
                      })}
                    </div>
                    {pickerCat && (allSubCats[pickerCat]?.length ?? 0) > 0 && (
                      <div className="uf-review-subs">
                        {[null, ...allSubCats[pickerCat]].map((sc) => (
                          <button key={sc ?? "-"} type="button"
                            aria-pressed={pickerCat === shownCat && (sc ?? null) === (shownSub ?? null)}
                            onClick={() => { setFilings((f) => ({ ...f, [key]: { category: pickerCat, sub_category: sc } })); setPickerKey(null); }}>
                            {sc ?? `All ${catOf(pickerCat)?.label ?? pickerCat}`}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {paysOpen && (
                  <div className="uf-review-pays">
                    {items.map((p) => (
                      <div key={p.tx.id} className="uf-review-pay">
                        <span className="dt">{shortDate(p.tx.date)}</span>
                        <span className="note">{p.tx.notes || p.tx.description}</span>
                        <span className="amt">{txMoney(netAmt(p.tx), p.tx.currency)}</span>
                        {n > 1 && (
                          <button type="button" aria-label="Sort this one on its own"
                            onClick={() => setSplit((s) => new Set(s).add(p.tx.id))}>✕</button>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                <div className="uf-review-acts">
                  <button type="button" className="uf-review-more" aria-expanded={paysOpen}
                    onClick={() => setOpenPays((o) => ({ ...o, [key]: !paysOpen }))}>
                    {paysOpen ? "Hide payments ⌃" : n === 1 ? "Details ⌄" : "See payments ⌄"}
                  </button>
                  <Button variant="secondary" onClick={() => onSkip(items.map((p) => p.tx.id))}>Skip</Button>
                  <Button variant="primary" onClick={() => approve(g)}>✓ Approve{n > 1 ? ` ${n}` : ""}</Button>
                </div>
              </div>
            );
          })}
        </div>

        {left > 0 && (
          <div className="uf-review-foot">
            <span>Looks right? Do them all at once.</span>
            <Button variant="primary" onClick={() => onApproveAll(groups.flatMap(resolveGroup))}>✓ Approve all {left}</Button>
          </div>
        )}
      </div>
    </>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────
export default function TransactionsTab({ defaultCurrency = "USD", displayCurrency = "USD", displayRates = FALLBACK_RATES, preferredCurrencies = [], isPro = false, onUpgradeClick, budgets, expectedIncome, freeToSpend, categoryNeeds }: {
  categoryNeeds?: NeedOverrides;
  defaultCurrency?: string;
  displayCurrency?: string;
  displayRates?: Record<string, number>;
  preferredCurrencies?: string[];
  isPro?: boolean;
  onUpgradeClick?: () => void;
  /** Monthly budget per category, USD, from the Budget tab. */
  budgets?: Record<string, number>;
  /** Monthly income from the Budget tab, USD. */
  expectedIncome?: number;
  /** Free to spend until payday (D-29), as on Home. */
  freeToSpend?: FreeToSpend | null;
}) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [showImport, setShowImport] = useState(false);
  const [isClassifying, setIsClassifying] = useState(false);
  const [pendingClassifications, setPendingClassifications] = useState<ReviewItem[]>([]);
  const [classificationRules, setClassificationRules] = useState<ClassificationRule[]>([]);
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  // The range on screen (D-31): a count of months ending with rangeEnd, remembered per browser.
  const [rangePreset, setRangePreset] = useState<RangePreset>(1);
  const [rangeEnd, setRangeEnd] = useState(currentMonth);
  useEffect(() => {
    try {
      const saved = localStorage.getItem("uf.tx.range");
      if (saved) setRangePreset(saved === "ytd" ? "ytd" : Math.max(1, Number(saved)) || 1);
    } catch { /* storage unavailable */ }
  }, []);
  const setRange = useCallback((preset: RangePreset, end: string) => {
    setRangePreset(preset); setRangeEnd(end);
    try { localStorage.setItem("uf.tx.range", String(preset)); } catch { /* storage unavailable */ }
  }, []);
  const range = useMemo(() => rangeFor(rangePreset, rangeEnd), [rangePreset, rangeEnd]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const toggleCategory = useCallback((k: string) => setSelectedCategories((prev) => prev.includes(k) ? prev.filter((x) => x !== k) : [...prev, k]), []);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [bankStatus, setBankStatus] = useState<BankStatus | null>(null);
  const [banksOpen, setBanksOpen] = useState(false);
  // One rate list for the whole page: the dashboard's live rates, the same
  // ones used to show amounts in the display currency (Oct 2026 audit: a
  // second fetch here could disagree with them).
  const marketRates = displayRates;
  // Yuan bought through Alipay or WeChat on a dollar card count at the rate
  // the card actually charged, once five card copies teach it (Oct 2026
  // audit: 6.6 a dollar against the feed's 7.1, so yuan showed 7% low).
  const rates = useMemo(() => {
    const market = (amount: number, currency: string) => toUSD(amount, currency, marketRates);
    const learned = cardRates(transactions.filter((t) => t.transaction_type === "expense"), market);
    return Object.keys(learned).length ? { ...marketRates, ...learned } : marketRates;
  }, [transactions, marketRates]);

  // Custom categories / sub-categories (persisted in localStorage)
  const [catCustomizations, setCatCustomizations] = useState<CatCustomizations>(loadCatCustomizations);
  const handleCategoryColor = useCallback((key: string, color: string) => {
    setCatCustomizations((prev) => {
      const next = { ...prev, [key]: { ...prev[key], color } };
      try { saveCatCustomizations(next); } catch { /* storage unavailable */ }
      return next;
    });
  }, []);

  const { customCats, setCustomCats, customSubCats, setCustomSubCats } = useCustomCategories();

  const allExpenseCats = useMemo(() => {
    const defaultLabels = new Set(EXPENSE_CATEGORIES.map(c => c.label.toLowerCase()));
    const uniqueCustom = customCats.filter(c => !defaultLabels.has(c.label.toLowerCase()));
    return [...EXPENSE_CATEGORIES, ...uniqueCustom];
  }, [customCats]);
  const allSubCats = useMemo(() => {
    const merged: Record<string, string[]> = { ...SUB_CATEGORIES };
    Object.entries(customSubCats).forEach(([k, extras]) => {
      merged[k] = [...(merged[k] || []), ...extras];
    });
    return merged;
  }, [customSubCats]);

  const handleAddCategory = useCallback((cat: CustomCategory) => {
    setCustomCats((prev) => [...prev, cat]);
  }, [setCustomCats]);
  const handleDeleteCategory = useCallback((key: string) => {
    setCustomCats((prev) => prev.filter((c) => c.key !== key));
    setCustomSubCats((prev) => { const n = { ...prev }; delete n[key]; return n; });
  }, [setCustomCats, setCustomSubCats]);
  const handleAddSubCategory = useCallback((catKey: string, sub: string) => {
    setCustomSubCats((prev) => ({ ...prev, [catKey]: [...(prev[catKey] || []), sub] }));
  }, [setCustomSubCats]);

  // Form state (lifted so edit can populate it)
  const [draft, setDraft] = useState<DraftTransaction>(() => ({ ...EMPTY_DRAFT(), currency: defaultCurrency }));
  const [alwaysShop, setAlwaysShop] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [justAddedId, setJustAddedId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; undoId?: string; _removed?: Transaction; _removedMany?: Transaction[]; isError?: boolean } | null>(null);
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
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) return;
      fetchAllPages<Transaction>((from, to) => supabase
        .from("expenses")
        .select("*")
        .eq("user_id", session.user.id)
        .order("date", { ascending: false })
        .order("id")
        .range(from, to))
        .then(({ data }) => {
          if (data) setTransactions(data);
          setLoading(false);
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

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) return;
      supabase.from("classification_rules")
        .select("id, category, sub_category, classification")
        .eq("user_id", session.user.id)
        .then(({ data }) => { if (data) setClassificationRules(data as ClassificationRule[]); });
    });
  }, []);

  const inRange = useCallback((t: { date: string }) => {
    const d = t.date.slice(0, 10);
    return d >= range.start && d <= range.end;
  }, [range]);
  const monthTxns = useMemo(() => transactions.filter(inRange), [transactions, inRange]);
  // The list follows what the summary has picked: a category, or a day in the calendar.
  const listTxns = useMemo(() => monthTxns.filter((t) =>
    (!selectedCategories.length || selectedCategories.includes(t.category)) && (!selectedDay || t.date.startsWith(selectedDay))),
  [monthTxns, selectedCategories, selectedDay]);
  const today = `${currentMonth}-${String(now.getDate()).padStart(2, "0")}`;
  const usd = useCallback((amount: number, currency: string) => toUSD(amount, currency, rates), [rates]);
  const catDisplay = useCallback((cats: { key: string; label: string; color: string; emoji?: string }[]): CatDisplay[] =>
    cats.map((c) => ({ key: c.key, label: c.label, ...resolveDisplay({ color: c.color, emoji: c.emoji ?? "📦" }, catCustomizations, c.key) })),
  [catCustomizations]);
  // Bills for the forecast and budget line: everything in Upcoming, paid
  // one-offs included (a past month needs the bills it actually had), plus
  // monthly, quarterly and annual payments spotted in the history and not
  // listed (rent paid through "BILT PAYMENT" every month is a bill whether
  // or not anyone added it). Each lands on its own date in lib/spend-forecast.
  const [expected, setExpected] = useState<{ id: string; amount: number; currency: string | null; transaction_type: string; due_date: string; category: string | null; description: string | null; recurrence: string | null; match_merchant: string | null; completed_at: string | null }[]>([]);
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) return;
      supabase.from("expected_payments").select("id, amount, currency, transaction_type, due_date, category, description, recurrence, match_merchant, completed_at")
        .eq("user_id", session.user.id)
        .then(({ data }) => { if (data) setExpected(data); });
    });
  }, [refreshKey]);
  // A listed bill without a category gets one guessed from its name ("Rent"
  // is housing), so it can still be matched to the bank's payment.
  const listedBills = useMemo<(Bill & { completed: boolean })[]>(() => expected
    .filter((r) => r.transaction_type === "expense" && r.due_date)
    .map((r) => ({ id: r.id, description: r.description, category: r.category || guessBillCategory(r.description), merchant: r.match_merchant,
      usd: usd(Number(r.amount) || 0, r.currency ?? "USD"), due: r.due_date.slice(0, 10),
      completed: !!r.completed_at && (r.recurrence ?? "none") === "none", // a repeating bill is never finished
      recurrence: (["weekly", "biweekly", "monthly", "quarterly", "annual"].includes(r.recurrence ?? "") ? r.recurrence : "none") as Recurrence })),
  [expected, usd]);
  // A payment that looks like a listed bill counts as paying it while the
  // "Upcoming bill?" question waits (D-49), so rent is not counted twice.
  const bills = useMemo<Bill[]>(() => {
    const asks = unlinkedBillPayments(
      transactions.filter((t) => t.transaction_type === "expense")
        .map((t) => ({ id: t.id, date: t.date.slice(0, 10), usd: usd(netAmt(t), t.currency), description: t.description ?? "", category: t.category })),
      listedBills, (t) => !!transactions.find((x) => x.id === t.id)?.tags?.includes(okTag("bill")));
    const listed = presumePaid(listedBills, asks);
    const raw = transactions.filter((t) => t.transaction_type !== "transfer").map((t) => ({
      id: t.id, date: t.date.slice(0, 10), amount: t.transaction_type === "expense" ? netAmt(t) : t.amount, currency: t.currency,
      description: t.description ?? "", category: t.category, transaction_type: t.transaction_type as "expense" | "income",
    }));
    const spotted: Bill[] = detectRecurring(raw, rates).expenses
      .filter((d) => d.frequency === "monthly" || d.frequency === "quarterly" || d.frequency === "annual")
      .map((d) => ({ description: d.description, category: d.category, usd: d.avgAmountUSD, due: d.nextDueDate, recurrence: d.frequency as Recurrence }));
    return mergeBills(listed, spotted);
  }, [listedBills, transactions, rates, usd]);
  const calendarItems=useMemo<ScheduledCalendarItem[]>(()=>expected.filter(r=>(r.transaction_type==='income'||r.transaction_type==='expense')&&r.due_date).map(r=>({description:r.description??(r.transaction_type==='income'?'Income':'Bill'),amountUSD:usd(Number(r.amount)||0,r.currency??'USD'),type:r.transaction_type as 'income'|'expense',dueDate:r.due_date.slice(0,10),category:r.category,completed:!!r.completed_at&&(r.recurrence??'none')==='none',recurrence: (['weekly','biweekly','monthly','quarterly','annual'].includes(r.recurrence??'')?r.recurrence:'none') as Recurrence})),[expected,usd]);
  const expenseCatDisplay = useMemo(() => catDisplay(allExpenseCats), [catDisplay, allExpenseCats]);
  const incomeCatDisplay = useMemo(() => catDisplay(INCOME_CATEGORIES), [catDisplay]);
  const reviewCounts = useMemo(() => {
    const expenses = monthTxns.filter((t) => t.transaction_type === "expense");
    // Filed once it has a category; need or want comes from the category (lib/needs, D-86), as on the phone.
    // "Other" counts once tagged: the app files a transaction nobody recognises as Other (Oct 2026).
    const done = expenses.filter((t) => t.category && (t.category !== "other" || t.tags?.some((g) => g === "need" || g === "want"))).length;
    return { filed: done, need: expenses.length - done };
  }, [monthTxns]);

  const existingTags = useMemo(
    () => [...new Set(transactions.flatMap((t) => t.tags || []))].filter((t) => !isSystemTag(t)).sort(),
    [transactions]
  );

  const showToast = useCallback((msg: string, undoId?: string, removed?: Transaction, isError?: boolean, removedMany?: Transaction[]) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ msg, undoId, _removed: removed, _removedMany: removedMany, isError });
    // A bulk delete keeps its Undo up longer: it is a bigger thing to take back.
    toastTimer.current = setTimeout(() => setToast(null), removedMany ? 12000 : undoId ? 6000 : 3200);
  }, []);

  const applyClassifications = useCallback(async (toApply: { tx: Transaction; suggestion: "need" | "want"; filing?: { category: string; sub_category: string | null } }[]) => {
    const updates = toApply.map(({ tx, suggestion, filing }) => ({
      id: tx.id,
      tags: [...(tx.tags || []).filter((t) => t !== "need" && t !== "want"), suggestion],
      category: filing?.category ?? tx.category,
      sub_category: filing ? filing.sub_category : (tx.sub_category ?? null),
    }));
    for (let i = 0; i < updates.length; i += 20) {
      await Promise.all(
        updates.slice(i, i + 20).map((u) => supabase.from("expenses").update({ tags: u.tags, category: u.category, sub_category: u.sub_category }).eq("id", u.id))
      );
    }
    const updateMap = new Map(updates.map((u) => [u.id, u]));
    setTransactions((prev) => prev.map((t) => {
      const u = updateMap.get(t.id);
      return u ? { ...t, tags: u.tags, category: u.category, sub_category: u.sub_category } : t;
    }));
  }, []);

  const handleAiClassify = useCallback(async () => {
    if (isClassifying) return;
    setIsClassifying(true);
    try {
      const toReview = transactions.filter(
        (t) => t.transaction_type === "expense" && inRange(t)
      );
      if (!toReview.length) { showToast("No expenses to review here"); return; }

      // Apply saved rules first — only for transactions not already correctly tagged
      const ruleMap = new Map(
        classificationRules
          .filter((r) => r.sub_category !== null)
          .map((r) => [`${r.category.toLowerCase()}|${r.sub_category!.toLowerCase()}`, r])
      );
      const ruleMatched: { tx: Transaction; suggestion: "need" | "want" }[] = [];
      const needsAi: Transaction[] = [];
      for (const tx of toReview) {
        const rule = ruleMap.get(`${(tx.category || "").toLowerCase()}|${(tx.sub_category || "").toLowerCase()}`);
        if (rule) {
          const alreadyCorrect = !!(tx.tags?.includes(rule.classification) && !tx.tags?.includes(rule.classification === "need" ? "want" : "need"));
          if (!alreadyCorrect) ruleMatched.push({ tx, suggestion: rule.classification });
        } else {
          needsAi.push(tx);
        }
      }
      if (ruleMatched.length > 0) {
        await applyClassifications(ruleMatched);
        showToast(`${ruleMatched.length} transaction${ruleMatched.length !== 1 ? "s" : ""} auto-classified by rules`);
      }

      // The person's own history for each merchant comes first: it covers
      // the category and sub-category as well as need/want, in any language.
      // A transaction already filed and tagged, with nothing new to suggest,
      // is not put back in front of them.
      const memory = buildMerchantMemory(transactions.filter((t) => !inRange(t) || t.tags?.some((g) => g === "need" || g === "want")));
      const unfiled = (t: Transaction) => !t.category || t.category === "other";
      const tagged = (t: Transaction) => !!t.tags?.some((g) => g === "need" || g === "want");
      const reviews: ReviewItem[] = [];
      const forAi: Transaction[] = [];
      for (const tx of needsAi) {
        const h = suggestFromHistory(tx, memory);
        const fileIt = !!h?.category && (unfiled(tx) || (h.category === tx.category && !tx.sub_category && !!h.sub_category));
        if (!fileIt && tagged(tx)) continue;
        const was = (tx.tags?.includes("need") ? "need" : tx.tags?.includes("want") ? "want" : undefined) as "need" | "want" | undefined;
        const item: ReviewItem = {
          tx, suggestion: h?.classification ?? was ?? "want", wasTag: was,
          ...(fileIt ? { category: h!.category!, sub_category: h!.sub_category, source: "history" as const, seen: h!.seen } : {}),
        };
        reviews.push(item);
        if (!h?.classification && !was) forAi.push(tx);
      }
      // History-based filing is free; asking the model about new merchants is Pro.
      if (!forAi.length || !isPro) {
        if (reviews.length) setPendingClassifications(reviews);
        else showToast("Everything here is already filed");
        return;
      }

      const items = [...new Map(
        forAi.map((t) => [t.description.toLowerCase(), { description: t.description, category: t.category }])
      ).values()];

      const res = await fetch("/api/classify-needs-wants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      });
      if (!res.ok) throw new Error("classification failed");
      const { results } = await res.json() as { results: { description: string; needOrWant: string }[] };
      const classMap = new Map(results.map((r) => [r.description.toLowerCase(), r.needOrWant]));

      const aiIds = new Set(forAi.map((t) => t.id));
      setPendingClassifications(reviews.map((r) => aiIds.has(r.tx.id)
        ? { ...r, suggestion: (classMap.get(r.tx.description.toLowerCase()) === "need" ? "need" : "want") as "need" | "want" }
        : r));
    } catch {
      showToast("Classification failed — try again", undefined, undefined, true);
    } finally {
      setIsClassifying(false);
    }
  }, [transactions, isClassifying, showToast, inRange, isPro, classificationRules, applyClassifications]);


  const handleSave = useCallback(async (keepOpen: boolean) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const payload = {
      user_id: session.user.id,
      date: draft.date,
      // Null when the field is left blank — an unknown time stays unknown
      // rather than becoming a confident midnight.
      occurred_at: combineDateAndTime(draft.date, draft.time),
      amount: parseFloat(draft.amount),
      refund_amount: Math.min(parseFloat(draft.refund_amount) || 0, parseFloat(draft.amount) || 0),
      currency: draft.currency,
      description: draft.description,
      notes: draft.notes || "",
      category: draft.category || (draft.transaction_type === "income" ? "other_income" : draft.transaction_type === "transfer" ? "transfer" : "other"),
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
      // "Always for this shop" (D-106): later buys there are filed and sorted the same way, on both apps.
      if (alwaysShop && payload.transaction_type === "expense" && merchantKey(payload.description)) {
        const { data: budget } = await supabase.from("user_budget").select("expenses").eq("user_id", session.user.id).maybeSingle();
        const ex = (budget?.expenses as Record<string, unknown>) ?? {};
        const fp = (ex._fire_profile as Record<string, unknown>) ?? {};
        const rule = { category: payload.category, sub_category: payload.sub_category, need: transactionNeed(payload, categoryNeeds) };
        const { error: ruleError } = await supabase.from("user_budget").update({
          expenses: { ...ex, _fire_profile: { ...fp, merchantRules: { ...readMerchantRules(fp.merchantRules), [merchantKey(payload.description)]: rule } } },
        }).eq("user_id", session.user.id);
        if (ruleError) showToast("Saved, but couldn't remember the shop — please try again", undefined, undefined, true);
      }
      setAlwaysShop(false);
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
      if (!inRange(data)) setRangeEnd(data.date.slice(0, 7));
      showToast(`Added — ${data.description || txMoney(data.amount, data.currency)}`, data.id);
      if (!keepOpen) {
        setDraft({ ...EMPTY_DRAFT(), currency: defaultCurrency });
      } else {
        setDraft((d) => ({ ...EMPTY_DRAFT(), date: d.date, transaction_type: d.transaction_type, currency: d.currency, sub_category: "", tags: d.tags }));
      }
      if (drawerOpen && !keepOpen) setDrawerOpen(false);
    }
  }, [defaultCurrency, draft, drawerOpen, inRange, showToast, alwaysShop, categoryNeeds]);

  const handleEdit = useCallback((tx: Transaction) => {
    setEditingId(tx.id);
    setDraft({
      id: tx.id,
      transaction_type: tx.transaction_type,
      amount: String(tx.amount),
      refund_amount: tx.refund_amount ? String(tx.refund_amount) : "",
      currency: tx.currency,
      description: tx.description,
      notes: tx.notes || "",
      date: tx.date,
      time: timeInputValue(tx.occurred_at),
      category: tx.category,
      sub_category: tx.sub_category || "",
      tags: [...(tx.tags || [])],
      aiSuggestion: null,
    });
    setDrawerOpen(true);
  }, []);

  const handleCancelEdit = useCallback(() => {
    setEditingId(null);
    setAlwaysShop(false);
    setDraft({ ...EMPTY_DRAFT(), currency: defaultCurrency });
    if (drawerOpen) setDrawerOpen(false);
  }, [defaultCurrency, drawerOpen]);

  // "Worth a look" (D-31): rows that may be making the numbers wrong.
  // Plus payments that look like an Upcoming bill not yet linked to it: asked once, then matched by name.
  const billAsks = useMemo(() => unlinkedBillPayments(
    monthTxns.filter((t) => t.transaction_type === "expense")
      .map((t) => ({ id: t.id, date: t.date.slice(0, 10), usd: usd(netAmt(t), t.currency), description: t.description ?? "", category: t.category })),
    listedBills, (t) => !!transactions.find((x) => x.id === t.id)?.tags?.includes(okTag("bill"))),
  [monthTxns, listedBills, transactions, usd]);
  // Card copies of Alipay/WeChat purchases, across every month, so they can
  // be cleared in one go: card row id → the wallet row it copies.
  const twins = useMemo(() => {
    const expenses = transactions.filter((t) => t.transaction_type === "expense");
    return walletTwins(expenses.filter((t) => !t.tags?.includes(okTag("duplicate"))), expenses, usd);
  }, [transactions, usd]);
  const flags = useMemo(() => {
    const f = findFlags(monthTxns, transactions, usd);
    billAsks.forEach((_, id) => { if (!f.has(id)) f.set(id, "bill"); });
    twins.forEach((_, id) => f.set(id, "duplicate"));
    return f;
  }, [monthTxns, transactions, usd, billAsks, twins]);
  // Card bill payments and likely copies stay out of every total on this
  // page until the person answers (D-130), across all months, so a past
  // month's chart and the "usual" bands are not doubled either.
  const uncounted = useMemo(() => {
    const f = findFlags(transactions, transactions, usd);
    twins.forEach((_, id) => f.set(id, "duplicate"));
    return pendingUncounted(f);
  }, [transactions, usd, twins]);
  // Refunds saved as income are not earnings, so Income and Saved leave them out.
  const counted = useMemo(() => transactions.filter((t) => !uncounted.has(t.id) && !looksLikeRefund(t)), [transactions, uncounted]);
  const spentThisMonth = useMemo(() => counted
    .filter((t) => t.transaction_type === "expense" && t.date.startsWith(currentMonth))
    .reduce((s, t) => s + toUSD(netAmt(t), t.currency, rates), 0), [counted, currentMonth, rates]);
  // A linked bill whose payment has arrived is marked paid on its own: a
  // repeat moves to its next date, a one-off is completed. The update is
  // conditional on the due date it read, so two open tabs cannot roll it twice.
  const settling = useRef(new Set<string>());
  useEffect(() => {
    const txs = transactions.filter((t) => t.transaction_type === "expense")
      .map((t) => ({ id: t.id, date: t.date.slice(0, 10), usd: usd(netAmt(t), t.currency), description: t.description ?? "", category: t.category }));
    for (const bill of listedBills) {
      const patch = settleBill(bill, txs, new Date().toISOString());
      const key = `${bill.id}|${bill.due}`;
      if (!patch || settling.current.has(key)) continue;
      settling.current.add(key);
      supabase.from("expected_payments").update(patch).eq("id", bill.id!).eq("due_date", bill.due).select("id").then(({ data, error }) => {
        if (error || !data?.length) return;
        setExpected((prev) => prev.map((r) => (r.id === bill.id ? { ...r, ...patch } : r)));
        showToast(`${bill.description ?? "Bill"} marked paid`);
      });
    }
  }, [transactions, listedBills, usd, showToast]);
  const billNotes = useMemo(() => new Map([...billAsks].map(([id, b]) => [id, b.description ?? ""])), [billAsks]);
  const resolveFlag = useCallback(async (row: { id: string }, kind: FlagKind, confirmed: boolean) => {
    const tx = transactions.find((t) => t.id === row.id);
    if (!tx) return;
    trackTxFlagResolved({ flag: kind, confirmed });
    if (confirmed && kind === "duplicate") { await handleDeleteRef.current?.(tx); return; }
    // "Yes, link it": the Upcoming bill remembers the bank's name for it, so
    // the two count as one bill and the question is not asked again.
    const bill = kind === "bill" ? billAsks.get(tx.id) : undefined;
    if (confirmed && bill?.id) {
      const { error } = await supabase.from("expected_payments").update({ match_merchant: tx.description }).eq("id", bill.id);
      if (error) { showToast("Couldn't save that — try again", undefined, undefined, true); return; }
      setExpected((prev) => prev.map((r) => (r.id === bill.id ? { ...r, match_merchant: tx.description } : r)));
      return;
    }
    const patch = confirmed && kind === "card_payment"
      ? { transaction_type: "transfer" as const }
      : { tags: [...(tx.tags || []).filter((g) => g !== okTag(kind)), okTag(kind)] };
    const { error } = await supabase.from("expenses").update(patch).eq("id", tx.id);
    if (error) { showToast("Couldn't save that — try again", undefined, undefined, true); return; }
    setTransactions((prev) => prev.map((t) => (t.id === tx.id ? { ...t, ...patch } : t)));
  }, [transactions, showToast, billAsks]);
  const handleDeleteRef = useRef<((tx: Transaction) => Promise<void>) | null>(null);

  // "Delete all card copies": one tap, with Undo putting every row back.
  const deleteCopies = useCallback(async (ids: string[]) => {
    const rows = transactions.filter((t) => ids.includes(t.id));
    if (!rows.length) return;
    trackTxFlagResolved({ flag: "duplicate", confirmed: true });
    for (let i = 0; i < rows.length; i += 200) {
      const chunk = rows.slice(i, i + 200).map((t) => t.id);
      const { error } = await supabase.from("expenses").delete().in("id", chunk);
      if (error) {
        const gone = new Set(rows.slice(0, i).map((t) => t.id));
        setTransactions((prev) => prev.filter((t) => !gone.has(t.id)));
        showToast(i ? `Deleted ${i}, then it stopped — try again` : "Couldn't delete them — try again", undefined, undefined, true);
        return;
      }
    }
    const gone = new Set(rows.map((t) => t.id));
    setTransactions((prev) => prev.filter((t) => !gone.has(t.id)));
    showToast(`Deleted ${rows.length} card ${rows.length === 1 ? "copy" : "copies"}`, "undo:many", undefined, false, rows);
  }, [transactions, showToast]);

  const handleCategoryChange = useCallback(async (tx: Transaction, category: string) => {
    const { error } = await supabase.from("expenses").update({ category }).eq("id", tx.id);
    if (error) { showToast("Couldn't change the category. Try again.", undefined, undefined, true); return; }
    setTransactions(prev => prev.map(t => t.id === tx.id ? { ...t, category } : t));
  }, [showToast]);

  const handleDelete = useCallback(async (tx: Transaction) => {
    // No confirm popup: the toast offers Undo for six seconds.
    const { error } = await supabase.from("expenses").delete().eq("id", tx.id);
    if (error) {
      showToast("Failed to delete — please try again", undefined, undefined, true);
      return;
    }
    setTransactions((prev) => prev.filter((t) => t.id !== tx.id));
    if (editingId === tx.id) { setEditingId(null); setDraft({ ...EMPTY_DRAFT(), currency: defaultCurrency }); }
    showToast(`Deleted "${tx.description}"`, "undo:" + tx.id, tx);
  }, [defaultCurrency, editingId, showToast]);
  useEffect(() => { handleDeleteRef.current = handleDelete; }, [handleDelete]);

  const handleUndo = useCallback(() => {
    if (!toast) return;
    if (toast._removedMany) {
      const rows = toast._removedMany;
      setToast(null);
      supabase.from("expenses").insert(rows).select().then(({ data, error }) => {
        if (!error && data) setTransactions((prev) => [...(data as Transaction[]), ...prev]);
        else showToast("Couldn't put them back — import the card file again", undefined, undefined, true);
      });
    } else if (toast._removed) {
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
      // Undo add: delete the just-added transaction. It leaves the list at
      // once and goes back if the delete fails. The delete has to be .then()'d:
      // a query builder sends nothing until it is, and this one never ran, so
      // an undone transaction came back on the next reload.
      const id = toast.undoId;
      const row = transactions.find((t) => t.id === id);
      setTransactions((prev) => prev.filter((t) => t.id !== id));
      supabase.from("expenses").delete().eq("id", id).then(({ error }) => {
        if (!error) return;
        if (row) setTransactions((prev) => (prev.some((t) => t.id === id) ? prev : [row, ...prev]));
        showToast("Couldn't undo — the transaction is still saved", undefined, undefined, true);
      });
    }
    setToast(null);
  }, [showToast, toast, transactions]);

  if (loading) {
    return <TransactionsLoading />;
  }

  return (
    <>
      <style>{`
        .cf-mobile-bar {
          display: flex; position: fixed; bottom: calc(80px + env(safe-area-inset-bottom, 0px));
          left: 16px; right: 16px; background: transparent; border-radius: 999px; padding: 0; align-items: center; z-index: 30;
        }
        @media (min-width: 1025px) {
          .cf-mobile-bar { left: 50%; right: auto; width: 100%; max-width: 340px; transform: translateX(-50%); bottom: 28px; }
        }
        /* Toasts sit above the Add bar, never on it. */
        .cf-toast { bottom: calc(140px + env(safe-area-inset-bottom, 0px)); }
        @media (min-width: 1025px) { .cf-toast { bottom: 88px; } }
        .uf-cat-scrim { display: none; }
        /* The row clips its overflow, so on phones the picker is a bottom sheet instead of a popover. */
        @media (max-width: 700px) {
          .uf-cat-scrim { display: block; position: fixed; inset: 0; z-index: 229; background: var(--uf-scrim); }
          .uf-cat-picker {
            position: fixed !important; top: auto !important; left: 0 !important; right: 0 !important; bottom: 0 !important;
            width: auto !important; z-index: 230 !important; border-radius: 16px 16px 0 0 !important; gap: 8px !important;
            padding: 16px 16px calc(20px + env(safe-area-inset-bottom, 0px)) !important;
            max-height: 70dvh; overflow-y: auto; box-shadow: var(--uf-e2) !important;
          }
          .uf-cat-picker button { min-height: 64px; }
          .uf-cat-picker button span { font-size: 11px !important; }
        }
      `}</style>

      {/* Top bar: one date control, and the import action */}
      <div style={{
        position: "sticky", top: 0, zIndex: 10, background: "var(--uf-bg)",
        padding: "8px 0", marginBottom: 12, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap",
      }}>
        <SpendRangePill preset={rangePreset} endMonth={rangeEnd} currentMonth={currentMonth}
          onChange={(p, end) => { setRange(p, end); setSelectedDay(null); trackTxRangeChanged({ preset: p, months: rangeFor(p, end).months.length }); }} />
        {/* Import lives once, in the floating Add bar (Oct 2026 audit). */}
      </div>

      <div style={{ display: "grid", gap: 16, marginBottom: 20 }}>
        <SpendCard transactions={counted} range={range} today={today} toUSD={usd} fmt={fmtDisplay}
          expenseCats={expenseCatDisplay} incomeCats={incomeCatDisplay}
          selectedCategories={selectedCategories} onToggleCategory={toggleCategory}
          onClearFilters={() => { setSelectedCategories([]); setSelectedDay(null); }}
          selectedDay={selectedDay} onSelectDay={setSelectedDay}
          onZoomMonth={(m) => { setRange(1, m); setSelectedDay(null); }}
          palette={COLOR_PALETTE} onColor={handleCategoryColor}
          budgets={budgets} expectedIncome={expectedIncome} bills={bills} calendarItems={calendarItems} compact={n=>formatUSDInCurrency(n,displayCurrency,displayRates,{compact:true})} periodLabel={rangePreset === 1 && rangeEnd === currentMonth ? "This month" : rangeLabel(rangePreset, rangeEnd)} />
        <WorthALook flags={flags} notes={billNotes} rows={transactions} fmt={fmtDisplay} toUSD={usd} displayCurrency={displayCurrency}
          twins={twins} onDeleteCopies={deleteCopies}
          onYes={(r, k) => resolveFlag(r, k, true)} onNo={(r, k) => resolveFlag(r, k, false)} />
        {/* Money first: the chart opens the page, the review and bank rows follow (Oct 2026 audit). */}
        <ReviewPill filed={reviewCounts.filed} need={reviewCounts.need} busy={isClassifying}
          fmt={fmtDisplay} spentThisMonth={spentThisMonth}
          free={freeToSpend && range.months.includes(currentMonth) ? { amount: freeToSpend.free, untilIso: freeToSpend.payday.iso } : null}
          onReview={() => { trackTxReviewOpened({ needCount: reviewCounts.need, months: range.months.length }); handleAiClassify(); }}
          bank={bankStatus} banksOpen={banksOpen} onToggleBanks={() => setBanksOpen((v) => !v)} />
        <PlaidConnect onTransactionsImported={() => setRefreshKey((k) => k + 1)} onUpgradeClick={onUpgradeClick}
          collapsed={!banksOpen} onStatus={setBankStatus} />
      </div>

      <TransactionList
        transactions={listTxns}
        editingId={editingId}
        justAddedId={justAddedId}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onCategoryChange={handleCategoryChange}
        rates={rates}
        formatAmount={fmtDisplay}
        catCustomizations={catCustomizations}
        expenseCategories={allExpenseCats}
        categoryNeeds={categoryNeeds}
        uncounted={uncounted}
      />
      {/* Room for the floating Add bar, so the last row is never under it. */}
      <div aria-hidden style={{ height: 72 }} />

      <MobileBar
        onOpen={() => { setEditingId(null); setDraft({ ...EMPTY_DRAFT(), currency: defaultCurrency }); setDrawerOpen(true); }}
        onImport={() => setShowImport(true)}
      />
      <MobileDrawer open={drawerOpen} onClose={() => { setDrawerOpen(false); if (editingId) handleCancelEdit(); }}>
        <QuickAddForm
          draft={draft}
          setDraft={setDraft}
          onSave={handleSave}
          editing={!!editingId}
          onCancelEdit={handleCancelEdit}
          onDelete={() => { const tx = transactions.find((t) => t.id === editingId); if (tx) { setDrawerOpen(false); handleDelete(tx); } }}
          existingTags={existingTags}
          allExpenseCats={allExpenseCats}
          allSubCats={allSubCats}
          colorPalette={COLOR_PALETTE}
          emojiPalette={EMOJI_PALETTE}
          onAddCategory={handleAddCategory}
          onAddSubCategory={handleAddSubCategory}
          preferredCurrencies={preferredCurrencies}
          alwaysShop={alwaysShop}
          onAlwaysShop={setAlwaysShop}
          categoryNeeds={categoryNeeds}
        />
      </MobileDrawer>

      <Toast toast={toast} onUndo={handleUndo} />

      {pendingClassifications.length > 0 && (
        <AiReviewModal
          pending={pendingClassifications}
          onApprove={async (items) => {
            await applyClassifications(items);
            const ids = new Set(items.map((i) => i.tx.id));
            setPendingClassifications((prev) => prev.filter((p) => !ids.has(p.tx.id)));
          }}
          onApproveAll={async (resolved) => {
            await applyClassifications(resolved);
            showToast(`${resolved.length} expense${resolved.length !== 1 ? "s" : ""} filed`);
            setPendingClassifications([]);
          }}
          onSkip={(txIds) => setPendingClassifications((prev) => prev.filter((p) => !txIds.includes(p.tx.id)))}
          onUndo={async (items) => {
            // Put back what each payment had before it was approved.
            await Promise.all(items.map(({ tx }) =>
              supabase.from("expenses").update({ tags: tx.tags ?? [], category: tx.category, sub_category: tx.sub_category ?? null }).eq("id", tx.id)));
            const before = new Map(items.map(({ tx }) => [tx.id, tx]));
            setTransactions((prev) => prev.map((t) => {
              const b = before.get(t.id);
              return b ? { ...t, tags: b.tags, category: b.category, sub_category: b.sub_category } : t;
            }));
            setPendingClassifications((prev) => [...items, ...prev.filter((p) => !before.has(p.tx.id))]);
          }}
          onClose={() => setPendingClassifications([])}
          allExpenseCats={allExpenseCats}
          allSubCats={allSubCats}
        />
      )}

      {showImport && (
        <CsvImportModal
          onClose={() => setShowImport(false)}
          // Refresh behind the modal; it stays open on its Done screen.
          onImported={() => setRefreshKey((k) => k + 1)}
          defaultCurrency={defaultCurrency}
          preferredCurrencies={preferredCurrencies}
          rates={marketRates}
          formatAmount={fmtDisplay}
          displayCurrency={displayCurrency}
        />
      )}

    </>
  );
}
