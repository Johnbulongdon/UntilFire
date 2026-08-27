"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { FALLBACK_RATES, SUPPORTED_CURRENCIES, formatUSDInCurrency } from "@/lib/currency";

const toUSD = (amount: number, currency: string, rates: Record<string, number>): number => {
  if (!currency || currency === "USD") return amount;
  const rate = rates[currency];
  return rate ? amount / rate : amount;
};

type TransactionType = "income" | "expense";

type ExpectedPayment = {
  id: string;
  description: string;
  amount: number;
  currency: string;
  transaction_type: TransactionType;
  due_date: string;
  completed_at: string | null;
};

function todayStr(): string {
  return new Date().toISOString().split("T")[0];
}

function daysUntil(dateStr: string): number {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const due = new Date(dateStr + "T00:00:00");
  return Math.round((due.getTime() - today.getTime()) / 86_400_000);
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

function PaymentCard({
  item, onToggle, onEdit, onDelete,
}: {
  item: ExpectedPayment;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const isIncome = item.transaction_type === "income";
  const isCompleted = !!item.completed_at;

  return (
    <div style={{
      background: "var(--uf-card)", border: "1px solid var(--uf-border)", borderRadius: 12,
      padding: "14px 18px", display: "grid",
      gridTemplateColumns: "1fr auto", gap: 14, alignItems: "center",
      opacity: isCompleted ? 0.6 : 1,
    }}>
      <div>
        <div style={{ fontSize: 14, fontWeight: 700, color: "var(--uf-text)", marginBottom: 5, textDecoration: isCompleted ? "line-through" : "none" }}>
          {item.description}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
          <span style={{
            background: isIncome ? "rgba(5,150,105,0.1)" : "rgba(220,38,38,0.08)",
            color: isIncome ? "#059669" : "#DC2626",
            borderRadius: 999, padding: "2px 9px", fontSize: 11, fontWeight: 700,
          }}>
            {isIncome ? "Incoming" : "Outgoing"}
          </span>
          {isCompleted ? (
            <span style={{ background: "var(--uf-surface-2)", color: "var(--uf-text-3)", borderRadius: 999, padding: "2px 9px", fontSize: 11, fontWeight: 700 }}>
              {isIncome ? "Received" : "Paid"} {new Date(item.completed_at!).toLocaleDateString()}
            </span>
          ) : (
            <DueBadge daysUntilDue={daysUntil(item.due_date)} />
          )}
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8 }}>
        <div style={{
          fontSize: 16, fontWeight: 800, fontFamily: "Manrope, sans-serif",
          color: isCompleted ? "#94A3B8" : (isIncome ? "#059669" : "#19181E"),
        }}>
          {isIncome ? "+" : "−"}{item.currency !== "USD" ? `${item.currency} ` : "$"}{item.amount.toLocaleString()}
        </div>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <button
            onClick={onToggle}
            style={{
              background: isCompleted ? "rgba(100,116,139,0.08)" : "rgba(5,150,105,0.08)",
              color: isCompleted ? "var(--uf-text-2)" : "#059669",
              border: "none", borderRadius: 8, padding: "4px 10px",
              fontSize: 11, fontWeight: 700, cursor: "pointer",
            }}
          >
            {isCompleted ? "Mark pending" : (isIncome ? "Mark received" : "Mark paid")}
          </button>
          <button
            onClick={onEdit}
            style={{ background: "rgba(100,116,139,0.08)", color: "var(--uf-text-2)", border: "none", borderRadius: 8, padding: "4px 8px", fontSize: 13, cursor: "pointer", lineHeight: 1 }}
            title="Edit"
          >
            ✏️
          </button>
          <button
            onClick={onDelete}
            style={{ background: "rgba(220,38,38,0.06)", color: "#DC2626", border: "none", borderRadius: 8, padding: "4px 8px", fontSize: 13, cursor: "pointer", lineHeight: 1 }}
            title="Delete"
          >
            🗑️
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ExpectedPaymentsTab({
  userId, defaultCurrency = "USD", displayCurrency = "USD", displayRates = FALLBACK_RATES, preferredCurrencies = [],
}: {
  userId: string;
  defaultCurrency?: string;
  displayCurrency?: string;
  displayRates?: Record<string, number>;
  preferredCurrencies?: string[];
}) {
  const [payments, setPayments] = useState<ExpectedPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showCompleted, setShowCompleted] = useState(false);

  const [formDesc, setFormDesc] = useState("");
  const [formAmount, setFormAmount] = useState("");
  const [formCurrency, setFormCurrency] = useState(defaultCurrency);
  const [formType, setFormType] = useState<TransactionType>("income");
  const [formDueDate, setFormDueDate] = useState(todayStr());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!userId) return;
    supabase
      .from("expected_payments")
      .select("id, description, amount, currency, transaction_type, due_date, completed_at")
      .eq("user_id", userId)
      .order("due_date")
      .then(({ data }) => {
        setPayments((data as ExpectedPayment[]) ?? []);
        setLoading(false);
      });
  }, [userId]);

  function openAddForm() {
    setEditingId(null);
    setFormDesc(""); setFormAmount(""); setFormCurrency(defaultCurrency);
    setFormType("income"); setFormDueDate(todayStr());
    setShowForm(true);
  }

  function openEditForm(item: ExpectedPayment) {
    setEditingId(item.id);
    setFormDesc(item.description); setFormAmount(String(item.amount));
    setFormCurrency(item.currency); setFormType(item.transaction_type);
    setFormDueDate(item.due_date);
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditingId(null);
  }

  async function saveForm() {
    const amount = parseFloat(formAmount);
    if (!formDesc.trim() || !amount || !formDueDate) return;
    setSaving(true);
    const payload = {
      user_id: userId,
      description: formDesc.trim(),
      amount,
      currency: formCurrency,
      transaction_type: formType,
      due_date: formDueDate,
    };
    if (editingId) {
      const { data } = await supabase.from("expected_payments").update(payload).eq("id", editingId).select().single();
      if (data) setPayments(prev => prev.map(p => p.id === editingId ? (data as ExpectedPayment) : p));
    } else {
      const { data } = await supabase.from("expected_payments").insert(payload).select().single();
      if (data) setPayments(prev => [...prev, data as ExpectedPayment].sort((a, b) => a.due_date.localeCompare(b.due_date)));
    }
    setSaving(false);
    closeForm();
  }

  async function toggleCompleted(item: ExpectedPayment) {
    const completed_at = item.completed_at ? null : new Date().toISOString();
    const { data } = await supabase.from("expected_payments").update({ completed_at }).eq("id", item.id).select().single();
    if (data) setPayments(prev => prev.map(p => p.id === item.id ? (data as ExpectedPayment) : p));
  }

  async function deletePayment(id: string) {
    await supabase.from("expected_payments").delete().eq("id", id);
    setPayments(prev => prev.filter(p => p.id !== id));
  }

  const formatAmount = (usdValue: number) => formatUSDInCurrency(usdValue, displayCurrency, displayRates);

  const pending = payments.filter(p => !p.completed_at);
  const completed = payments.filter(p => p.completed_at).sort((a, b) => (b.completed_at ?? "").localeCompare(a.completed_at ?? ""));
  const overdue = pending.filter(p => daysUntil(p.due_date) < 0).sort((a, b) => a.due_date.localeCompare(b.due_date));
  const upcoming = pending.filter(p => daysUntil(p.due_date) >= 0).sort((a, b) => a.due_date.localeCompare(b.due_date));

  const totalIncomingUSD = pending.filter(p => p.transaction_type === "income").reduce((s, p) => s + toUSD(p.amount, p.currency, displayRates), 0);
  const totalOutgoingUSD = pending.filter(p => p.transaction_type === "expense").reduce((s, p) => s + toUSD(p.amount, p.currency, displayRates), 0);

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "10px 12px", borderRadius: 10,
    border: "1.5px solid var(--uf-border)", fontSize: 14, fontFamily: "inherit",
    outline: "none", background: "var(--uf-card)", boxSizing: "border-box",
  };
  const selectStyle: React.CSSProperties = { ...inputStyle, cursor: "pointer" };

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "80px 24px", color: "var(--uf-text-3)", fontSize: 14 }}>
        Loading…
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: "var(--uf-text)", margin: "0 0 4px", fontFamily: "Bricolage Grotesque, Manrope, sans-serif" }}>
            Expected payments
          </h2>
          <p style={{ color: "var(--uf-text-2)", fontSize: 13, margin: 0 }}>
            One-time payments you&apos;re expecting to receive or owe by a specific date.
          </p>
        </div>
        <button
          onClick={showForm ? closeForm : openAddForm}
          style={{
            background: showForm ? "#F1F5F9" : "linear-gradient(135deg, #059669, #064E3B)",
            color: showForm ? "#64748B" : "#fff",
            border: "none", borderRadius: 10, padding: "10px 18px",
            fontWeight: 700, fontSize: 14, cursor: "pointer", flexShrink: 0,
          }}
        >
          {showForm ? "✕ Cancel" : "+ Add expected payment"}
        </button>
      </div>

      {/* Summary */}
      {pending.length > 0 && (
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
          <div style={{ background: "var(--uf-card)", border: "1px solid var(--uf-border)", borderRadius: 12, padding: "14px 18px", flex: "1 1 200px" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--uf-text-3)", textTransform: "uppercase", marginBottom: 4 }}>Expected in</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: "#059669", fontFamily: "Manrope, sans-serif" }}>+{formatAmount(totalIncomingUSD)}</div>
          </div>
          <div style={{ background: "var(--uf-card)", border: "1px solid var(--uf-border)", borderRadius: 12, padding: "14px 18px", flex: "1 1 200px" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--uf-text-3)", textTransform: "uppercase", marginBottom: 4 }}>Expected out</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: "#DC2626", fontFamily: "Manrope, sans-serif" }}>−{formatAmount(totalOutgoingUSD)}</div>
          </div>
        </div>
      )}

      {/* Add / Edit form */}
      {showForm && (
        <div style={{ background: "var(--uf-card)", border: "1.5px solid var(--uf-border)", borderRadius: 16, padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ fontWeight: 800, fontSize: 15, color: "var(--uf-text)" }}>
            {editingId ? "Edit expected payment" : "Add expected payment"}
          </div>

          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: "var(--uf-text-2)", display: "block", marginBottom: 6 }}>DESCRIPTION</label>
            <input type="text" value={formDesc} onChange={e => setFormDesc(e.target.value)} placeholder="e.g. Client invoice, Tax refund, Car repair" style={inputStyle} />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 120px", gap: 12 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: "var(--uf-text-2)", display: "block", marginBottom: 6 }}>AMOUNT</label>
              <input type="number" value={formAmount} onChange={e => setFormAmount(e.target.value)} placeholder="0" min="0" step="any" style={inputStyle} />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: "var(--uf-text-2)", display: "block", marginBottom: 6 }}>CURRENCY</label>
              <select value={formCurrency} onChange={e => setFormCurrency(e.target.value)} style={selectStyle}>
                {(preferredCurrencies.length > 0 ? preferredCurrencies : [...SUPPORTED_CURRENCIES]).map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: "var(--uf-text-2)", display: "block", marginBottom: 6 }}>DUE DATE</label>
              <input type="date" value={formDueDate} onChange={e => setFormDueDate(e.target.value)} style={inputStyle} />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: "var(--uf-text-2)", display: "block", marginBottom: 6 }}>TYPE</label>
              <div style={{ display: "flex", borderRadius: 10, overflow: "hidden", border: "1.5px solid var(--uf-border)" }}>
                {(["income", "expense"] as const).map(t => (
                  <button
                    key={t}
                    onClick={() => setFormType(t)}
                    style={{
                      flex: 1, padding: "10px 0", border: "none", cursor: "pointer", fontSize: 13, fontWeight: 700,
                      background: formType === t ? (t === "income" ? "#059669" : "#DC2626") : "#fff",
                      color: formType === t ? "#fff" : "#64748B",
                    }}
                  >
                    {t === "income" ? "Incoming" : "Outgoing"}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <button
            onClick={saveForm}
            disabled={saving || !formDesc.trim() || !formAmount || !formDueDate}
            style={{
              background: (!formDesc.trim() || !formAmount || !formDueDate) ? "#E2E8F0" : "linear-gradient(135deg, #059669, #064E3B)",
              color: (!formDesc.trim() || !formAmount || !formDueDate) ? "#94A3B8" : "#fff",
              border: "none", borderRadius: 10, padding: "12px 0",
              fontWeight: 700, fontSize: 14, cursor: (!formDesc.trim() || !formAmount || !formDueDate) ? "default" : "pointer",
            }}
          >
            {editingId ? "Save changes" : "Add payment"}
          </button>
        </div>
      )}

      {/* Overdue */}
      {overdue.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#DC2626" }}>Overdue ({overdue.length})</div>
          {overdue.map(item => (
            <PaymentCard key={item.id} item={item} onToggle={() => toggleCompleted(item)} onEdit={() => openEditForm(item)} onDelete={() => deletePayment(item.id)} />
          ))}
        </div>
      )}

      {/* Upcoming */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "var(--uf-text-2)" }}>Upcoming ({upcoming.length})</div>
        {upcoming.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px 24px", color: "var(--uf-text-3)", fontSize: 13, background: "var(--uf-card)", border: "1px dashed var(--uf-border)", borderRadius: 12 }}>
            No expected payments yet. Add one to track a payment coming in or a bill due.
          </div>
        ) : (
          upcoming.map(item => (
            <PaymentCard key={item.id} item={item} onToggle={() => toggleCompleted(item)} onEdit={() => openEditForm(item)} onDelete={() => deletePayment(item.id)} />
          ))
        )}
      </div>

      {/* Completed (collapsible) */}
      {completed.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <button
            onClick={() => setShowCompleted(v => !v)}
            style={{ background: "none", border: "none", padding: 0, textAlign: "left", fontSize: 13, fontWeight: 700, color: "var(--uf-text-2)", cursor: "pointer" }}
          >
            {showCompleted ? "▾" : "▸"} Completed ({completed.length})
          </button>
          {showCompleted && completed.map(item => (
            <PaymentCard key={item.id} item={item} onToggle={() => toggleCompleted(item)} onEdit={() => openEditForm(item)} onDelete={() => deletePayment(item.id)} />
          ))}
        </div>
      )}
    </div>
  );
}
