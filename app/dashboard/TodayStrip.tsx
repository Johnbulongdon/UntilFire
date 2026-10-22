"use client";

import { useCallback, useEffect, useState } from "react";
import { Button, Card, Icon } from "@/components/ui";
import { supabase } from "@/lib/supabase";
import { addDays, isoDay, monthCount, webTodayItems, type TodayLease, type TodayProgress, type TodayRow, type WebTodayItem } from "@/lib/today-web";
import { isRent, type LeaseDecision } from "@/lib/lease";
import type { Bill } from "@/lib/spend-forecast";
import { DoorChip } from "./HomeCards";

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
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    (async () => {
      const [{ data: budget }, { data: tx }, { data: housing }, { count: oldTx }] = await Promise.all([
        supabase.from("user_budget").select("expenses").eq("user_id", userId).maybeSingle(),
        supabase.from("expenses").select("id, date, description, amount, refund_amount, currency, category, tags, transaction_type")
          .eq("user_id", userId).gte("date", addDays(isoDay(new Date()), -3)).order("date", { ascending: false }).limit(50),
        // Housing bills, for the lease and the old combined tag; spends still on that tag ask the same question.
        supabase.from("expected_payments").select("id, category, sub_category, lease_ends_on, lease_notice_days, lease_decision")
          .eq("user_id", userId).eq("category", "housing"),
        supabase.from("expenses").select("id", { count: "exact", head: true })
          .eq("user_id", userId).eq("category", "housing").eq("sub_category", "Rent/Mortgage"),
      ]);
      if (cancelled) return;
      const saved = ((budget?.expenses as Record<string, unknown>)?._fire_profile as { today?: TodayProgress } | undefined)?.today;
      setProgress({ done: saved?.done ?? [], acks: saved?.acks ?? [] });
      setLeases((housing ?? []).filter((b) => isRent(b) && b.lease_ends_on).map((b) => ({
        id: String(b.id), ends_on: String(b.lease_ends_on).slice(0, 10), notice_days: b.lease_notice_days ?? null, decision: (b.lease_decision as LeaseDecision | null) ?? null,
      })));
      setOldRentTag((oldTx ?? 0) > 0 || (housing ?? []).some((b) => b.sub_category === "Rent/Mortgage"));
      setRows((tx ?? []).map((t) => ({
        id: String(t.id), date: String(t.date).slice(0, 10), description: t.description ?? "", category: t.category ?? "other",
        tags: t.tags ?? [], transaction_type: t.transaction_type ?? "expense",
        usd: toUsd((t.amount ?? 0) - (t.refund_amount ?? 0), t.currency ?? "USD"),
      })));
    })();
    return () => { cancelled = true; };
    // toUsd changes with rates only; the strip reads once per visit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);
  return { progress, setProgress, rows, setRows, leases, setLeases, oldRentTag, setOldRentTag };
}

/** A Today answer that writes back to a bill or a tag, not only the saved progress. */
export type TodayWrite =
  | { id: string; need: "need" | "want" }
  | { lease: string; decision: LeaseDecision }
  | { renttag: "Rent" | "Mortgage" };

export default function TodayStrip({ userId, bills, perDay, fmt, toUsd, onOpen, onWhatIf }: {
  userId?: string;
  bills: Bill[];
  /** Safe to spend each day: Until payday over the days to payday (D-90), else the budget left over the days left. Null with neither. */
  perDay: number | null;
  fmt: (n: number) => string;
  toUsd: (amount: number, currency: string) => number;
  onOpen: () => void;
  /** Plan → Compare, where "Move" on a lease goes next (the phone opens What if). */
  onWhatIf?: () => void;
}) {
  const { progress, setProgress, rows, setRows, leases, setLeases, oldRentTag, setOldRentTag } = useTodayData(userId, toUsd);

  const list = progress ? webTodayItems({ rows, bills, progress, perDay, leases, oldRentTag }) : null;

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
    const left = webTodayItems({ rows: nextRows, bills, progress: { ...progress, acks }, perDay, leases: nextLeases, oldRentTag: nextOld }).items;
    const next = { acks, done: left.length === 0 ? [...progress.done, list.day] : progress.done };
    setProgress(next);
    await saveProgress(userId, next);
  }, [userId, progress, list, rows, leases, oldRentTag, bills, perDay, setProgress, setRows, setLeases, setOldRentTag]);

  if (!progress || !list) return null;
  return <TodayList items={list.items} count={monthCount(progress.done)} fmt={fmt} onAnswer={answer} onOpen={onOpen} onWhatIf={onWhatIf} />;
}

/** The strip itself, from a built list: up to three one-tap items, or "Today's done". */
export function TodayList({ items, count, fmt, onAnswer, onOpen, onWhatIf }: {
  items: WebTodayItem[];
  count: { done: number; of: number };
  fmt: (n: number) => string;
  onAnswer: (key: string, write?: TodayWrite) => void;
  onOpen: () => void;
  onWhatIf?: () => void;
}) {
  const finished = items.length === 0;
  return (
    <Card style={{ display: "grid", gap: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
        <span style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
          <span className="uf-t-label" style={muted}>Today</span>
          <span className="uf-t-small" style={{ ...mono, ...muted }}>{count.done} of {count.of} days</span>
        </span>
        <DoorChip to="money" onClick={onOpen} />
      </div>
      {finished ? (
        <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--uf-teal)", fontWeight: 700 }}>
          <Icon name="positive" size={18} />Today&apos;s done
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(240px, 100%), 1fr))", gap: 10 }}>
          {items.slice(0, 3).map((item) => (
            <div key={item.key} style={{ display: "grid", gap: 10, padding: 14, borderRadius: 16, background: "var(--uf-surface-2)" }}>
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
              {item.kind === "need" && (
                <>
                  <span style={{ fontWeight: 700 }}>{item.row.description || "A spend"} <span style={mono}>{fmt(item.row.usd)}</span></span>
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
              {item.kind === "number" && (
                <>
                  <span style={{ fontWeight: 700 }}>
                    {item.perDay != null ? <>Safe to spend today: <span style={mono}>{fmt(item.perDay)}</span></> : "Set a budget to see what's safe to spend each day"}
                  </span>
                  {/* The phone's "Got it" (mobile today.tsx): reading your number is the day's last tap, so a quiet day can still be finished. */}
                  <span><Button size="sm" onClick={() => onAnswer(item.key)}>Got it</Button></span>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
