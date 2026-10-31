"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button, Card, Icon } from "@/components/ui";
import { supabase } from "@/lib/supabase";
import { addDays, isoDay, monthCount, quietDayToMark, webTodayItems, type TodayLease, type TodayProgress, type TodayRow, type WebTodayItem } from "@/lib/today-web";
import { isRent, type LeaseDecision } from "@/lib/lease";
import { merchantKey } from "@/lib/merchant-memory";
import { readMerchantRules, type MerchantRule } from "@/lib/merchant-rules";
import type { Bill } from "@/lib/spend-forecast";
import DoneCheck from "./DoneCheck";

const mono: React.CSSProperties = { fontFamily: "var(--uf-font-mono)", fontVariantNumeric: "tabular-nums" };
const muted: React.CSSProperties = { color: "var(--uf-ink-3)" };

/** Save progress into the FIRE profile beside the rest, the way the phone does. Short lists, newest kept. */
async function saveProgress(userId: string, progress: TodayProgress) {
  const { data } = await supabase.from("user_budget").select("expenses").eq("user_id", userId).maybeSingle();
  if (!data) return;
  const ex = (data.expenses as Record<string, unknown>) ?? {};
  const today = { done: [...new Set(progress.done)].sort().slice(-400), acks: [...new Set(progress.acks)].slice(-300) };
  const { error } = await supabase.from("user_budget").update({
    expenses: { ...ex, _fire_profile: { ...((ex._fire_profile as Record<string, unknown>) ?? {}), today } },
  }).eq("user_id", userId);
  if (error) console.error("[today] saving", error);
}

/** Today's saved progress and the last few days of spending, read for the strip alone. */
function useTodayData(userId: string | undefined, toUsd: (amount: number, currency: string) => number) {
  const [progress, setProgress] = useState<TodayProgress | null>(null);
  const [rows, setRows] = useState<TodayRow[]>([]);
  const [leases, setLeases] = useState<TodayLease[]>([]);
  const [oldRentTag, setOldRentTag] = useState(false);
  const [shopRules, setShopRules] = useState<Record<string, MerchantRule>>({});
  const [sorted, setSorted] = useState(0);
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    (async () => {
      const [{ data: budget }, { data: tx }, { data: housing }, { count: oldTx }, { count: bankTx }] = await Promise.all([
        supabase.from("user_budget").select("expenses").eq("user_id", userId).maybeSingle(),
        supabase.from("expenses").select("id, date, description, amount, refund_amount, currency, category, sub_category, tags, transaction_type")
          .eq("user_id", userId).gte("date", addDays(isoDay(new Date()), -3)).order("date", { ascending: false }).limit(50),
        // Housing bills, for the lease and the old combined tag; spends still on that tag ask the same question.
        supabase.from("expected_payments").select("id, category, sub_category, lease_ends_on, lease_notice_days, lease_decision")
          .eq("user_id", userId).eq("category", "housing"),
        supabase.from("expenses").select("id", { count: "exact", head: true })
          .eq("user_id", userId).eq("category", "housing").eq("sub_category", "Rent/Mortgage"),
        // Bank purchases in the last 30 days, for the one-time "We sorted" card (D-106).
        supabase.from("expenses").select("id", { count: "exact", head: true })
          .eq("user_id", userId).eq("transaction_type", "expense").not("plaid_transaction_id", "is", null).gte("date", addDays(isoDay(new Date()), -30)),
      ]);
      if (cancelled) return;
      const fp = (budget?.expenses as Record<string, unknown>)?._fire_profile as { today?: TodayProgress; merchantRules?: unknown } | undefined;
      const saved = fp?.today;
      setShopRules(readMerchantRules(fp?.merchantRules));
      setSorted(bankTx ?? 0);
      setProgress({ done: saved?.done ?? [], acks: saved?.acks ?? [] });
      setLeases((housing ?? []).filter((b) => isRent(b) && b.lease_ends_on).map((b) => ({
        id: String(b.id), ends_on: String(b.lease_ends_on).slice(0, 10), notice_days: b.lease_notice_days ?? null, decision: (b.lease_decision as LeaseDecision | null) ?? null,
      })));
      setOldRentTag((oldTx ?? 0) > 0 || (housing ?? []).some((b) => b.sub_category === "Rent/Mortgage"));
      setRows((tx ?? []).map((t) => ({
        id: String(t.id), date: String(t.date).slice(0, 10), description: t.description ?? "", category: t.category ?? "other", sub_category: t.sub_category ?? null,
        tags: t.tags ?? [], transaction_type: t.transaction_type ?? "expense",
        usd: toUsd((t.amount ?? 0) - (t.refund_amount ?? 0), t.currency ?? "USD"),
      })));
    })();
    return () => { cancelled = true; };
    // toUsd changes with rates only; the strip reads once per visit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);
  return { progress, setProgress, rows, setRows, leases, setLeases, oldRentTag, setOldRentTag, shopRules, setShopRules, sorted };
}

/** A Today answer that writes back to a bill or a tag, not only the saved progress. */
export type TodayWrite =
  | { id: string; need: "need" | "want" }
  | { lease: string; decision: LeaseDecision }
  | { renttag: "Rent" | "Mortgage" };

export default function TodayStrip({ userId, bills, perDay, fmt, toUsd, onOpen, onWhatIf, onOpenNeeds }: {
  userId?: string;
  bills: Bill[];
  /** Safe to spend each day: Until payday over the days to payday (D-90), else the budget left over the days left. Null with neither. */
  perDay: number | null;
  fmt: (n: number) => string;
  toUsd: (amount: number, currency: string) => number;
  onOpen: () => void;
  /** Plan → Compare, where "Move" on a lease goes next (the phone opens What if). */
  onWhatIf?: () => void;
  /** Money › Categories › Needs & wants, from the "We sorted" card. */
  onOpenNeeds?: () => void;
}) {
  const { progress, setProgress, rows, setRows, leases, setLeases, oldRentTag, setOldRentTag, shopRules, setShopRules, sorted } = useTodayData(userId, toUsd);

  const list = progress ? webTodayItems({ rows, bills, progress, leases, oldRentTag, shopRules, sorted }) : null;

  /* Each answer is saved straight away; the answer that empties the list also
     marks the day finished. Need or want is written onto the spend itself, a
     lease answer onto the Rent bill and a retag onto every old row, the way
     the phone writes them (mobile/src/lib/mutations.ts), so both see it. */
  const answer = useCallback(async (key: string, write?: TodayWrite) => {
    if (!userId || !progress || !list) return;
    let nextRows = rows, nextLeases = leases, nextOld = oldRentTag;
    if (write && "need" in write) {
      const row = rows.find((r) => r.id === write.id);
      if (!row) return;
      const tags = [...row.tags.filter((g) => g !== "need" && g !== "want"), write.need];
      const { error } = await supabase.from("expenses").update({ tags }).eq("id", write.id).eq("user_id", userId);
      if (error) { console.error("[today] tagging", error); return; }
      nextRows = rows.map((r) => (r.id === write.id ? { ...r, tags } : r));
      setRows(nextRows);
      // The answer is the shop's from now on (D-106): bank sync files later buys there the same way.
      const rules = { ...shopRules, [merchantKey(row.description)]: { category: row.category, sub_category: row.sub_category ?? null, need: write.need } };
      const { data } = await supabase.from("user_budget").select("expenses").eq("user_id", userId).maybeSingle();
      const ex = (data?.expenses as Record<string, unknown>) ?? {};
      const fp = (ex._fire_profile as Record<string, unknown>) ?? {};
      const { error: ruleError } = await supabase.from("user_budget").update({
        expenses: { ...ex, _fire_profile: { ...fp, merchantRules: { ...readMerchantRules(fp.merchantRules), ...rules } } },
      }).eq("user_id", userId);
      if (ruleError) console.error("[today] shop rule", ruleError);
      else setShopRules(rules);
    } else if (write && "lease" in write) {
      const { error } = await supabase.from("expected_payments").update({ lease_decision: write.decision }).eq("id", write.lease).eq("user_id", userId);
      if (error) { console.error("[today] lease", error); return; }
      nextLeases = leases.map((l) => (l.id === write.lease ? { ...l, decision: write.decision } : l));
      setLeases(nextLeases);
    } else if (write && "renttag" in write) {
      const old = { category: "housing", sub_category: "Rent/Mortgage" };
      const [tx, eb] = await Promise.all([
        supabase.from("expenses").update({ sub_category: write.renttag }).eq("user_id", userId).match(old),
        supabase.from("expected_payments").update({ sub_category: write.renttag }).eq("user_id", userId).match(old),
      ]);
      if (tx.error || eb.error) { console.error("[today] retag", tx.error ?? eb.error); return; }
      nextOld = false;
      setOldRentTag(false);
    }
    // A sorted spend leaves by its tag; everything else is acked, which also stops a second ask the same stage.
    const acks = write && "need" in write ? progress.acks : [...progress.acks, key];
    const left = webTodayItems({ rows: nextRows, bills, progress: { ...progress, acks }, leases: nextLeases, oldRentTag: nextOld, sorted }).items;
    const next = { acks, done: left.length === 0 ? [...progress.done, list.day] : progress.done };
    setProgress(next);
    await saveProgress(userId, next);
  }, [userId, progress, list, rows, leases, oldRentTag, bills, shopRules, sorted, setProgress, setRows, setLeases, setOldRentTag, setShopRules]);

  // Nothing to answer: opening the day counts it (D-108).
  const quiet = progress && list ? quietDayToMark(progress.done, list.items.length) : null;
  useEffect(() => {
    if (!userId || !progress || !quiet) return;
    const next = { ...progress, done: [...progress.done, quiet] };
    setProgress(next);
    void saveProgress(userId, next);
    // Runs once per day to mark; progress is read at that moment.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, quiet]);

  if (!progress || !list) return null;
  return <TodayList items={list.items} count={monthCount(progress.done)} perDay={perDay} fmt={fmt} onAnswer={answer} onOpen={onOpen} onWhatIf={onWhatIf} onOpenNeeds={onOpenNeeds} />;
}

/**
 * The strip itself, from a built list: up to three one-tap items, or "Today's
 * done", and under either, what's safe to spend today: a figure to read, not a
 * step to tick (D-108). It opens Money.
 */
export function TodayList({ items, count, perDay, fmt, onAnswer, onOpen, onWhatIf, onOpenNeeds }: {
  items: WebTodayItem[];
  count: { done: number; of: number };
  /** Safe to spend each day; null without a budget or a payday. */
  perDay: number | null;
  fmt: (n: number) => string;
  onAnswer: (key: string, write?: TodayWrite) => void;
  onOpen: () => void;
  onWhatIf?: () => void;
  onOpenNeeds?: () => void;
}) {
  const finished = items.length === 0;
  // Celebrate only the answer that finishes the day; a day already done on load just shows the check.
  const wasFinished = useRef(finished);
  const [celebrated, setCelebrated] = useState(false);
  // Decided during render, so the first painted frame is already the start of the animation, not the finished check.
  const justFinished = celebrated || (finished && !wasFinished.current);
  useEffect(() => {
    if (justFinished) setCelebrated(true);
    wasFinished.current = finished;
  }, [finished, justFinished]);
  return (
    <Card style={{ display: "grid", gap: 4, background: "var(--uf-mint)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
        <h2 className="uf-t-h3" style={{ margin: 0 }}>Today</h2>
        <span className="uf-t-small" style={{ color: "var(--uf-ink-2)" }}><span style={mono}>{count.done}</span> of <span style={mono}>{count.of}</span> days</span>
      </div>
      {finished ? (
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", color: "var(--uf-teal)", fontWeight: 700 }}>
          <DoneCheck play={justFinished} />Today&apos;s done
        </div>
      ) : (
        <div style={{ display: "grid" }}>
          {items.slice(0, 3).map((item, i) => (
            <div key={item.key} style={{ display: "grid", gap: 10, padding: "14px 0", borderTop: i > 0 ? "1px solid var(--uf-border)" : "none" }}>
              {item.kind === "lease" && (
                <>
                  <span style={{ display: "grid", gap: 2 }}>
                    <span style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 700 }}><Icon name="home" size={18} />Your lease: stay or move?</span>
                    <span className="uf-t-small" style={muted}>Notice is due {new Date(`${item.deadline}T12:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" })}.</span>
                  </span>
                  <span style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <Button size="sm" onClick={() => onAnswer(item.key, { lease: item.billId, decision: "renew" })}>Renew</Button>
                    <Button size="sm" onClick={() => { onAnswer(item.key, { lease: item.billId, decision: "move" }); onWhatIf?.(); }}>Move</Button>
                    <Button size="sm" variant="ghost" onClick={() => onAnswer(item.key, { lease: item.billId, decision: "unsure" })}>Not sure</Button>
                  </span>
                </>
              )}
              {item.kind === "renttag" && (
                <>
                  <span style={{ display: "grid", gap: 2 }}>
                    <span style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 700 }}><Icon name="home" size={18} />Do you rent or pay a mortgage?</span>
                    <span className="uf-t-small" style={muted}>So a lease is only offered if you rent.</span>
                  </span>
                  <span style={{ display: "flex", gap: 8 }}>
                    <Button size="sm" onClick={() => onAnswer(item.key, { renttag: "Rent" })}>Rent</Button>
                    <Button size="sm" onClick={() => onAnswer(item.key, { renttag: "Mortgage" })}>Mortgage</Button>
                  </span>
                </>
              )}
              {item.kind === "sorted" && (
                <>
                  <span style={{ display: "grid", gap: 2 }}>
                    <span style={{ fontWeight: 700 }}>We sorted {item.count} buys for you</span>
                    <span className="uf-t-small" style={muted}>Groceries and gas count as needs. Delivery and eating out count as wants.</span>
                  </span>
                  <span style={{ display: "flex", gap: 8 }}>
                    <Button size="sm" onClick={() => onAnswer(item.key)}>Got it</Button>
                    {onOpenNeeds && <Button size="sm" variant="ghost" onClick={() => { onAnswer(item.key); onOpenNeeds(); }}>See all</Button>}
                  </span>
                </>
              )}
              {item.kind === "need" && (
                <>
                  <span style={{ display: "grid", gap: 2 }}>
                    <span className="uf-t-small" style={muted}>This shop sells both</span>
                    <span style={{ fontWeight: 700 }}>{item.row.description || "A spend"} <span style={mono}>{fmt(item.row.usd)}</span>: usually a need or a want?</span>
                  </span>
                  <span style={{ display: "flex", gap: 8 }}>
                    <Button size="sm" onClick={() => onAnswer(item.key, { id: item.row.id, need: "need" })}>Need</Button>
                    <Button size="sm" onClick={() => onAnswer(item.key, { id: item.row.id, need: "want" })}>Want</Button>
                  </span>
                </>
              )}
              {item.kind === "bill" && (
                <>
                  <span style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 700 }}>
                    <Icon name="calendar" size={18} />{item.label} <span style={mono}>{fmt(item.usd)}</span> tomorrow
                  </span>
                  <span><Button size="sm" onClick={() => onAnswer(item.key)}>Got it</Button></span>
                </>
              )}
            </div>
          ))}
        </div>
      )}
      <button type="button" onClick={onOpen} aria-label={perDay != null ? `Safe to spend today ${fmt(perDay)}. Open Money` : "Set a budget to see what's safe to spend each day. Open Money"}
        style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, minHeight: 48, padding: "10px 0 0", border: "none", borderTop: "1px solid var(--uf-border)",
          background: "transparent", color: "var(--uf-ink)", font: "inherit", textAlign: "left", cursor: "pointer" }}>
        {perDay != null
          ? <span>Safe to spend today <span style={{ ...mono, fontWeight: 600 }}>{fmt(perDay)}</span></span>
          : <span style={{ color: "var(--uf-ink-2)" }}>Set a budget to see what&apos;s safe to spend each day</span>}
        <span aria-hidden style={{ color: "var(--uf-ink-3)", fontSize: 16 }}>›</span>
      </button>
    </Card>
  );
}
