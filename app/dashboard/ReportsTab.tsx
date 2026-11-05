"use client";

import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import TransactionStartCard from "./TransactionStartCard";
import { Button } from "@/components/ui";
import { fetchAllPages } from "@/lib/supabase-pages";
import { FALLBACK_RATES } from "@/lib/currency";
import { formatUSDInCurrency } from "@/lib/money";
import { EXPENSE_CATEGORIES, loadCatCustomizations, resolveDisplay } from "@/lib/categories";
import MonthInsight from "./MonthInsight";
import WhatChanged from "./WhatChanged";
import { useCustomCategories } from "@/lib/useCustomCategories";

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
  refund_amount: number;
  currency: string;
  category: string;
  transaction_type: "expense" | "income" | "transfer";
};

// Net expense amount after refunds — mirrors Cashflow (TransactionsTab).
const netAmt = (t: { amount: number; refund_amount: number }) =>
  Math.max(0, t.amount - (t.refund_amount || 0));

// ─── Helpers ──────────────────────────────────────────────────────────────────
function lastNMonths(n: number): string[] {
  const now = new Date();
  const months: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const m = String(d.getMonth() + 1).padStart(2, "0");
    months.push(`${d.getFullYear()}-${m}`);
  }
  return months;
}

// ─── Root Component ───────────────────────────────────────────────────────────
export default function ReportsTab({ displayCurrency = "USD", displayRates = FALLBACK_RATES, targetMultiple, onOpenTransactions, freedomShift, budgets = {} }: {
  /** Years the freedom date moves if monthly spending changed by this many dollars for good. */
  freedomShift?: (monthlyUsd: number) => number | null;
  /** Monthly budget per category, in dollars. */
  budgets?: Record<string, number>;
  displayCurrency?: string;
  displayRates?: Record<string, number>;
  /** FIRE target per dollar of a year's spending, as the freedom date uses it. */
  targetMultiple?: number;
  onOpenTransactions: () => void;
}) {
  const { customCats } = useCustomCategories();
  const [transactions, setTransactions] = useState<RawTx[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [retry, setRetry] = useState(0);
  const [rates, setRates] = useState<Record<string, number>>(FALLBACK_RATES);
  const [ratesFallback, setRatesFallback] = useState(false);
  const period = 6;
  const [detail, setDetail] = useState(false);
  const [catCustomizations] = useState(loadCatCustomizations);
  const fmtDisplay = (n: number) => formatUSDInCurrency(n, displayCurrency, displayRates);

  useEffect(() => {
    fetch("https://api.frankfurter.app/latest?from=USD")
      .then(r => r.json())
      .then(d => { if (d.rates) setRates({ ...FALLBACK_RATES, ...d.rates }); else setRatesFallback(true); })
      .catch(() => setRatesFallback(true));

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { setLoadFailed(true); setLoading(false); return; }
      fetchAllPages((from, to) => supabase
        .from("expenses")
        .select("id, date, amount, refund_amount, currency, category, transaction_type")
        .eq("user_id", session.user.id)
        .order("date", { ascending: false })
        .order("id")
        .range(from, to))
        .then(({ data }) => {
          setLoadFailed(data === null);
          if (data) setTransactions(data as RawTx[]);
          setLoading(false);
        });
    });
  }, [retry]);

  const months = useMemo(() => lastNMonths(period), [period]);

  const catTotals = useMemo(() => {
    const periodTxns = transactions.filter(
      t => t.date >= months[0] && t.transaction_type === "expense"
    );
    // Every category, custom ones included, so the slices add up to the
    // expenses total; a category no longer defined counts under Other.
    const cats = [...EXPENSE_CATEGORIES, ...customCats.filter((c) => !EXPENSE_CATEGORIES.some((e) => e.key === c.key))];
    const known = new Set(cats.map((c) => c.key));
    return cats.map(cat => {
      const { color, emoji } = resolveDisplay({ color: cat.color, emoji: cat.emoji ?? "📦" }, catCustomizations, cat.key);
      return {
        ...cat,
        color,
        emoji,
        total: periodTxns
          .filter(t => t.category === cat.key || (cat.key === "other" && !known.has(t.category)))
          .reduce((s, t) => s + toUSD(netAmt(t), t.currency, rates), 0),
      };
    })
      .filter(c => c.total > 0)
      .sort((a, b) => b.total - a.total);
  }, [months, transactions, rates, catCustomizations, customCats]);

  const hasAny = transactions.length > 0;
  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "80px 24px", color: "var(--uf-text-3)", fontSize: 14 }}>
        Loading reports…
      </div>
    );
  }

  if (loadFailed) return (
    <div className="uf-card" role="alert">
      <p>Couldn&apos;t load your reports.</p>
      <Button size="sm" onClick={() => { setLoading(true); setRetry((n) => n + 1); }}>Try again</Button>
    </div>
  );

  if (!hasAny) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        <div>
          <h2 style={{ fontFamily: "Inter, sans-serif", fontSize: 22, fontWeight: 800, color: "var(--uf-text)", margin: "0 0 4px", letterSpacing: "-0.5px" }}>
            Insights
          </h2>
          <p style={{ color: "var(--uf-text-2)", fontSize: 13, margin: 0 }}>
            What changed, and what it means for your freedom date.
          </p>
        </div>
        <TransactionStartCard title="See where your money goes" description="See your monthly income, spending, and savings."
          onOpenTransactions={onOpenTransactions} />
      </div>
    );
  }

  return (
    <div className="uf-reports" style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <style>{`
        .uf-reports { width: 100%; max-width: 100%; overflow-x: hidden; }
        .uf-report-header { display: flex; align-items: flex-start; justify-content: space-between; flex-wrap: wrap; gap: 12px; }
        .uf-report-controls { display: flex; flex-direction: column; align-items: flex-end; gap: 6px; }
        .uf-report-periods { display: flex; gap: 6px; }
        .uf-report-kpi-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 16px; }
        .uf-report-kpi-card { min-width: 0; background: var(--uf-card); border-radius: 16px; padding: 20px 24px; box-shadow: var(--uf-e1); }
        .uf-report-card { background: var(--uf-card); border: 1px solid var(--uf-border); border-radius: 16px; padding: 24px; max-width: 100%; overflow: hidden; }
        .uf-report-chart { width: 100%; min-width: 0; }
        .uf-report-category-row { display: grid; grid-template-columns: 40px minmax(0, 1fr) auto auto; gap: 14px; align-items: center; }
        .uf-report-category-name { min-width: 0; }
        .uf-report-month-grid { display: grid; grid-template-columns: 80px minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1fr) 80px; gap: 8px; }
        .uf-report-money { min-width: 0; overflow-wrap: anywhere; font-variant-numeric: tabular-nums; }

        @media (max-width: 640px) {
          .uf-reports { gap: 18px !important; }
          .uf-report-header { flex-direction: column; align-items: stretch; }
          .uf-report-controls { align-items: stretch; }
          .uf-report-periods { width: 100%; display: grid; grid-template-columns: repeat(3, 1fr); }
          .uf-report-periods button { width: 100%; }
          .uf-report-kpi-grid { grid-template-columns: 1fr; gap: 10px; }
          .uf-report-kpi-card { padding: 18px 20px; }
          .uf-report-card { padding: 18px 14px; border-radius: 14px; }
          .uf-report-chart { height: 210px; }
          .uf-report-category-row { grid-template-columns: 36px minmax(0, 1fr) 30px 62px; gap: 8px; }
          .uf-report-category-row > div:first-child { width: 36px !important; height: 36px !important; font-size: 18px !important; }
          .uf-report-category-row > div:nth-child(3), .uf-report-category-row > div:last-child { min-width: 0 !important; font-size: 12px !important; }
          .uf-report-category-name > div:first-child { font-size: 12px !important; }
          .uf-report-month-grid { grid-template-columns: 54px minmax(52px, 1fr) minmax(52px, 1fr) minmax(52px, 1fr) 42px; gap: 6px; }
          .uf-report-month-grid.uf-report-table-head { font-size: 9px !important; letter-spacing: 0.04em !important; }
          .uf-report-month-row { font-size: 12px !important; }
          .uf-report-month-row span:first-child { font-size: 12px !important; }
        }
      `}</style>

      {/* ── Header ───────────────────────────────────────────────────────── */}
      <div className="uf-report-header">
        <div>
          <h2 style={{ fontFamily: "Inter, sans-serif", fontSize: 22, fontWeight: 800, color: "var(--uf-text)", margin: "0 0 4px", letterSpacing: "-0.5px" }}>
            Insights
          </h2>
          <p style={{ color: "var(--uf-text-2)", fontSize: 13, margin: 0 }}>
            What changed, and what it means for your freedom date.
          </p>
        </div>
        {ratesFallback && (
          <div style={{ fontSize: 11, color: "var(--uf-warn-ink)", fontWeight: 600 }}>
            ⚠ Estimated rates — live fetch failed
          </div>
        )}
      </div>

      <WhatChanged transactions={transactions} toUsd={(t, a) => toUSD(a, t.currency, rates)} money={fmtDisplay}
        short={(n) => formatUSDInCurrency(n, displayCurrency, displayRates, { compact: true })}
        cat={(key) => { const c = catTotals.find((x) => x.key === key); return c ? { label: c.label, emoji: c.emoji } : { label: "Other", emoji: "📦" }; }}
        shift={freedomShift} budgets={budgets} onOpenTransactions={onOpenTransactions} />

      {/* Any one month, with one-offs left out (the old month view), kept one tap away. */}
      <div className="uf-report-card" style={{ padding: "12px 16px" }}>
        <button type="button" aria-expanded={detail} onClick={() => setDetail((v) => !v)} className="uf-t-small" style={{ background: "none", border: 0, padding: 0, fontWeight: 800, color: "var(--uf-ink)", cursor: "pointer" }}>{detail ? "▾" : "▸"} Look at any month</button>
        {detail && <div style={{ marginTop: 12 }}><MonthInsight targetMultiple={targetMultiple} transactions={transactions} rates={rates} displayCurrency={displayCurrency} displayRates={displayRates} /></div>}
      </div>

    </div>
  );
}
