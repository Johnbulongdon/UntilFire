"use client";

import { useEffect, useMemo, useState } from "react";
import { Badge, Button, Card, Field, Input, Money, SegmentedControl } from "@/components/ui";
import {
  planContribution, targetsSumTo100,
  type Frequency, type Holding, type Target,
} from "@/lib/contribution";

/* Where this month's money goes. The maths and the two places it departs from
   the spreadsheet it ports are in lib/contribution.ts and
   docs/design/next-contribution.md.

   Targets and holdings are kept in localStorage, the same way CitizenshipTab
   keeps its answer. Moving them to Supabase, along with the monthly snapshot
   that makes a history table possible, is a later step — this one has no
   migration behind it. */

const STORAGE_KEY = "uf_contribution_v1";

interface Row { id: string; symbol: string; targetPct: string; value: string }

/* A worked example rather than an empty form, labelled as one. The named
   portfolios the user picks from, with their arguments for and against, are a
   later step — nothing here recommends anything. */
const EXAMPLE: Row[] = [
  { id: "a", symbol: "VTI",  targetPct: "60", value: "" },
  { id: "b", symbol: "VXUS", targetPct: "30", value: "" },
  { id: "c", symbol: "BND",  targetPct: "10", value: "" },
];

const FREQUENCIES = [
  { value: "monthly" as const, label: "Monthly" },
  { value: "weekly" as const, label: "Weekly" },
  { value: "daily" as const, label: "Daily" },
];

const num = (s: string) => {
  const n = parseFloat(s.replace(/[^0-9.\-]/g, ""));
  return Number.isFinite(n) ? n : 0;
};
const mono: React.CSSProperties = { fontFamily: "var(--uf-font-mono)", fontVariantNumeric: "tabular-nums" };

export default function ContributionsTab() {
  const [rows, setRows] = useState<Row[]>(EXAMPLE);
  const [budget, setBudget] = useState("500");
  const [frequency, setFrequency] = useState<Frequency>("monthly");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as { rows?: Row[]; budget?: string; frequency?: Frequency };
        if (Array.isArray(saved.rows) && saved.rows.length) setRows(saved.rows);
        if (typeof saved.budget === "string") setBudget(saved.budget);
        if (saved.frequency) setFrequency(saved.frequency);
      }
    } catch { /* a blocked or corrupt store just means the example */ }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;   // don't write the example over a real saved plan
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ rows, budget, frequency })); } catch { /* ignore */ }
  }, [rows, budget, frequency, loaded]);

  const named = rows.filter((r) => r.symbol.trim());
  const targets: Target[] = named.map((r) => ({ symbol: r.symbol.trim().toUpperCase(), targetPct: num(r.targetPct) / 100 }));
  const holdings: Holding[] = named.map((r) => ({ symbol: r.symbol.trim().toUpperCase(), value: num(r.value) }));

  const targetSum = targets.reduce((s, t) => s + t.targetPct, 0);
  const balanced = targets.length > 0 && targetsSumTo100(targets);
  const plan = useMemo(
    () => (balanced ? planContribution(targets, holdings, num(budget), { frequency }) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [JSON.stringify(targets), JSON.stringify(holdings), budget, frequency, balanced],
  );

  const portfolio = holdings.reduce((s, h) => s + h.value, 0);
  const set = (id: string, patch: Partial<Row>) =>
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)));

  const periodWord = frequency === "monthly" ? "month" : frequency === "weekly" ? "week" : "day";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--uf-s5)" }}>
      <div>
        <h2 className="uf-t-h2" style={{ margin: 0 }}>Next contribution</h2>
        <p className="uf-t-body" style={{ color: "var(--uf-ink-2)", margin: "var(--uf-s2) 0 0", maxWidth: 560 }}>
          Set what you want to hold and what you hold now. This works out where
          the next {periodWord}&apos;s money should go to close the gap.
        </p>
      </div>

      <Card>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--uf-s5)", alignItems: "flex-end" }}>
          <Field label="Contribution per month" htmlFor="uf-budget" style={{ minWidth: 180 }}>
            <Input id="uf-budget" numeric inputMode="decimal" value={budget}
                   onChange={(e) => setBudget(e.target.value)} />
          </Field>
          <Field label="Buy in">
            <SegmentedControl options={FREQUENCIES} value={frequency} onChange={setFrequency} label="Contribution frequency" />
          </Field>
          <Field label="Portfolio now">
            <div style={{ ...mono, fontSize: 24, paddingTop: 4 }}><Money amount={portfolio} /></div>
          </Field>
        </div>
      </Card>

      <Card>
        <div className="uf-contrib-head uf-contrib-row" style={{ color: "var(--uf-ink-2)" }}>
          <span>Asset</span><span>Target %</span><span>Value now</span>
          <span>Now</span><span>Drift</span><span>Status</span>
          <span style={{ textAlign: "right" }}>Per {periodWord}</span><span />
        </div>

        {rows.map((r) => {
          const a = plan?.assets.find((x) => x.symbol === r.symbol.trim().toUpperCase());
          // deviation is target − current, which is what the tilt needs. Shown
          // the other way round: a holding below its target should read
          // negative, or "-11.5" beside a badge saying "Over" is a puzzle.
          const drift = a ? -a.deviation : null;
          return (
            <div key={r.id} className="uf-contrib-row">
              <div className="uf-cell uf-cell-wide">
                <span className="uf-cell-label">Asset</span>
                <Input aria-label="Ticker" value={r.symbol} placeholder="VTI"
                       onChange={(e) => set(r.id, { symbol: e.target.value })} />
              </div>
              <div className="uf-cell">
                <span className="uf-cell-label">Target %</span>
                <Input aria-label="Target percent" numeric inputMode="decimal" value={r.targetPct}
                       onChange={(e) => set(r.id, { targetPct: e.target.value })} />
              </div>
              <div className="uf-cell">
                <span className="uf-cell-label">Value now</span>
                <Input aria-label="Current value" numeric inputMode="decimal" value={r.value} placeholder="0"
                       onChange={(e) => set(r.id, { value: e.target.value })} />
              </div>
              <div className="uf-cell">
                <span className="uf-cell-label">Now</span>
                <span style={mono}>{a ? `${(a.currentPct * 100).toFixed(1)}%` : "\u2014"}</span>
              </div>
              <div className="uf-cell">
                <span className="uf-cell-label">Drift</span>
                <span style={{ ...mono, color: drift !== null && Math.abs(drift) > 0.0005 ? "var(--uf-ink)" : "var(--uf-ink-3)" }}>
                  {drift !== null ? `${drift > 0 ? "+" : ""}${(drift * 100).toFixed(1)}` : "\u2014"}
                </span>
              </div>
              <div className="uf-cell">
                <span className="uf-cell-label">Status</span>
                <span>
                  {a && (
                    <Badge tone={a.status === "on-track" ? "positive" : "warning"}>
                      {a.status === "on-track" ? "On track" : a.status === "under" ? "Under" : "Over"}
                    </Badge>
                  )}
                </span>
              </div>
              <div className="uf-cell uf-cell-amount">
                <span className="uf-cell-label">Per {periodWord}</span>
                <span style={{ ...mono, fontWeight: 700 }}>
                  {a ? <Money amount={a.adjusted} decimals={a.adjusted < 100 ? 2 : 0} /> : "\u2014"}
                </span>
              </div>
              <div className="uf-cell uf-cell-remove">
                {rows.length > 1 && (
                  <Button variant="ghost" size="sm" aria-label={`Remove ${r.symbol || "row"}`}
                          onClick={() => setRows((rs) => rs.filter((x) => x.id !== r.id))}>Remove</Button>
                )}
              </div>
            </div>
          );
        })}

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "var(--uf-s4)", marginTop: "var(--uf-s4)", flexWrap: "wrap" }}>
          <Button variant="secondary" size="sm"
                  onClick={() => setRows((rs) => [...rs, { id: crypto.randomUUID(), symbol: "", targetPct: "", value: "" }])}>
            Add an asset
          </Button>
          <span className="uf-t-small" style={{ ...mono, color: balanced ? "var(--uf-ink-2)" : "var(--uf-neg)" }}>
            Targets total {(targetSum * 100).toFixed(1)}%{balanced ? "" : " — must be 100%"}
          </span>
        </div>
      </Card>

      {plan && (
        <Card>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--uf-s6)", alignItems: "baseline" }}>
            <div>
              <div className="uf-t-label" style={{ color: "var(--uf-ink-2)", textTransform: "uppercase", letterSpacing: "0.09em" }}>
                This {periodWord}
              </div>
              <div style={{ ...mono, fontSize: 34, fontWeight: 800 }}><Money amount={plan.perPeriod} /></div>
            </div>
            <p className="uf-t-small" style={{ color: "var(--uf-ink-2)", margin: 0, maxWidth: 420 }}>
              {plan.warnings.length === 0
                ? "Every holding is inside its band. The split above is just your targets, nudged slightly toward whatever is furthest behind."
                : `${plan.warnings.length} holding${plan.warnings.length === 1 ? " is" : "s are"} outside ${plan.warnings.length === 1 ? "its" : "their"} band: ${plan.warnings.map((w) => `${w.symbol} ${w.status}`).join(", ")}. The split leans toward closing that.`}
            </p>
          </div>
        </Card>
      )}

      <p className="uf-t-small" style={{ color: "var(--uf-ink-3)", margin: 0, maxWidth: 620 }}>
        These figures follow the allocation you set — they are not a
        recommendation to buy or hold anything. The example above is a worked
        example, not advice. Bands flag a holding once it is off by 5
        percentage points or a quarter of its own target, whichever is tighter.
      </p>

      <style>{`
        .uf-contrib-row {
          display: grid;
          grid-template-columns: 1.3fr 0.8fr 1.1fr 0.7fr 0.7fr 1fr 1fr auto;
          gap: var(--uf-s3);
          align-items: center;
          padding: var(--uf-s2) 0;
        }
        .uf-contrib-head {
          font-size: 11px; font-weight: 700; letter-spacing: 0.09em; text-transform: uppercase;
          border-bottom: 1px solid var(--uf-border); padding-bottom: var(--uf-s2);
        }
        .uf-cell { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
        .uf-cell-label { display: none; }
        .uf-cell-amount { align-items: flex-end; }
        .uf-cell-remove { align-items: flex-end; }

        /* Below 860px the eight columns cannot hold their contents — the
           target field was clipping to a single digit — so each row becomes a
           two-column card and every figure carries its own label, since the
           header row is gone. */
        @media (max-width: 860px) {
          .uf-contrib-head { display: none; }
          .uf-contrib-row {
            grid-template-columns: 1fr 1fr;
            gap: var(--uf-s4) var(--uf-s3);
            padding: var(--uf-s4) 0;
            border-bottom: 1px solid var(--uf-border);
          }
          .uf-cell-label {
            display: block;
            font-size: 11px; font-weight: 700; letter-spacing: 0.09em;
            text-transform: uppercase; color: var(--uf-ink-2);
          }
          .uf-cell-wide { grid-column: 1 / -1; }
          .uf-cell-amount, .uf-cell-remove { align-items: flex-start; }
          .uf-cell-remove { grid-column: 1 / -1; }
        }
      `}</style>
    </div>
  );
}
