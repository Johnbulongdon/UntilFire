"use client";

/**
 * What the day-to-day estimate is made of, category by category.
 *
 * One month's needs are the basis (D-11), so one unusual month moves the
 * figure: a trip booked as a need, a vet bill. The breakdown shows each
 * category's share, so the outlier is visible, and lets it be left out —
 * just this month, which lapses by itself once the next month's spending
 * becomes the basis, or always, until it is ticked back in (D-14).
 *
 * Opens on hover where there is a mouse, and on click, tap or Enter
 * everywhere, since a phone has no hover and the ticks inside need clicking.
 */

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { Button } from "@/components/ui";
import type { AllowanceBasis } from "@/lib/contribution-ladder";

type NeedsBasis = Extract<AllowanceBasis, { kind: "needs" }>;
type Scope = "month" | "always";

export interface AllowanceBreakdownProps {
  basis: NeedsBasis;
  /** Absent where the estimate is only shown, not changed. */
  onSetExclusion?: (category: string, scope: Scope | null, monthKey: string) => void;
  /** "text" sits inside a sentence; "button" stands on its own. */
  variant?: "text" | "button";
  children: React.ReactNode;
}

const fmt = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2 });
const label = (category: string) => {
  const t = category.replace(/_/g, " ");
  return t.charAt(0).toUpperCase() + t.slice(1);
};
const mono: React.CSSProperties = { fontFamily: "var(--uf-font-mono)", fontVariantNumeric: "tabular-nums" };

export default function AllowanceBreakdown({ basis, onSetExclusion, variant = "text", children }: AllowanceBreakdownProps) {
  const [open, setOpen] = useState(false);
  const [pinned, setPinned] = useState(false);
  const [asking, setAsking] = useState<{ category: string; amount: number } | null>(null);
  const [shift, setShift] = useState(0);
  const wrapRef = useRef<HTMLSpanElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const panelId = useId();
  const monthShort = basis.monthLabel.split(" ")[0];

  const canHover = () => typeof window !== "undefined" && !!window.matchMedia?.("(hover: hover) and (pointer: fine)").matches;
  const cancelClose = () => { if (closeTimer.current) clearTimeout(closeTimer.current); };
  const close = useCallback((refocus = false) => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setOpen(false);
    setPinned(false);
    if (refocus) triggerRef.current?.focus();
  }, []);

  // Keep the panel on screen: near the right edge it slides left.
  useEffect(() => {
    if (!open) { setShift(0); return; }
    const rect = panelRef.current?.getBoundingClientRect();
    if (!rect) return;
    const overflow = rect.right - (window.innerWidth - 16);
    setShift(overflow > 0 ? -Math.min(overflow, rect.left - 16) : 0);
  }, [open]);

  // Escape closes; a click elsewhere closes a panel that was opened by click.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape" && !asking) close(true); };
    const onDown = (e: PointerEvent) => {
      if (!asking && wrapRef.current && !wrapRef.current.contains(e.target as Node)) close();
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onDown);
    return () => { document.removeEventListener("keydown", onKey); document.removeEventListener("pointerdown", onDown); };
  }, [open, asking, close]);

  // The month-or-always question is a real modal dialog.
  useEffect(() => {
    const d = dialogRef.current;
    if (!d) return;
    if (asking && !d.open) d.showModal();
    if (!asking && d.open) d.close();
  }, [asking]);

  const choose = (scope: Scope | null) => {
    if (asking && scope) onSetExclusion?.(asking.category, scope, basis.monthKey);
    setAsking(null);
  };

  const byYou = basis.excluded.filter((e) => e.byYou);
  const onList = basis.excluded.filter((e) => !e.byYou);
  const share = (amount: number) => {
    if (basis.monthly <= 0) return "—";
    const pct = (amount / basis.monthly) * 100;
    return pct > 0 && pct < 1 ? "<1%" : `${Math.round(pct)}%`;
  };

  return (
    <span
      ref={wrapRef}
      className="uf-bd"
      onMouseEnter={() => { if (canHover()) { cancelClose(); setOpen(true); } }}
      onMouseLeave={() => { if (canHover() && !pinned && !asking) closeTimer.current = setTimeout(() => setOpen(false), 180); }}
    >
      <button
        ref={triggerRef}
        type="button"
        className={variant === "text" ? "uf-bd-text" : "uf-bd-button"}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => { if (open && pinned) close(); else { setOpen(true); setPinned(true); } }}
      >
        {children}
      </button>

      {open && (
        <div
          ref={panelRef}
          id={panelId}
          role="region"
          aria-label="What the day-to-day estimate is made of"
          className="uf-bd-panel"
          style={{ transform: shift ? `translateX(${shift}px)` : undefined }}
          data-testid="uf-breakdown"
        >
          <div className="uf-bd-head">
            <strong>Day-to-day needs · <span style={mono}>{fmt(basis.perDay)}</span> a day</strong>
            <span>From {basis.monthLabel}&apos;s needs: <span style={mono}>{fmt(basis.monthly)}</span> over {basis.days} days</span>
          </div>

          {basis.counted.length > 0 ? (
            <ul className="uf-bd-list">
              {basis.counted.map((c) => (
                <li key={c.category} className="uf-bd-row">
                  <span className="uf-bd-cat">{label(c.category)}</span>
                  <span className="uf-bd-amt" style={mono}>{fmt(c.amount)}</span>
                  <span className="uf-bd-pct" style={mono}>{share(c.amount)}</span>
                  <span className="uf-bd-bar" aria-hidden="true">
                    <span style={{ width: `${Math.max(2, Math.min(100, (c.amount / (basis.monthly || 1)) * 100))}%` }} />
                  </span>
                  {onSetExclusion && (
                    <label className="uf-bd-leave">
                      <input
                        type="checkbox" checked={false}
                        aria-label={`Leave ${label(c.category)} out of the estimate`}
                        onChange={() => { setPinned(true); setAsking({ category: c.category, amount: c.amount }); }}
                      />
                      Leave out
                    </label>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="uf-bd-note">Nothing is left to count — every need last month is dated or left out.</p>
          )}

          {byYou.length > 0 && (
            <div className="uf-bd-group">
              <span className="uf-bd-sub">Left out by you</span>
              <ul className="uf-bd-list">
                {byYou.map((e) => (
                  <li key={e.category} className="uf-bd-row is-out">
                    <span className="uf-bd-cat">{label(e.category)}
                      <span className="uf-bd-scope">{e.byYou === "always" ? "always" : `just ${monthShort}`}</span>
                    </span>
                    <span className="uf-bd-amt" style={mono}>{fmt(e.amount)}</span>
                    <span className="uf-bd-pct" />
                    <span className="uf-bd-bar" aria-hidden="true" />
                    {onSetExclusion && (
                      <label className="uf-bd-leave">
                        <input
                          type="checkbox" checked
                          aria-label={`Count ${label(e.category)} again`}
                          onChange={() => onSetExclusion(e.category, null, basis.monthKey)}
                        />
                        Leave out
                      </label>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {onList.length > 0 && (
            <p className="uf-bd-note">
              Already a dated line, so not counted twice: {onList.map((e) => `${label(e.category)} ${fmt(e.amount)} (${e.because})`).join("; ")}.
            </p>
          )}
          {(basis.wants > 0 || basis.untagged > 0) && (
            <p className="uf-bd-note">
              Not counted: {[
                basis.wants > 0 ? `${fmt(basis.wants)} of wants` : null,
                basis.untagged > 0 ? `${fmt(basis.untagged)} not tagged need or want` : null,
              ].filter(Boolean).join(" and ")}.
            </p>
          )}

          <dialog
            ref={dialogRef}
            className="uf-bd-dialog"
            aria-labelledby={`${panelId}-q`}
            onClose={() => setAsking(null)}
          >
            {asking && (
              <>
                <h3 id={`${panelId}-q`} className="uf-t-h3" style={{ margin: 0 }}>Leave {label(asking.category).toLowerCase()} out?</h3>
                <p className="uf-t-small" style={{ margin: "var(--uf-s2) 0 var(--uf-s4)", color: "var(--uf-ink-2)" }}>
                  <span style={mono}>{fmt(asking.amount)}</span> of {label(asking.category).toLowerCase()} in {basis.monthLabel} won&apos;t count
                  toward your day-to-day needs.
                </p>
                <div className="uf-bd-choice">
                  <Button variant="primary" onClick={() => choose("month")} autoFocus>Just this month</Button>
                  <span className="uf-t-small">It counts again once next month&apos;s spending is the basis.</span>
                </div>
                <div className="uf-bd-choice">
                  <Button variant="secondary" onClick={() => choose("always")}>Always leave it out</Button>
                  <span className="uf-t-small">Every month, until you tick it back in.</span>
                </div>
                <Button variant="ghost" size="sm" onClick={() => choose(null)} style={{ marginTop: "var(--uf-s2)" }}>Cancel</Button>
              </>
            )}
          </dialog>
        </div>
      )}

      <style>{`
        .uf-bd { position: relative; display: inline; }
        .uf-bd-text {
          font: inherit; color: inherit; background: none; border: 0; padding: 0; cursor: pointer;
          text-decoration: underline dotted; text-underline-offset: 3px;
        }
        .uf-bd-button {
          font: inherit; font-size: 13px; font-weight: 700; color: var(--uf-ink); cursor: pointer;
          background: var(--uf-card); border: 1px solid var(--uf-border-2); border-radius: var(--uf-r-pill);
          padding: 4px 12px; min-height: 28px;
        }
        .uf-bd-text:focus-visible, .uf-bd-button:focus-visible, .uf-bd-leave input:focus-visible {
          outline: 2px solid var(--uf-green); outline-offset: 2px;
        }
        .uf-bd-panel {
          position: absolute; left: 0; top: calc(100% + 6px); z-index: 30;
          width: min(380px, calc(100vw - 32px)); padding: var(--uf-s3);
          background: var(--uf-card); color: var(--uf-ink); border: 1px solid var(--uf-border-2);
          border-radius: var(--uf-r-card); box-shadow: var(--uf-e2);
          font-size: 13px; line-height: 1.45; text-align: left; white-space: normal;
        }
        .uf-bd-head { display: flex; flex-direction: column; gap: 2px; margin-bottom: var(--uf-s2); }
        .uf-bd-head span { color: var(--uf-ink-2); }
        .uf-bd-list { list-style: none; margin: 0; padding: 0; }
        .uf-bd-row {
          display: grid; grid-template-columns: minmax(0, 1fr) auto 40px; gap: 2px var(--uf-s2);
          align-items: center; padding: 6px 0; border-top: 1px solid var(--uf-border);
        }
        .uf-bd-cat { min-width: 0; font-weight: 600; }
        .uf-bd-amt, .uf-bd-pct { text-align: right; }
        .uf-bd-pct { color: var(--uf-ink-2); }
        .uf-bd-bar { grid-column: 1 / 2; height: 4px; border-radius: 2px; background: var(--uf-surface-2); overflow: hidden; }
        .uf-bd-bar > span { display: block; height: 100%; background: var(--uf-ink-2); border-radius: 2px; }
        .uf-bd-leave {
          grid-column: 2 / 4; grid-row: 2; justify-self: end;
          display: inline-flex; align-items: center; gap: 4px; min-height: 24px;
          font-size: 11px; color: var(--uf-ink-2); cursor: pointer; white-space: nowrap;
        }
        .uf-bd-leave input { width: 16px; height: 16px; margin: 0; accent-color: var(--uf-green); cursor: pointer; }
        .uf-bd-row.is-out .uf-bd-cat, .uf-bd-row.is-out .uf-bd-amt { color: var(--uf-ink-2); }
        .uf-bd-scope { margin-left: var(--uf-s2); font-size: 11px; font-weight: 400; color: var(--uf-ink-2); }
        .uf-bd-group { margin-top: var(--uf-s2); }
        .uf-bd-sub { display: block; font-size: 11px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; color: var(--uf-ink-2); margin-bottom: 2px; }
        .uf-bd-note { margin: var(--uf-s2) 0 0; color: var(--uf-ink-2); }
        /* On a phone the figure that opens this can sit anywhere in a line,
           so the panel comes up as a sheet from the bottom instead. */
        @media (max-width: 560px) {
          .uf-bd-panel {
            position: fixed; left: 12px; right: 12px; bottom: 12px; top: auto;
            width: auto; max-height: 70vh; overflow-y: auto; transform: none !important;
          }
        }
        .uf-bd-dialog {
          width: min(420px, calc(100vw - 32px)); padding: var(--uf-s5);
          background: var(--uf-card); color: var(--uf-ink);
          border: 1px solid var(--uf-border-2); border-radius: var(--uf-r-card);
        }
        .uf-bd-dialog::backdrop { background: rgba(0, 0, 0, 0.45); }
        .uf-bd-choice { display: flex; flex-direction: column; align-items: flex-start; gap: 4px; margin-bottom: var(--uf-s3); }
        .uf-bd-choice .uf-t-small { color: var(--uf-ink-2); }
      `}</style>
    </span>
  );
}
