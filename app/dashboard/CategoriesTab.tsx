"use client";

import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import { FALLBACK_RATES, formatUSDInCurrency } from "@/lib/currency";
import {
  EXPENSE_CATEGORIES,
  loadCatCustomizations, saveCatCustomizations,
  CatCustomizations, COLOR_PALETTE, EMOJI_PALETTE, resolveDisplay,
} from "@/lib/categories";

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
  currency: string;
  category: string;
  sub_category: string | null;
  tags: string[];
  transaction_type: "expense" | "income";
};

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
    map[sc] = (map[sc] || 0) + toUSD(t.amount, t.currency, rates);
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
      total: catTxns.reduce((s, t) => s + toUSD(t.amount, t.currency, rates), 0),
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
      style={{ transform: open ? "rotate(90deg)" : "rotate(0deg)", transition: "transform 0.15s", color: "#94A3B8", flexShrink: 0 }}
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
  onCancelDelete,
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
}) {
  const pct = totalSpend > 0 ? (cat.total / totalSpend) * 100 : 0;
  const isDeleteConfirming = deleteConfirmKey === cat.key;

  return (
    <div>
      {/* Row */}
      <div
        onClick={onToggle}
        style={{
          display: "grid", gridTemplateColumns: "36px 1fr 160px 80px 24px",
          gap: 12, alignItems: "center", padding: "14px 20px",
          borderTop: "1px solid #F1F5F9", cursor: "pointer",
          background: open || isEditing ? "#F8FAFC" : "transparent",
        }}
        onMouseEnter={(e) => { if (!open && !isEditing) (e.currentTarget as HTMLElement).style.background = "#F8FAFC"; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = open || isEditing ? "#F8FAFC" : "transparent"; }}
      >
        <div style={{ width: 36, height: 36, borderRadius: "50%", background: cat.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>
          {cat.emoji}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: "#19181E" }}>{cat.label}</div>
            <div style={{ fontSize: 11.5, color: "#94A3B8", marginTop: 1 }}>{cat.subBreakdown.length > 0 ? `${cat.subBreakdown.length} sub-categories` : "No sub-categories"}</div>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (isEditing) onCloseEdit();
              else onEdit();
            }}
            title="Customize color & emoji"
            style={{ background: "none", border: "none", cursor: "pointer", padding: "2px 4px", color: isEditing ? "#059669" : "#CBD5E1", fontSize: 14, lineHeight: 1, flexShrink: 0 }}
          >
            ✏️
          </button>
        </div>
        {/* Bar */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ flex: 1, height: 6, background: "#E2E8F0", borderRadius: 99, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${pct}%`, background: cat.color, borderRadius: 99 }} />
          </div>
          <span style={{ fontSize: 11, color: "#64748B", fontVariantNumeric: "tabular-nums", minWidth: 28, textAlign: "right" }}>{pct.toFixed(0)}%</span>
        </div>
        <div style={{ fontSize: 14, fontWeight: 700, color: "#19181E", textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{formatAmount(cat.total)}</div>
        <Chevron open={open} />
      </div>

      {/* Inline edit panel */}
      {isEditing && (
        <div style={{ background: "#F0FDF4", borderTop: "1px solid #BBF7D0", padding: "14px 20px 14px 68px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: "#047857", textTransform: "uppercase", letterSpacing: "0.06em" }}>
              Customize {cat.label}
            </span>
            <button onClick={onCloseEdit} style={{ background: "none", border: "none", color: "#94A3B8", cursor: "pointer", fontSize: 16, lineHeight: 1 }}>✕</button>
          </div>

          {/* Color swatches */}
          <div style={{ fontSize: 11, color: "#64748B", fontWeight: 600, marginBottom: 6 }}>Color</div>
          <div style={{ display: "flex", gap: 6, marginBottom: 14, flexWrap: "wrap" }}>
            {COLOR_PALETTE.map(c => (
              <button
                key={c}
                onClick={() => setCatCustomizations(prev => ({ ...prev, [cat.key]: { ...prev[cat.key], color: c } }))}
                style={{
                  width: 26, height: 26, borderRadius: "50%", background: c, cursor: "pointer",
                  border: cat.color === c ? "2.5px solid #0F172A" : "2.5px solid transparent",
                  outline: "none", boxShadow: cat.color === c ? "0 0 0 1px #fff inset" : "none",
                }}
              />
            ))}
          </div>

          {/* Emoji grid */}
          <div style={{ fontSize: 11, color: "#64748B", fontWeight: 600, marginBottom: 6 }}>Emoji</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 12 }}>
            {EMOJI_PALETTE.map(em => (
              <button
                key={em}
                onClick={() => setCatCustomizations(prev => ({ ...prev, [cat.key]: { ...prev[cat.key], emoji: em } }))}
                style={{
                  width: 34, height: 34, background: cat.emoji === em ? "#DCFCE7" : "transparent",
                  border: cat.emoji === em ? "1.5px solid #059669" : "1.5px solid #E2E8F0",
                  borderRadius: 6, cursor: "pointer", fontSize: 18, lineHeight: 1,
                }}
              >
                {em}
              </button>
            ))}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 16, marginTop: 4 }}>
            {!isCustom && (
              <button
                onClick={() => setCatCustomizations(prev => { const n = { ...prev }; delete n[cat.key]; return n; })}
                style={{ fontSize: 12, color: "#94A3B8", background: "none", border: "none", cursor: "pointer", textDecoration: "underline", padding: 0 }}
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
                      style={{ fontSize: 12, color: "#64748B", background: "none", border: "none", cursor: "pointer", textDecoration: "underline", padding: 0 }}
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
        <div style={{ background: "#F8FAFC", borderTop: "1px solid #F1F5F9", padding: "12px 20px 16px 68px" }}>
          {cat.subBreakdown.length > 0 && (
            <>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "1px", textTransform: "uppercase", color: "#94A3B8", marginBottom: 10 }}>Sub-categories</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {cat.subBreakdown.map((sc) => {
                  const scPct = cat.total > 0 ? (sc.total / cat.total) * 100 : 0;
                  return (
                    <div key={sc.name} style={{ display: "grid", gridTemplateColumns: "140px 1fr 70px", gap: 10, alignItems: "center" }}>
                      <span style={{ fontSize: 13, color: "#64748B", fontWeight: 500 }}>{sc.name}</span>
                      <div style={{ height: 4, background: "#E2E8F0", borderRadius: 99, overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${scPct}%`, background: cat.color, opacity: 0.65, borderRadius: 99 }} />
                      </div>
                      <span style={{ fontSize: 13, fontWeight: 600, color: "#19181E", textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{formatAmount(sc.total)}</span>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {cat.tagBreakdown.length > 0 && (
            <div style={{ marginTop: cat.subBreakdown.length > 0 ? 16 : 0 }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "1px", textTransform: "uppercase", color: "#94A3B8", marginBottom: 10 }}>Projects / Events</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {cat.tagBreakdown.map((tb) => (
                  <div key={tb.tag} style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "#fff", border: "1px solid #E2E8F0", borderRadius: 999, padding: "4px 12px", fontSize: 12, fontWeight: 600, color: "#64748B" }}>
                    <span style={{ color: "#94A3B8" }}>#</span>{tb.tag}
                    <span style={{ color: "#19181E" }}>{formatAmount(tb.total)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {cat.subBreakdown.length === 0 && cat.tagBreakdown.length === 0 && (
            <div style={{ fontSize: 13, color: "#94A3B8" }}>No breakdown available. Add tags or sub-categories when logging expenses.</div>
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
          borderTop: "1px solid #F1F5F9", cursor: "pointer",
          background: open ? "#F8FAFC" : "transparent",
        }}
        onMouseEnter={(e) => { if (!open) (e.currentTarget as HTMLElement).style.background = "#F8FAFC"; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = open ? "#F8FAFC" : "transparent"; }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 14, color: "#94A3B8", fontWeight: 600 }}>#</span>
          <span style={{ fontSize: 14, fontWeight: 700, color: "#19181E" }}>{tag}</span>
          <span style={{ fontSize: 12, color: "#94A3B8" }}>{catBreakdown.length} categories</span>
        </div>
        <div style={{ fontSize: 14, fontWeight: 700, color: "#19181E", textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{formatAmount(total)}</div>
        <Chevron open={open} />
      </div>

      {open && (
        <div style={{ background: "#F8FAFC", borderTop: "1px solid #F1F5F9", padding: "12px 20px 16px 36px" }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "1px", textTransform: "uppercase", color: "#94A3B8", marginBottom: 10 }}>By Category</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {catBreakdown.map((cat) => (
              <div key={cat.key}>
                <div style={{ display: "grid", gridTemplateColumns: "24px 120px 1fr 70px", gap: 10, alignItems: "center", marginBottom: cat.subBreakdown.length > 0 ? 6 : 0 }}>
                  <div style={{ width: 20, height: 20, borderRadius: "50%", background: cat.color, flexShrink: 0 }} />
                  <span style={{ fontSize: 13, fontWeight: 600, color: "#19181E" }}>{cat.label}</span>
                  <div style={{ height: 4, background: "#E2E8F0", borderRadius: 99, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${total > 0 ? (cat.total / total) * 100 : 0}%`, background: cat.color, opacity: 0.7, borderRadius: 99 }} />
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "#19181E", textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{formatAmount(cat.total)}</span>
                </div>
                {cat.subBreakdown.length > 0 && (
                  <div style={{ paddingLeft: 34, display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 4 }}>
                    {cat.subBreakdown.map((sc) => (
                      <span key={sc.name} style={{ fontSize: 11.5, color: "#64748B", background: "#fff", border: "1px solid #E2E8F0", borderRadius: 4, padding: "2px 8px" }}>
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
  const fmtDisplay = (n: number) => formatUSDInCurrency(n, displayCurrency, displayRates);

  useEffect(() => { saveCatCustomizations(catCustomizations); }, [catCustomizations]);

  // Merge built-in categories with any user-defined ones — seeded from localStorage, synced from Supabase
  const [customCats, setCustomCats] = useState<{ key: string; label: string; code: string; color: string; emoji?: string }[]>(() => {
    try { return JSON.parse(localStorage.getItem("uf_custom_cats") || "[]"); } catch { return []; }
  });
  const allExpenseCats = useMemo(() => [...EXPENSE_CATEGORIES, ...customCats], [customCats]);

  // ── Category manager state ──────────────────────────────────────────────────
  const [manageCatKey, setManageCatKey] = useState<string | null>(null);
  const [showAddForm, setShowAddForm]   = useState(false);
  const [newCatLabel, setNewCatLabel]   = useState("");
  const [newCatColor, setNewCatColor]   = useState(COLOR_PALETTE[0]);
  const [newCatEmoji, setNewCatEmoji]   = useState("");
  const [editLabel, setEditLabel]       = useState("");
  const [editColor, setEditColor]       = useState(COLOR_PALETTE[0]);
  const [editEmoji, setEditEmoji]       = useState("");

  const handleDeleteCustomCat = (key: string) => {
    const updated = customCats.filter((c) => c.key !== key);
    setCustomCats(updated);
    setDeleteConfirmKey(null);
    localStorage.setItem("uf_custom_cats", JSON.stringify(updated));
    // Sync deletion to Supabase
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) return;
      supabase.from("user_budget").select("expenses").eq("user_id", session.user.id).maybeSingle()
        .then(({ data }) => {
          const cur = (data?.expenses as Record<string, unknown>) || {};
          supabase.from("user_budget").upsert({
            user_id: session.user.id,
            expenses: { ...cur, _custom_cats: updated },
            updated_at: new Date().toISOString(),
          }, { onConflict: "user_id" });
        });
    });
  };

  const syncCustomCats = (updated: typeof customCats) => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) return;
      supabase.from("user_budget").select("expenses").eq("user_id", session.user.id).maybeSingle()
        .then(({ data }) => {
          const cur = (data?.expenses as Record<string, unknown>) || {};
          supabase.from("user_budget").upsert({
            user_id: session.user.id,
            expenses: { ...cur, _custom_cats: updated },
            updated_at: new Date().toISOString(),
          }, { onConflict: "user_id" });
        });
    });
  };

  const handleAddCustomCat = () => {
    const label = newCatLabel.trim();
    if (!label) return;
    const key = label.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
    if (allExpenseCats.some((c) => c.key === key)) return;
    const code = label.replace(/[^a-zA-Z]/g, "").slice(0, 2).toUpperCase() || "CU";
    const cat = { key, label, code, color: newCatColor, ...(newCatEmoji ? { emoji: newCatEmoji } : {}) };
    const updated = [...customCats, cat];
    setCustomCats(updated);
    localStorage.setItem("uf_custom_cats", JSON.stringify(updated));
    syncCustomCats(updated);
    setNewCatLabel(""); setNewCatColor(COLOR_PALETTE[0]); setNewCatEmoji("");
    setShowAddForm(false);
  };

  const handleUpdateCustomCat = (key: string) => {
    const label = editLabel.trim();
    if (!label) return;
    const code = label.replace(/[^a-zA-Z]/g, "").slice(0, 2).toUpperCase() || "CU";
    const updated = customCats.map((c) =>
      c.key === key ? { ...c, label, code, color: editColor, ...(editEmoji ? { emoji: editEmoji } : { emoji: undefined }) } : c
    );
    setCustomCats(updated);
    localStorage.setItem("uf_custom_cats", JSON.stringify(updated));
    syncCustomCats(updated);
    setManageCatKey(null);
  };

  const openManageEdit = (cat: typeof allExpenseCats[0]) => {
    const { color, emoji } = resolveDisplay({ ...cat, emoji: cat.emoji ?? "" }, catCustomizations, cat.key);
    setEditLabel(cat.label);
    setEditColor(color);
    setEditEmoji(emoji);
    setManageCatKey(manageCatKey === cat.key ? null : cat.key);
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
        .select("id, date, amount, currency, category, sub_category, tags, transaction_type")
        .eq("user_id", session.user.id)
        .order("date", { ascending: false })
        .then(({ data }) => {
          if (data) setTransactions(data as Transaction[]);
          setLoading(false);
        });
      supabase.from("user_budget").select("expenses").eq("user_id", session.user.id).maybeSingle()
        .then(({ data }) => {
          if (data?.expenses) {
            const { _custom_cats } = data.expenses as Record<string, unknown>;
            if (Array.isArray(_custom_cats)) {
              setCustomCats(_custom_cats as { key: string; label: string; code: string; color: string; emoji?: string }[]);
              localStorage.setItem("uf_custom_cats", JSON.stringify(_custom_cats));
            }
          }
        });
    });
  }, []);

  // Re-fetch custom categories when the browser tab regains focus (cross-device sync)
  useEffect(() => {
    const refetch = () => {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (!session) return;
        supabase.from("user_budget").select("expenses").eq("user_id", session.user.id).maybeSingle()
          .then(({ data }) => {
            if (!data?.expenses) return;
            const { _custom_cats } = data.expenses as Record<string, unknown>;
            if (Array.isArray(_custom_cats)) {
              setCustomCats(_custom_cats as { key: string; label: string; code: string; color: string; emoji?: string }[]);
              localStorage.setItem("uf_custom_cats", JSON.stringify(_custom_cats));
            }
          });
      });
    };
    const onVisible = () => { if (document.visibilityState === "visible") refetch(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, []);

  const [y, m] = viewMonth.split("-").map(Number);
  const monthLabel = new Date(y, m - 1, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" });
  const isCurrentMonth = viewMonth === currentMonth;

  const expTxns = useMemo(
    () => transactions.filter((t) => t.date.startsWith(viewMonth) && t.transaction_type !== "income"),
    [transactions, viewMonth]
  );

  const totalSpend = useMemo(
    () => expTxns.reduce((s, t) => s + toUSD(t.amount, t.currency, rates), 0),
    [expTxns, rates]
  );

  // All category groups with sub-category + tag breakdowns. Keep zero-spend
  // categories visible so the Categories page remains the management surface
  // for custom categories, even before they are used by a transaction.
  const primaryGroups = useMemo(() => {
    return allExpenseCats
      .map((cat) => {
        const catTxns = expTxns.filter((t) => t.category === cat.key);
        const total = catTxns.reduce((s, t) => s + toUSD(t.amount, t.currency, rates), 0);

        const subBreakdown = groupBySubCat(catTxns, rates);

        const tagMap: Record<string, number> = {};
        catTxns.forEach((t) => {
          (t.tags || []).forEach((tag) => {
            tagMap[tag] = (tagMap[tag] || 0) + toUSD(t.amount, t.currency, rates);
          });
        });
        const tagBreakdown: TagBreakdown[] = Object.entries(tagMap)
          .map(([tag, ttl]) => ({ tag, total: ttl }))
          .sort((a, b) => b.total - a.total);

        const base = { color: cat.color, emoji: (cat as { emoji?: string }).emoji ?? "📦" };
        const { color, emoji } = resolveDisplay(base, catCustomizations, cat.key);

        return {
          key: cat.key,
          label: cat.label,
          code: cat.code,
          color,
          emoji,
          total,
          subBreakdown,
          tagBreakdown,
        };
      })
      .sort((a, b) => b.total - a.total || a.label.localeCompare(b.label));
  }, [expTxns, rates, allExpenseCats, catCustomizations]);

  // Project groups (by tag)
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
        total: txns.reduce((s, t) => s + toUSD(t.amount, t.currency, rates), 0),
        catBreakdown: groupByCat(txns, rates, allExpenseCats, catCustomizations),
      }))
      .sort((a, b) => b.total - a.total);
  }, [expTxns, rates, allExpenseCats, catCustomizations]);

  const handlePrevMonth = () => {
    const [py, pm] = viewMonth.split("-").map(Number);
    const d = new Date(py, pm - 2, 1);
    setViewMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
    setExpandedCat(null);
    setEditingCat(null);
    setDeleteConfirmKey(null);
    setExpandedProject(null);
  };

  const handleNextMonth = () => {
    const [py, pm] = viewMonth.split("-").map(Number);
    const d = new Date(py, pm, 1);
    const next = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    if (next <= currentMonth) {
      setViewMonth(next);
      setExpandedCat(null);
      setEditingCat(null);
      setDeleteConfirmKey(null);
      setExpandedProject(null);
    }
  };

  if (loading) {
    return <div style={{ textAlign: "center", padding: "60px 0", color: "#94A3B8" }}>Loading…</div>;
  }

  return (
    <div>
      {/* ── All Categories Manager ──────────────────────────────────────── */}
      <div style={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 12, overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.04)", marginBottom: 24 }}>
        {/* Header */}
        <div style={{ padding: "14px 20px", borderBottom: "1px solid #E2E8F0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontSize: 15, fontWeight: 700, color: "#064E3B" }}>All Categories</span>
          <button
            onClick={() => { setShowAddForm((v) => !v); setManageCatKey(null); }}
            style={{ display: "flex", alignItems: "center", gap: 5, background: showAddForm ? "#F1F5F9" : "#064E3B", color: showAddForm ? "#64748B" : "#fff", border: "none", borderRadius: 7, padding: "6px 12px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
          >
            {showAddForm ? "✕ Cancel" : "+ Add"}
          </button>
        </div>

        {/* Add form */}
        {showAddForm && (
          <div style={{ padding: "14px 20px", borderBottom: "1px solid #E2E8F0", background: "#F8FAFC" }}>
            <div style={{ marginBottom: 10 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#64748B", display: "block", marginBottom: 4 }}>Category name</label>
              <input
                type="text"
                autoFocus
                placeholder="e.g. Hobbies"
                value={newCatLabel}
                onChange={(e) => setNewCatLabel(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleAddCustomCat(); if (e.key === "Escape") setShowAddForm(false); }}
                style={{ width: "100%", padding: "8px 10px", border: "1px solid #E2E8F0", borderRadius: 7, fontSize: 14, color: "#0F172A", background: "#fff", outline: "none", boxSizing: "border-box" }}
              />
            </div>
            <div style={{ marginBottom: 10 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#64748B", display: "block", marginBottom: 6 }}>Color</label>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {COLOR_PALETTE.map((c) => (
                  <button key={c} onClick={() => setNewCatColor(c)} style={{ width: 24, height: 24, borderRadius: "50%", background: c, border: newCatColor === c ? "2px solid #0F172A" : "2px solid transparent", cursor: "pointer", outline: newCatColor === c ? "2px solid #fff" : "none", outlineOffset: "-3px" }} />
                ))}
              </div>
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#64748B", display: "block", marginBottom: 6 }}>Emoji <span style={{ fontWeight: 400, color: "#94A3B8" }}>(optional)</span></label>
              <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                {EMOJI_PALETTE.map((em) => (
                  <button key={em} onClick={() => setNewCatEmoji(newCatEmoji === em ? "" : em)} style={{ width: 30, height: 30, borderRadius: 6, border: newCatEmoji === em ? "2px solid #064E3B" : "1px solid #E2E8F0", background: newCatEmoji === em ? "#F0FDF4" : "transparent", fontSize: 15, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {em}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={handleAddCustomCat}
                disabled={!newCatLabel.trim()}
                style={{ flex: 1, padding: "8px 0", background: newCatLabel.trim() ? "#064E3B" : "#E2E8F0", color: newCatLabel.trim() ? "#fff" : "#94A3B8", border: "none", borderRadius: 7, fontSize: 14, fontWeight: 600, cursor: newCatLabel.trim() ? "pointer" : "not-allowed" }}
              >
                Add Category
              </button>
              <button onClick={() => setShowAddForm(false)} style={{ padding: "8px 16px", background: "transparent", color: "#64748B", border: "1px solid #E2E8F0", borderRadius: 7, fontSize: 14, cursor: "pointer" }}>
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Category list */}
        <div>
          {/* Built-in */}
          {EXPENSE_CATEGORIES.map((cat) => {
            const { color, emoji } = resolveDisplay(cat, catCustomizations, cat.key);
            const isEditing = manageCatKey === cat.key;
            return (
              <div key={cat.key}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 20px", borderBottom: "1px solid #F1F5F9" }}>
                  <div style={{ width: 32, height: 32, borderRadius: "50%", background: color, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: emoji ? 16 : 11, color: "#fff", fontWeight: 700 }}>
                    {emoji || cat.code}
                  </div>
                  <span style={{ flex: 1, fontSize: 14, fontWeight: 500, color: "#0F172A" }}>{cat.label}</span>
                  <span style={{ fontSize: 11, padding: "2px 6px", background: "#F1F5F9", borderRadius: 4, color: "#64748B", fontWeight: 600, marginRight: 4 }}>{cat.code}</span>
                  <button
                    onClick={() => openManageEdit(cat)}
                    title="Edit appearance"
                    style={{ width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", background: isEditing ? "#F0FDF4" : "transparent", border: isEditing ? "1px solid #BBF7D0" : "1px solid transparent", borderRadius: 6, cursor: "pointer", color: isEditing ? "#064E3B" : "#94A3B8" }}
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                  </button>
                </div>
                {isEditing && (
                  <div style={{ padding: "12px 20px 16px", borderBottom: "1px solid #F1F5F9", background: "#F8FAFC" }}>
                    <div style={{ marginBottom: 10 }}>
                      <label style={{ fontSize: 12, fontWeight: 600, color: "#64748B", display: "block", marginBottom: 6 }}>Color</label>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        {COLOR_PALETTE.map((c) => (
                          <button key={c} onClick={() => setEditColor(c)} style={{ width: 24, height: 24, borderRadius: "50%", background: c, border: editColor === c ? "2px solid #0F172A" : "2px solid transparent", cursor: "pointer", outline: editColor === c ? "2px solid #fff" : "none", outlineOffset: "-3px" }} />
                        ))}
                      </div>
                    </div>
                    <div style={{ marginBottom: 14 }}>
                      <label style={{ fontSize: 12, fontWeight: 600, color: "#64748B", display: "block", marginBottom: 6 }}>Emoji</label>
                      <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                        {EMOJI_PALETTE.map((em) => (
                          <button key={em} onClick={() => setEditEmoji(editEmoji === em ? "" : em)} style={{ width: 30, height: 30, borderRadius: 6, border: editEmoji === em ? "2px solid #064E3B" : "1px solid #E2E8F0", background: editEmoji === em ? "#F0FDF4" : "transparent", fontSize: 15, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                            {em}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <button
                        onClick={() => {
                          setCatCustomizations((prev) => ({ ...prev, [cat.key]: { color: editColor, emoji: editEmoji || undefined } }));
                          setManageCatKey(null);
                        }}
                        style={{ padding: "7px 16px", background: "#064E3B", color: "#fff", border: "none", borderRadius: 7, fontSize: 13, fontWeight: 600, cursor: "pointer" }}
                      >
                        Save
                      </button>
                      <button
                        onClick={() => { setCatCustomizations((prev) => { const n = { ...prev }; delete n[cat.key]; return n; }); setManageCatKey(null); }}
                        style={{ padding: "7px 12px", background: "transparent", color: "#94A3B8", border: "1px solid #E2E8F0", borderRadius: 7, fontSize: 13, cursor: "pointer" }}
                      >
                        Reset
                      </button>
                      <button onClick={() => setManageCatKey(null)} style={{ marginLeft: "auto", padding: "7px 12px", background: "transparent", color: "#64748B", border: "1px solid #E2E8F0", borderRadius: 7, fontSize: 13, cursor: "pointer" }}>
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {/* Custom categories divider + rows */}
          {customCats.length > 0 && (
            <div style={{ padding: "6px 20px 2px", background: "#F8FAFC", borderBottom: "1px solid #F1F5F9" }}>
              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.8px", textTransform: "uppercase", color: "#94A3B8" }}>Custom</span>
            </div>
          )}
          {customCats.map((cat) => {
            const { color, emoji } = resolveDisplay({ ...cat, emoji: cat.emoji ?? "" }, catCustomizations, cat.key);
            const isEditing = manageCatKey === cat.key;
            return (
              <div key={cat.key}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 20px", borderBottom: "1px solid #F1F5F9" }}>
                  <div style={{ width: 32, height: 32, borderRadius: "50%", background: color, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: emoji ? 16 : 11, color: "#fff", fontWeight: 700 }}>
                    {emoji || cat.code}
                  </div>
                  <span style={{ flex: 1, fontSize: 14, fontWeight: 500, color: "#0F172A" }}>{cat.label}</span>
                  <span style={{ fontSize: 11, padding: "2px 6px", background: "#F1F5F9", borderRadius: 4, color: "#64748B", fontWeight: 600, marginRight: 4 }}>{cat.code}</span>
                  <button
                    onClick={() => openManageEdit(cat)}
                    title="Edit"
                    style={{ width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", background: isEditing ? "#F0FDF4" : "transparent", border: isEditing ? "1px solid #BBF7D0" : "1px solid transparent", borderRadius: 6, cursor: "pointer", color: isEditing ? "#064E3B" : "#94A3B8" }}
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                  </button>
                  <button
                    onClick={() => handleDeleteCustomCat(cat.key)}
                    title="Delete"
                    style={{ width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", background: "transparent", border: "1px solid transparent", borderRadius: 6, cursor: "pointer", color: "#FDA4AF" }}
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6M14 11v6" /><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" /></svg>
                  </button>
                </div>
                {isEditing && (
                  <div style={{ padding: "12px 20px 16px", borderBottom: "1px solid #F1F5F9", background: "#F8FAFC" }}>
                    <div style={{ marginBottom: 10 }}>
                      <label style={{ fontSize: 12, fontWeight: 600, color: "#64748B", display: "block", marginBottom: 4 }}>Name</label>
                      <input
                        type="text"
                        value={editLabel}
                        onChange={(e) => setEditLabel(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") handleUpdateCustomCat(cat.key); if (e.key === "Escape") setManageCatKey(null); }}
                        style={{ width: "100%", padding: "7px 10px", border: "1px solid #E2E8F0", borderRadius: 7, fontSize: 14, color: "#0F172A", background: "#fff", outline: "none", boxSizing: "border-box" }}
                      />
                    </div>
                    <div style={{ marginBottom: 10 }}>
                      <label style={{ fontSize: 12, fontWeight: 600, color: "#64748B", display: "block", marginBottom: 6 }}>Color</label>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        {COLOR_PALETTE.map((c) => (
                          <button key={c} onClick={() => setEditColor(c)} style={{ width: 24, height: 24, borderRadius: "50%", background: c, border: editColor === c ? "2px solid #0F172A" : "2px solid transparent", cursor: "pointer", outline: editColor === c ? "2px solid #fff" : "none", outlineOffset: "-3px" }} />
                        ))}
                      </div>
                    </div>
                    <div style={{ marginBottom: 14 }}>
                      <label style={{ fontSize: 12, fontWeight: 600, color: "#64748B", display: "block", marginBottom: 6 }}>Emoji <span style={{ fontWeight: 400, color: "#94A3B8" }}>(optional)</span></label>
                      <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                        {EMOJI_PALETTE.map((em) => (
                          <button key={em} onClick={() => setEditEmoji(editEmoji === em ? "" : em)} style={{ width: 30, height: 30, borderRadius: 6, border: editEmoji === em ? "2px solid #064E3B" : "1px solid #E2E8F0", background: editEmoji === em ? "#F0FDF4" : "transparent", fontSize: 15, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                            {em}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button
                        onClick={() => handleUpdateCustomCat(cat.key)}
                        disabled={!editLabel.trim()}
                        style={{ flex: 1, padding: "7px 0", background: editLabel.trim() ? "#064E3B" : "#E2E8F0", color: editLabel.trim() ? "#fff" : "#94A3B8", border: "none", borderRadius: 7, fontSize: 13, fontWeight: 600, cursor: editLabel.trim() ? "pointer" : "not-allowed" }}
                      >
                        Save
                      </button>
                      <button onClick={() => setManageCatKey(null)} style={{ padding: "7px 12px", background: "transparent", color: "#64748B", border: "1px solid #E2E8F0", borderRadius: 7, fontSize: 13, cursor: "pointer" }}>
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Month nav */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 22, color: "#064E3B", letterSpacing: "-0.4px" }}>{monthLabel}</div>
          {totalSpend > 0 && <div style={{ fontSize: 13, color: "#64748B", marginTop: 2 }}>Total spend: <strong>{fmtDisplay(totalSpend)}</strong></div>}
        </div>
        <div style={{ display: "flex", alignItems: "center", background: "#fff", border: "1px solid #E2E8F0", borderRadius: 8, overflow: "hidden", boxShadow: "0 1px 2px rgba(0,0,0,0.04)" }}>
          <button onClick={handlePrevMonth} style={{ background: "transparent", border: "none", padding: "9px 12px", color: "#64748B", cursor: "pointer", display: "flex", alignItems: "center" }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="m14 6-6 6 6 6" /></svg>
          </button>
          <div style={{ padding: "0 8px", fontSize: 14, fontWeight: 700, color: "#064E3B", minWidth: 130, textAlign: "center", letterSpacing: "-0.2px" }}>{monthLabel}</div>
          <button onClick={handleNextMonth} disabled={isCurrentMonth} style={{ background: "transparent", border: "none", padding: "9px 12px", color: isCurrentMonth ? "#CBD5E1" : "#64748B", cursor: isCurrentMonth ? "not-allowed" : "pointer", display: "flex", alignItems: "center" }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="m10 6 6 6-6 6" /></svg>
          </button>
        </div>
      </div>

      {totalSpend === 0 && (
        <div style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 12, padding: "18px 20px", marginBottom: 16, color: "#64748B" }}>
          <div style={{ fontWeight: 700, fontSize: 15, color: "#064E3B", marginBottom: 4 }}>No expenses this month</div>
          <div style={{ fontSize: 13 }}>Your full category list is still shown below so you can review, customize, or delete custom categories.</div>
        </div>
      )}

      {/* All Categories */}
      <div style={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 12, overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.04)", marginBottom: 24 }}>
            <div style={{ padding: "14px 20px", borderBottom: "1px solid #E2E8F0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: 15, fontWeight: 700, color: "#064E3B" }}>All Categories</span>
              <span style={{ fontSize: 12, color: "#94A3B8", fontWeight: 600 }}>{primaryGroups.length} categories</span>
            </div>
            {/* Column headers */}
            <div style={{ display: "grid", gridTemplateColumns: "36px 1fr 160px 80px 24px", gap: 12, padding: "8px 20px 4px", borderBottom: "1px solid #F1F5F9" }}>
              <div />
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.8px", textTransform: "uppercase", color: "#94A3B8" }}>Category</div>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.8px", textTransform: "uppercase", color: "#94A3B8" }}>Share</div>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.8px", textTransform: "uppercase", color: "#94A3B8", textAlign: "right" }}>Total</div>
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
              />
            ))}
          </div>

          {/* By Project / Event — only if any transactions have tags */}
      {projectGroups.length > 0 && (
        <div style={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 12, overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
          <div style={{ padding: "14px 20px", borderBottom: "1px solid #E2E8F0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: 15, fontWeight: 700, color: "#064E3B" }}>By Project / Event</span>
            <span style={{ fontSize: 12, color: "#94A3B8", fontWeight: 600 }}>{projectGroups.length} projects</span>
          </div>
          <div style={{ padding: "8px 20px 4px", borderBottom: "1px solid #F1F5F9", display: "grid", gridTemplateColumns: "1fr 80px 24px", gap: 12 }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.8px", textTransform: "uppercase", color: "#94A3B8" }}>Tag</div>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.8px", textTransform: "uppercase", color: "#94A3B8", textAlign: "right" }}>Total</div>
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
