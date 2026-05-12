"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { PieChart, Pie, Cell, Tooltip as ChartTooltip, ResponsiveContainer } from "recharts";

const EXPENSE_CATEGORIES = [
  { key: "food",          label: "Food & Dining", code: "FD", color: "#f97316" },
  { key: "transport",     label: "Transport",     code: "TR", color: "#22d3a5" },
  { key: "housing",       label: "Housing",       code: "HO", color: "#818cf8" },
  { key: "subscriptions", label: "Subscriptions", code: "SB", color: "#a78bfa" },
  { key: "healthcare",    label: "Healthcare",    code: "HC", color: "#ef4444" },
  { key: "entertainment", label: "Entertainment", code: "EN", color: "#fbbf24" },
  { key: "shopping",      label: "Shopping",      code: "SH", color: "#ec4899" },
  { key: "work",          label: "Work Expense",  code: "WK", color: "#6366f1" },
  { key: "other",         label: "Other",         code: "OT", color: "#6b6b85" },
];

const INCOME_CATEGORIES = [
  { key: "salary",       label: "Salary",       code: "SA", color: "#22d3a5" },
  { key: "freelance",    label: "Freelance",    code: "FR", color: "#34d399" },
  { key: "investment",   label: "Investment",   code: "IN", color: "#818cf8" },
  { key: "gift",         label: "Gift",         code: "GF", color: "#a78bfa" },
  { key: "other_income", label: "Other Income", code: "OI", color: "#6b6b85" },
];

const ALL_CATEGORIES = [...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES];

const CURRENCIES = ["USD", "EUR", "GBP", "JPY", "CNY", "AUD", "CAD", "SGD", "HKD"];

const fmt = (n: number, currency = "USD") =>
  new Intl.NumberFormat("en-US", { style: "currency", currency, minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(n);

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
};

async function aiCategorize(
  description: string,
  type: "expense" | "income"
): Promise<{ category: string; tags: string[]; is_work_related: boolean }> {
  const categories =
    type === "income"
      ? "salary, freelance, investment, gift, other_income"
      : "food, transport, housing, subscriptions, healthcare, entertainment, shopping, work, other";
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

function AddTransactionForm({ onAdd }: { onAdd: (t: Transaction) => void }) {
  const [transactionType, setTransactionType] = useState<"expense" | "income">("expense");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [isWorkRelated, setIsWorkRelated] = useState(false);
  const [categorizing, setCategorizing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [aiUsed, setAiUsed] = useState(false);

  const categories = transactionType === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
  const catInfo = categories.find((c) => c.key === category);

  const switchType = (t: "expense" | "income") => {
    setTransactionType(t);
    setCategory("");
    setTags([]);
    setIsWorkRelated(false);
    setAiUsed(false);
  };

  const handleDescriptionBlur = async () => {
    if (!description || category) return;
    setCategorizing(true);
    const result = await aiCategorize(description, transactionType);
    setCategory(result.category);
    setTags(result.tags);
    setIsWorkRelated(result.is_work_related);
    setAiUsed(true);
    setCategorizing(false);
  };

  const handleSubmit = async () => {
    if (!date || !amount || !description) return;
    setSaving(true);
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) return;

    let finalCategory = category;
    let finalTags = tags;
    let finalWorkRelated = isWorkRelated;
    if (!finalCategory) {
      const result = await aiCategorize(description, transactionType);
      finalCategory = result.category;
      finalTags = result.tags;
      finalWorkRelated = result.is_work_related;
    }

    const { data, error } = await supabase
      .from("expenses")
      .insert({
        user_id: session.user.id,
        date,
        amount: parseFloat(amount),
        currency,
        description,
        category: finalCategory,
        tags: finalTags,
        is_work_related: finalWorkRelated,
        transaction_type: transactionType,
      })
      .select()
      .single();

    if (!error && data) {
      onAdd(data);
      setAmount("");
      setDescription("");
      setCategory("");
      setTags([]);
      setIsWorkRelated(false);
      setAiUsed(false);
    }
    setSaving(false);
  };

  const isIncome = transactionType === "income";

  return (
    <div className="uf-card" style={{ marginBottom: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div style={{ fontWeight: 700, fontSize: 16 }}>Add Transaction</div>
        <div style={{ display: "flex", background: "#e8e8f0", borderRadius: 8, padding: 3, gap: 2 }}>
          {(["expense", "income"] as const).map((t) => (
            <button
              key={t}
              onClick={() => switchType(t)}
              style={{
                background:
                  transactionType === t
                    ? t === "income"
                      ? "rgba(34,211,165,0.15)"
                      : "rgba(239,68,68,0.12)"
                    : "transparent",
                border:
                  transactionType === t
                    ? `1px solid ${t === "income" ? "rgba(34,211,165,0.3)" : "rgba(239,68,68,0.25)"}`
                    : "1px solid transparent",
                color: transactionType === t ? (t === "income" ? "#22d3a5" : "#ef4444") : "#9090a8",
                borderRadius: 6,
                padding: "5px 14px",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              {t === "expense" ? "Expense" : "Income"}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 12 }}>
        <div>
          <div style={{ color: "#9090a8", fontSize: 12, marginBottom: 6 }}>Date</div>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            style={{ width: "100%", background: "#f9f9fb", border: "1px solid #e8e8f0", borderRadius: 8, padding: "8px 12px", color: "#1a1a2e", fontSize: 14, outline: "none", fontFamily: "inherit" }}
          />
        </div>
        <div>
          <div style={{ color: "#9090a8", fontSize: 12, marginBottom: 6 }}>Amount</div>
          <input
            type="number"
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            style={{ width: "100%", background: "#f9f9fb", border: "1px solid #e8e8f0", borderRadius: 8, padding: "8px 12px", color: "#1a1a2e", fontSize: 14, outline: "none", fontFamily: "'DM Mono', monospace" }}
          />
        </div>
        <div>
          <div style={{ color: "#9090a8", fontSize: 12, marginBottom: 6 }}>Currency</div>
          <select
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            style={{ width: "100%", background: "#f9f9fb", border: "1px solid #e8e8f0", borderRadius: 8, padding: "8px 12px", color: "#1a1a2e", fontSize: 14, outline: "none", fontFamily: "inherit" }}
          >
            {CURRENCIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div style={{ marginBottom: 12 }}>
        <div style={{ color: "#9090a8", fontSize: 12, marginBottom: 6 }}>
          Description
          {categorizing && <span style={{ color: "#f97316", marginLeft: 8, fontSize: 11 }}>AI categorizing...</span>}
          {aiUsed && !categorizing && <span style={{ color: "#22d3a5", marginLeft: 8, fontSize: 11 }}>AI categorized</span>}
        </div>
        <input
          type="text"
          placeholder={isIncome ? "e.g. Monthly salary, Freelance project, Dividend..." : "e.g. Starbucks latte, Uber to office, Netflix..."}
          value={description}
          onChange={(e) => { setDescription(e.target.value); setAiUsed(false); setCategory(""); }}
          onBlur={handleDescriptionBlur}
          style={{ width: "100%", background: "#f9f9fb", border: "1px solid #e8e8f0", borderRadius: 8, padding: "10px 12px", color: "#1a1a2e", fontSize: 14, outline: "none", fontFamily: "inherit" }}
        />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
        <div>
          <div style={{ color: "#9090a8", fontSize: 12, marginBottom: 6 }}>Category</div>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            style={{ width: "100%", background: "#f9f9fb", border: `1px solid ${catInfo ? catInfo.color + "66" : "#e8e8f0"}`, borderRadius: 8, padding: "8px 12px", color: catInfo ? catInfo.color : "#1a1a2e", fontSize: 14, outline: "none", fontFamily: "inherit" }}
          >
            <option value="">Select category...</option>
            {categories.map((c) => (
              <option key={c.key} value={c.key}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <div style={{ color: "#9090a8", fontSize: 12, marginBottom: 6 }}>Tags</div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", minHeight: 38, alignItems: "center", background: "#f9f9fb", border: "1px solid #e8e8f0", borderRadius: 8, padding: "6px 12px" }}>
            {tags.length === 0 ? (
              <span style={{ color: "#9090a8", fontSize: 13 }}>AI will suggest tags</span>
            ) : (
              tags.map((t) => (
                <span key={t} style={{ background: "rgba(249,115,22,0.15)", color: "#f97316", borderRadius: 4, padding: "2px 8px", fontSize: 12 }}>
                  #{t}
                </span>
              ))
            )}
          </div>
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        {!isIncome ? (
          <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 13, color: isWorkRelated ? "#6366f1" : "#9090a8" }}>
            <input type="checkbox" checked={isWorkRelated} onChange={(e) => setIsWorkRelated(e.target.checked)} style={{ accentColor: "#6366f1" }} />
            Work expense
          </label>
        ) : (
          <div />
        )}
        <button
          onClick={handleSubmit}
          disabled={saving || !amount || !description}
          style={{ background: isIncome ? "#22d3a5" : "#f97316", color: isIncome ? "#0a2010" : "#fff", border: "none", borderRadius: 10, padding: "10px 28px", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "'Syne', sans-serif", opacity: saving || !amount || !description ? 0.5 : 1 }}
        >
          {saving ? "Saving..." : "Add transaction →"}
        </button>
      </div>
    </div>
  );
}

function TransactionList({ transactions, onDelete }: { transactions: Transaction[]; onDelete: (id: string) => void }) {
  const grouped = transactions.reduce(
    (acc, t) => {
      const month = t.date.slice(0, 7);
      if (!acc[month]) acc[month] = [];
      acc[month].push(t);
      return acc;
    },
    {} as Record<string, Transaction[]>
  );

  const months = Object.keys(grouped).sort().reverse();

  if (transactions.length === 0) {
    return (
      <div className="uf-card" style={{ textAlign: "center", padding: "48px 24px" }}>
        <div style={{ fontSize: 12, letterSpacing: "0.12em", textTransform: "uppercase", color: "#9090a8", marginBottom: 16 }}>Transactions</div>
        <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 8 }}>No transactions yet</div>
        <div style={{ color: "#9090a8", fontSize: 14 }}>Add your first transaction above — AI will categorize it automatically</div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {months.map((month) => {
        const monthTxns = grouped[month];
        const income = monthTxns.filter((t) => t.transaction_type === "income").reduce((s, t) => s + t.amount, 0);
        const spent = monthTxns.filter((t) => t.transaction_type !== "income").reduce((s, t) => s + t.amount, 0);
        const net = income - spent;
        const date = new Date(month + "-01");
        const monthLabel = date.toLocaleDateString("en-US", { month: "long", year: "numeric" });

        return (
          <div key={month}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <div style={{ fontWeight: 700, fontSize: 15 }}>{monthLabel}</div>
              <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
                {income > 0 && <span style={{ fontFamily: "'DM Mono', monospace", color: "#22d3a5", fontSize: 13, fontWeight: 600 }}>+{fmt(income)}</span>}
                {spent > 0 && <span style={{ fontFamily: "'DM Mono', monospace", color: "#ef4444", fontSize: 13, fontWeight: 600 }}>−{fmt(spent)}</span>}
                {income > 0 && spent > 0 && (
                  <span style={{ fontFamily: "'DM Mono', monospace", color: net >= 0 ? "#22d3a5" : "#ef4444", fontSize: 13, fontWeight: 700, borderLeft: "1px solid #e8e8f0", paddingLeft: 14 }}>
                    Net {net >= 0 ? "+" : "−"}{fmt(Math.abs(net))}
                  </span>
                )}
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {monthTxns
                .sort((a, b) => b.date.localeCompare(a.date))
                .map((txn) => {
                  const isIncome = txn.transaction_type === "income";
                  const cat = ALL_CATEGORIES.find((c) => c.key === txn.category);
                  return (
                    <div key={txn.id} className="uf-card" style={{ padding: "14px 18px", display: "flex", alignItems: "center", gap: 12 }}>
                      <div style={{ width: 36, height: 36, borderRadius: 10, background: `${cat?.color || "#6b6b85"}22`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>
                        {cat?.code || (isIncome ? "IN" : "EX")}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 3 }}>{txn.description}</div>
                        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                          <span style={{ color: cat?.color || "#6b6b85", fontSize: 11, fontWeight: 600 }}>{cat?.label || txn.category}</span>
                          {txn.is_work_related && <span style={{ background: "rgba(99,102,241,0.15)", color: "#6366f1", borderRadius: 4, padding: "1px 6px", fontSize: 11 }}>work</span>}
                          {txn.tags?.map((t) => (
                            <span key={t} style={{ background: "rgba(249,115,22,0.1)", color: "#f97316", borderRadius: 4, padding: "1px 6px", fontSize: 11 }}>
                              #{t}
                            </span>
                          ))}
                          <span style={{ color: "#9090a8", fontSize: 11 }}>{new Date(txn.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
                        </div>
                      </div>
                      <div style={{ textAlign: "right", flexShrink: 0 }}>
                        <div style={{ fontFamily: "'DM Mono', monospace", fontWeight: 700, fontSize: 15, color: isIncome ? "#22d3a5" : "#1a1a2e" }}>
                          {isIncome ? "+" : ""}{fmt(txn.amount, txn.currency)}
                        </div>
                        <button onClick={() => onDelete(txn.id)} style={{ background: "none", border: "none", color: "#9090a8", fontSize: 11, cursor: "pointer", marginTop: 4 }}>
                          delete
                        </button>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function MonthlySummary({
  transactions,
  viewMonth,
  onPrevMonth,
  onNextMonth,
  budgetExpenses,
}: {
  transactions: Transaction[];
  viewMonth: string;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  budgetExpenses: Record<string, number> | null;
}) {
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const isCurrentMonth = viewMonth === currentMonth;
  const [y, m] = viewMonth.split("-").map(Number);
  const monthLabel = new Date(y, m - 1, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" });

  const monthTxns = transactions.filter((t) => t.date.startsWith(viewMonth));
  const incomeTotal = monthTxns.filter((t) => t.transaction_type === "income").reduce((s, t) => s + t.amount, 0);
  const expenseTotal = monthTxns.filter((t) => t.transaction_type !== "income").reduce((s, t) => s + t.amount, 0);
  const net = incomeTotal - expenseTotal;
  const workTotal = monthTxns.filter((t) => t.is_work_related).reduce((s, t) => s + t.amount, 0);

  const byCat = EXPENSE_CATEGORIES.map((cat) => ({
    ...cat,
    total: monthTxns.filter((t) => t.transaction_type !== "income" && t.category === cat.key).reduce((s, t) => s + t.amount, 0),
  }))
    .filter((c) => c.total > 0)
    .sort((a, b) => b.total - a.total);

  return (
    <div className="uf-card" style={{ marginBottom: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div style={{ fontWeight: 700, fontSize: 16 }}>{monthLabel}</div>
        <div style={{ display: "flex", gap: 4 }}>
          <button
            onClick={onPrevMonth}
            style={{ background: "#e8e8f0", border: "none", color: "#1a1a2e", borderRadius: 6, padding: "4px 12px", cursor: "pointer", fontSize: 16, lineHeight: 1 }}
          >
            ←
          </button>
          <button
            onClick={onNextMonth}
            disabled={isCurrentMonth}
            style={{ background: "#e8e8f0", border: "none", color: isCurrentMonth ? "#b8b8cc" : "#1a1a2e", borderRadius: 6, padding: "4px 12px", cursor: isCurrentMonth ? "default" : "pointer", fontSize: 16, lineHeight: 1 }}
          >
            →
          </button>
        </div>
      </div>

      {monthTxns.length === 0 ? (
        <div style={{ textAlign: "center", padding: "32px 0", color: "#9090a8", fontSize: 14 }}>No transactions for this month</div>
      ) : (
        <>
          <div style={{ display: "grid", gridTemplateColumns: workTotal > 0 ? "1fr 1fr 1fr 1fr" : "1fr 1fr 1fr", gap: 12, marginBottom: 24 }}>
            <div style={{ background: "#f9f9fb", borderRadius: 12, padding: "14px 16px" }}>
              <div style={{ color: "#9090a8", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>Income</div>
              <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 22, fontWeight: 700, color: "#22d3a5" }}>{fmt(incomeTotal)}</div>
            </div>
            <div style={{ background: "#f9f9fb", borderRadius: 12, padding: "14px 16px" }}>
              <div style={{ color: "#9090a8", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>Spent</div>
              <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 22, fontWeight: 700, color: "#ef4444" }}>{fmt(expenseTotal)}</div>
            </div>
            <div style={{ background: net >= 0 ? "rgba(34,211,165,0.06)" : "rgba(239,68,68,0.06)", border: `1px solid ${net >= 0 ? "rgba(34,211,165,0.2)" : "rgba(239,68,68,0.2)"}`, borderRadius: 12, padding: "14px 16px" }}>
              <div style={{ color: "#9090a8", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>Net</div>
              <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 22, fontWeight: 700, color: net >= 0 ? "#22d3a5" : "#ef4444" }}>
                {net >= 0 ? "+" : "−"}{fmt(Math.abs(net))}
              </div>
            </div>
            {workTotal > 0 && (
              <div style={{ background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.2)", borderRadius: 12, padding: "14px 16px" }}>
                <div style={{ color: "#6366f1", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>Work</div>
                <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 22, fontWeight: 700, color: "#6366f1" }}>{fmt(workTotal)}</div>
              </div>
            )}
          </div>

          {byCat.length > 0 && (
            <div style={{ display: "flex", gap: 24, alignItems: "flex-start" }}>
              <div style={{ flexShrink: 0 }}>
                <ResponsiveContainer width={176} height={176}>
                  <PieChart>
                    <Pie data={byCat} cx="50%" cy="50%" innerRadius={52} outerRadius={80} paddingAngle={2} dataKey="total">
                      {byCat.map((cat) => (
                        <Cell key={cat.key} fill={cat.color} />
                      ))}
                    </Pie>
                    <ChartTooltip
                      formatter={(v) => [fmt(Number(v ?? 0)), ""]}
                      contentStyle={{ background: "#ffffff", border: "1px solid #e8e8f0", borderRadius: 8, fontFamily: "DM Mono, monospace", fontSize: 12 }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 10, paddingTop: 4 }}>
                {byCat.map((cat) => {
                  const budget = budgetExpenses?.[cat.key] || 0;
                  const over = budget > 0 && cat.total > budget;
                  const barPct = budget > 0 ? Math.min(100, (cat.total / budget) * 100) : (cat.total / expenseTotal) * 100;
                  return (
                    <div key={cat.key}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 3 }}>
                        <span style={{ color: "#6b6b85" }}>{cat.label}</span>
                        <span style={{ fontFamily: "'DM Mono', monospace", fontWeight: 600, color: over ? "#ef4444" : cat.color }}>
                          {fmt(cat.total)}
                          {budget > 0 ? (
                            <span style={{ color: "#9090a8", fontWeight: 400 }}> / {fmt(budget)}</span>
                          ) : (
                            <span style={{ color: "#9090a8", fontWeight: 400 }}> ({((cat.total / expenseTotal) * 100).toFixed(0)}%)</span>
                          )}
                        </span>
                      </div>
                      <div style={{ height: 4, background: "#e8e8f0", borderRadius: 4, overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${barPct}%`, background: over ? "#ef4444" : cat.color, borderRadius: 4, transition: "width 0.4s" }} />
                      </div>
                      {over && <div style={{ fontSize: 11, color: "#ef4444", marginTop: 2 }}>over by {fmt(cat.total - budget)}</div>}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function TransactionsTab() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const [viewMonth, setViewMonth] = useState(currentMonth);
  const [budgetExpenses, setBudgetExpenses] = useState<Record<string, number> | null>(null);

  useEffect(() => {
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

  const handleAdd = (txn: Transaction) => setTransactions((prev) => [txn, ...prev]);

  const handleDelete = async (id: string) => {
    if (!window.confirm("Delete this transaction?")) return;
    await supabase.from("expenses").delete().eq("id", id);
    setTransactions((prev) => prev.filter((t) => t.id !== id));
  };

  const handlePrevMonth = () => {
    const [y, m] = viewMonth.split("-").map(Number);
    const d = new Date(y, m - 2, 1);
    setViewMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  };

  const handleNextMonth = () => {
    const [y, m] = viewMonth.split("-").map(Number);
    const d = new Date(y, m, 1);
    const next = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    if (next <= currentMonth) setViewMonth(next);
  };

  if (loading) {
    return <div style={{ textAlign: "center", padding: "60px 0", color: "#9090a8" }}>Loading transactions...</div>;
  }

  return (
    <>
      <MonthlySummary
        transactions={transactions}
        viewMonth={viewMonth}
        onPrevMonth={handlePrevMonth}
        onNextMonth={handleNextMonth}
        budgetExpenses={budgetExpenses}
      />
      <AddTransactionForm onAdd={handleAdd} />
      <TransactionList transactions={transactions} onDelete={handleDelete} />
    </>
  );
}
