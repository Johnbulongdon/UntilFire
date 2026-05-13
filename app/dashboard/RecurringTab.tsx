"use client";

import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/lib/supabase";

// ─── Constants (copied from TransactionsTab — kept local to avoid coupling) ───
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

const INCOME_CATEGORIES = [
  { key: "salary",       label: "Salary",     code: "SA", color: "#22d3a5" },
  { key: "freelance",    label: "Freelance",  code: "FR", color: "#34d399" },
  { key: "investment",   label: "Investment", code: "IV", color: "#818cf8" },
  { key: "gift",         label: "Gift",       code: "GF", color: "#a78bfa" },
  { key: "other_income", label: "Other",      code: "OI", color: "#6b7280" },
];

const ALL_CATEGORIES = [...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES];

const FALLBACK_RATES: Record<string, number> = {
  EUR: 0.92, GBP: 0.79, JPY: 149.5, CNY: 7.27,
  AUD: 1.56, CAD: 1.36, SGD: 1.30, HKD: 7.78,
};

const fmt = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);

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

type RecurringItem = {
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

// ─── Detection Helpers ────────────────────────────────────────────────────────
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

function detectRecurring(txns: RawTx[], rates: Record<string, number>): { expenses: RecurringItem[]; income: RecurringItem[] } {
  const groups = new Map<string, RawTx[]>();
  for (const tx of txns) {
    const key = tx.description.toLowerCase().trim();
    if (!key) continue;
    const arr = groups.get(key) ?? [];
    arr.push(tx);
    groups.set(key, arr);
  }

  const results: RecurringItem[] = [];

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

    const avgAmountUSD = group.reduce((s, t) => s + toUSD(t.amount, t.currency, rates), 0) / group.length;
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

// ─── Sub-components ───────────────────────────────────────────────────────────
function FrequencyBadge({ frequency }: { frequency: FrequencyLabel }) {
  const label = frequency === "biweekly" ? "bi-weekly" : frequency;
  return (
    <span style={{
      background: "rgba(32,212,191,0.12)", color: "#20D4BF",
      border: "1px solid rgba(32,212,191,0.25)",
      borderRadius: 999, padding: "2px 9px",
      fontSize: 11, fontWeight: 700, textTransform: "capitalize",
    }}>
      {label}
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

function RecurringCard({ item }: { item: RecurringItem }) {
  const cat = ALL_CATEGORIES.find(c => c.key === item.category)
    ?? { label: item.category, code: item.category.slice(0, 2).toUpperCase(), color: "#6b7280" };
  const isIncome = item.transaction_type === "income";

  return (
    <div style={{
      background: "#fff", border: "1px solid #E2E8F0", borderRadius: 12,
      padding: "16px 20px", display: "grid",
      gridTemplateColumns: "40px 1fr auto", gap: 14, alignItems: "center",
    }}>
      {/* Category circle */}
      <div style={{
        width: 40, height: 40, borderRadius: "50%",
        background: cat.color + "22", border: `1.5px solid ${cat.color}44`,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 11, fontWeight: 800, color: cat.color, fontFamily: "Inter, sans-serif",
        flexShrink: 0,
      }}>
        {cat.code}
      </div>

      {/* Description + meta */}
      <div>
        <div style={{ fontSize: 14, fontWeight: 700, color: "#19181E", marginBottom: 5 }}>
          {item.description}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
          <span style={{
            background: cat.color + "18", color: cat.color,
            borderRadius: 999, padding: "2px 10px", fontSize: 11, fontWeight: 700,
          }}>
            {cat.label}
          </span>
          <FrequencyBadge frequency={item.frequency} />
          <span style={{ fontSize: 11, color: "#94A3B8" }}>
            seen {item.monthCount} months
          </span>
        </div>
      </div>

      {/* Amount + due badge */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
        <div style={{
          fontSize: 16, fontWeight: 800,
          color: isIncome ? "#059669" : "#19181E",
          fontFamily: "Inter, sans-serif",
        }}>
          {isIncome ? "+" : "−"}{fmt(item.avgAmountUSD)}
        </div>
        <DueBadge daysUntilDue={item.daysUntilDue} />
      </div>
    </div>
  );
}

// ─── Root Component ───────────────────────────────────────────────────────────
export default function RecurringTab() {
  const [transactions, setTransactions] = useState<RawTx[]>([]);
  const [loading, setLoading] = useState(true);
  const [rates, setRates] = useState<Record<string, number>>(FALLBACK_RATES);

  useEffect(() => {
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

  const { expenses: recurringExpenses, income: recurringIncome } = useMemo(
    () => detectRecurring(transactions, rates),
    [transactions, rates]
  );

  const monthlyExpenseTotal = useMemo(
    () => recurringExpenses.reduce((s, r) => s + toMonthly(r.avgAmountUSD, r.frequency), 0),
    [recurringExpenses]
  );
  const monthlyIncomeTotal = useMemo(
    () => recurringIncome.reduce((s, r) => s + toMonthly(r.avgAmountUSD, r.frequency), 0),
    [recurringIncome]
  );

  const hasAny = recurringExpenses.length > 0 || recurringIncome.length > 0;

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "80px 24px", color: "#94A3B8", fontSize: 14 }}>
        Analysing transaction history…
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>

      {/* ── Page header ──────────────────────────────────────────────────── */}
      <div>
        <h2 style={{ fontFamily: "Manrope, sans-serif", fontSize: 22, fontWeight: 800, color: "#19181E", margin: "0 0 4px", letterSpacing: "-0.5px" }}>
          Recurring Transactions
        </h2>
        <p style={{ color: "#64748B", fontSize: 13, margin: 0 }}>
          Auto-detected from your transaction history. Items appearing in 2+ months are shown here.
        </p>
      </div>

      {/* ── Empty state ───────────────────────────────────────────────────── */}
      {!hasAny && (
        <div style={{
          background: "#fff", border: "1px solid #E2E8F0", borderRadius: 16,
          padding: "60px 32px", textAlign: "center",
        }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🔄</div>
          <div style={{ fontWeight: 700, fontSize: 18, color: "#19181E", marginBottom: 8 }}>
            No recurring patterns detected yet
          </div>
          <div style={{ fontSize: 14, color: "#64748B", maxWidth: 360, margin: "0 auto", lineHeight: 1.6 }}>
            Keep tracking your transactions. Once the same description appears across{" "}
            <strong>2 or more months</strong>, it will automatically show up here.
          </div>
        </div>
      )}

      {/* ── Summary KPI row ───────────────────────────────────────────────── */}
      {hasAny && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <div style={{
            background: "#003527", borderRadius: 16, padding: "20px 24px", border: "none",
          }}>
            <div style={{ fontSize: 10, letterSpacing: "1px", textTransform: "uppercase", color: "rgba(255,255,255,0.5)", fontWeight: 700, marginBottom: 6 }}>
              Monthly Recurring Expenses
            </div>
            <div style={{ fontSize: 28, fontWeight: 800, color: "#FCA5A5", fontFamily: "Inter, sans-serif", letterSpacing: "-1px" }}>
              {fmt(monthlyExpenseTotal)}
            </div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginTop: 4 }}>
              {recurringExpenses.length} item{recurringExpenses.length !== 1 ? "s" : ""} detected
            </div>
          </div>
          <div style={{
            background: "#003527", borderRadius: 16, padding: "20px 24px", border: "none",
          }}>
            <div style={{ fontSize: 10, letterSpacing: "1px", textTransform: "uppercase", color: "rgba(255,255,255,0.5)", fontWeight: 700, marginBottom: 6 }}>
              Monthly Recurring Income
            </div>
            <div style={{ fontSize: 28, fontWeight: 800, color: "#62FAE3", fontFamily: "Inter, sans-serif", letterSpacing: "-1px" }}>
              {fmt(monthlyIncomeTotal)}
            </div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginTop: 4 }}>
              {recurringIncome.length} item{recurringIncome.length !== 1 ? "s" : ""} detected
            </div>
          </div>
        </div>
      )}

      {/* ── Recurring Expenses ────────────────────────────────────────────── */}
      {recurringExpenses.length > 0 && (
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
            <span style={{ fontSize: 16 }}>💸</span>
            <span style={{ fontSize: 13, fontWeight: 800, color: "#DC2626", textTransform: "uppercase", letterSpacing: "0.06em" }}>
              Recurring Expenses
            </span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {recurringExpenses.map(item => (
              <RecurringCard key={item.key} item={item} />
            ))}
          </div>
        </div>
      )}

      {/* ── Recurring Income ──────────────────────────────────────────────── */}
      {recurringIncome.length > 0 && (
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
            <span style={{ fontSize: 16 }}>💰</span>
            <span style={{ fontSize: 13, fontWeight: 800, color: "#059669", textTransform: "uppercase", letterSpacing: "0.06em" }}>
              Recurring Income
            </span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {recurringIncome.map(item => (
              <RecurringCard key={item.key} item={item} />
            ))}
          </div>
        </div>
      )}

    </div>
  );
}
