"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { FALLBACK_RATES, SUPPORTED_CURRENCIES } from "@/lib/currency";
import { formatUSDInCurrency } from "@/lib/money";
import { addRecurrence, isoDay } from "@/lib/cashflow-forecast";
import ExpectedMonth from "./ExpectedMonth";
import { parseIsoDate } from "@/lib/contribution-schedule";
import {
  detectRecurring, toRecurrence, sameMerchant,
  recurrenceToMonthly, RECURRENCE_LABEL,
  type DetectedItem, type RawTx, type Recurrence,
} from "@/lib/recurring-detect";

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
  recurrence: Recurrence;
  category: string | null;
};

const SELECT_COLUMNS =
  "id, description, amount, currency, transaction_type, due_date, completed_at, recurrence, category";

function todayStr(): string {
  return new Date().toISOString().split("T")[0];
}

function daysUntil(dateStr: string): number {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const due = new Date(dateStr + "T00:00:00");
  return Math.round((due.getTime() - today.getTime()) / 86_400_000);
}

/**
 * Move recurring items out of localStorage and into the table, once.
 *
 * The old Recurring tab kept hand-added bills in `uf_recurring_manual`, which
 * meant they never left the browser that created them. Anyone who added bills
 * on their phone had them only there. This runs before the first read, keeps
 * the localStorage copy rather than deleting it (a failed insert should not
 * lose the only copy), and marks itself done so it cannot double-insert.
 */
async function rescueLocalRecurring(userId: string): Promise<void> {
  let raw: string | null = null;
  try {
    if (localStorage.getItem("uf_recurring_migrated") === "1") return;
    raw = localStorage.getItem("uf_recurring_manual");
  } catch {
    return; // storage blocked — nothing to rescue
  }
  if (!raw) {
    try { localStorage.setItem("uf_recurring_migrated", "1"); } catch {}
    return;
  }

  type OldItem = {
    description?: string; amount?: number; currency?: string;
    transaction_type?: string; frequency?: string; nextDueDate?: string;
  };
  let items: OldItem[] = [];
  try { items = JSON.parse(raw); } catch { return; }
  if (!Array.isArray(items) || items.length === 0) {
    try { localStorage.setItem("uf_recurring_migrated", "1"); } catch {}
    return;
  }

  const rows = items
    .filter((i) => i?.description && Number(i.amount) > 0)
    .map((i) => ({
      user_id: userId,
      description: String(i.description).slice(0, 200),
      amount: Number(i.amount),
      currency: i.currency || "USD",
      transaction_type: i.transaction_type === "income" ? "income" : "expense",
      due_date: i.nextDueDate || todayStr(),
      recurrence: toRecurrence((i.frequency as never) ?? "monthly"),
    }));
  if (rows.length === 0) {
    try { localStorage.setItem("uf_recurring_migrated", "1"); } catch {}
    return;
  }

  const { error } = await supabase.from("expected_payments").insert(rows);
  // Only mark done on success, so a transient failure retries next load
  // instead of silently dropping the items.
  if (!error) {
    try { localStorage.setItem("uf_recurring_migrated", "1"); } catch {}
  }
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
          {item.category && (
            <span style={{ background: "var(--uf-surface-2)", color: "var(--uf-text-2)", borderRadius: 999, padding: "2px 9px", fontSize: 11, fontWeight: 700 }}>
              {item.category}
            </span>
          )}
          {item.recurrence !== "none" && (
            <span style={{ background: "var(--uf-surface-2)", color: "var(--uf-text-2)", borderRadius: 999, padding: "2px 9px", fontSize: 11, fontWeight: 700 }}>
              {RECURRENCE_LABEL[item.recurrence]}
            </span>
          )}
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
  budgetMonthlySpending = 0,
}: {
  userId: string;
  defaultCurrency?: string;
  displayCurrency?: string;
  displayRates?: Record<string, number>;
  preferredCurrencies?: string[];
  /** The Budget tab's monthly spending, for the month view's day-to-day line. */
  budgetMonthlySpending?: number;
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
  const [formRecurrence, setFormRecurrence] = useState<Recurrence>("none");
  const [saving, setSaving] = useState(false);
  const [suggestions, setSuggestions] = useState<DetectedItem[]>([]);
  const [dismissed, setDismissed] = useState<string[]>([]);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;

    (async () => {
      // Recurring items used to live in localStorage, so they were device-local
      // and invisible to the server. Move any that are still there into the
      // table before the first render, once, rather than leaving someone's
      // bills stranded in a browser.
      await rescueLocalRecurring(userId);
      if (cancelled) return;

      const { data } = await supabase
        .from("expected_payments")
        .select(SELECT_COLUMNS)
        .eq("user_id", userId)
        .order("due_date");
      if (cancelled) return;
      setPayments((data as ExpectedPayment[]) ?? []);
      setLoading(false);

      // Detection is a suggestion feed, never a list in its own right.
      const { data: txns } = await supabase
        .from("expenses")
        .select("id, date, amount, currency, description, category, transaction_type")
        .eq("user_id", userId)
        .order("date", { ascending: false });
      if (cancelled || !txns) return;
      const found = detectRecurring(txns as RawTx[], displayRates);
      setSuggestions([...found.expenses, ...found.income].slice(0, 8));
      try {
        setDismissed(JSON.parse(localStorage.getItem("uf_expected_dismissed") || "[]"));
      } catch { /* a browser with storage blocked simply sees every suggestion */ }
    })();

    return () => { cancelled = true; };
  }, [userId, displayRates]);

  function openAddForm() {
    setEditingId(null);
    setFormDesc(""); setFormAmount(""); setFormCurrency(defaultCurrency);
    setFormType("income"); setFormDueDate(todayStr()); setFormRecurrence("none");
    setShowForm(true);
  }

  function openEditForm(item: ExpectedPayment) {
    setEditingId(item.id);
    setFormDesc(item.description); setFormAmount(String(item.amount));
    setFormCurrency(item.currency); setFormType(item.transaction_type);
    setFormDueDate(item.due_date); setFormRecurrence(item.recurrence ?? "none");
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
      recurrence: formRecurrence,
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
    // A one-off that is paid is finished. A repeat that is paid is not — it is
    // due again next period, and burying it in a completed pile is how rent
    // disappears from a list whose whole job is telling you rent is coming.
    if (item.recurrence !== "none" && !item.completed_at) {
      // Calendar months in local time, via the same helper the contribution
      // forecast uses. The previous version added a fixed 30 days and wrote
      // the result with toISOString(), which converts to UTC: in UTC+8 a bill
      // due on the 28th rolled to the 27th, and a bill due on the 1st walked
      // to the 31st, then the 30th. Only the current due date is stored, so an
      // anchor on the 29th–31st still settles after meeting a short month;
      // every other day of the month now holds for good.
      const current = parseIsoDate(item.due_date);
      const due_date = current
        ? isoDay(addRecurrence(current, item.recurrence as Recurrence))
        : item.due_date;
      const { data } = await supabase
        .from("expected_payments").update({ due_date }).eq("id", item.id).select().single();
      if (data) {
        setPayments(prev => prev.map(p => p.id === item.id ? (data as ExpectedPayment) : p)
                                .sort((a, b) => a.due_date.localeCompare(b.due_date)));
      }
      return;
    }
    const completed_at = item.completed_at ? null : new Date().toISOString();
    const { data } = await supabase.from("expected_payments").update({ completed_at }).eq("id", item.id).select().single();
    if (data) setPayments(prev => prev.map(p => p.id === item.id ? (data as ExpectedPayment) : p));
  }

  /** Accepting a suggestion creates a real row the user owns and can edit. */
  async function acceptSuggestion(sug: DetectedItem) {
    const payload = {
      user_id: userId,
      description: sug.description,
      amount: Math.round(sug.avgAmountUSD * 100) / 100,
      currency: "USD",
      transaction_type: sug.transaction_type,
      due_date: sug.nextDueDate,
      recurrence: toRecurrence(sug.frequency),
      category: sug.category || null,
    };
    const { data } = await supabase.from("expected_payments").insert(payload).select().single();
    if (data) {
      setPayments((prev) => [...prev, data as ExpectedPayment].sort((a, b) => a.due_date.localeCompare(b.due_date)));
      setSuggestions((prev) => prev.filter((x) => x.key !== sug.key));
    }
  }

  function dismissSuggestion(key: string) {
    const next = [...dismissed, key];
    setDismissed(next);
    try { localStorage.setItem("uf_expected_dismissed", JSON.stringify(next)); } catch {}
  }

  async function deletePayment(id: string) {
    await supabase.from("expected_payments").delete().eq("id", id);
    setPayments(prev => prev.filter(p => p.id !== id));
  }

  const formatAmount = (usdValue: number) => formatUSDInCurrency(usdValue, displayCurrency, displayRates);

  // Already-added and dismissed suggestions drop out, matched on description
  // so accepting one does not leave its twin sitting in the strip.
  const visibleSuggestions = suggestions.filter(
    x => !dismissed.includes(x.key) &&
         !payments.some(p => sameMerchant(p.description, x.description)),
  );

  const pending = payments.filter(p => !p.completed_at);
  const completed = payments.filter(p => p.completed_at).sort((a, b) => (b.completed_at ?? "").localeCompare(a.completed_at ?? ""));
  const overdue = pending.filter(p => daysUntil(p.due_date) < 0).sort((a, b) => a.due_date.localeCompare(b.due_date));
  const upcoming = pending.filter(p => daysUntil(p.due_date) >= 0).sort((a, b) => a.due_date.localeCompare(b.due_date));

  const totalIncomingUSD = pending.filter(p => p.transaction_type === "income").reduce((s, p) => s + toUSD(p.amount, p.currency, displayRates), 0);
  const totalOutgoingUSD = pending.filter(p => p.transaction_type === "expense").reduce((s, p) => s + toUSD(p.amount, p.currency, displayRates), 0);

  // Committed spending, normalised. Summing raw amounts made a £1,200 yearly
  // policy weigh the same as £1,200 of rent every month, which is the figure
  // people were reading off the top of the page.
  const committedMonthlyUSD = payments
    .filter(p => p.recurrence !== "none" && p.transaction_type === "expense")
    .reduce((s, p) => s + recurrenceToMonthly(toUSD(p.amount, p.currency, displayRates), p.recurrence), 0);
  // 25x annual spending — the same rule the freedom date uses.
  const committedShareOfTarget = committedMonthlyUSD * 12 * 25;

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
          <h2 style={{ fontSize: 20, fontWeight: 800, color: "var(--uf-text)", margin: "0 0 4px", fontFamily: "Fraunces, Georgia, serif" }}>
            Upcoming
          </h2>
          <p style={{ color: "var(--uf-text-2)", fontSize: 13, margin: 0 }}>
            Money you expect in or out &mdash; a one-off, or a bill that repeats. Nothing is here unless you put it here.
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

      {/* The month first, in date order: the dated half of the budget, which
          is what the contribution forecast is built from. */}
      <ExpectedMonth
        items={payments.map((p) => ({
          description: p.description,
          amountUSD: toUSD(p.amount, p.currency, displayRates),
          type: p.transaction_type,
          dueDate: p.due_date,
          recurrence: p.recurrence,
          completed: !!p.completed_at,
        }))}
        budgetMonthlySpending={budgetMonthlySpending}
        formatAmount={formatAmount}
      />

      {/* Spotted in transaction history. A guess until accepted — it never
          joins the list on its own, which is the whole reason the list can be
          trusted: everything in it is there because someone put it there. */}
      {visibleSuggestions.length > 0 && (
        <div style={{ background: "var(--uf-surface)", border: "1px solid var(--uf-border)", borderRadius: 12, padding: 14 }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: "var(--uf-text-2)", marginBottom: 10 }}>
            Spotted in your transactions
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {visibleSuggestions.map(sug => (
              <div key={sug.key} style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: "var(--uf-text)", flex: 1, minWidth: 130 }}>
                  {sug.description}
                </span>
                <span style={{ fontSize: 13, fontFamily: "var(--uf-font-mono)", fontVariantNumeric: "tabular-nums", color: "var(--uf-text-2)" }}>
                  {formatAmount(sug.avgAmountUSD)}
                </span>
                <span style={{ fontSize: 11, fontWeight: 700, color: "var(--uf-text-3)" }}>
                  {RECURRENCE_LABEL[toRecurrence(sug.frequency) as Recurrence]} &middot; seen {sug.occurrences}&times;
                  {sug.category ? ` · ${sug.category}` : ""}
                </span>
                <button onClick={() => acceptSuggestion(sug)} style={{ background: "rgba(5,150,105,0.08)", color: "#059669", border: "none", borderRadius: 8, padding: "5px 12px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                  Add
                </button>
                <button onClick={() => dismissSuggestion(sug.key)} style={{ background: "transparent", color: "var(--uf-text-3)", border: "none", padding: "5px 6px", fontSize: 12, cursor: "pointer" }}>
                  Not this
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Summary */}
      {pending.length > 0 && (
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
          <div style={{ background: "var(--uf-card)", border: "1px solid var(--uf-border)", borderRadius: 12, padding: "14px 18px", flex: "1 1 200px" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--uf-text-3)", textTransform: "uppercase", marginBottom: 4 }}>Still to come in</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: "#059669", fontFamily: "Manrope, sans-serif" }}>+{formatAmount(totalIncomingUSD)}</div>
          </div>
          <div style={{ background: "var(--uf-card)", border: "1px solid var(--uf-border)", borderRadius: 12, padding: "14px 18px", flex: "1 1 200px" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--uf-text-3)", textTransform: "uppercase", marginBottom: 4 }}>Still to go out</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: "#DC2626", fontFamily: "Manrope, sans-serif" }}>−{formatAmount(totalOutgoingUSD)}</div>
          </div>
        </div>
      )}

      {/* The answer this page exists to give. The two figures below it are a
          running balance that moves as things get paid; this one does not,
          because a commitment is still a commitment after you have paid this
          month's instalment. Kept separate so they stop being read as the
          same kind of number. */}
      {committedMonthlyUSD > 0 && (
        <div style={{ background: "var(--uf-surface)", border: "1px solid var(--uf-border)", borderRadius: 12, padding: "16px 18px" }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--uf-text-3)", textTransform: "uppercase", marginBottom: 4 }}>
            Committed every month
          </div>
          <div style={{ fontSize: 28, fontWeight: 500, fontFamily: "var(--uf-font-mono)", fontVariantNumeric: "tabular-nums", color: "var(--uf-text)" }}>
            {formatAmount(committedMonthlyUSD)}
          </div>
          <div style={{ fontSize: 13, color: "var(--uf-text-2)", marginTop: 6, lineHeight: 1.6 }}>
            Your repeating bills, levelled to a monthly figure &mdash; {formatAmount(committedShareOfTarget)} of your
            FIRE target at 25&times; annual spending.
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
              <label style={{ fontSize: 12, fontWeight: 700, color: "var(--uf-text-2)", display: "block", marginBottom: 6 }}>
                {formRecurrence === "none" ? "DUE DATE" : "NEXT DUE"}
              </label>
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

          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: "var(--uf-text-2)", display: "block", marginBottom: 6 }}>REPEATS</label>
            <select value={formRecurrence} onChange={e => setFormRecurrence(e.target.value as Recurrence)} style={selectStyle}>
              {(Object.keys(RECURRENCE_LABEL) as Recurrence[]).map(k => (
                <option key={k} value={k}>{RECURRENCE_LABEL[k]}</option>
              ))}
            </select>
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
