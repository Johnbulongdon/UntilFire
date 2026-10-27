"use client";

import { useEffect, useRef, useState } from "react";
import { Card } from "@/components/ui";
import { supabase } from "@/lib/supabase";
import { fetchAllPages } from "@/lib/supabase-pages";
import { EXPENSE_CATEGORIES } from "@/lib/categories";
import { readMerchantRules, type MerchantRule } from "@/lib/merchant-rules";
import { EATING_OUT, rowNeed, transactionNeed, withRowNeed, type Need, type NeedOverrides } from "@/lib/needs";

type Row = { key: string; label: string; emoji?: string; note?: string };
type Tx = { category: string | null; sub_category: string | null; tags: string[] | null; amount: number; refund_amount: number | null; currency: string; date: string };

const mono: React.CSSProperties = { fontFamily: "var(--uf-font-mono)", fontVariantNumeric: "tabular-nums" };

/** Writes a few keys into the FIRE profile, read fresh so nothing the phone saved is lost. */
async function saveProfile(userId: string, patch: Record<string, unknown>) {
  try {
    const { data, error: readError } = await supabase.from("user_budget").select("expenses").eq("user_id", userId).maybeSingle();
    if (readError) return { message: "Couldn't load your budget. Please try again." };
    if (!data) return { message: "Your budget could not be loaded. Please reload and try again." };
    const ex = (data.expenses as Record<string, unknown>) ?? {};
    const { data: saved, error } = await supabase.rpc("replace_budget_if_unchanged", {
      p_expected: data.expenses,
      p_expenses: { ...ex, _fire_profile: { ...((ex._fire_profile as Record<string, unknown>) ?? {}), ...patch } },
    });
    if (error) return { message: "Couldn't save. Please try again." };
    return saved ? null : { message: "Your budget changed. Please reload and try again." };
  } catch {
    return { message: "Couldn't save. Please try again." };
  }
}

/**
 * Needs & wants (D-106): what we sorted for you, one click to move a row.
 * Each category is a row (work costs have their own tag), with eating out pulled out of Food, then the shops
 * answered in Today. The phone's mobile/src/app/needs-wants.tsx, as two columns.
 */
export default function NeedsWantsPanel({ customCats = [], toUsd, fmt, onChange }: {
  customCats?: { key: string; label: string; emoji?: string }[];
  toUsd: (amount: number, currency: string) => number;
  fmt: (usd: number) => string;
  /** The dashboard's own copy, so the safety pot and ladder follow at once. */
  onChange?: (overrides: NeedOverrides) => void;
}) {
  const [userId, setUserId] = useState<string | null>(null);
  const [overrides, setOverrides] = useState<NeedOverrides>({});
  const [shops, setShops] = useState<Record<string, MerchantRule>>({});
  const [txs, setTxs] = useState<Tx[]>([]);
  const [error, setError] = useState("");
  const saving = useRef(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session || cancelled) return;
      const now = new Date();
      const from = new Date(now.getFullYear(), now.getMonth() - 3, 1);
      const first = `${from.getFullYear()}-${String(from.getMonth() + 1).padStart(2, "0")}-01`;
      const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
      const [{ data: budget, error: budgetError }, { data: rows, error: rowsError }] = await Promise.all([
        supabase.from("user_budget").select("expenses").eq("user_id", session.user.id).maybeSingle(),
        fetchAllPages((from, to) => supabase.from("expenses").select("category, sub_category, tags, amount, refund_amount, currency, date")
          .eq("user_id", session.user.id).eq("transaction_type", "expense").gte("date", first).lt("date", thisMonth)
          .order("id").range(from, to)),
      ]);
      if (cancelled) return;
      if (budgetError || rowsError || !budget) { setError("Couldn't load your categories. Please reload and try again."); return; }
      const fp = ((budget?.expenses as Record<string, unknown>)?._fire_profile ?? {}) as { categoryNeeds?: unknown; merchantRules?: unknown };
      setUserId(session.user.id);
      setOverrides(fp.categoryNeeds && typeof fp.categoryNeeds === "object" && !Array.isArray(fp.categoryNeeds) ? fp.categoryNeeds as NeedOverrides : {});
      setShops(readMerchantRules(fp.merchantRules));
      setTxs((rows ?? []) as Tx[]);
    })().catch(() => { if (!cancelled) setError("Couldn't load your categories. Please reload and try again."); });
    return () => { cancelled = true; };
  }, []);

  const rows: Row[] = [...EXPENSE_CATEGORIES, ...customCats].filter((c) => c.key !== "other" && c.key !== "work").flatMap((c) => c.key === "food"
    ? [{ key: "food", label: "Groceries", emoji: "🛒", note: "Food" }, { key: EATING_OUT, label: "Eating out & delivery", emoji: "🍽️", note: "Food" }]
    : [{ key: c.key, label: c.label, emoji: c.emoji }]);
  // A month of each side, averaged over the last three full months.
  const monthly = (side: Need) => txs.filter((t) => transactionNeed(t, overrides) === side)
    .reduce((s, t) => s + toUsd(Math.max(0, t.amount - (t.refund_amount ?? 0)), t.currency), 0) / 3;

  const move = async (row: string) => {
    if (!userId || saving.current) return;
    saving.current = true; setBusy(true);
    const next = withRowNeed(row, rowNeed(row, overrides) === "need" ? "want" : "need", overrides);
    setOverrides(next); setError("");
    const problem = await saveProfile(userId, { categoryNeeds: next });
    saving.current = false; setBusy(false);
    if (problem) { setOverrides(overrides); setError(problem.message); return; }
    onChange?.(next);
  };
  const flipShop = async (key: string) => {
    if (!userId || saving.current) return;
    saving.current = true; setBusy(true);
    const next = { ...shops, [key]: { ...shops[key], need: shops[key].need === "need" ? "want" as const : "need" as const } };
    setShops(next); setError("");
    const problem = await saveProfile(userId, { merchantRules: next });
    saving.current = false; setBusy(false);
    if (problem) { setShops(shops); setError(problem.message); }
  };

  const column = (side: Need) => (
    <Card style={{ display: "grid", gap: 4, alignContent: "start", alignSelf: "start" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
        <span className="uf-t-label" style={{ color: "var(--uf-ink-3)" }}>{side === "need" ? "Needs" : "Wants"}</span>
        {txs.length > 0 && <span className="uf-t-small" style={{ ...mono, color: "var(--uf-ink-3)" }}>{fmt(monthly(side))}/mo</span>}
      </div>
      {rows.filter((r) => rowNeed(r.key, overrides) === side).map((r) => (
        <div key={r.key} style={{ display: "flex", alignItems: "center", gap: 12, padding: "9px 0", borderTop: "1px solid var(--uf-border)" }}>
          <span aria-hidden style={{ width: 34, height: 34, borderRadius: 10, display: "grid", placeItems: "center", background: "var(--uf-surface-2)", fontSize: 17 }}>{r.emoji ?? "•"}</span>
          <span style={{ flex: 1, display: "grid" }}>
            <span style={{ fontWeight: 600, fontSize: 14 }}>{r.label}</span>
            {r.note && <span className="uf-t-small" style={{ color: "var(--uf-ink-3)" }}>{r.note}</span>}
          </span>
          <button disabled={busy || !userId} type="button" onClick={() => move(r.key)} aria-label={`Move ${r.label} to ${side === "need" ? "wants" : "needs"}`}
            style={{ background: "none", border: "none", color: "var(--uf-green)", fontWeight: 700, fontSize: 13, cursor: "pointer", padding: "6px 4px" }}>
            {side === "need" ? "Move →" : "← Move"}
          </button>
        </div>
      ))}
    </Card>
  );

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <p className="uf-t-small" style={{ color: "var(--uf-ink-2)", margin: 0 }}>We sorted these for you. Move anything that&apos;s wrong for you.</p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(280px, 100%), 1fr))", gap: 16 }}>
        {column("need")}
        {column("want")}
      </div>
      {Object.keys(shops).length > 0 && (
        <Card style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <span style={{ fontWeight: 700, fontSize: 14 }}>Shops you told us</span>
          {Object.entries(shops).map(([key, rule]) => (
            <button disabled={busy || !userId} key={key} type="button" onClick={() => flipShop(key)} aria-label={`${key}, a ${rule.need}. Change`}
              style={{ display: "inline-flex", gap: 6, alignItems: "baseline", borderRadius: 999, border: "1px solid var(--uf-border)", background: "var(--uf-surface-2)", padding: "6px 12px", cursor: "pointer", color: "var(--uf-ink)", font: "inherit" }}>
              <span style={{ fontWeight: 700, fontSize: 13, textTransform: "capitalize" }}>{key}</span>
              <span className="uf-t-small" style={{ color: "var(--uf-ink-3)" }}>{rule.need === "need" ? "Need" : "Want"}</span>
            </button>
          ))}
        </Card>
      )}
      {error && <p role="alert" className="uf-t-small" style={{ color: "var(--uf-neg)", margin: 0 }}>{error}</p>}
    </div>
  );
}
