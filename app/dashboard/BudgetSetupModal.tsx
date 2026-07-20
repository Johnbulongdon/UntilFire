"use client";

import { useMemo, useState } from "react";

type CustomCategory = { key: string; label: string; code: string; color: string; emoji?: string };

type MinimalTransaction = {
  date: string;
  amount: number;
  refund_amount: number;
  currency: string;
  category: string;
  transaction_type: "expense" | "income" | "transfer";
};

const toUSD = (amount: number, currency: string, rates: Record<string, number>): number => {
  if (!currency || currency === "USD") return amount;
  const rate = rates[currency];
  return rate ? amount / rate : amount;
};

export default function BudgetSetupModal({
  transactions,
  expenseCategories,
  budgetExpenses,
  rates,
  formatAmount,
  onClose,
  onSave,
}: {
  transactions: MinimalTransaction[];
  expenseCategories: CustomCategory[];
  budgetExpenses: Record<string, number> | null;
  rates: Record<string, number>;
  formatAmount: (value: number) => string;
  onClose: () => void;
  onSave: (values: Record<string, number>) => Promise<void> | void;
}) {
  // Same 3-prior-month averaging math the old bulk "Predict from history"
  // action used, but computed per category so it can sit next to each input
  // as a reference instead of silently overwriting every category at once.
  const { averages, monthCount } = useMemo(() => {
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const priorMonths = [...new Set(
      transactions
        .filter((t) => t.transaction_type === "expense" && !t.date.startsWith(currentMonth))
        .map((t) => t.date.slice(0, 7))
    )].sort().slice(-3);

    const catMonthTotals: Record<string, number[]> = {};
    for (const month of priorMonths) {
      const monthExpenses = transactions.filter((t) => t.transaction_type === "expense" && t.date.startsWith(month));
      const catTotals: Record<string, number> = {};
      for (const tx of monthExpenses) {
        const usd = toUSD(Math.max(0, tx.amount - (tx.refund_amount || 0)), tx.currency, rates);
        catTotals[tx.category] = (catTotals[tx.category] || 0) + usd;
      }
      for (const [cat, total] of Object.entries(catTotals)) {
        if (!catMonthTotals[cat]) catMonthTotals[cat] = [];
        catMonthTotals[cat].push(total);
      }
    }
    const result: Record<string, number> = {};
    for (const [cat, totals] of Object.entries(catMonthTotals)) {
      result[cat] = Math.round(totals.reduce((s, v) => s + v, 0) / priorMonths.length);
    }
    return { averages: result, monthCount: priorMonths.length };
  }, [transactions, rates]);

  const steps = expenseCategories;
  const [stepIndex, setStepIndex] = useState(0);
  const [drafts, setDrafts] = useState<Record<string, number>>(() => {
    const seeded: Record<string, number> = {};
    for (const c of steps) {
      const existing = budgetExpenses?.[c.key];
      const suggested = averages[c.key];
      if (existing != null) seeded[c.key] = existing;
      else if (suggested != null) seeded[c.key] = suggested;
    }
    return seeded;
  });
  const [saving, setSaving] = useState(false);

  const cat = steps[stepIndex];
  const isLast = stepIndex === steps.length - 1;
  const reference = cat ? averages[cat.key] : undefined;

  async function handleSave(finalDrafts: Record<string, number>) {
    setSaving(true);
    await onSave(finalDrafts);
    setSaving(false);
    onClose();
  }

  function advance(nextDrafts: Record<string, number>) {
    setDrafts(nextDrafts);
    if (isLast) handleSave(nextDrafts);
    else setStepIndex((i) => i + 1);
  }

  if (!cat) return null;

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)",
        display: "flex", alignItems: "center", justifyContent: "center",
        zIndex: 300, padding: 16,
      }}
    >
      <div
        onClick={(e: React.MouseEvent) => e.stopPropagation()}
        style={{
          background: "#111118", border: "1px solid #23232d", borderRadius: 20,
          padding: 32, width: "100%", maxWidth: 440,
          fontFamily: "Manrope, sans-serif",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div style={{ fontSize: 12, color: "#64748B", fontWeight: 700 }}>
            Category {stepIndex + 1} of {steps.length}
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#64748B", cursor: "pointer", fontSize: 20, lineHeight: 1, padding: 4 }}>×</button>
        </div>

        <div style={{ fontSize: 20, fontWeight: 800, color: "#f1f5f9", marginBottom: 6 }}>
          {cat.emoji ? `${cat.emoji} ` : ""}{cat.label}
        </div>
        <div style={{ fontSize: 13, color: "#94a3b8", marginBottom: 18 }}>
          {reference != null
            ? `Averaged ${formatAmount(reference)}/mo over your last ${monthCount} month${monthCount === 1 ? "" : "s"}`
            : "No spending history yet in this category"}
        </div>

        <input
          type="number"
          value={drafts[cat.key] ?? ""}
          onChange={(e) => setDrafts((d) => ({ ...d, [cat.key]: Number(e.target.value) || 0 }))}
          placeholder={reference != null ? String(reference) : "0"}
          style={{
            width: "100%", padding: "12px 14px", borderRadius: 10,
            border: "1px solid #23232d", background: "#1a1a24", color: "#e2e8f0",
            fontSize: 18, fontWeight: 700, fontFamily: "Manrope, sans-serif", marginBottom: 24,
          }}
        />

        <div style={{ display: "flex", gap: 10 }}>
          {stepIndex > 0 && (
            <button
              onClick={() => setStepIndex((i) => i - 1)}
              style={{ padding: "10px 16px", borderRadius: 10, border: "1px solid #23232d", background: "transparent", color: "#94a3b8", fontSize: 13, fontWeight: 700, cursor: "pointer" }}
            >
              Back
            </button>
          )}
          <button
            onClick={() => {
              const next = { ...drafts };
              delete next[cat.key];
              advance(next);
            }}
            style={{ padding: "10px 16px", borderRadius: 10, border: "1px solid #23232d", background: "transparent", color: "#64748B", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
          >
            Skip
          </button>
          <button
            onClick={() => advance(drafts)}
            disabled={saving}
            style={{ flex: 1, padding: "10px 16px", borderRadius: 10, border: "none", background: "#047857", color: "#fff", fontSize: 13, fontWeight: 700, cursor: saving ? "default" : "pointer", opacity: saving ? 0.7 : 1 }}
          >
            {saving ? "Saving…" : isLast ? "Save budget" : "Next"}
          </button>
        </div>
      </div>
    </div>
  );
}
