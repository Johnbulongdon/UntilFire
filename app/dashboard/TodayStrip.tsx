"use client";

import { useCallback, useEffect, useState } from "react";
import { Button, Card, Icon } from "@/components/ui";
import { supabase } from "@/lib/supabase";
import { addDays, isoDay, monthCount, webTodayItems, type TodayProgress, type TodayRow, type WebTodayItem } from "@/lib/today-web";
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
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    (async () => {
      const [{ data: budget }, { data: tx }] = await Promise.all([
        supabase.from("user_budget").select("expenses").eq("user_id", userId).maybeSingle(),
        supabase.from("expenses").select("id, date, description, amount, refund_amount, currency, category, tags, transaction_type")
          .eq("user_id", userId).gte("date", addDays(isoDay(new Date()), -3)).order("date", { ascending: false }).limit(50),
      ]);
      if (cancelled) return;
      const saved = ((budget?.expenses as Record<string, unknown>)?._fire_profile as { today?: TodayProgress } | undefined)?.today;
      setProgress({ done: saved?.done ?? [], acks: saved?.acks ?? [] });
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
  return { progress, setProgress, rows, setRows };
}

export default function TodayStrip({ userId, bills, perDay, fmt, toUsd, onOpen }: {
  userId?: string;
  bills: Bill[];
  /** Safe to spend each day: Until payday over the days to payday (D-90), else the budget left over the days left. Null with neither. */
  perDay: number | null;
  fmt: (n: number) => string;
  toUsd: (amount: number, currency: string) => number;
  onOpen: () => void;
}) {
  const { progress, setProgress, rows, setRows } = useTodayData(userId, toUsd);

  const list = progress ? webTodayItems({ rows, bills, progress, perDay }) : null;

  /* Each answer is saved straight away; the answer that empties the list also
     marks the day finished. Need or want is written onto the spend itself, so
     the phone sees it as sorted too. */
  const answer = useCallback(async (key: string, tag?: { id: string; need: "need" | "want" }) => {
    if (!userId || !progress || !list) return;
    let nextRows = rows;
    if (tag) {
      const row = rows.find((r) => r.id === tag.id);
      if (!row) return;
      const tags = [...row.tags.filter((g) => g !== "need" && g !== "want"), tag.need];
      const { error } = await supabase.from("expenses").update({ tags }).eq("id", tag.id).eq("user_id", userId);
      if (error) { console.error("[today] tagging", error); return; }
      nextRows = rows.map((r) => (r.id === tag.id ? { ...r, tags } : r));
      setRows(nextRows);
    }
    const acks = tag ? progress.acks : [...progress.acks, key];
    const left = webTodayItems({ rows: nextRows, bills, progress: { ...progress, acks }, perDay }).items;
    const next = { acks, done: left.length === 0 ? [...progress.done, list.day] : progress.done };
    setProgress(next);
    await saveProgress(userId, next);
  }, [userId, progress, list, rows, bills, perDay, setProgress, setRows]);

  if (!progress || !list) return null;
  return <TodayList items={list.items} count={monthCount(progress.done)} fmt={fmt} onAnswer={answer} onOpen={onOpen} />;
}

/** The strip itself, from a built list: up to three one-tap items, or "Today's done". */
export function TodayList({ items, count, fmt, onAnswer, onOpen }: {
  items: WebTodayItem[];
  count: { done: number; of: number };
  fmt: (n: number) => string;
  onAnswer: (key: string, tag?: { id: string; need: "need" | "want" }) => void;
  onOpen: () => void;
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
