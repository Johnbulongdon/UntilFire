"use client";

import { useEffect, useState } from "react";
import { Button, SegmentedControl } from "@/components/ui";
import { owedFor } from "@/lib/split";

const mono: React.CSSProperties = { fontVariantNumeric: "tabular-nums" };
const PEOPLE = [2, 3, 4, 5];

/**
 * "Split it" (D-135) inside a spend's details, above "Make it a bill": by
 * people or a typed share, only the person's share counts as spending. Rare,
 * so it waits one tap past the row, like the bill action.
 */
export default function SplitPanel({ txId, paid, split, money, onSave }: {
  txId: string | null;
  /** What was paid, less any real refund. */
  paid: number;
  /** The split already on it, if any. */
  split: { owed: number; people: number | null } | null;
  money: (n: number) => string;
  /** Saves the others' share (0 undoes the split). */
  onSave: (owed: number, people: number | null) => Promise<boolean>;
}) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"people" | "share">("people");
  const [people, setPeople] = useState(2);
  const [more, setMore] = useState("");
  const [share, setShare] = useState("");
  const [busy, setBusy] = useState(false);
  // Another transaction opened: start over.
  useEffect(() => { setOpen(false); setMore(""); setShare(""); }, [txId]);

  if (!(paid > 0)) return null;

  const n = people >= 6 ? Math.max(2, Math.floor(Number(more)) || 0) : people;
  const shareNum = parseFloat(share);
  const ready = mode === "people" ? n >= 2 : share !== "" && shareNum >= 0 && shareNum < paid;
  const owed = !ready ? 0 : mode === "people" ? owedFor(paid, { people: n }) : owedFor(paid, { share: shareNum });

  const save = async (o: number, p: number | null) => {
    if (busy) return;
    setBusy(true);
    const ok = await onSave(o, p);
    setBusy(false);
    if (ok) setOpen(false);
  };

  if (split && split.owed > 0 && !open) {
    return (
      <p className="uf-t-small" style={{ margin: "10px 0 0", textAlign: "center", color: "var(--uf-ink-2)" }}>
        👥 {split.people ? `Split ${split.people} ways.` : "Split."} Your share <span style={mono}>{money(paid - split.owed)}</span>
        {" · "}<button type="button" onClick={() => { setOpen(true); if (split.people) { setMode("people"); setPeople(Math.min(split.people, 6)); setMore(split.people >= 6 ? String(split.people) : ""); } else { setMode("share"); setShare(String(Math.round((paid - split.owed) * 100) / 100)); } }}
          style={linkBtn}>Change</button>
        {" · "}<button type="button" disabled={busy} onClick={() => save(0, null)} style={linkBtn}>Undo</button>
      </p>
    );
  }
  if (!open) return <div style={{ marginTop: 8 }}><Button variant="secondary" fullWidth onClick={() => setOpen(true)}>👥 Split it</Button></div>;

  const chip = (on: boolean): React.CSSProperties => ({
    width: 48, height: 48, borderRadius: 16, font: "inherit", fontWeight: 800, fontSize: 18, cursor: "pointer",
    background: on ? "var(--uf-ink)" : "var(--uf-card)", color: on ? "var(--uf-card)" : "var(--uf-ink)",
    border: `1px solid ${on ? "var(--uf-ink)" : "var(--uf-border)"}`, ...mono,
  });
  const input: React.CSSProperties = { width: "100%", border: "1px solid var(--uf-border)", borderRadius: 12, padding: "10px 12px", fontSize: 16, fontWeight: 700, color: "var(--uf-ink)", background: "var(--uf-card)", fontFamily: "inherit", ...mono };

  return (
    <div role="group" aria-label="Split it" style={{ marginTop: 8, display: "grid", gap: 12, background: "var(--uf-surface)", borderRadius: 16, padding: 12 }}>
      <SegmentedControl label="Split by" value={mode} onChange={setMode}
        options={[{ value: "people", label: "By people" }, { value: "share", label: "My share" }] as const} />
      {mode === "people" ? (
        <>
          <span style={{ fontWeight: 700, fontSize: 14 }}>How many people, you too?</span>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {PEOPLE.map((p) => <button key={p} type="button" aria-pressed={people === p} onClick={() => setPeople(p)} style={chip(people === p)}>{p}</button>)}
            <button type="button" aria-pressed={people >= 6} onClick={() => { setPeople(6); if (!more) setMore("6"); }} style={{ ...chip(people >= 6), fontSize: 14 }}>6+</button>
          </div>
          {people >= 6 && (
            <input type="number" inputMode="numeric" min={2} step={1} aria-label="How many people" value={more} onChange={(e) => setMore(e.target.value)} style={input} />
          )}
        </>
      ) : (
        <>
          <span style={{ fontWeight: 700, fontSize: 14 }}>What was your part?</span>
          <input type="number" inputMode="decimal" min={0} step="0.01" aria-label="Your share" placeholder="0" value={share} onChange={(e) => setShare(e.target.value)} style={input} />
        </>
      )}
      {ready && (
        <div style={{ background: "var(--uf-yellow)", color: "#151719", borderRadius: 16, padding: "12px 14px", display: "grid", gap: 6 }}>
          <Line label="You paid" value={money(paid)} />
          <Line label="Your share" value={money(paid - owed)} big />
          <Line label="Not your spending" value={money(owed)} />
        </div>
      )}
      {ready && <span className="uf-t-small" style={{ color: "var(--uf-ink-2)" }}>Only {money(paid - owed)} counts in Budget and your freedom date.</span>}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        <Button variant="primary" size="sm" disabled={!ready || owed <= 0 || busy} onClick={() => save(owed, mode === "people" ? n : null)}>Split it</Button>
        <Button variant="ghost" size="sm" disabled={busy} onClick={() => setOpen(false)}>Cancel</Button>
      </div>
    </div>
  );
}

const linkBtn: React.CSSProperties = { background: "none", border: "none", padding: 0, font: "inherit", color: "inherit", textDecoration: "underline", cursor: "pointer" };

function Line({ label, value, big }: { label: string; value: string; big?: boolean }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
      <span style={{ fontSize: 13, fontWeight: 600 }}>{label}</span>
      <b style={{ ...mono, fontSize: big ? 20 : 14 }}>{value}</b>
    </div>
  );
}
