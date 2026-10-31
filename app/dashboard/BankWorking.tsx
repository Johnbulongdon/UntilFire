"use client";

import { useEffect, useState } from "react";

import { Button, Card, Icon } from "@/components/ui";

/** What the bank showed, as /api/plaid/exchange-token returns it. */
export interface BankFound {
  name: string;
  added: number;
  accounts: number;
  found: { payday: boolean; bills: number };
}

const STEP_MS = 550;

/**
 * Linking a bank, shown working (labor illusion, Oct 2026): real steps tick by
 * as the import finishes, each with what it found, so a few seconds of Plaid
 * reads as work done for you rather than a spinner. Nothing is invented: until
 * the import answers only the first step spins; after, the steps tick at a
 * steady pace (all at once with reduced motion). The payday and bills it names
 * are the setup checklist's own finds, offered there as one-tap confirms.
 */
export default function BankWorking({ name, result, onClose }: { name: string; result: BankFound | null; onClose: () => void }) {
  const [shown, setShown] = useState(0);

  const steps = result ? [
    { label: `Connected to ${result.name}`, ok: true },
    { label: result.added > 0 ? `Read ${result.added.toLocaleString("en-US")} transactions` : "No transactions yet, they can take a few minutes", ok: result.added > 0 },
    { label: result.found.payday ? "Found your payday" : "No payday found yet", ok: result.found.payday },
    { label: result.found.bills > 0 ? `Found ${result.found.bills} ${result.found.bills === 1 ? "bill" : "bills"}` : "No repeating bills found yet", ok: result.found.bills > 0 },
    { label: "Updated your freedom date", ok: true },
  ] : [];

  useEffect(() => {
    if (!result) return;
    const reduce = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce) { setShown(steps.length); return; }
    const timers = steps.map((_, i) => setTimeout(() => setShown(i + 1), (i + 1) * STEP_MS));
    return () => timers.forEach(clearTimeout);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result]);

  const finished = !!result && shown >= steps.length;
  useEffect(() => {
    if (!finished) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [finished, onClose]);

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 9998, background: "rgba(0,0,0,0.45)", display: "grid", placeItems: "center", padding: 16 }}>
      <style>{`@keyframes uf-bank-spin { to { transform: rotate(360deg); } }
        @keyframes uf-bank-in { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }
        @media (prefers-reduced-motion: reduce) { .uf-bank-row { animation: none !important; } }`}</style>
      <Card role="dialog" aria-modal="true" aria-labelledby="uf-bank-title" style={{ width: "100%", maxWidth: 400, display: "grid", gap: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span aria-hidden style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 44, height: 44, borderRadius: 13, background: "var(--uf-green-50)", color: "var(--uf-green)" }}>
            <Icon name="bank" size={24} />
          </span>
          <h2 id="uf-bank-title" className="uf-t-h3" style={{ margin: 0 }}>{finished ? "Your bank is in" : `Linking ${name}`}</h2>
        </div>
        <ol aria-live="polite" style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 10 }}>
          {!result && <Row state="busy" label={`Connecting to ${name}`} />}
          {steps.slice(0, shown).map((s) => <Row key={s.label} state={s.ok ? "ok" : "none"} label={s.label} />)}
          {result && !finished && <Row state="busy" label="Working…" />}
        </ol>
        {finished && <Button autoFocus variant="primary" onClick={onClose}>Done</Button>}
      </Card>
    </div>
  );
}

/** One step: a spinner while busy, a teal tick when it found something, a quiet dash when it found nothing. */
function Row({ state, label }: { state: "busy" | "ok" | "none"; label: string }) {
  return (
    <li className="uf-bank-row" style={{ display: "flex", alignItems: "center", gap: 12, minHeight: 32, animation: "uf-bank-in 0.25s ease" }}>
      <span aria-hidden style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 26, height: 26, borderRadius: 8, flexShrink: 0,
        background: state === "ok" ? "var(--uf-teal)" : "var(--uf-surface-2)", color: "var(--uf-card)" }}>
        {state === "busy" && <i style={{ width: 14, height: 14, borderRadius: "50%", border: "2px solid var(--uf-border-2)", borderTopColor: "var(--uf-green)", animation: "uf-bank-spin 0.8s linear infinite" }} />}
        {state === "ok" && <Icon name="positive" size={16} />}
        {state === "none" && <i style={{ width: 10, height: 2, borderRadius: 1, background: "var(--uf-ink-3)" }} />}
      </span>
      <span className="uf-t-body" style={{ color: state === "none" ? "var(--uf-ink-2)" : "var(--uf-ink)" }}>{label}</span>
    </li>
  );
}
