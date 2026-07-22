"use client";

import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import { FALLBACK_RATES, formatUSDInCurrency } from "@/lib/currency";
import {
  EXPENSE_CATEGORIES,
  loadCatCustomizations, saveCatCustomizations,
  CatCustomizations, COLOR_PALETTE, EMOJI_PALETTE, resolveDisplay,
} from "@/lib/categories";
import { useCustomCategories } from "@/lib/useCustomCategories";

type ClassificationRule = {
  id: string;
  category: string;
  sub_category: string | null;
  classification: "need" | "want";
};

const toUSD = (amount: number, currency: string, rates: Record<string, number>): number => {
  if (!currency || currency === "USD") return amount;
  const rate = rates[currency];
  return rate ? amount / rate : amount;
};

// ─── Types ────────────────────────────────────────────────────────────────────
type Transaction = {
  id: string;
  date: string;
  amount: number;
  refund_amount: number;
  currency: string;
  category: string;
  sub_category: string | null;
  tags: string[];
  transaction_type: "expense" | "income";
};

const netAmt = (t: Transaction) => Math.max(0, t.amount - (t.refund_amount || 0));

type SubBreakdown = { name: string; total: number };
type TagBreakdown = { tag: string; total: number };
type CatBreakdown = {
  key: string; label: string; color: string; emoji: string; code: string;
  total: number; subBreakdown: SubBreakdown[]; tagBreakdown: TagBreakdown[];
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function groupBySubCat(txns: Transaction[], rates: Record<string, number>): SubBreakdown[] {
  const map: Record<string, number> = {};
  txns.forEach((t) => {
    const sc = t.sub_category || "Uncategorized";
    map[sc] = (map[sc] || 0) + toUSD(netAmt(t), t.currency, rates);
  });
  return Object.entries(map)
    .map(([name, total]) => ({ name, total }))
    .sort((a, b) => b.total - a.total);
}

type AnyCat = { key: string; label: string; code: string; color: string; emoji?: string };

function groupByCat(
  txns: Transaction[],
  rates: Record<string, number>,
  allCats: AnyCat[],
  customs: CatCustomizations,
): CatBreakdown[] {
  const map: Record<string, Transaction[]> = {};
  txns.forEach((t) => {
    if (!map[t.category]) map[t.category] = [];
    map[t.category].push(t);
  });
  return Object.entries(map).map(([key, catTxns]) => {
    const meta = allCats.find((c) => c.key === key);
    const base = { color: meta?.color ?? "#6b7280", emoji: meta?.emoji ?? "📦" };
    const { color, emoji } = resolveDisplay(base, customs, key);
    return {
      key,
      label: meta?.label || key,
      code: meta?.code || key.slice(0, 2).toUpperCase(),
      color,
      emoji,
      total: catTxns.reduce((s, t) => s + toUSD(netAmt(t), t.currency, rates), 0),
      subBreakdown: groupBySubCat(catTxns, rates),
      tagBreakdown: [],
    };
  }).sort((a, b) => b.total - a.total);
}

// ─── Chevron ──────────────────────────────────────────────────────────────────
function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      width="16" height="16" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      style={{ transform: open ? "rotate(90deg)" : "rotate(0deg)", transition: "transform 0.15s", color: "var(--uf-text-3)", flexShrink: 0 }}
    >
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}

// ─── Category Row ─────────────────────────────────────────────────────────────
function CategoryRow({
  cat,
  totalSpend,
  open,
  onToggle,
  formatAmount,
  isEditing,
  onEdit,
  onCloseEdit,
  setCatCustomizations,
  isCustom = false,
  onDelete,
  deleteConfirmKey,
  onRequestDelete,
  classificationRules,
  onSetRule,
  onCancelDelete,
  subCategories,
  onAddSubCategory,
  onDeleteSubCategory,
}: {
  cat: CatBreakdown;
  totalSpend: number;
  open: boolean;
  onToggle: () => void;
  formatAmount: (value: number) => string;
  isEditing: boolean;
  onEdit: () => void;
  onCloseEdit: () => void;
  setCatCustomizations: React.Dispatch<React.SetStateAction<CatCustomizations>>;
  isCustom?: boolean;
  onDelete?: (key: string) => void;
  deleteConfirmKey: string | null;
  onRequestDelete: (key: string) => void;
  onCancelDelete: () => void;
  subCategories: string[];
  onAddSubCategory: (sub: string) => void;
  onDeleteSubCategory: (sub: string) => void;
  classificationRules: ClassificationRule[];
  onSetRule: (category: string, sub_category: string, classification: "need" | "want" | null) => void;
}) {
  const pct = totalSpend > 0 ? (cat.total / totalSpend) * 100 : 0;
  const isDeleteConfirming = deleteConfirmKey === cat.key;
  const [newSubCat, setNewSubCat] = useState("");

  const handleAddSub = () => {
    const v = newSubCat.trim();
    if (!v || subCategories.includes(v)) return;
    onAddSubCategory(v);
    setNewSubCat("");
  };

  return (
    <div>
      {/* Row */}
      <div
        onClick={onToggle}
        style={{
          display: "grid", gridTemplateColumns: "36px 1fr 160px 80px 24px",
          gap: 12, alignItems: "center", padding: "14px 20px",
          borderTop: "1px solid var(--uf-border)", cursor: "pointer",
          background: open || isEditing ? "var(--uf-surface)" : "transparent",
        }}
        onMouseEnter={(e) => { if (!open && !isEditing) (e.currentTarget as HTMLElement).style.background = "var(--uf-surface)"; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = open || isEditing ? "var(--uf-surface)" : "transparent"; }}
      >
        <div style={{ width: 36, height: 36, borderRadius: "50%", background: cat.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>
          {cat.emoji}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: "var(--uf-text)" }}>{cat.label}</div>
            {cat.subBreakdown.length > 0 && (
              <div style={{ fontSize: 11.5, color: "var(--uf-text-3)", marginTop: 1 }}>{cat.subBreakdown.length} sub-categories</div>
            )}
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (isEditing) onCloseEdit();
              else onEdit();
            }}
            title="Customize"
            style={{ background: "none", border: "none", cursor: "pointer", padding: "2px 4px", color: isEditing ? "#059669" : "#CBD5E1", fontSize: 14, lineHeight: 1, flexShrink: 0 }}
          >
            ✏️
          </button>
        </div>
        {/* Bar */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ flex: 1, height: 6, background: "var(--uf-border)", borderRadius: 99, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${pct}%`, background: cat.color, borderRadius: 99 }} />
          </div>
          <span style={{ fontSize: 11, color: "var(--uf-text-2)", fontVariantNumeric: "tabular-nums", minWidth: 28, textAlign: "right" }}>{pct.toFixed(0)}%</span>
        </div>
        <div style={{ fontSize: 14, fontWeight: 700, color: "var(--uf-text)", textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{formatAmount(cat.total)}</div>
        <Chevron open={open} />
      </div>

      {/* Inline edit panel */}
      {isEditing && (
        <div style={{ background: "var(--uf-surface)", borderTop: "1px solid var(--uf-border)", padding: "14px 20px 14px 68px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: "#047857", textTransform: "uppercase", letterSpacing: "0.06em" }}>
              Customize {cat.label}
            </span>
            <button onClick={onCloseEdit} style={{ background: "none", border: "none", color: "var(--uf-text-3)", cursor: "pointer", fontSize: 16, lineHeight: 1 }}>✕</button>
          </div>

          {/* Color swatches */}
          <div style={{ fontSize: 11, color: "var(--uf-text-2)", fontWeight: 600, marginBottom: 6 }}>Color</div>
          <div style={{ display: "flex", gap: 6, marginBottom: 14, flexWrap: "wrap" }}>
            {COLOR_PALETTE.map(c => (
              <button
                key={c}
                onClick={() => setCatCustomizations(prev => ({ ...prev, [cat.key]: { ...prev[cat.key], color: c } }))}
                style={{
                  width: 26, height: 26, borderRadius: "50%", background: c, cursor: "pointer",
                  border: cat.color === c ? "2.5px solid var(--uf-text)" : "2.5px solid transparent",
                  outline: "none", boxShadow: cat.color === c ? "0 0 0 1px var(--uf-card) inset" : "none",
                }}
              />
            ))}
          </div>

          {/* Emoji grid */}
          <div style={{ fontSize: 11, color: "var(--uf-text-2)", fontWeight: 600, marginBottom: 6 }}>Emoji</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 14 }}>
            {EMOJI_PALETTE.map(em => (
              <button
                key={em}
                onClick={() => setCatCustomizations(prev => ({ ...prev, [cat.key]: { ...prev[cat.key], emoji: em } }))}
                style={{
                  width: 34, height: 34, background: cat.emoji === em ? "rgba(5,150,105,0.12)" : "transparent",
                  border: cat.emoji === em ? "1.5px solid #059669" : "1.5px solid var(--uf-border)",
                  borderRadius: 6, cursor: "pointer", fontSize: 18, lineHeight: 1,
                }}
              >
                {em}
              </button>
            ))}
          </div>

          {/* Sub-categories */}
          <div style={{ borderTop: "1px solid var(--uf-border)", paddingTop: 14, marginBottom: 4 }}>
            <div style={{ fontSize: 11, color: "var(--uf-text-2)", fontWeight: 600, marginBottom: 8 }}>Sub-categories</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
              {subCategories.length === 0 && (
                <span style={{ fontSize: 12, color: "var(--uf-text-3)" }}>None defined yet</span>
              )}
              {subCategories.map(sc => (
                <div key={sc} style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "var(--uf-card)", border: "1px solid var(--uf-border)", borderRadius: 999, padding: "3px 6px 3px 10px", fontSize: 12, color: "var(--uf-text-2)" }}>
                  {sc}
                  <button
                    onClick={() => onDeleteSubCategory(sc)}
                    style={{ background: "none", border: "none", cursor: "pointer", color: "var(--uf-text-3)", fontSize: 16, lineHeight: 1, padding: "0 2px", display: "flex", alignItems: "center" }}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <input
                type="text"
                placeholder="New sub-category"
                value={newSubCat}
                onChange={(e) => setNewSubCat(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleAddSub(); }}
                style={{ flex: 1, padding: "6px 10px", border: "1px solid var(--uf-border)", borderRadius: 7, fontSize: 13, color: "var(--uf-text)", background: "var(--uf-card)", outline: "none" }}
              />
              <button
                onClick={handleAddSub}
                disabled={!newSubCat.trim() || subCategories.includes(newSubCat.trim())}
                style={{ padding: "6px 14px", background: newSubCat.trim() && !subCategories.includes(newSubCat.trim()) ? "#064E3B" : "var(--uf-border)", color: newSubCat.trim() && !subCategories.includes(newSubCat.trim()) ? "#fff" : "var(--uf-text-3)", border: "none", borderRadius: 7, fontSize: 13, fontWeight: 600, cursor: "pointer" }}
              >
                Add
              </button>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 16, marginTop: 14, borderTop: "1px solid var(--uf-border)", paddingTop: 14 }}>
            {!isCustom && (
              <button
                onClick={() => setCatCustomizations(prev => { const n = { ...prev }; delete n[cat.key]; return n; })}
                style={{ fontSize: 12, color: "var(--uf-text-3)", background: "none", border: "none", cursor: "pointer", textDecoration: "underline", padding: 0 }}
              >
                Reset to default
              </button>
            )}
            {isCustom && onDelete && (
              <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-start" }}>
                <button
                  onClick={() => {
                    if (!isDeleteConfirming) {
                      onRequestDelete(cat.key);
                      return;
                    }
                    onDelete(cat.key);
                    onCloseEdit();
                    onCancelDelete();
                  }}
                  style={{ fontSize: 12, color: "#DC2626", background: "none", border: "none", cursor: "pointer", fontWeight: 700, padding: 0 }}
                >
                  {isDeleteConfirming ? "Confirm delete category" : "🗑 Delete category"}
                </button>
                {isDeleteConfirming && (
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontSize: 12, color: "#DC2626", fontWeight: 600 }}>
                      This removes the custom category from your list. Existing transactions keep their category key.
                    </span>
                    <button
                      onClick={onCancelDelete}
                      style={{ fontSize: 12, color: "var(--uf-text-2)", background: "none", border: "none", cursor: "pointer", textDecoration: "underline", padding: 0 }}
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Expanded sub-categories + tags */}
      {open && (
        <div style={{ background: "var(--uf-surface)", borderTop: "1px solid var(--uf-border)", padding: "12px 20px 16px 68px" }}>
          {cat.subBreakdown.length > 0 && (
            <>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "1px", textTransform: "uppercase", color: "var(--uf-text-3)", marginBottom: 10 }}>Sub-categories</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {cat.subBreakdown.map((sc) => {
                  const scPct = cat.total > 0 ? (sc.total / cat.total) * 100 : 0;
                  const rule = classificationRules.find(
                    (r) => r.category.toLowerCase() === cat.key.toLowerCase() &&
                           r.sub_category?.toLowerCase() === sc.name.toLowerCase()
                  );
                  const cycleRule = () => {
                    if (!rule) onSetRule(cat.key, sc.name, "need");
                    else if (rule.classification === "need") onSetRule(cat.key, sc.name, "want");
                    else onSetRule(cat.key, sc.name, null);
                  };
                  return (
                    <div key={sc.name} style={{ display: "grid", gridTemplateColumns: "140px 1fr 70px auto", gap: 10, alignItems: "center" }}>
                      <span style={{ fontSize: 13, color: "var(--uf-text-2)", fontWeight: 500 }}>{sc.name}</span>
                      <div style={{ height: 4, background: "var(--uf-border)", borderRadius: 99, overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${scPct}%`, background: cat.color, opacity: 0.65, borderRadius: 99 }} />
                      </div>
                      <span style={{ fontSize: 13, fontWeight: 600, color: "var(--uf-text)", textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{formatAmount(sc.total)}</span>
                      <button
                        onClick={cycleRule}
                        title={rule ? `Rule: always ${rule.classification} — click to change` : "Click to set a classification rule"}
                        style={{
                          fontSize: 10, fontWeight: 700, borderRadius: 999, padding: "2px 8px",
                          background: rule?.classification === "need" ? "rgba(34,211,165,0.15)" : rule?.classification === "want" ? "rgba(249,115,22,0.15)" : "var(--uf-surface-2)",
                          color: rule?.classification === "need" ? "#22d3a5" : rule?.classification === "want" ? "#f97316" : "var(--uf-text-3)",
                          border: rule ? `1px solid ${rule.classification === "need" ? "#22d3a5" : "#f97316"}` : "1px dashed var(--uf-border)",
                          cursor: "pointer", whiteSpace: "nowrap",
                        }}
                      >
                        {rule ? rule.classification : "+ rule"}
                      </button>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {cat.tagBreakdown.length > 0 && (
            <div style={{ marginTop: cat.subBreakdown.length > 0 ? 16 : 0 }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "1px", textTransform: "uppercase", color: "var(--uf-text-3)", marginBottom: 10 }}>Projects / Events</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {cat.tagBreakdown.map((tb) => (
                  <div key={tb.tag} style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "var(--uf-card)", border: "1px solid var(--uf-border)", borderRadius: 999, padding: "4px 12px", fontSize: 12, fontWeight: 600, color: "var(--uf-text-2)" }}>
                    <span style={{ color: "var(--uf-text-3)" }}>#</span>{tb.tag}
                    <span style={{ color: "var(--uf-text)" }}>{formatAmount(tb.total)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {cat.subBreakdown.length === 0 && cat.tagBreakdown.length === 0 && (
            <div style={{ fontSize: 13, color: "var(--uf-text-3)" }}>No breakdown available. Add tags or sub-categories when logging expenses.</div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Project Row ──────────────────────────────────────────────────────────────
function ProjectRow({
  tag,
  total,
  catBreakdown,
  open,
  onToggle,
  formatAmount,
}: {
  tag: string;
  total: number;
  catBreakdown: CatBreakdown[];
  open: boolean;
  onToggle: () => void;
  formatAmount: (value: number) => string;
}) {
  return (
    <div>
      <div
        onClick={onToggle}
        style={{
          display: "grid", gridTemplateColumns: "1fr 80px 24px",
          gap: 12, alignItems: "center", padding: "14px 20px",
          borderTop: "1px solid var(--uf-border)", cursor: "pointer",
          background: open ? "var(--uf-surface)" : "transparent",
        }}
        onMouseEnter={(e) => { if (!open) (e.currentTarget as HTMLElement).style.background = "var(--uf-surface)"; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = open ? "var(--uf-surface)" : "transparent"; }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 14, color: "var(--uf-text-3)", fontWeight: 600 }}>#</span>
          <span style={{ fontSize: 14, fontWeight: 700, color: "var(--uf-text)" }}>{tag}</span>
          <span style={{ fontSize: 12, color: "var(--uf-text-3)" }}>{catBreakdown.length} categories</span>
        </div>
        <div style={{ fontSize: 14, fontWeight: 700, color: "var(--uf-text)", textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{formatAmount(total)}</div>
        <Chevron open={open} />
      </div>

      {open && (
        <div style={{ background: "var(--uf-surface)", borderTop: "1px solid var(--uf-border)", padding: "12px 20px 16px 36px" }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "1px", textTransform: "uppercase", color: "var(--uf-text-3)", marginBottom: 10 }}>By Category</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {catBreakdown.map((cat) => (
              <div key={cat.key}>
                <div style={{ display: "grid", gridTemplateColumns: "24px 120px 1fr 70px", gap: 10, alignItems: "center", marginBottom: cat.subBreakdown.length > 0 ? 6 : 0 }}>
                  <div style={{ width: 20, height: 20, borderRadius: "50%", background: cat.color, flexShrink: 0 }} />
                  <span style={{ fontSize: 13, fontWeight: 600, color: "var(--uf-text)" }}>{cat.label}</span>
                  <div style={{ height: 4, background: "var(--uf-border)", borderRadius: 99, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${total > 0 ? (cat.total / total) * 100 : 0}%`, background: cat.color, opacity: 0.7, borderRadius: 99 }} />
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "var(--uf-text)", textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{formatAmount(cat.total)}</span>
                </div>
                {cat.subBreakdown.length > 0 && (
                  <div style={{ paddingLeft: 34, display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 4 }}>
                    {cat.subBreakdown.map((sc) => (
                      <span key={sc.name} style={{ fontSize: 11.5, color: "var(--uf-text-2)", background: "var(--uf-card)", border: "1px solid var(--uf-border)", borderRadius: 4, padding: "2px 8px" }}>
                        {sc.name}: {formatAmount(sc.total)}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────
export default function CategoriesTab({ displayCurrency = "USD", displayRates = FALLBACK_RATES }: {
  displayCurrency?: string;
  displayRates?: Record<string, number>;
}) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [rates, setRates] = useState<Record<string, number>>(FALLBACK_RATES);
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const [viewMonth, setViewMonth] = useState(currentMonth);
  const [expandedCat, setExpandedCat] = useState<string | null>(null);
  const [expandedProject, setExpandedProject] = useState<string | null>(null);
  const [editingCat, setEditingCat] = useState<string | null>(null);
  const [deleteConfirmKey, setDeleteConfirmKey] = useState<string | null>(null);
  const [catCustomizations, setCatCustomizations] = useState<CatCustomizations>(loadCatCustomizations);
  const [classificationRules, setClassificationRules] = useState<ClassificationRule[]>([]);
  const [mismatchPrompt, setMismatchPrompt] = useState<{
    category: string; sub_category: string; classification: "need" | "want"; mismatched: Transaction[];
  } | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) return;
      supabase.from("classification_rules")
        .select("id, category, sub_category, classification")
        .eq("user_id", session.user.id)
        .then(({ data }) => { if (data) setClassificationRules(data as ClassificationRule[]); });
    });
  }, []);

  const handleSetRule = async (category: string, sub_category: string, classification: "need" | "want" | null) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    if (classification === null) {
      await supabase.from("classification_rules")
        .delete()
        .eq("user_id", session.user.id)
        .eq("category", category)
        .eq("sub_category", sub_category);
      setClassificationRules((prev) => prev.filter((r) => !(r.category === category && r.sub_category === sub_category)));
    } else {
      const { data } = await supabase.from("classification_rules").upsert(
        { user_id: session.user.id, category, sub_category, classification },
        { onConflict: "user_id,category,sub_category" }
      ).select("id, category, sub_category, classification").single();
      if (data) {
        setClassificationRules((prev) => {
          const filtered = prev.filter((r) => !(r.category === category && r.sub_category === sub_category));
          return [...filtered, data as ClassificationRule];
        });
        // Query fresh from DB so we catch transactions added since this tab mounted
        const opposite = classification === "need" ? "want" : "need";
        const { data: freshData } = await supabase
          .from("expenses")
          .select("id, tags, category, sub_category, transaction_type, date, amount, refund_amount, currency")
          .eq("user_id", session.user.id)
          .eq("transaction_type", "expense")
          .ilike("category", category)
          .ilike("sub_category", sub_category);
        const mismatched = (freshData || []).filter((t) =>
          !t.tags?.includes(classification) || t.tags?.includes(opposite)
        ) as Transaction[];
        if (mismatched.length > 0) {
          setMismatchPrompt({ category, sub_category, classification, mismatched });
        }
      }
    }
  };

  const handleApplyMismatch = async () => {
    if (!mismatchPrompt) return;
    const { classification, mismatched } = mismatchPrompt;
    const updates = mismatched.map((t) => ({
      id: t.id,
      tags: [...(t.tags || []).filter((tag) => tag !== "need" && tag !== "want"), classification],
    }));
    for (let i = 0; i < updates.length; i += 20) {
      await Promise.all(
        updates.slice(i, i + 20).map((u) => supabase.from("expenses").update({ tags: u.tags }).eq("id", u.id))
      );
    }
    const updateMap = new Map(updates.map((u) => [u.id, u]));
    setTransactions((prev) => prev.map((t) => {
      const u = updateMap.get(t.id);
      return u ? { ...t, tags: u.tags } : t;
    }));
    setMismatchPrompt(null);
  };
  const fmtDisplay = (n: number) => formatUSDInCurrency(n, displayCurrency, displayRates);

  useEffect(() => { saveCatCustomizations(catCustomizations); }, [catCustomizations]);

  // Merge built-in categories with any user-defined ones (single shared source, synced everywhere)
  const { customCats, setCustomCats, customSubCats, setCustomSubCats } = useCustomCategories();
  const allExpenseCats = useMemo(() => [...EXPENSE_CATEGORIES, ...customCats], [customCats]);

  const handleAddSubCategory = (catKey: string, sub: string) => {
    setCustomSubCats((prev) => ({ ...prev, [catKey]: [...(prev[catKey] || []), sub] }));
  };

  const handleDeleteSubCategory = (catKey: string, sub: string) => {
    setCustomSubCats((prev) => ({ ...prev, [catKey]: (prev[catKey] || []).filter((s) => s !== sub) }));
  };

  // ── Category manager state ──────────────────────────────────────────────────
  const [showAddForm, setShowAddForm] = useState(false);
  const [newCatLabel, setNewCatLabel] = useState("");
  const [newCatColor, setNewCatColor] = useState(COLOR_PALETTE[0]);
  const [newCatEmoji, setNewCatEmoji] = useState("");

  const handleDeleteCustomCat = (key: string) => {
    setCustomCats((prev) => prev.filter((c) => c.key !== key));
    setDeleteConfirmKey(null);
  };

  const handleAddCustomCat = () => {
    const label = newCatLabel.trim();
    if (!label) return;
    const key = label.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
    if (allExpenseCats.some((c) => c.key === key)) return;
    const code = label.replace(/[^a-zA-Z]/g, "").slice(0, 2).toUpperCase() || "CU";
    const cat = { key, label, code, color: newCatColor, ...(newCatEmoji ? { emoji: newCatEmoji } : {}) };
    setCustomCats((prev) => [...prev, cat]);
    setNewCatLabel(""); setNewCatColor(COLOR_PALETTE[0]); setNewCatEmoji("");
    setShowAddForm(false);
  };

  useEffect(() => {
    fetch("https://api.frankfurter.app/latest?from=USD")
      .then((r) => r.json())
      .then((d) => { if (d.rates) setRates(d.rates); })
      .catch(() => {});

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) return;
      supabase
        .from("expenses")
        .select("id, date, amount, refund_amount, currency, category, sub_category, tags, transaction_type")
        .eq("user_id", session.user.id)
        .order("date", { ascending: false })
        .then(({ data }) => {
          if (data) setTransactions(data as Transaction[]);
          setLoading(false);
        });
    });
  }, []);

  const [y, m] = viewMonth.split("-").map(Number);
  const monthLabel = new Date(y, m - 1, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" });
  const isCurrentMonth = viewMonth === currentMonth;

  const expTxns = useMemo(
    () => transactions.filter((t) => t.date.startsWith(viewMonth) && t.transaction_type === "expense"),
    [transactions, viewMonth]
  );

  const totalSpend = useMemo(
    () => expTxns.reduce((s, t) => s + toUSD(netAmt(t), t.currency, rates), 0),
    [expTxns, rates]
  );

  const primaryGroups = useMemo(() => {
    return allExpenseCats
      .map((cat) => {
        const catTxns = expTxns.filter((t) => t.category === cat.key);
        const total = catTxns.reduce((s, t) => s + toUSD(netAmt(t), t.currency, rates), 0);
        const subBreakdown = groupBySubCat(catTxns, rates);
        const tagMap: Record<string, number> = {};
        catTxns.forEach((t) => {
          (t.tags || []).forEach((tag) => {
            tagMap[tag] = (tagMap[tag] || 0) + toUSD(netAmt(t), t.currency, rates);
          });
        });
        const tagBreakdown: TagBreakdown[] = Object.entries(tagMap)
          .map(([tag, ttl]) => ({ tag, total: ttl }))
          .sort((a, b) => b.total - a.total);
        const base = { color: cat.color, emoji: (cat as { emoji?: string }).emoji ?? "📦" };
        const { color, emoji } = resolveDisplay(base, catCustomizations, cat.key);
        return { key: cat.key, label: cat.label, code: cat.code, color, emoji, total, subBreakdown, tagBreakdown };
      })
      .sort((a, b) => b.total - a.total || a.label.localeCompare(b.label));
  }, [expTxns, rates, allExpenseCats, catCustomizations]);

  const projectGroups = useMemo(() => {
    const tagMap: Record<string, Transaction[]> = {};
    expTxns.forEach((t) => {
      (t.tags || []).forEach((tag) => {
        if (!tagMap[tag]) tagMap[tag] = [];
        tagMap[tag].push(t);
      });
    });
    return Object.entries(tagMap)
      .map(([tag, txns]) => ({
        tag,
        total: txns.reduce((s, t) => s + toUSD(netAmt(t), t.currency, rates), 0),
        catBreakdown: groupByCat(txns, rates, allExpenseCats, catCustomizations),
      }))
      .sort((a, b) => b.total - a.total);
  }, [expTxns, rates, allExpenseCats, catCustomizations]);

  const handlePrevMonth = () => {
    const [py, pm] = viewMonth.split("-").map(Number);
    const d = new Date(py, pm - 2, 1);
    setViewMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
    setExpandedCat(null); setEditingCat(null); setDeleteConfirmKey(null); setExpandedProject(null);
  };

  const handleNextMonth = () => {
    const [py, pm] = viewMonth.split("-").map(Number);
    const d = new Date(py, pm, 1);
    const next = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    if (next <= currentMonth) {
      setViewMonth(next);
      setExpandedCat(null); setEditingCat(null); setDeleteConfirmKey(null); setExpandedProject(null);
    }
  };

  if (loading) {
    return <div style={{ textAlign: "center", padding: "60px 0", color: "var(--uf-text-3)" }}>Loading…</div>;
  }

  return (
    <div>
      {/* Mismatch prompt */}
      {mismatchPrompt && (
        <>
          <div onClick={() => setMismatchPrompt(null)} style={{ position: "fixed", inset: 0, background: "rgba(8,8,14,0.6)", zIndex: 50 }} />
          <div style={{
            position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)",
            background: "var(--uf-card)", border: "1px solid var(--uf-border)", borderRadius: 14,
            zIndex: 51, width: "min(420px, 92vw)", padding: "20px 24px",
            boxShadow: "0 8px 40px rgba(0,0,0,0.4)",
          }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: "var(--uf-text)", marginBottom: 6 }}>
              Rule mismatch detected
            </div>
            <div style={{ fontSize: 13, color: "var(--uf-text-2)", lineHeight: 1.5, marginBottom: 18 }}>
              <strong>{mismatchPrompt.mismatched.length}</strong> existing{" "}
              <strong style={{ textTransform: "capitalize" }}>{mismatchPrompt.sub_category}</strong>{" "}
              transaction{mismatchPrompt.mismatched.length !== 1 ? "s are" : " is"} not tagged as{" "}
              <strong style={{ color: mismatchPrompt.classification === "need" ? "#22d3a5" : "#f97316" }}>
                {mismatchPrompt.classification}
              </strong>. Update them to match the rule?
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={handleApplyMismatch}
                style={{ background: "#047857", color: "#fff", border: "none", borderRadius: 7, padding: "8px 16px", fontSize: 12, fontWeight: 700, cursor: "pointer", flex: 1 }}
              >
                Update {mismatchPrompt.mismatched.length} transaction{mismatchPrompt.mismatched.length !== 1 ? "s" : ""}
              </button>
              <button
                onClick={() => setMismatchPrompt(null)}
                style={{ background: "none", color: "var(--uf-text-2)", border: "1px solid var(--uf-border)", borderRadius: 7, padding: "8px 16px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}
              >
                Ignore
              </button>
            </div>
          </div>
        </>
      )}

      {/* Month nav */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 22, color: "var(--uf-text)", letterSpacing: "-0.4px" }}>{monthLabel}</div>
          {totalSpend > 0 && <div style={{ fontSize: 13, color: "var(--uf-text-2)", marginTop: 2 }}>Total spend: <strong>{fmtDisplay(totalSpend)}</strong></div>}
        </div>
        <div style={{ display: "flex", alignItems: "center", background: "var(--uf-card)", border: "1px solid var(--uf-border)", borderRadius: 8, overflow: "hidden", boxShadow: "0 1px 2px rgba(0,0,0,0.04)" }}>
          <button onClick={handlePrevMonth} style={{ background: "transparent", border: "none", padding: "9px 12px", color: "var(--uf-text-2)", cursor: "pointer", display: "flex", alignItems: "center" }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="m14 6-6 6 6 6" /></svg>
          </button>
          <div style={{ padding: "0 8px", fontSize: 14, fontWeight: 700, color: "var(--uf-text)", minWidth: 130, textAlign: "center", letterSpacing: "-0.2px" }}>{monthLabel}</div>
          <button onClick={handleNextMonth} disabled={isCurrentMonth} style={{ background: "transparent", border: "none", padding: "9px 12px", color: isCurrentMonth ? "var(--uf-text-3)" : "var(--uf-text-2)", cursor: isCurrentMonth ? "not-allowed" : "pointer", display: "flex", alignItems: "center" }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="m10 6 6 6-6 6" /></svg>
          </button>
        </div>
      </div>

      {totalSpend === 0 && (
        <div style={{ background: "var(--uf-surface)", border: "1px solid var(--uf-border)", borderRadius: 12, padding: "18px 20px", marginBottom: 16, color: "var(--uf-text-2)" }}>
          <div style={{ fontWeight: 700, fontSize: 15, color: "var(--uf-text)", marginBottom: 4 }}>No expenses this month</div>
          <div style={{ fontSize: 13 }}>Your full category list is still shown below so you can review, customize, or delete custom categories.</div>
        </div>
      )}

      {/* All Categories */}
      <div style={{ background: "var(--uf-card)", border: "1px solid var(--uf-border)", borderRadius: 12, overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.04)", marginBottom: 24 }}>
        <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--uf-border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 15, fontWeight: 700, color: "var(--uf-text)" }}>All Categories</span>
            <span style={{ fontSize: 12, color: "var(--uf-text-3)", fontWeight: 600 }}>{primaryGroups.length}</span>
          </div>
          <button
            onClick={() => setShowAddForm((v) => !v)}
            style={{ display: "flex", alignItems: "center", gap: 5, background: showAddForm ? "var(--uf-surface-2)" : "#064E3B", color: showAddForm ? "var(--uf-text-2)" : "#fff", border: "none", borderRadius: 7, padding: "6px 12px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
          >
            {showAddForm ? "✕ Cancel" : "+ Add"}
          </button>
        </div>

        {/* Add form */}
        {showAddForm && (
          <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--uf-border)", background: "var(--uf-surface)" }}>
            <div style={{ marginBottom: 10 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: "var(--uf-text-2)", display: "block", marginBottom: 4 }}>Category name</label>
              <input
                type="text"
                autoFocus
                placeholder="e.g. Hobbies"
                value={newCatLabel}
                onChange={(e) => setNewCatLabel(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleAddCustomCat(); if (e.key === "Escape") setShowAddForm(false); }}
                style={{ width: "100%", padding: "8px 10px", border: "1px solid var(--uf-border)", borderRadius: 7, fontSize: 14, color: "var(--uf-text)", background: "var(--uf-card)", outline: "none", boxSizing: "border-box" }}
              />
            </div>
            <div style={{ marginBottom: 10 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: "var(--uf-text-2)", display: "block", marginBottom: 6 }}>Color</label>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {COLOR_PALETTE.map((c) => (
                  <button key={c} onClick={() => setNewCatColor(c)} style={{ width: 24, height: 24, borderRadius: "50%", background: c, border: newCatColor === c ? "2px solid var(--uf-text)" : "2px solid transparent", cursor: "pointer", outline: newCatColor === c ? "2px solid var(--uf-card)" : "none", outlineOffset: "-3px" }} />
                ))}
              </div>
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: "var(--uf-text-2)", display: "block", marginBottom: 6 }}>Emoji <span style={{ fontWeight: 400, color: "var(--uf-text-3)" }}>(optional)</span></label>
              <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                {EMOJI_PALETTE.map((em) => (
                  <button key={em} onClick={() => setNewCatEmoji(newCatEmoji === em ? "" : em)} style={{ width: 30, height: 30, borderRadius: 6, border: newCatEmoji === em ? "2px solid #064E3B" : "1px solid var(--uf-border)", background: newCatEmoji === em ? "rgba(5,150,105,0.1)" : "transparent", fontSize: 15, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {em}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={handleAddCustomCat}
                disabled={!newCatLabel.trim()}
                style={{ flex: 1, padding: "8px 0", background: newCatLabel.trim() ? "#064E3B" : "var(--uf-border)", color: newCatLabel.trim() ? "#fff" : "var(--uf-text-3)", border: "none", borderRadius: 7, fontSize: 14, fontWeight: 600, cursor: newCatLabel.trim() ? "pointer" : "not-allowed" }}
              >
                Add Category
              </button>
              <button onClick={() => setShowAddForm(false)} style={{ padding: "8px 16px", background: "transparent", color: "var(--uf-text-2)", border: "1px solid var(--uf-border)", borderRadius: 7, fontSize: 14, cursor: "pointer" }}>
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Column headers */}
        <div style={{ display: "grid", gridTemplateColumns: "36px 1fr 160px 80px 24px", gap: 12, padding: "8px 20px 4px", borderBottom: "1px solid var(--uf-border)" }}>
          <div />
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.8px", textTransform: "uppercase", color: "var(--uf-text-3)" }}>Category</div>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.8px", textTransform: "uppercase", color: "var(--uf-text-3)" }}>Share</div>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.8px", textTransform: "uppercase", color: "var(--uf-text-3)", textAlign: "right" }}>Total</div>
          <div />
        </div>
        {primaryGroups.map((cat) => (
          <CategoryRow
            key={cat.key}
            cat={cat}
            totalSpend={totalSpend}
            open={expandedCat === cat.key}
            onToggle={() => setExpandedCat(expandedCat === cat.key ? null : cat.key)}
            formatAmount={fmtDisplay}
            isEditing={editingCat === cat.key}
            onEdit={() => { setEditingCat(cat.key); setDeleteConfirmKey(null); }}
            onCloseEdit={() => { setEditingCat(null); setDeleteConfirmKey(null); }}
            setCatCustomizations={setCatCustomizations}
            isCustom={customCats.some((c) => c.key === cat.key)}
            onDelete={handleDeleteCustomCat}
            deleteConfirmKey={deleteConfirmKey}
            onRequestDelete={setDeleteConfirmKey}
            onCancelDelete={() => setDeleteConfirmKey(null)}
            subCategories={customSubCats[cat.key] || []}
            onAddSubCategory={(sub) => handleAddSubCategory(cat.key, sub)}
            onDeleteSubCategory={(sub) => handleDeleteSubCategory(cat.key, sub)}
            classificationRules={classificationRules}
            onSetRule={handleSetRule}
          />
        ))}
      </div>

      {/* By Project / Event */}
      {projectGroups.length > 0 && (
        <div style={{ background: "var(--uf-card)", border: "1px solid var(--uf-border)", borderRadius: 12, overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
          <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--uf-border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: 15, fontWeight: 700, color: "var(--uf-text)" }}>By Project / Event</span>
            <span style={{ fontSize: 12, color: "var(--uf-text-3)", fontWeight: 600 }}>{projectGroups.length} projects</span>
          </div>
          <div style={{ padding: "8px 20px 4px", borderBottom: "1px solid var(--uf-border)", display: "grid", gridTemplateColumns: "1fr 80px 24px", gap: 12 }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.8px", textTransform: "uppercase", color: "var(--uf-text-3)" }}>Tag</div>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.8px", textTransform: "uppercase", color: "var(--uf-text-3)", textAlign: "right" }}>Total</div>
            <div />
          </div>
          {projectGroups.map((proj) => (
            <ProjectRow
              key={proj.tag}
              tag={proj.tag}
              total={proj.total}
              catBreakdown={proj.catBreakdown}
              open={expandedProject === proj.tag}
              onToggle={() => setExpandedProject(expandedProject === proj.tag ? null : proj.tag)}
              formatAmount={fmtDisplay}
            />
          ))}
        </div>
      )}
    </div>
  );
}
