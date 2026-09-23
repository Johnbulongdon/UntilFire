"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Badge, Button, Card, Field, Input, Money, SegmentedControl, Select } from "@/components/ui";
import {
  EMPTY_LADDER, ladderToStored, loadCloudPlan, newerPlan, planHasContent,
  planToRows, readLocalPlan, rowsToPlan, saveCloudPlan, saveSnapshot,
  stampPlan, storedToLadder, writeLocalPlan,
  type DebtRow, type LadderFields, type PlanRow, type SaveResult, type StoredPlan,
} from "@/lib/contribution-store";
import { DEFAULT_THRESHOLD_PCT, type RungKind } from "@/lib/contribution-waterfall";
import {
  countdownLabel, DEFAULT_SCHEDULE, type ContributionCadence, type ContributionSchedule,
} from "@/lib/contribution-schedule";
import {
  buildLadderView, measuredEmergencyFund, measuredExpenses, planBudgetOverride,
  type AccountFacts,
} from "@/lib/contribution-ladder";
import { describeAccounts } from "@/lib/emergency-fund-accounts";
import { supabase } from "@/lib/supabase";
import {
  aggregateHoldingsByTicker, planContribution, planImportMerge, targetsSumTo100,
  type ExpenseSource, type Frequency, type Holding, type Target,
} from "@/lib/contribution";

/* Where this month's money goes. The maths and the two places it departs from
   the spreadsheet it ports are in lib/contribution.ts and
   docs/design/next-contribution.md.

   Everything typed here is saved: the allocation, the budget, and the
   ladder's own inputs. localStorage holds it for an instant repaint, the
   profiles.contribution_plan column holds the copy that survives a cleared
   browser and follows the user to another device. lib/contribution-store.ts
   has the two-store rationale. */

type Row = PlanRow;

/* A worked example rather than an empty form, labelled as one. The named
   portfolios the user picks from, with their arguments for and against, are a
   later step — nothing here recommends anything. */
const EXAMPLE: Row[] = [
  { id: "a", symbol: "VTI",  targetPct: "60", value: "" },
  { id: "b", symbol: "VXUS", targetPct: "30", value: "" },
  { id: "c", symbol: "BND",  targetPct: "10", value: "" },
];

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const FREQUENCIES = [
  { value: "monthly" as const, label: "Monthly" },
  { value: "weekly" as const, label: "Weekly" },
  { value: "daily" as const, label: "Daily" },
];

const num = (s: string) => {
  const n = parseFloat(s.replace(/[^0-9.\-]/g, ""));
  return Number.isFinite(n) ? n : 0;
};
const fmtUsd = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const mono: React.CSSProperties = { fontFamily: "var(--uf-font-mono)", fontVariantNumeric: "tabular-nums" };

/* The same facts the Home card reads, by the same names — the dashboard
   builds them once and hands the object to both, so the two surfaces cannot
   end up looking at different inputs. cashAccounts is optional here because
   the page renders perfectly well with none. */
export type ContributionsTabProps = Partial<AccountFacts>;

/* Three of the ladder's inputs are things the app already knows, so they are
   read from the account rather than asked for again. They stay editable: a
   measured figure can be zero (nothing connected, no spending history yet)
   and someone may want to try a different number without changing their real
   assumptions. An override is remembered until it is cleared.

   Two of the three have a choice behind them as well, because the app knowing
   a number is not the same as it knowing which number you mean. Cash is not
   one pot — a savings account is a buffer, a current account is this month's
   spending — so the emergency fund reads from savings and the user can say
   otherwise. And needs vary month to month, so the expenses field follows
   either the last complete month or the average of them. */
export default function ContributionsTab({
  cashAccounts = [], manualCashSavings, lastMonthNeeds, averageNeeds, realReturn,
  expectedOutgoings, today,
}: ContributionsTabProps = {}) {
  const [rows, setRows] = useState<Row[]>(EXAMPLE);
  /* Null means "whatever is actually free by the next contribution date".
     A string is an amount the user fixed by hand — the same override shape
     the other measured fields on this page use. */
  const [budgetOverride, setBudgetOverride] = useState<string | null>(null);
  const [frequency, setFrequency] = useState<Frequency>("monthly");
  /* When money arrives, which is payday. `frequency` above is when it is then
     invested, which is strategy. Paid monthly while buying weekly is ordinary
     and needs both. */
  const [schedule, setSchedule] = useState<ContributionSchedule>(DEFAULT_SCHEDULE);
  const [loaded, setLoaded] = useState(false);

  /* The ladder's own inputs, in one object so they save and restore as one
     thing. Plaid can supply debt rates through its Liabilities product, but
     that is not one of the products this app's link token asks for, and
     adding it would only cover newly linked accounts — so these are typed,
     and Plaid becomes a pre-fill later rather than the source of truth. */
  const [fields, setFields] = useState<LadderFields>(EMPTY_LADDER);

  /* The account read is asynchronous, so it can land after someone has
     started typing. Anything typed wins: a plan arriving from the network
     and wiping the figure you are halfway through entering is the same
     complaint as not saving at all. */
  const touched = useRef(false);
  const patchFields = (p: Partial<LadderFields>) => {
    touched.current = true;
    setFields((f) => ({ ...f, ...p }));
  };
  const {
    efOverride, expensesOverride: expOverride, thresholdOverride: thrOverride,
    efAccountIds, expenseSource,
    monthlyMatch, taxRoom, lowInterestExtra, debts: debtRows, disabled,
  } = fields;
  const setEfOverride = (v: string | null) => patchFields({ efOverride: v });
  const setExpOverride = (v: string | null) => patchFields({ expensesOverride: v });
  const setThrOverride = (v: string | null) => patchFields({ thresholdOverride: v });
  const setMonthlyMatch = (v: string) => patchFields({ monthlyMatch: v });
  const setTaxRoom = (v: string) => patchFields({ taxRoom: v });
  const setLowInterestExtra = (v: string) => patchFields({ lowInterestExtra: v });
  const setDebtRows = (fn: (rs: DebtRow[]) => DebtRow[]) => {
    touched.current = true;
    setFields((f) => ({ ...f, debts: fn(f.debts) }));
  };
  const setDisabled = (fn: (d: RungKind[]) => RungKind[]) => {
    touched.current = true;
    setFields((f) => ({ ...f, disabled: fn(f.disabled) }));
  };
  const editRows = (fn: (rs: Row[]) => Row[]) => { touched.current = true; setRows(fn); };
  const editBudget = (v: string | null) => { touched.current = true; setBudgetOverride(v); };
  const editFrequency = (v: Frequency) => { touched.current = true; setFrequency(v); };
  const editSchedule = (p: Partial<ContributionSchedule>) => {
    touched.current = true;
    setSchedule((sc) => ({ ...sc, ...p }));
  };

  /* localStorage first so the tab paints immediately, then the account, which
     is the copy that survives a cleared browser and follows you to another
     device. Whichever was written later wins: the account write is debounced,
     so switching tabs mid-edit cancels it and leaves the local copy ahead by
     a keystroke — and handing that user back the older plan is exactly what
     this is here to prevent. Whichever wins is pushed to the account, so a
     plan from before there was persistence, or one left behind by a cancelled
     write, ends up stored rather than stranded. */
  const apply = (plan: StoredPlan) => {
    const r = planToRows(plan);
    // An empty target list leaves the worked example alone rather than
    // replacing it with nothing. The budget and the ladder still restore:
    // they are a plan on their own, even with no allocation behind them yet.
    if (r.rows.length) setRows(r.rows);
    const fixed = planBudgetOverride(plan);
    setBudgetOverride(fixed === null ? null : String(fixed));
    setFrequency(r.frequency);
    setSchedule(plan.contribution ?? DEFAULT_SCHEDULE);
    if (plan.ladder) setFields(storedToLadder(plan.ladder));
  };

  useEffect(() => {
    let cancelled = false;
    const local = readLocalPlan();
    if (planHasContent(local)) apply(local);
    (async () => {
      const cloud = await loadCloudPlan();
      if (cancelled) return;
      const winner = newerPlan(local, cloud);
      if (planHasContent(winner)) {
        // The local copy is already on screen from above. Re-applying it
        // would rebuild every row with a fresh id under the user's cursor.
        if (winner !== local && !touched.current) apply(winner);
        if (winner !== cloud) await saveCloudPlan(winner);
      }
      if (!cancelled) setLoaded(true);
    })();
    return () => { cancelled = true; };
  }, []);

  const accountThresholdPct = realReturn != null ? +(realReturn * 100).toFixed(2) : DEFAULT_THRESHOLD_PCT;

  /* The emergency fund. Read from the accounts the user has chosen, or from
     their savings accounts if they have not chosen; a profile figure typed in
     by hand covers anyone with no bank connected at all. The derivation lives
     in lib/contribution-ladder.ts because the Home card reports the same
     answer, and two copies of it would drift. */
  const facts: AccountFacts = {
    cashAccounts, manualCashSavings, lastMonthNeeds, averageNeeds, realReturn,
    expectedOutgoings, today,
  };
  const measuredEf = measuredEmergencyFund(efAccountIds, facts);
  const efAccounts = measuredEf.accounts;
  const efFromAccounts = measuredEf.balance;
  const hasAccountEf = efFromAccounts > 0;
  const efBalance = efOverride ?? (hasAccountEf ? String(Math.round(efFromAccounts)) : "");
  const efSourceLabel = cashAccounts.length > 0
    ? (efAccounts.length > 0 ? `From ${describeAccounts(efAccounts)}` : "No accounts chosen")
    : hasAccountEf ? "From the cash in your profile" : "No connected cash yet";

  /* Needs vary month to month, so which month matters. The last complete one
     is the default: it is what someone means by "what I spend", and an
     average over a year of connected history quietly flattens the rent rise
     they are actually planning around. */
  const measured = measuredExpenses(expenseSource, facts);
  const hasAccountExp = measured > 0;
  const monthlyExpenses = expOverride ?? (hasAccountExp ? String(Math.round(measured)) : "");
  /* No figures in the labels: the chosen one is already in the input directly
     above, and "Last month · $1,340" is wider than the grid cell, which
     clipped it to "Last month · $1,34". */
  const expenseChoices: { value: ExpenseSource | "custom"; label: string }[] = [
    { value: "last-month", label: "Last month" },
    { value: "average", label: "Monthly average" },
    { value: "custom", label: "A number I set" },
  ];
  const expenseChoice: ExpenseSource | "custom" = expOverride !== null ? "custom" : expenseSource;
  const chooseExpenseSource = (v: string) => {
    if (v === "custom") {
      // Seed the custom field with whatever is on screen, so switching to it
      // does not blank the number the user was just looking at.
      patchFields({ expensesOverride: monthlyExpenses });
    } else {
      patchFields({ expenseSource: v as ExpenseSource, expensesOverride: null });
    }
  };

  const threshold = thrOverride ?? String(accountThresholdPct);

  const [pickingAccounts, setPickingAccounts] = useState(false);
  const toggleEfAccount = (id: string) => {
    // The first tick turns "my savings accounts" into an explicit list, so
    // that unticking one of them has something to remove it from.
    const current = efAccountIds ?? efAccounts.map((a) => a.id);
    patchFields({
      efAccountIds: current.includes(id) ? current.filter((x) => x !== id) : [...current, id],
    });
  };

  const [importing, setImporting] = useState(false);
  const [importNote, setImportNote] = useState<{ tone: "ok" | "warn"; text: string } | null>(null);

  /* Pull what you actually hold from connected investment accounts. Plaid
     returns institution_price and institution_value per position, so this
     needs no market-data feed of its own — the prices arrive with the
     holdings. Matching is by ticker, which is the only identifier shared
     between what Plaid knows and what the user typed. */
  async function importFromAccounts() {
    setImporting(true);
    setImportNote(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setImportNote({ tone: "warn", text: "Sign in to import from your connected accounts." });
        return;
      }
      const res = await fetch("/api/plaid/holdings", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      }).catch(() => null);
      if (!res?.ok) {
        setImportNote({ tone: "warn", text: "Could not reach your accounts just now. Nothing was changed." });
        return;
      }
      const data = await res.json().catch(() => null);
      const agg = aggregateHoldingsByTicker(data?.holdings ?? [], data?.securities ?? {});
      const reconnect: string[] = data?.needs_reconnect ?? [];

      if (agg.holdings.length === 0) {
        const why = reconnect.length
          ? `No holdings came back. Reconnect ${reconnect.join(", ")} and try again.`
          : "No investment holdings found in your connected accounts.";
        setImportNote({ tone: "warn", text: why });
        return;
      }

      const merge = planImportMerge(rows.map((r) => r.symbol), agg.holdings);
      const filled = merge.fill.size;
      const added = merge.add.length;
      editRows((current) => [
        ...current.map((r) => {
          const v = merge.fill.get(r.symbol.trim().toUpperCase());
          return v === undefined ? r : { ...r, value: String(Math.round(v)) };
        }),
        ...merge.add.map((h) => ({
          id: crypto.randomUUID(), symbol: h.symbol, targetPct: "", value: String(Math.round(h.value)),
        })),
      ].filter((r) => r.symbol.trim() || r.targetPct.trim() || r.value.trim()));

      const parts = [`Updated ${filled} holding${filled === 1 ? "" : "s"}`];
      if (added) parts.push(`added ${added} more — give each a target`);
      if (agg.cashValue > 0) {
        parts.push(`${fmtUsd(agg.cashValue)} of that is cash, listed under its currency — give it a target if you hold it on purpose`);
      }
      if (agg.skippedCount) {
        parts.push(`${agg.skippedCount} position${agg.skippedCount === 1 ? "" : "s"} worth ${fmtUsd(agg.skippedValue)} had no ticker and was left out, so the total below is short by that much`);
      }
      if (reconnect.length) parts.push(`${reconnect.join(", ")} needs reconnecting`);
      setImportNote({ tone: agg.skippedCount || reconnect.length ? "warn" : "ok", text: `${parts.join(". ")}.` });
    } finally {
      setImporting(false);
    }
  }

  const named = rows.filter((r) => r.symbol.trim());
  const targets: Target[] = named.map((r) => ({ symbol: r.symbol.trim().toUpperCase(), targetPct: num(r.targetPct) / 100 }));
  const holdings: Holding[] = named.map((r) => ({ symbol: r.symbol.trim().toUpperCase(), value: num(r.value) }));

  /* The ladder, from the same builder the Home card reads. What is on screen
     wins over what was measured — the fields carry the overrides already —
     so the view is built from the fields as they stand. */
  const view = buildLadderView(
    ladderToStored(fields),
    budgetOverride === null ? null : num(budgetOverride),
    facts,
    schedule,
  );
  /* What the amount field shows: the fixed figure when there is one, and
     otherwise what is actually free by the next contribution date. */
  const budget = budgetOverride ?? String(Math.round(view.available.free));

  /* The local write is immediate; the account write is debounced, because
     otherwise every keystroke in a target field is a round trip. */
  const [saveState, setSaveState] = useState<"idle" | "saving" | SaveResult>("idle");
  useEffect(() => {
    // Nothing is written until the user has actually changed something.
    // `loaded` alone would store the worked example as if it were their plan
    // — and flash "Saving…" at someone who has not typed a character.
    // `touched` is a ref, but every edit also changes a dep below, so the
    // effect re-runs on the same tick the ref is set.
    if (!loaded || !touched.current) return;
    const plan = stampPlan({
      ...rowsToPlan(rows, budget, frequency),
      ladder: ladderToStored(fields),
      contribution: schedule,
      budgetOverride: budgetOverride === null ? null : num(budgetOverride),
    });
    writeLocalPlan(plan);
    setSaveState("saving");
    const t = setTimeout(() => {
      void saveCloudPlan(plan).then(setSaveState);
    }, 900);
    return () => clearTimeout(t);
  }, [rows, budget, frequency, fields, schedule, budgetOverride, loaded]);

  const expenses = view.expenses;
  const efFloor = view.efFloor;
  const efTarget = view.efTarget;
  const waterfall = view.waterfall;
  // Only what survives the ladder is available to the allocation.
  const investable = view.investable;

  const targetSum = targets.reduce((s, t) => s + t.targetPct, 0);
  const balanced = targets.length > 0 && targetsSumTo100(targets);
  const plan = useMemo(
    () => (balanced ? planContribution(targets, holdings, investable, { frequency }) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [JSON.stringify(targets), JSON.stringify(holdings), investable, frequency, balanced],
  );

  /* One snapshot per visit, per month. This is the only record of what the
     portfolio looked like at a point in time — holdings are priced live and
     stored nowhere else — so a month nobody opens the tab in has no row, and
     cannot be reconstructed later. Written on open rather than by a cron
     because there is no server-side price source to run one against. */
  const snapshotWritten = useRef(false);
  useEffect(() => {
    if (!loaded || !plan || snapshotWritten.current) return;
    if (plan.assets.every((a) => a.value <= 0)) return;   // nothing held yet
    snapshotWritten.current = true;
    void saveSnapshot(plan, num(budget), frequency);
  }, [loaded, plan, budget, frequency]);

  const portfolio = holdings.reduce((s, h) => s + h.value, 0);
  const set = (id: string, patch: Partial<Row>) =>
    editRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)));

  const periodWord = frequency === "monthly" ? "month" : frequency === "weekly" ? "week" : "day";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--uf-s5)" }}>
      <div>
        <h2 className="uf-t-h2" style={{ margin: 0 }}>Next contribution</h2>
        <p className="uf-t-body" style={{ color: "var(--uf-ink-2)", margin: "var(--uf-s2) 0 0", maxWidth: 560 }}>
          Set what you want to hold and what you hold now. This works out where
          the next {periodWord}&apos;s money should go to close the gap. Everything
          on this page is saved as you type.
        </p>
        {/* Quiet, and only after something has actually been written — a
            "Saved" that is on screen before the first edit says nothing. */}
        <p className="uf-t-small" aria-live="polite" data-testid="uf-save-state"
           style={{ color: "var(--uf-ink-2)", margin: "var(--uf-s2) 0 0", minHeight: "1.2em" }}>
          {saveState === "saving" ? "Saving…"
            : saveState === "saved" ? "Saved to your account."
            : saveState === "signed-out" ? "Saved on this device. Sign in to keep it across devices."
            : saveState === "failed" ? "Saved on this device. Your account could not be reached — it will sync next time."
            : ""}
        </p>
      </div>

      <Card>
        {/* flex-start, not flex-end: these fields have hints of differing
            heights, and aligning their bottoms pushed the hint-less ones
            down so the row of inputs no longer lined up. */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--uf-s5)", alignItems: "flex-start" }}>
          <Field label="Contribution" htmlFor="uf-budget" style={{ minWidth: 170 }}
                 hint={budgetOverride !== null ? "A figure you set — clear it to follow your cash" : "What is free by then"}>
            <Input id="uf-budget" numeric inputMode="decimal" value={budget}
                   onChange={(e) => editBudget(e.target.value)} />
            {budgetOverride !== null && (
              <Button variant="ghost" size="sm" style={{ alignSelf: "flex-start", marginTop: 2 }}
                      onClick={() => editBudget(null)}>Use what I have</Button>
            )}
          </Field>
          <Field label="Money arrives" htmlFor="uf-cadence" style={{ minWidth: 150 }}
                 hint={`Next ${countdownLabel(view.available.daysUntil)}`}>
            <Select id="uf-cadence" value={schedule.cadence}
                    onChange={(e) => editSchedule({
                      cadence: e.target.value as ContributionCadence,
                      // A day-of-month anchor is meaningless as a weekday and
                      // vice versa, so switching resets it to a sane default.
                      anchorDay: e.target.value === "weekly" ? 5 : 1,
                    })}>
              <option value="monthly">Monthly</option>
              <option value="weekly">Weekly</option>
            </Select>
          </Field>
          <Field label={schedule.cadence === "weekly" ? "On" : "Day of month"} htmlFor="uf-anchor" style={{ minWidth: 130 }}>
            {schedule.cadence === "weekly" ? (
              <Select id="uf-anchor" value={String(schedule.anchorDay)}
                      onChange={(e) => editSchedule({ anchorDay: Number(e.target.value) })}>
                {WEEKDAYS.map((label, i) => <option key={label} value={i}>{label}</option>)}
              </Select>
            ) : (
              <Input id="uf-anchor" numeric inputMode="numeric" value={String(schedule.anchorDay)}
                     onChange={(e) => editSchedule({ anchorDay: Math.min(31, Math.max(1, Math.round(num(e.target.value)) || 1)) })} />
            )}
          </Field>
          <Field label="Buy in" hint="How often it is invested">
            <SegmentedControl options={FREQUENCIES} value={frequency} onChange={editFrequency} label="How often it is invested" />
          </Field>
          <Field label="Portfolio now">
            <div style={{ ...mono, fontSize: 24, paddingTop: 4 }}><Money amount={portfolio} /></div>
          </Field>
        </div>

        {/* The subtraction, not just its answer. With no expected payments
            recorded nothing is subtracted, so the figure reads high — and
            high is the direction that tells someone to invest their rent.
            Showing the working is what makes that visible. */}
        {budgetOverride === null && (
          <p className="uf-t-small" style={{ color: "var(--uf-ink-2)", margin: "var(--uf-s3) 0 0" }}>
            <span style={mono}>{fmtUsd(view.available.cash)}</span> in cash outside your emergency fund
            {view.available.hasExpectedData ? (
              <> · less <span style={mono}>{fmtUsd(view.available.committed)}</span> due before{" "}
                {view.available.nextDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                {" "}· <span style={mono}>{fmtUsd(view.available.free)}</span> free</>
            ) : (
              <> · nothing recorded as due, so this assumes none of it is spoken for.{" "}
                <strong>Add your bills in Money → Expected</strong> to make this figure real.</>
            )}
          </p>
        )}
      </Card>

      <Card>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: "var(--uf-s4)", flexWrap: "wrap" }}>
          <h3 className="uf-t-h3" style={{ margin: 0 }}>Before investing</h3>
          <span className="uf-t-small" style={{ color: "var(--uf-ink-2)" }}>
            Each step takes what it needs, in order. What is left is invested.
          </span>
        </div>

        <div className="uf-ladder-inputs">
          <Field label="Emergency fund now" htmlFor="uf-ef"
                 hint={efOverride !== null ? "Edited — clear to read it from your accounts" : efSourceLabel}>
            <Input id="uf-ef" numeric inputMode="decimal" placeholder="0" value={efBalance}
                   onChange={(e) => setEfOverride(e.target.value)} />
            <div style={{ display: "flex", gap: "var(--uf-s2)", flexWrap: "wrap", marginTop: 2 }}>
              {efOverride !== null && hasAccountEf && (
                <Button variant="ghost" size="sm" onClick={() => setEfOverride(null)}>Use my accounts</Button>
              )}
              {cashAccounts.length > 0 && (
                <Button variant="ghost" size="sm" aria-expanded={pickingAccounts}
                        onClick={() => setPickingAccounts((v) => !v)}>
                  {pickingAccounts ? "Done" : "Choose accounts"}
                </Button>
              )}
            </div>
          </Field>
          <Field label="Monthly expenses" htmlFor="uf-exp"
                 hint={expenses > 0
                   ? `Floor ${fmtUsd(efFloor)} · target ${fmtUsd(efTarget)}`
                   : hasAccountExp ? "From your spending" : "No spending history yet"}>
            <Input id="uf-exp" numeric inputMode="decimal" placeholder="0" value={monthlyExpenses}
                   onChange={(e) => setExpOverride(e.target.value)} />
            {/* A Select, not a pill row: three labels this long overflow a
                150px grid cell, and the neighbouring field then sits on top
                of them — the options became unclickable. */}
            <Select aria-label="Which spending to plan against" style={{ marginTop: 2 }}
                    value={expenseChoice} onChange={(e) => chooseExpenseSource(e.target.value)}>
              {expenseChoices.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </Select>
            {expOverride !== null && hasAccountExp && (
              <Button variant="ghost" size="sm" style={{ alignSelf: "flex-start", marginTop: 2 }}
                      onClick={() => setExpOverride(null)}>Use my spending</Button>
            )}
          </Field>
          <Field label="Employer match / mo" htmlFor="uf-match"><Input id="uf-match" numeric inputMode="decimal" placeholder="0" value={monthlyMatch} onChange={(e) => setMonthlyMatch(e.target.value)} /></Field>
          <Field label="Tax-advantaged room" htmlFor="uf-room"><Input id="uf-room" numeric inputMode="decimal" placeholder="0" value={taxRoom} onChange={(e) => setTaxRoom(e.target.value)} /></Field>
          <Field label="Overpay a cheap loan / mo" htmlFor="uf-extra" hint="Above the minimum you already pay. Leave at 0 unless you want it gone early."><Input id="uf-extra" numeric inputMode="decimal" placeholder="0" value={lowInterestExtra} onChange={(e) => setLowInterestExtra(e.target.value)} /></Field>
          <Field label="Expensive above (%)" htmlFor="uf-thr"
                 hint={thrOverride !== null ? "Edited — clear to follow your plan" : "Your own growth assumption"}>
            <Input id="uf-thr" numeric inputMode="decimal" value={threshold}
                   onChange={(e) => setThrOverride(e.target.value)} />
            {thrOverride !== null && (
              <Button variant="ghost" size="sm" style={{ alignSelf: "flex-start", marginTop: 2 }}
                      onClick={() => setThrOverride(null)}>Use my {accountThresholdPct}%</Button>
            )}
          </Field>
        </div>

        {pickingAccounts && cashAccounts.length > 0 && (
          <div className="uf-ef-picker">
            <p className="uf-t-small" style={{ color: "var(--uf-ink-2)", margin: "0 0 var(--uf-s2)" }}>
              Which of these is your emergency fund? Savings and money market
              are ticked to start with — a current account is this month&apos;s
              spending, not a buffer.
            </p>
            {cashAccounts.map((a) => {
              const on = efAccounts.some((x) => x.id === a.id);
              return (
                <label key={a.id} className="uf-ef-account">
                  <input type="checkbox" checked={on} onChange={() => toggleEfAccount(a.id)} />
                  <span className="uf-t-body" style={{ flex: 1, minWidth: 0 }}>
                    {a.label}
                    {a.mask && <span style={{ color: "var(--uf-ink-2)" }}> ····{a.mask}</span>}
                    <span className="uf-t-label" style={{ color: "var(--uf-ink-2)", textTransform: "capitalize", marginLeft: "var(--uf-s2)" }}>
                      {a.subtype}
                      {a.apy != null && a.apy > 0 ? ` · ${a.apy}% APY` : ""}
                    </span>
                  </span>
                  <span style={{ ...mono, fontSize: 14 }}>{fmtUsd(a.balance)}</span>
                </label>
              );
            })}
            {efAccountIds !== null && (
              <Button variant="ghost" size="sm" style={{ marginTop: "var(--uf-s2)" }}
                      onClick={() => patchFields({ efAccountIds: null })}>
                Back to my savings accounts
              </Button>
            )}
          </div>
        )}

        <div style={{ marginTop: "var(--uf-s5)" }}>
          <div className="uf-t-label" style={{ textTransform: "uppercase", letterSpacing: "0.09em", color: "var(--uf-ink-2)", marginBottom: "var(--uf-s2)" }}>
            What you owe
          </div>
          {debtRows.length === 0 && (
            <p className="uf-t-small" style={{ color: "var(--uf-ink-2)", margin: "0 0 var(--uf-s3)" }}>
              Nothing added. Rates are typed in — your bank connection does not carry them.
            </p>
          )}
          {debtRows.map((d) => (
            <div key={d.id} className="uf-debt-row">
              <Input aria-label="Debt name" placeholder="Credit card" value={d.name}
                     onChange={(e) => setDebtRows((rs) => rs.map((x) => x.id === d.id ? { ...x, name: e.target.value } : x))} />
              <Input aria-label="Debt balance" numeric inputMode="decimal" placeholder="0" value={d.balance}
                     onChange={(e) => setDebtRows((rs) => rs.map((x) => x.id === d.id ? { ...x, balance: e.target.value } : x))} />
              <Input aria-label="Debt rate" numeric inputMode="decimal" placeholder="%" value={d.ratePct}
                     onChange={(e) => setDebtRows((rs) => rs.map((x) => x.id === d.id ? { ...x, ratePct: e.target.value } : x))} />
              <span style={{ ...mono, fontSize: 13, color: "var(--uf-ink-2)" }}>
                {num(d.ratePct) >= (num(threshold) || DEFAULT_THRESHOLD_PCT) ? "expensive" : "cheap"}
              </span>
              <Button variant="ghost" size="sm" aria-label={`Remove ${d.name || "debt"}`}
                      onClick={() => setDebtRows((rs) => rs.filter((x) => x.id !== d.id))}>Remove</Button>
            </div>
          ))}
          <Button variant="secondary" size="sm" style={{ marginTop: "var(--uf-s2)" }}
                  onClick={() => setDebtRows((rs) => [...rs, { id: crypto.randomUUID(), name: "", balance: "", ratePct: "" }])}>
            Add a debt
          </Button>
        </div>

        <div className="uf-ladder-steps">
          {waterfall.fills.map((f, i) => {
            const off = !f.enabled;
            return (
              <div key={f.kind} className={`uf-ladder-step${f.amount > 0 ? " is-active" : ""}`}>
                <span style={{ ...mono, color: "var(--uf-ink-3)", fontSize: 13 }}>{i + 1}</span>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 700, opacity: off ? 0.45 : 1 }}>{f.label}</div>
                  <div className="uf-t-small" style={{ color: "var(--uf-ink-2)" }}>{f.why}</div>
                </div>
                <span style={{ ...mono, fontWeight: 700, whiteSpace: "nowrap" }}>
                  {off ? "—" : f.amount > 0 ? <Money amount={f.amount} decimals={f.amount < 100 ? 2 : 0} /> : <span style={{ color: "var(--uf-ink-3)" }}>$0</span>}
                </span>
                {(f.capacity > 0 || disabled.includes(f.kind)) ? (
                  <Button variant="ghost" size="sm" aria-label={`${off ? "Turn on" : "Turn off"} ${f.label}`}
                          onClick={() => setDisabled((d) => off ? d.filter((k) => k !== f.kind) : [...d, f.kind])}>
                    {off ? "On" : "Off"}
                  </Button>
                ) : <span />}
              </div>
            );
          })}
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
                          onClick={() => editRows((rs) => rs.filter((x) => x.id !== r.id))}>Remove</Button>
                )}
              </div>
            </div>
          );
        })}

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "var(--uf-s4)", marginTop: "var(--uf-s4)", flexWrap: "wrap" }}>
          <div style={{ display: "flex", gap: "var(--uf-s2)", flexWrap: "wrap" }}>
            <Button variant="secondary" size="sm"
                    onClick={() => editRows((rs) => [...rs, { id: crypto.randomUUID(), symbol: "", targetPct: "", value: "" }])}>
              Add an asset
            </Button>
            <Button variant="secondary" size="sm" disabled={importing} onClick={importFromAccounts}>
              {importing ? "Importing\u2026" : "Import from my accounts"}
            </Button>
          </div>
          <span className="uf-t-small" style={{ ...mono, color: balanced ? "var(--uf-ink-2)" : "var(--uf-neg)" }}>
            Targets total {(targetSum * 100).toFixed(1)}%{balanced ? "" : " — must be 100%"}
          </span>
        </div>

        {importNote && (
          <p className="uf-t-small" aria-live="polite"
             style={{ margin: "var(--uf-s3) 0 0", color: importNote.tone === "ok" ? "var(--uf-ink-2)" : "var(--uf-neg)" }}>
            {importNote.text}
          </p>
        )}
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
        .uf-ladder-inputs {
          display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: var(--uf-s4); margin-top: var(--uf-s5);
        }
        .uf-debt-row {
          display: grid; grid-template-columns: 1.4fr 1fr 0.7fr auto auto;
          gap: var(--uf-s3); align-items: center; padding: var(--uf-s2) 0;
        }
        .uf-ef-picker {
          margin-top: var(--uf-s4); padding: var(--uf-s4);
          background: var(--uf-surface); border-radius: var(--uf-r-card);
        }
        .uf-ef-account {
          display: flex; align-items: center; gap: var(--uf-s3);
          padding: var(--uf-s2) 0; cursor: pointer;
        }
        .uf-ef-account + .uf-ef-account { border-top: 1px solid var(--uf-border); }
        .uf-ef-account input { width: 18px; height: 18px; accent-color: var(--uf-green); flex: none; }
        .uf-ladder-steps { margin-top: var(--uf-s5); border-top: 1px solid var(--uf-border); }
        .uf-ladder-step {
          display: grid; grid-template-columns: 22px 1fr auto auto;
          gap: var(--uf-s3); align-items: center;
          padding: var(--uf-s3) 0; border-bottom: 1px solid var(--uf-border);
        }
        .uf-ladder-step.is-active { background: var(--uf-surface); }
        @media (max-width: 860px) {
          .uf-debt-row { grid-template-columns: 1fr 1fr; }
          .uf-ladder-step { grid-template-columns: 22px 1fr auto; }
          .uf-ladder-step > :last-child { grid-column: 2 / -1; justify-self: start; }
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
