"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui";
import { supabase } from "@/lib/supabase";
import { trackSetupChecklist } from "@/lib/analytics";
import { RECURRENCE_LABEL, type RawTx } from "@/lib/recurring-detect";
import {
  SETUP_CTA, SETUP_FINISHED_KEY, SETUP_FOLDED_KEY, SETUP_LABEL, SETUP_SNAPSHOT_KEY,
  setupFinds, setupMoment, setupSteps,
  type SetupFacts, type SetupFind, type SetupMoment, type SetupSnapshot, type SetupStepId,
} from "@/lib/setup-steps";

/** A row as page.tsx keeps Calendar (committedRows), so a confirmed find shows everywhere at once. */
export interface AddedExpected {
  id: string; description: string; amount: number; currency: string; transaction_type: string;
  due_date: string; recurrence: string; category: string | null; completed_at: null;
}

const mono: React.CSSProperties = { fontFamily: "var(--uf-font-mono)", fontVariantNumeric: "tabular-nums" };
const DISMISSED_KEY = "uf_expected_dismissed"; // shared with Calendar's suggestions, so "Not this" holds in both
// Data on Home arrives in several requests; comparing before they settle would
// call a half-loaded page a finished step.
const SETTLE_MS = 2500;

const read = (k: string) => { try { return localStorage.getItem(k); } catch { return null; } };
const write = (k: string, v: string) => { try { localStorage.setItem(k, v); } catch { /* storage blocked: the box still works, it just forgets */ } };

const ICON: Record<SetupStepId, React.ReactNode> = {
  income: <><rect x="3" y="6" width="18" height="12" rx="3" /><circle cx="12" cy="12" r="2.5" /></>,
  bank: <path d="M3 10l9-5 9 5M5 10v8M9.5 10v8M14.5 10v8M19 10v8M3 20h18" />,
  payday: <><rect x="3" y="5" width="18" height="16" rx="3" /><path d="M3 10h18M8 3v4M16 3v4" /><circle cx="12" cy="15.5" r="1.6" fill="currentColor" /></>,
  bills: <><path d="M6 3h12v18l-3-2-3 2-3-2-3 2z" /><path d="M9 8h6M9 12h6" /></>,
  budget: <><circle cx="12" cy="12" r="9" /><path d="M12 3v9l6.4 6.4" /></>,
};

function StepIcon({ id, done }: { id: SetupStepId; done: boolean }) {
  return (
    <span aria-hidden style={{ width: 38, height: 38, borderRadius: 11, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center",
      background: done ? "var(--uf-teal-soft)" : "var(--uf-surface-2)", color: done ? "var(--uf-teal)" : "var(--uf-ink-2)" }}>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">{ICON[id]}</svg>
    </span>
  );
}

const Tick = ({ size = 22 }: { size?: number }) => (
  <span aria-hidden style={{ width: size, height: size, borderRadius: 7, background: "var(--uf-teal)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2.5 6.2l2.3 2.3 4.7-4.9" stroke="var(--uf-card)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
  </span>
);

/** Progress as a ring: teal is freedom/progress, never a button. */
function Ring({ done, total, size = 40 }: { done: number; total: number; size?: number }) {
  const c = 2 * Math.PI * 16;
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden style={{ flexShrink: 0 }}>
      <circle cx="20" cy="20" r="16" fill="none" stroke="var(--uf-surface-2)" strokeWidth="5" />
      {done > 0 && <circle cx="20" cy="20" r="16" fill="none" stroke="var(--uf-teal)" strokeWidth="5" strokeLinecap="round"
        strokeDasharray={`${(c * done) / total} ${c}`} transform="rotate(-90 20 20)" />}
    </svg>
  );
}

/**
 * Get set up (Oct 2026): the five steps that make the freedom date and Until
 * payday your own, docked in Home under the next move (D-108). Ticks itself from your
 * data (lib/setup-steps), folds to a pill, shows what each step changed, turns
 * bank findings into one-tap confirms, celebrates once, then is gone for good.
 */
export default function SetupChecklist({ userId, facts, freedomYear, untilPaydayUSD, fmt, transactions, rates, onAdded, onOpen }: {
  userId: string | null;
  facts: SetupFacts;
  freedomYear: number | null;
  untilPaydayUSD: number | null;
  fmt: (usd: number) => string;
  transactions: RawTx[];
  rates: Record<string, number>;
  onAdded: (rows: AddedExpected[]) => void;
  onOpen: (step: SetupStepId) => void;
}) {
  const steps = useMemo(() => setupSteps(facts), [facts]);
  const doneIds = useMemo(() => steps.filter((s) => s.done).map((s) => s.id), [steps]);
  const total = steps.length;
  const next = steps.find((s) => !s.done)?.id ?? null;

  const [mounted, setMounted] = useState(false);
  const [settled, setSettled] = useState(false);
  const [finished, setFinished] = useState(false);
  const [folded, setFolded] = useState(false);
  const [moment, setMoment] = useState<SetupMoment | null>(null);
  const [celebrate, setCelebrate] = useState(false);
  const [dismissed, setDismissed] = useState<string[]>([]);
  const [open, setOpen] = useState<SetupStepId | null>(null);
  const [unticked, setUnticked] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const snapshot = useRef<SetupSnapshot | null>(null);

  // Storage is read after mount: the server render has none.
  useEffect(() => {
    setMounted(true);
    setFinished(read(SETUP_FINISHED_KEY) === "1");
    const f = read(SETUP_FOLDED_KEY);
    // Folded unless opened: it sits in Home's flow now, under the next move (D-108).
    setFolded(f != null ? f === "1" : true);
    try { setDismissed(JSON.parse(read(DISMISSED_KEY) || "[]")); } catch { /* none */ }
    try { snapshot.current = JSON.parse(read(SETUP_SNAPSHOT_KEY) || "null"); } catch { snapshot.current = null; }
    const t = setTimeout(() => setSettled(true), SETTLE_MS);
    return () => clearTimeout(t);
  }, []);

  // Once settled: compare with the last visit, show the payoff, remember now.
  useEffect(() => {
    if (!settled || finished) return;
    const prev = snapshot.current;
    const m = setupMoment(prev, doneIds, freedomYear);
    for (const id of doneIds) if (prev && !prev.done.includes(id)) trackSetupChecklist({ action: "step_done", step: id, done_count: doneIds.length });
    if (m && (m.kind === "date" || untilPaydayUSD != null)) { setMoment(m); setFolded(false); }
    if (doneIds.length === total) {
      // Already complete on a first visit (an existing account): nothing to celebrate, just never show.
      if (!prev) { write(SETUP_FINISHED_KEY, "1"); setFinished(true); }
      else if (prev.done.length < total) setCelebrate(true);
    }
    const now: SetupSnapshot = { done: doneIds, year: freedomYear ?? prev?.year ?? null };
    snapshot.current = now;
    write(SETUP_SNAPSHOT_KEY, JSON.stringify(now));
  }, [settled, finished, doneIds, freedomYear, untilPaydayUSD, total]);

  // The payoff is a moment, not a fixture.
  useEffect(() => {
    if (!moment) return;
    const t = setTimeout(() => setMoment(null), 12000);
    return () => clearTimeout(t);
  }, [moment]);

  const finds = useMemo(() => {
    const all = setupFinds(transactions, [], rates);
    return {
      payday: all.payday && !dismissed.includes(all.payday.key) ? all.payday : null,
      bills: all.bills.filter((b) => !dismissed.includes(b.key)),
    };
  }, [transactions, rates, dismissed]);
  const findsFor = (id: SetupStepId): SetupFind[] =>
    id === "payday" ? (finds.payday ? [finds.payday] : []) : id === "bills" ? finds.bills : [];
  // The next step opens on its findings by itself; others on "Add".
  const shown = open ?? (next && findsFor(next).length > 0 ? next : null);

  const dismiss = (keys: string[]) => {
    const all = [...new Set([...dismissed, ...keys])];
    setDismissed(all);
    write(DISMISSED_KEY, JSON.stringify(all));
  };

  async function confirm(step: SetupStepId, items: SetupFind[]) {
    if (!userId || busy) return;
    const keep = items.filter((f) => !unticked.includes(f.key));
    setBusy(true); setError("");
    if (keep.length > 0) {
      const { data, error: err } = await supabase.from("expected_payments").insert(keep.map((f) => ({
        user_id: userId, description: f.description, amount: f.amountUSD, currency: "USD",
        transaction_type: step === "payday" ? "income" : "expense",
        due_date: f.nextDueDate, recurrence: f.recurrence, category: f.category || null,
      }))).select("id, description, amount, currency, transaction_type, due_date, recurrence, category, completed_at");
      if (err || !data) { setBusy(false); setError("Couldn't add them. Please try again."); return; }
      onAdded(data as AddedExpected[]);
      trackSetupChecklist({ action: "found_confirmed", step, added: keep.length });
    }
    // Unticked ones were "not a bill": don't offer them again, here or in Calendar.
    dismiss(items.filter((f) => unticked.includes(f.key)).map((f) => f.key));
    setBusy(false); setOpen(null); setUnticked([]);
  }

  const toggleFold = () => {
    const f = !folded;
    setFolded(f); write(SETUP_FOLDED_KEY, f ? "1" : "0");
    trackSetupChecklist({ action: f ? "folded" : "opened", done_count: doneIds.length });
  };

  const finish = () => {
    write(SETUP_FINISHED_KEY, "1");
    trackSetupChecklist({ action: "finished", done_count: total });
    setCelebrate(false); setFinished(true);
  };

  if (!mounted || finished || (doneIds.length === total && !celebrate)) return null;

  const count = <><span style={mono}>{doneIds.length}</span> of <span style={mono}>{total}</span> done</>;

  if (folded && !celebrate) {
    return (
      <div className="uf-setup-dock">
        <button type="button" className="uf-setup-pill" onClick={toggleFold} aria-expanded={false} aria-label={`Get set up, ${doneIds.length} of ${total} done. Show steps`}>
          <Ring done={doneIds.length} total={total} size={30} />
          <span style={{ fontWeight: 800 }}>Get set up</span>
          <span style={{ ...mono, color: "var(--uf-ink-2)", fontWeight: 500 }}>{doneIds.length}/{total}</span>
        </button>
        <SetupStyles />
      </div>
    );
  }

  return (
    <div className="uf-setup-dock">
      <section className="uf-setup-box" aria-label="Get set up">
        {celebrate ? (
          <div style={{ textAlign: "center", padding: "10px 6px 4px" }}>
            <div style={{ width: 64, height: 64, borderRadius: 20, background: "var(--uf-teal-soft)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px" }}>
              <svg width="34" height="34" viewBox="0 0 12 12" aria-hidden><path d="M2.5 6.2l2.3 2.3 4.7-4.9" stroke="var(--uf-teal)" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </div>
            <h2 className="uf-t-h2" style={{ margin: 0 }}>You&rsquo;re set up</h2>
            {freedomYear != null && <>
              <div className="uf-t-small" style={{ color: "var(--uf-ink-2)", marginTop: 6 }}>Your freedom date</div>
              {/* The freedom date's Inter exception (design system). */}
              <div style={{ fontFamily: "var(--uf-font-display)", fontWeight: 700, fontSize: 44, letterSpacing: "-0.02em", lineHeight: 1.1, margin: "4px 0 6px" }}>{freedomYear}</div>
            </>}
            <Button variant="primary" fullWidth onClick={finish} style={{ marginTop: 12 }}>Nice</Button>
          </div>
        ) : <>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <Ring done={doneIds.length} total={total} />
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 800, fontSize: 16 }}>Get set up</div>
              <div className="uf-t-small" style={{ color: "var(--uf-ink-2)" }}>{count}</div>
            </div>
            <button type="button" className="uf-setup-fold" onClick={toggleFold} aria-expanded aria-label="Hide steps">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden><path d="M6 9l6 6 6-6" /></svg>
            </button>
          </div>

          <div role="status" aria-live="polite">
            {moment && (
              <div style={{ marginTop: 14, background: "var(--uf-teal-soft)", borderRadius: 16, padding: "12px 14px", display: "flex", alignItems: "center", gap: 14 }}>
                <span aria-hidden style={{ width: 38, height: 38, borderRadius: 11, background: "var(--uf-card)", color: "var(--uf-teal)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M4 17h16M7 17a5 5 0 0 1 10 0M12 7V4M5.6 10.6 3.5 8.5M18.4 10.6l2.1-2.1" /></svg>
                </span>
                {moment.kind === "date" ? (
                  <div>
                    <div className="uf-t-label" style={{ color: "var(--uf-teal-deep)", marginBottom: 4 }}>Your date moved</div>
                    <span style={{ ...mono, color: "var(--uf-ink-3)", textDecoration: "line-through" }}>{moment.from}</span>
                    <span className="sr-only"> to </span>
                    <span style={{ fontFamily: "var(--uf-font-display)", fontWeight: 700, fontSize: 30, lineHeight: 1, marginLeft: 10 }}>{moment.to}</span>
                  </div>
                ) : (
                  <div>
                    <div className="uf-t-label" style={{ color: "var(--uf-teal-deep)", marginBottom: 4 }}>Until payday</div>
                    <span style={{ ...mono, fontSize: 24, fontWeight: 500 }}>{fmt(untilPaydayUSD ?? 0)}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          <ul style={{ listStyle: "none", margin: "12px 0 0", padding: 0, display: "flex", flexDirection: "column", gap: 4 }}>
            {steps.map(({ id, done }) => {
              const found = !done && shown === id ? findsFor(id) : [];
              if (found.length > 0) {
                const keep = found.filter((f) => !unticked.includes(f.key)).length;
                const isPay = id === "payday";
                return (
                  <li key={id} style={{ background: "var(--uf-surface)", borderRadius: 16, padding: 12 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12, paddingBottom: 8 }}>
                      <StepIcon id={id} done={false} />
                      <div style={{ fontWeight: 800, fontSize: 15 }}>
                        {isPay ? "We found your paycheck" : <>We found <span style={mono}>{found.length}</span> {found.length === 1 ? "bill" : "bills"}</>}
                      </div>
                    </div>
                    {found.map((f) => {
                      const on = !unticked.includes(f.key);
                      return (
                        <label key={f.key} style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 4px", fontSize: 14, fontWeight: 600, cursor: "pointer", color: on ? "var(--uf-ink)" : "var(--uf-ink-3)" }}>
                          <input type="checkbox" className="uf-setup-check" checked={on}
                            onChange={() => setUnticked((u) => (on ? [...u, f.key] : u.filter((k) => k !== f.key)))} />
                          <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.description}</span>
                          <span style={mono}>{fmt(f.amountUSD)}</span>
                          <span className="uf-t-small" style={{ color: "var(--uf-ink-3)", width: 92, textAlign: "right" }}>{RECURRENCE_LABEL[f.recurrence]}</span>
                        </label>
                      );
                    })}
                    {error && <div role="alert" className="uf-t-small" style={{ color: "var(--uf-neg)", marginTop: 6 }}>{error}</div>}
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10 }}>
                      <Button variant="primary" size="sm" style={{ flex: 1 }} disabled={busy} onClick={() => confirm(id, found)}>
                        {keep === 0 ? "None of these" : isPay ? "Add payday" : `Add ${keep} ${keep === 1 ? "bill" : "bills"}`}
                      </Button>
                      <Button variant="ghost" size="sm" style={{ color: "var(--uf-green)" }} onClick={() => { setOpen(null); onOpen(id); }}>Add by hand</Button>
                    </div>
                  </li>
                );
              }
              const isNext = id === next;
              return (
                <li key={id} style={{ display: "flex", alignItems: "center", gap: 12, padding: 8, borderRadius: 14, background: isNext ? "var(--uf-surface)" : "transparent" }}>
                  <StepIcon id={id} done={done} />
                  <span style={{ flex: 1, fontSize: 15, fontWeight: done ? 600 : 700, color: done ? "var(--uf-ink-3)" : "var(--uf-ink)",
                    textDecoration: done ? "line-through" : "none", textDecorationThickness: 1.5 }}>
                    {SETUP_LABEL[id]}{done && <span className="sr-only"> (done)</span>}
                  </span>
                  {done ? <Tick /> : (
                    <Button variant={isNext ? "primary" : "ghost"} size="sm" aria-label={`${SETUP_CTA[id]}: ${SETUP_LABEL[id]}`}
                      style={isNext ? { padding: "7px 14px" } : { color: "var(--uf-green)", padding: "7px 8px" }}
                      onClick={() => (findsFor(id).length > 0 ? setOpen(id) : onOpen(id))}>
                      {SETUP_CTA[id]}
                    </Button>
                  )}
                </li>
              );
            })}
          </ul>
        </>}
      </section>
      <SetupStyles />
    </div>
  );
}

function SetupStyles() {
  return (
    <style>{`
      .uf-setup-dock { display: block; }
      .uf-setup-box { background: var(--uf-card); color: var(--uf-ink);
        border: 1px solid var(--uf-border); border-radius: 20px; padding: 18px 18px 12px; box-shadow: var(--uf-e1); }
      .uf-setup-pill { display: flex; align-items: center; gap: 10px; width: 100%; min-height: 52px; padding: 8px 16px 8px 10px; border-radius: 16px; cursor: pointer;
        background: var(--uf-card); color: var(--uf-ink); border: 1px solid var(--uf-border); font: inherit; font-size: 15px; text-align: left; box-shadow: var(--uf-e1); }
      .uf-setup-pill > :nth-child(3) { margin-left: auto; }
      .uf-setup-fold { width: 36px; height: 36px; border-radius: 10px; border: none; background: transparent; color: var(--uf-ink-3); cursor: pointer;
        display: flex; align-items: center; justify-content: center; }
      .uf-setup-fold:hover { background: var(--uf-surface); }
      .uf-setup-pill:focus-visible, .uf-setup-fold:focus-visible, .uf-setup-check:focus-visible { outline: 2px solid var(--uf-green); outline-offset: 2px; }
      .uf-setup-check { width: 20px; height: 20px; margin: 0; flex-shrink: 0; accent-color: var(--uf-green); cursor: pointer; }
    `}</style>
  );
}
