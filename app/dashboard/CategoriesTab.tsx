"use client";

import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/lib/supabase";

// ─── Shared constants ─────────────────────────────────────────────────────────
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

const fmt = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);

const FALLBACK_RATES: Record<string, number> = {
  EUR: 0.92, GBP: 0.79, JPY: 149.5, CNY: 7.27,
  AUD: 1.56, CAD: 1.36, SGD: 1.30, HKD: 7.78,
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
  currency: string;
  category: string;
  sub_category: string | null;
  tags: string[];
  transaction_type: "expense" | "income";
};

type SubBreakdown = { name: string; total: number };
type CatBreakdown = { key: string; label: string; color: string; total: number; subBreakdown: SubBreakdown[] };

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

function groupByCat(txns: Transaction[], rates: Record<string, number>): CatBreakdown[] {
  const map: Record<string, Transaction[]> = {};
  txns.forEach((t) => {
    if (!map[t.category]) map[t.category] = [];
    map[t.category].push(t);
  });
  return Object.entries(map).map(([key, catTxns]) => {
    const meta = EXPENSE_CATEGORIES.find((c) => c.key === key);
    return {
      key,
      label: meta?.label || key,
      color: meta?.color || "#6b7280",
      total: catTxns.reduce((s, t) => s + toUSD(t.amount, t.currency, rates), 0),
      subBreakdown: groupBySubCat(catTxns, rates),
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
}: {
  cat: { key: string; label: string; color: string; code: string; total: number; subBreakdown: SubBreakdown[]; tagBreakdown: { tag: string; total: number }[] };
  totalSpend: number;
  open: boolean;
  onToggle: () => void;
}) {
  const pct = totalSpend > 0 ? (cat.total / totalSpend) * 100 : 0;

  return (
    <div>
      {/* Row */}
      <div
        onClick={onToggle}
        style={{
          display: "grid", gridTemplateColumns: "36px 1fr 160px 80px 24px",
          gap: 12, alignItems: "center", padding: "14px 20px",
          borderTop: "1px solid #F1F5F9", cursor: "pointer",
          background: open ? "#F8FAFC" : "transparent",
        }}
        onMouseEnter={(e) => { if (!open) (e.currentTarget as HTMLElement).style.background = "#F8FAFC"; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = open ? "#F8FAFC" : "transparent"; }}
      >
        <div style={{ width: 36, height: 36, borderRadius: "50%", background: cat.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 800, color: "#fff", letterSpacing: "-0.5px", flexShrink: 0 }}>
          {cat.code}
        </div>
        <div>
          <div style={{ fontSize: 14, fontWeight: 600, color: "#19181E" }}>{cat.label}</div>
          <div style={{ fontSize: 11.5, color: "#94A3B8", marginTop: 1 }}>{cat.subBreakdown.length > 0 ? `${cat.subBreakdown.length} sub-categories` : "No sub-categories"}</div>
        </div>
        {/* Bar */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ flex: 1, height: 6, background: "#E2E8F0", borderRadius: 99, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${pct}%`, background: cat.color, borderRadius: 99 }} />
          </div>
          <span style={{ fontSize: 11, color: "#64748B", fontVariantNumeric: "tabular-nums", minWidth: 28, textAlign: "right" }}>{pct.toFixed(0)}%</span>
        </div>
        <div style={{ fontSize: 14, fontWeight: 700, color: "#19181E", textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{fmt(cat.total)}</div>
        <Chevron open={open} />
      </div>

      {/* Expanded */}
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
                      <span style={{ fontSize: 13, fontWeight: 600, color: "#19181E", textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{fmt(sc.total)}</span>
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
                    <span style={{ color: "#19181E" }}>{fmt(tb.total)}</span>
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
}: {
  tag: string;
  total: number;
  catBreakdown: CatBreakdown[];
  open: boolean;
  onToggle: () => void;
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
        <div style={{ fontSize: 14, fontWeight: 700, color: "#19181E", textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{fmt(total)}</div>
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
                  <span style={{ fontSize: 13, fontWeight: 600, color: "#19181E", textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{fmt(cat.total)}</span>
                </div>
                {cat.subBreakdown.length > 0 && (
                  <div style={{ paddingLeft: 34, display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 4 }}>
                    {cat.subBreakdown.map((sc) => (
                      <span key={sc.name} style={{ fontSize: 11.5, color: "#64748B", background: "#fff", border: "1px solid #E2E8F0", borderRadius: 4, padding: "2px 8px" }}>
                        {sc.name}: {fmt(sc.total)}
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
export default function CategoriesTab() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [rates, setRates] = useState<Record<string, number>>(FALLBACK_RATES);
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const [viewMonth, setViewMonth] = useState(currentMonth);
  const [expandedCat, setExpandedCat] = useState<string | null>(null);
  const [expandedProject, setExpandedProject] = useState<string | null>(null);

  // Merge built-in categories with any user-defined ones from localStorage
  const [customCats] = useState<{ key: string; label: string; code: string; color: string }[]>(() => {
    try { return JSON.parse(localStorage.getItem("uf_custom_cats") || "[]"); } catch { return []; }
  });
  const allExpenseCats = useMemo(() => [...EXPENSE_CATEGORIES, ...customCats], [customCats]);

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
    });
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

  // Primary category groups with sub-category + tag breakdowns
  const primaryGroups = useMemo(() => {
    return allExpenseCats
      .map((cat) => {
        const catTxns = expTxns.filter((t) => t.category === cat.key);
        if (catTxns.length === 0) return null;
        const total = catTxns.reduce((s, t) => s + toUSD(t.amount, t.currency, rates), 0);

        const subBreakdown = groupBySubCat(catTxns, rates);

        // Tag breakdown for this category
        const tagMap: Record<string, number> = {};
        catTxns.forEach((t) => {
          (t.tags || []).forEach((tag) => {
            tagMap[tag] = (tagMap[tag] || 0) + toUSD(t.amount, t.currency, rates);
          });
        });
        const tagBreakdown = Object.entries(tagMap)
          .map(([tag, ttl]) => ({ tag, total: ttl }))
          .sort((a, b) => b.total - a.total);

        return { ...cat, total, subBreakdown, tagBreakdown };
      })
      .filter(Boolean) as ({ key: string; label: string; code: string; color: string } & { total: number; subBreakdown: SubBreakdown[]; tagBreakdown: { tag: string; total: number }[] })[];
  }, [expTxns, rates, allExpenseCats]);

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
        catBreakdown: groupByCat(txns, rates),
      }))
      .sort((a, b) => b.total - a.total);
  }, [expTxns, rates]);

  const handlePrevMonth = () => {
    const [py, pm] = viewMonth.split("-").map(Number);
    const d = new Date(py, pm - 2, 1);
    setViewMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
    setExpandedCat(null);
    setExpandedProject(null);
  };

  const handleNextMonth = () => {
    const [py, pm] = viewMonth.split("-").map(Number);
    const d = new Date(py, pm, 1);
    const next = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    if (next <= currentMonth) {
      setViewMonth(next);
      setExpandedCat(null);
      setExpandedProject(null);
    }
  };

  if (loading) {
    return <div style={{ textAlign: "center", padding: "60px 0", color: "#94A3B8" }}>Loading…</div>;
  }

  return (
    <div>
      {/* Month nav */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 22, color: "#064E3B", letterSpacing: "-0.4px" }}>{monthLabel}</div>
          {totalSpend > 0 && <div style={{ fontSize: 13, color: "#64748B", marginTop: 2 }}>Total spend: <strong>{fmt(totalSpend)}</strong></div>}
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

      {primaryGroups.length === 0 ? (
        <div style={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 12, padding: "60px 24px", textAlign: "center", color: "#94A3B8" }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>📊</div>
          <div style={{ fontWeight: 700, fontSize: 16, color: "#064E3B", marginBottom: 6 }}>No expenses this month</div>
          <div style={{ fontSize: 13 }}>Add transactions in the Cashflow tab to see your category breakdown here.</div>
        </div>
      ) : (
        <>
          {/* By Category */}
          <div style={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 12, overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.04)", marginBottom: 24 }}>
            <div style={{ padding: "14px 20px", borderBottom: "1px solid #E2E8F0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: 15, fontWeight: 700, color: "#064E3B" }}>By Category</span>
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
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
