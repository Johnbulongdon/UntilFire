"use client";

import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import { fetchAllPages } from "@/lib/supabase-pages";
import { FALLBACK_RATES, SUPPORTED_CURRENCIES } from "@/lib/currency";
import { formatUSDInCurrency } from "@/lib/money";
import { addRecurrence, isoDay } from "@/lib/cashflow-forecast";
import ExpectedMonth from "./ExpectedMonth";
import CalendarMonth from "./CalendarMonth";
import { Button, InfoTip } from "@/components/ui";
import { PillTabs, MoneyHead, MoneyKey, MoneyList, MoneyRow, Fig } from "./MoneyCards";
import { ladderViewFromPlan, type AccountFacts } from "@/lib/contribution-ladder";
import type { StoredPlan } from "@/lib/contribution";
import { parseIsoDate } from "@/lib/contribution-schedule";
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES, SUB_CATEGORIES } from "@/lib/categories";
import { guessBillCategory, settleBill } from "@/lib/spend-forecast";
import { useCustomCategories } from "@/lib/useCustomCategories";
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
  sub_category: string | null;
  /** The bank's name for this bill, set when the person confirms a payment is it (Transactions, Worth a look). */
  match_merchant: string | null;
};

const SELECT_COLUMNS =
  "id, description, amount, currency, transaction_type, due_date, completed_at, recurrence, category, sub_category, match_merchant";

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

/** When it is due, in words; overdue reads in red. */
function dueText(days: number): string {
  if (days < 0) return `${Math.abs(days)}d overdue`;
  if (days === 0) return "due today";
  return `in ${days}d`;
}

/** A past expense offered when linking a bill to how the bank names it. */
type LinkOption = { description: string; date: string; label: string };

/** A repeating bill is never finished; only a one-off can be completed. */
const isDone = (p: ExpectedPayment) => !!p.completed_at && p.recurrence === "none";

const shortDay = (iso: string) => new Date(`${iso.slice(0, 10)}T00:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" });

/** One upcoming payment as a calm row; tapping it opens what can be done to it. */
function PaymentRow({
  item, catLabel, color, emoji, linkOptions, onLink, onToggle, onEdit, onDelete,
}: {
  item: ExpectedPayment;
  catLabel: (key: string) => string;
  color: string;
  emoji?: string;
  linkOptions: LinkOption[];
  onLink: (merchant: string | null) => void;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const isIncome = item.transaction_type === "income";
  const isCompleted = isDone(item);
  const [open, setOpen] = useState(false);
  const [linking, setLinking] = useState(false);
  // Delete sits next to Mark paid, so it asks once before it goes.
  const [confirming, setConfirming] = useState(false);
  const days = daysUntil(item.due_date);
  const meta = [
    isCompleted ? `${isIncome ? "Received" : "Paid"} ${shortDay(item.completed_at!)}` : `${shortDay(item.due_date)} · ${dueText(days)}`,
    item.recurrence !== "none" ? RECURRENCE_LABEL[item.recurrence] : null,
    item.category ? `${catLabel(item.category)}${item.sub_category ? ` · ${item.sub_category}` : ""}` : null,
    item.match_merchant ? `↔ ${item.match_merchant}` : null,
  ].filter(Boolean).join(" · ");
  const amount = `${isIncome ? "+" : "−"}${item.currency !== "USD" ? `${item.currency} ` : "$"}${item.amount.toLocaleString()}`;

  return (
    <MoneyRow
      dot={color}
      icon={isIncome ? "💵" : emoji}
      name={<span style={{ textDecoration: isCompleted ? "line-through" : "none" }}>{isCompleted ? "✓ " : ""}{item.description}</span>}
      meta={<span style={{ color: !isCompleted && days < 0 ? "var(--uf-neg-ink)" : undefined }}>{meta}</span>}
      value={amount}
      valueTone={isCompleted ? "var(--uf-ink-3)" : isIncome ? "var(--uf-pos-ink)" : undefined}
      onClick={() => { setOpen((v) => !v); setLinking(false); setConfirming(false); }}
      after={open && (
        <div style={{ display: "grid", gap: 8 }}>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            <Button variant={isCompleted ? "secondary" : "primary"} size="sm" onClick={onToggle}>
              {isCompleted ? "Mark pending" : isIncome ? "Mark received" : "Mark paid"}
            </Button>
            {item.match_merchant
              ? <Button variant="secondary" size="sm" onClick={() => onLink(null)}>Unlink {item.match_merchant}</Button>
              : !isIncome && linkOptions.length > 0 && <Button variant="secondary" size="sm" aria-expanded={linking} onClick={() => setLinking((v) => !v)}>Link payment</Button>}
            <Button variant="ghost" size="sm" onClick={onEdit}>Edit</Button>
            {confirming
              ? <>
                  <Button variant="danger" size="sm" onClick={onDelete}>Delete {item.description}</Button>
                  <Button variant="ghost" size="sm" onClick={() => setConfirming(false)}>Keep it</Button>
                </>
              : <Button variant="danger" size="sm" onClick={() => setConfirming(true)}>Delete</Button>}
          </div>
          {/* Pick the past payment that was this bill; from then on, payments
              with that name and a similar amount or date settle it. */}
          {linking && !item.match_merchant && (
            <div style={{ display: "grid", gap: 4 }}>
              <span className="uf-t-small" style={{ color: "var(--uf-ink-3)" }}>Which payment was this bill?</span>
              {linkOptions.map((o) => (
                <button key={`${o.description}|${o.date}`} type="button" onClick={() => { onLink(o.description); setLinking(false); }}
                  className="uf-t-small"
                  style={{ display: "flex", justifyContent: "space-between", gap: 12, textAlign: "left", border: "1px solid var(--uf-border)", borderRadius: 8, background: "var(--uf-card)", padding: "6px 10px", cursor: "pointer", color: "var(--uf-ink)" }}>
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{o.description}</span>
                  <span style={{ fontFamily: "var(--uf-font-mono)", fontVariantNumeric: "tabular-nums", color: "var(--uf-ink-2)", whiteSpace: "nowrap" }}>{o.date.slice(5)} · {o.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    />
  );
}

export default function ExpectedPaymentsTab({
  userId, defaultCurrency = "USD", displayCurrency = "USD", displayRates = FALLBACK_RATES, preferredCurrencies = [],
  budgetMonthlySpending = 0, lastMonthSpending, targetMultiple = 25, plan = null, facts, billDue = {}, onMarkDone, onOpenTransactions,
}: {
  /** The contribution plan and account facts, for the month's cash balances (D-61). */
  plan?: StoredPlan | null;
  facts?: AccountFacts;
  /** Bill due dates after payments already made (null: a paid one-off), so a
   *  paid bill is not taken from cash a second time. */
  billDue?: Record<string, { from: string; due: string | null }>;
  onMarkDone?: (done: { iso: string; amount: number } | null) => void;
  onOpenTransactions?: () => void;
  /** FIRE target per dollar of a year's spending, as the freedom date uses it (D-35). */
  targetMultiple?: number;
  userId: string;
  defaultCurrency?: string;
  displayCurrency?: string;
  displayRates?: Record<string, number>;
  preferredCurrencies?: string[];
  /** The Budget tab's monthly spending, for the month view's day-to-day line. */
  budgetMonthlySpending?: number;
  lastMonthSpending?: AccountFacts["lastMonthSpending"];
}) {
  const [payments, setPayments] = useState<ExpectedPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showCompleted, setShowCompleted] = useState(false);
  const [view, setView] = useState<"month" | "list">("month");
  const [selected, setSelected] = useState<string | null>(null);

  const [formDesc, setFormDesc] = useState("");
  const [formAmount, setFormAmount] = useState("");
  const [formCurrency, setFormCurrency] = useState(defaultCurrency);
  const [formType, setFormType] = useState<TransactionType>("income");
  const [formDueDate, setFormDueDate] = useState(todayStr());
  const [formRecurrence, setFormRecurrence] = useState<Recurrence>("none");
  // Category and sub-category, as on a transaction, so the bill can be matched
  // to its payment when it arrives. Guessed from the name until picked.
  const [formCategory, setFormCategory] = useState("");
  const [formSubCategory, setFormSubCategory] = useState("");
  const [catPicked, setCatPicked] = useState(false);
  const { customCats, customSubCats } = useCustomCategories();
  const catOptions = formType === "income" ? INCOME_CATEGORIES : [...EXPENSE_CATEGORIES, ...customCats];
  const subOptions = formType === "expense" && formCategory ? [...(SUB_CATEGORIES[formCategory] ?? []), ...(customSubCats[formCategory] ?? [])] : [];
  const catLabel = (key: string) => [...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES, ...customCats].find((c) => c.key === key)?.label ?? key;
  const needsCategory = formType === "expense" && !formCategory;
  const [saving, setSaving] = useState(false);
  const [suggestions, setSuggestions] = useState<DetectedItem[]>([]);
  const [history, setHistory] = useState<RawTx[]>([]);
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
      const { data: txns } = await fetchAllPages((from, to) => supabase
        .from("expenses")
        .select("id, date, amount, currency, description, category, transaction_type")
        .eq("user_id", userId)
        .order("date", { ascending: false })
        .order("id")
        .range(from, to));
      if (cancelled || !txns) return;
      setHistory(txns as RawTx[]);
      const found = detectRecurring(txns as RawTx[], displayRates);
      setSuggestions([...found.expenses, ...found.income].slice(0, 8));
      try {
        setDismissed(JSON.parse(localStorage.getItem("uf_expected_dismissed") || "[]"));
      } catch { /* a browser with storage blocked simply sees every suggestion */ }
    })();

    return () => { cancelled = true; };
  }, [userId, displayRates]);

  function openAddForm(on?: string) {
    setEditingId(null);
    setFormDesc(""); setFormAmount(""); setFormCurrency(defaultCurrency);
    // A day tapped on the calendar is most often a bill landing on it.
    setFormType(on ? "expense" : "income"); setFormDueDate(on ?? todayStr()); setFormRecurrence("none");
    setFormCategory(""); setFormSubCategory(""); setCatPicked(false);
    setShowForm(true);
  }

  function openEditForm(item: ExpectedPayment) {
    setEditingId(item.id);
    setFormDesc(item.description); setFormAmount(String(item.amount));
    setFormCurrency(item.currency); setFormType(item.transaction_type);
    setFormDueDate(item.due_date); setFormRecurrence(item.recurrence ?? "none");
    setFormCategory(item.category ?? (item.transaction_type === "expense" ? guessBillCategory(item.description) ?? "" : ""));
    setFormSubCategory(item.sub_category ?? ""); setCatPicked(!!item.category);
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditingId(null);
  }

  async function saveForm() {
    const amount = parseFloat(formAmount);
    if (!formDesc.trim() || !amount || !formDueDate || needsCategory) return;
    setSaving(true);
    const payload = {
      user_id: userId,
      description: formDesc.trim(),
      amount,
      currency: formCurrency,
      transaction_type: formType,
      due_date: formDueDate,
      recurrence: formRecurrence,
      // A repeating bill is never finished, so switching to repeat reopens it.
      ...(formRecurrence !== "none" ? { completed_at: null } : {}),
      category: formCategory || null,
      sub_category: formSubCategory || null,
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
    if (item.recurrence !== "none") {
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
        .from("expected_payments").update({ due_date, completed_at: null }).eq("id", item.id).select().single();
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

  // Past expenses, in USD, for linking a bill and for settling it once linked.
  const pastExpenses = useMemo(() => history
    .filter((t) => t.transaction_type === "expense")
    .map((t) => ({ id: t.id, date: t.date.slice(0, 10), usd: toUSD(Number(t.amount) || 0, t.currency, displayRates), description: t.description ?? "", category: t.category })),
  [history, displayRates]);

  /** The last 120 days' expenses most like this bill: same category first, then closest in amount, one per name. */
  function linkOptionsFor(item: ExpectedPayment): LinkOption[] {
    if (item.transaction_type !== "expense") return [];
    const usd = toUSD(item.amount, item.currency, displayRates), cat = item.category || guessBillCategory(item.description);
    const since = isoDay(new Date(Date.now() - 120 * 86_400_000));
    const seen = new Set<string>();
    return pastExpenses
      .filter((t) => t.date >= since && t.description && Math.abs(t.usd - usd) <= 0.5 * Math.max(t.usd, usd))
      .sort((a, b) => Number(b.category === cat) - Number(a.category === cat) || Math.abs(a.usd - usd) - Math.abs(b.usd - usd))
      .filter((t) => { const k = t.description.toLowerCase(); if (seen.has(k)) return false; seen.add(k); return true; })
      .slice(0, 6)
      .map((t) => ({ description: t.description, date: t.date, label: formatAmount(t.usd) }));
  }

  /** Link (or unlink) the bank's name for a bill, then settle any due dates it has already paid. */
  async function linkPayment(item: ExpectedPayment, merchant: string | null) {
    const { data } = await supabase.from("expected_payments").update({ match_merchant: merchant }).eq("id", item.id).select().single();
    if (!data) return;
    let row = data as ExpectedPayment;
    const patch = merchant && settleBill({
      id: row.id, description: row.description, category: row.category, merchant, usd: toUSD(row.amount, row.currency, displayRates),
      due: row.due_date.slice(0, 10), recurrence: row.recurrence, completed: isDone(row),
    }, pastExpenses, new Date().toISOString());
    if (patch) {
      const { data: settled } = await supabase.from("expected_payments").update(patch).eq("id", row.id).eq("due_date", row.due_date).select().single();
      if (settled) row = settled as ExpectedPayment;
    }
    setPayments((prev) => prev.map((p) => (p.id === row.id ? row : p)).sort((a, b) => a.due_date.localeCompare(b.due_date)));
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

  const pending = payments.filter(p => !isDone(p));
  // The month's balances come from this list as it stands, so a payment added
  // here moves the cash line at once (D-61).
  const calendarItems = useMemo(() => payments.filter((p) => !isDone(p)).flatMap((p) => {
    // A bill already paid this cycle (matched to a transaction) moves to its
    // next date, as Free to spend and Contributions count it; otherwise the
    // bank balance and the overdue line would both take it.
    // An edit made here since load changes the date, and then the edit stands.
    const known = p.transaction_type === "expense" ? billDue[p.id] : undefined;
    const due = known && known.from === p.due_date.slice(0, 10) ? known.due : p.due_date;
    return due ? [{ description: p.description, amountUSD: toUSD(p.amount, p.currency, displayRates), type: p.transaction_type,
      dueDate: due, recurrence: p.recurrence, category: p.category }] : [];
  }), [payments, displayRates, billDue]);
  const ladder = useMemo(() => (facts ? ladderViewFromPlan(plan, { ...facts, expectedItems: calendarItems }) : null),
    [plan, facts, calendarItems]);
  const cash = ladder?.available ?? null;
  // What was recorded on past days, for the day panel: read-only, since
  // recording belongs to Transactions (D-64).
  const recorded = useMemo(() => history.map((t) => ({
    iso: t.date.slice(0, 10), label: t.description || (t.transaction_type === "income" ? "Income" : "Payment"),
    amount: Math.abs(toUSD(t.amount, t.currency, displayRates)), income: t.transaction_type === "income", category: t.category,
  })), [history, displayRates]);
  const categoryEmoji = (category: string | null | undefined, income: boolean) =>
    [...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES, ...customCats].find((c) => c.key === category)?.emoji ?? (income ? "💵" : "🧾");
  const completed = payments.filter(isDone).sort((a, b) => (b.completed_at ?? "").localeCompare(a.completed_at ?? ""));
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
  // The freedom date's own multiple (withdrawal rate and tax), passed in from Plan's facts.
  const committedShareOfTarget = committedMonthlyUSD * 12 * targetMultiple;

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "10px 12px", borderRadius: 10,
    border: "1.5px solid var(--uf-border)", fontSize: 14, fontFamily: "inherit",
    outline: "none", background: "var(--uf-card)", boxSizing: "border-box",
  };
  const selectStyle: React.CSSProperties = { ...inputStyle, cursor: "pointer" };
  const labelStyle: React.CSSProperties = { display: "block", marginBottom: 6, color: "var(--uf-ink-2)", fontWeight: 600 };
  // A bill wears its category's colour, as on Transactions; income is teal.
  const colorFor = (p: ExpectedPayment) => p.transaction_type === "income"
    ? "var(--uf-teal)"
    : [...EXPENSE_CATEGORIES, ...customCats].find((c) => c.key === p.category)?.color ?? "var(--uf-ink-3)";
  const emojiFor = (p: ExpectedPayment) => [...EXPENSE_CATEGORIES, ...customCats].find((c) => c.key === p.category)?.emoji;
  const rowProps = (item: ExpectedPayment) => ({
    item, catLabel, color: colorFor(item), emoji: emojiFor(item), linkOptions: linkOptionsFor(item),
    onLink: (m: string | null) => linkPayment(item, m), onToggle: () => toggleCompleted(item),
    onEdit: () => openEditForm(item), onDelete: () => deletePayment(item.id),
  });
  // How many are due in the next 30 days, for the headline key.
  const soon = pending.filter((p) => { const d = daysUntil(p.due_date); return d >= 0 && d <= 30; });

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "80px 24px", color: "var(--uf-text-3)", fontSize: 14 }}>
        Loading…
      </div>
    );
  }

  const inPanel = view === "month";
  const formNode = (
        <div style={inPanel ? { display: "flex", flexDirection: "column", gap: 12, borderTop: "1px solid var(--uf-border)", paddingTop: 12 }
          : { background: "var(--uf-card)", border: "1px solid var(--uf-border)", borderRadius: 16, padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
          <div className="uf-t-h3" style={{ margin: 0 }}>
            {editingId ? "Edit upcoming payment" : "Add upcoming payment"}
          </div>

          <div>
            <label className="uf-t-small" style={labelStyle}>Description</label>
            <input type="text" value={formDesc} onChange={e => {
              setFormDesc(e.target.value);
              if (!catPicked && formType === "expense") { setFormCategory(guessBillCategory(e.target.value) ?? ""); setFormSubCategory(""); }
            }} placeholder="e.g. Client invoice, Tax refund, Car repair" style={inputStyle} />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) 110px", gap: 12 }}>
            <div>
              <label className="uf-t-small" style={labelStyle}>Amount</label>
              <input type="number" value={formAmount} onChange={e => setFormAmount(e.target.value)} placeholder="0" min="0" step="any" style={inputStyle} />
            </div>
            <div>
              <label className="uf-t-small" style={labelStyle}>Currency</label>
              <select value={formCurrency} onChange={e => setFormCurrency(e.target.value)} style={selectStyle}>
                {(preferredCurrencies.length > 0 ? preferredCurrencies : [...SUPPORTED_CURRENCIES]).map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: inPanel ? "minmax(0, 1fr)" : "minmax(0, 1fr) minmax(0, 1fr)", gap: 12 }}>
            <div>
              <label className="uf-t-small" style={labelStyle}>{formRecurrence === "none" ? "Due date" : "Next due"}</label>
              <input type="date" value={formDueDate} onChange={e => setFormDueDate(e.target.value)} style={inputStyle} />
            </div>
            <div>
              <label className="uf-t-small" style={labelStyle}>Type</label>
              <PillTabs label="Type" value={formType} options={[{ key: "income", label: "Income" }, { key: "expense", label: "Expense" }]}
                onChange={(t) => { setFormType(t); setFormSubCategory(""); setCatPicked(false); setFormCategory(t === "expense" ? guessBillCategory(formDesc) ?? "" : ""); }} />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)", gap: 12 }}>
            <div>
              <label className="uf-t-small" style={labelStyle}>Category</label>
              <select value={formCategory} onChange={e => { setFormCategory(e.target.value); setFormSubCategory(""); setCatPicked(true); }} style={selectStyle}>
                <option value="">{formType === "expense" ? "Pick one" : "None"}</option>
                {catOptions.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
              </select>
            </div>
            <div>
              <label className="uf-t-small" style={labelStyle}>Sub-category</label>
              <select value={formSubCategory} onChange={e => setFormSubCategory(e.target.value)} disabled={!subOptions.length} style={selectStyle}>
                <option value="">Optional</option>
                {subOptions.map(sc => <option key={sc} value={sc}>{sc}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="uf-t-small" style={labelStyle}>Repeats</label>
            <select value={formRecurrence} onChange={e => setFormRecurrence(e.target.value as Recurrence)} style={selectStyle}>
              {(Object.keys(RECURRENCE_LABEL) as Recurrence[]).map(k => (
                <option key={k} value={k}>{RECURRENCE_LABEL[k]}</option>
              ))}
            </select>
          </div>

          <div style={{ display: "flex", gap: 8, justifyContent: inPanel ? "flex-end" : "flex-start" }}>
            {inPanel && <Button variant="ghost" onClick={closeForm}>Cancel</Button>}
            <Button variant="primary" onClick={saveForm} disabled={saving || !formDesc.trim() || !formAmount || !formDueDate || needsCategory}>
              {editingId ? "Save changes" : "Add payment"}
            </Button>
          </div>
        </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* The calm headline (D-40): what is still to go out and what is still
          to come in. The 30-day strip it once carried is the Month view now (D-61). */}
      {view === "list" && <MoneyHead
        label="Still to go out"
        value={pending.length > 0 ? `−${formatAmount(totalOutgoingUSD)}` : formatAmount(0)}
        sub={totalIncomingUSD > 0 ? <><Fig tone="var(--uf-pos-ink)">+{formatAmount(totalIncomingUSD)}</Fig> still to come in</> : "Money you expect in or out, one-off or repeating."}
        aside={<Button variant={showForm ? "secondary" : "primary"} size="sm" onClick={showForm ? closeForm : () => openAddForm()}>{showForm ? "Cancel" : "Add upcoming payment"}</Button>}
      >
        {committedMonthlyUSD > 0 && (
          <MoneyKey items={[
            <span key="c" style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
              <Fig>{formatAmount(committedMonthlyUSD)}</Fig> committed every month
              <InfoTip label="About committed">Your repeating bills, levelled to a monthly figure. That is {formatAmount(committedShareOfTarget)} of your FIRE number at {Math.round(targetMultiple * 10) / 10}× a year&apos;s spending.</InfoTip>
            </span>,
            <span key="n"><Fig>{soon.length}</Fig> in the next 30 days</span>,
          ]} />
        )}
      </MoneyHead>}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap", order: -1 }}>
        <PillTabs label="Calendar view" value={view} options={[{ key: "month", label: "Month" }, { key: "list", label: "List" }]} onChange={setView} />
        {view === "month" && <Button size="sm" onClick={() => { const on = selected && selected >= todayStr() ? selected : todayStr(); setSelected(on); openAddForm(on); }}>+ Add upcoming</Button>}
      </div>

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
                <Button variant="primary" size="sm" onClick={() => acceptSuggestion(sug)}>Add</Button>
                <Button variant="ghost" size="sm" onClick={() => dismissSuggestion(sug.key)}>Not this</Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add / Edit form: here in the list; in the day panel on the month (D-64). */}
      {showForm && view === "list" && formNode}

      {view === "month" && (
        <CalendarMonth items={calendarItems} forecast={cash?.forecast ?? null}
          reserve={ladder?.efBalance ?? 0} allowanceFrom={cash?.allowanceBasis?.kind ?? null}
          accounts={[...(cash?.cashAccounts ?? []).map((a) => ({ name: a.label, balance: a.balance, reserve: false })),
            ...(ladder?.efAccounts ?? []).map((a) => ({ name: a.label, balance: a.balance, reserve: true }))]}
          safe={cash?.free ?? 0} done={cash?.done ?? null}
          onMarkDone={onMarkDone} selected={selected} onSelect={(iso) => { if (showForm) closeForm(); setSelected(iso); }}
          recorded={recorded} addForm={showForm ? formNode : null} onAdd={(iso) => openAddForm(iso)}
          onOpenTransactions={onOpenTransactions} emojiFor={categoryEmoji}
          fmt={formatAmount} compact={(usd) => formatUSDInCurrency(usd, displayCurrency, displayRates, { compact: true })} />
      )}

      {view === "list" && overdue.length > 0 && (
        <section style={{ display: "grid", gap: 8 }}>
          <span className="uf-t-small" style={{ color: "var(--uf-neg-ink)", fontWeight: 700 }}>Overdue · {overdue.length}</span>
          <MoneyList>{overdue.map(item => <PaymentRow key={item.id} {...rowProps(item)} />)}</MoneyList>
        </section>
      )}

      {view === "list" && <section style={{ display: "grid", gap: 8 }}>
        <span className="uf-t-small" style={{ color: "var(--uf-ink-3)", fontWeight: 700 }}>Upcoming · {upcoming.length}</span>
        {upcoming.length === 0 ? (
          <div className="uf-t-small" style={{ textAlign: "center", padding: "32px 24px", color: "var(--uf-ink-3)", background: "var(--uf-card)", border: "1px dashed var(--uf-border)", borderRadius: 12 }}>
            Nothing upcoming yet. Add income you expect or a bill that is due.
          </div>
        ) : (
          <MoneyList>{upcoming.map(item => <PaymentRow key={item.id} {...rowProps(item)} />)}</MoneyList>
        )}
      </section>}

      {/* The month in date order: the dated half of the budget, which is what
          the contribution forecast is built from. */}
      {view === "list" && <ExpectedMonth
        items={payments.map((p) => ({
          description: p.description,
          amountUSD: toUSD(p.amount, p.currency, displayRates),
          type: p.transaction_type,
          dueDate: p.due_date,
          recurrence: p.recurrence,
          category: p.category,
          completed: isDone(p),
        }))}
        budgetMonthlySpending={budgetMonthlySpending}
        lastMonthSpending={lastMonthSpending}
        formatAmount={formatAmount}
      />}

      {view === "list" && completed.length > 0 && (
        <section style={{ display: "grid", gap: 8 }}>
          <button type="button" onClick={() => setShowCompleted(v => !v)} aria-expanded={showCompleted} className="uf-t-small"
            style={{ background: "none", border: "none", padding: 0, textAlign: "left", fontWeight: 700, color: "var(--uf-ink-3)", cursor: "pointer" }}>
            {showCompleted ? "▾" : "▸"} Completed · {completed.length}
          </button>
          {showCompleted && <MoneyList>{completed.map(item => <PaymentRow key={item.id} {...rowProps(item)} />)}</MoneyList>}
        </section>
      )}
    </div>
  );
}
