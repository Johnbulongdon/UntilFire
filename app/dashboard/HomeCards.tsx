"use client";

/**
 * Home's calm cards (D-39): the freedom date, this month, and one quiet row.
 *
 * Progress is drawn, not described. Each card leads with one number and the
 * bar that number fills; colour is the category colours in "This month" and
 * teal for freedom and progress, nothing else. Read-only, like all of Home:
 * every figure is computed by the dashboard and passed in.
 */

import { Button, Card, Icon } from "@/components/ui";
import type { NextMove } from "@/lib/next-move";
import type { PaydayLine } from "@/lib/payday-line";
import Flag, { flagUri } from "@/app/components/Flag";

/** A drawn flag, or the emoji as-is when it is a pin or a house rather than a country. */
function RouteFlag({ emoji }: { emoji?: string }) {
  if (!emoji) return null;
  return flagUri(emoji) ? <Flag emoji={emoji} size={10} /> : <span aria-hidden>{emoji}</span>;
}

const mono: React.CSSProperties = { fontFamily: "var(--uf-font-mono)", fontVariantNumeric: "tabular-nums" };
const muted: React.CSSProperties = { color: "var(--uf-ink-3)" };
/**
 * Where a card leads: the tab's own icon and name, top right, so Home teaches
 * the navigation by picture. The whole chip is the button.
 */
export function DoorChip({ to, onClick }: { to: "plan" | "money"; onClick: () => void }) {
  const name = to === "plan" ? "Plan" : "Money";
  return (
    <button type="button" onClick={onClick} aria-label={`Open ${name}`}
      style={{ display: "inline-flex", alignItems: "center", gap: 6, border: "none", borderRadius: 999, padding: "5px 11px",
        background: "var(--uf-green-50)", color: "var(--uf-green)", font: "inherit", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
      <Icon name={to} size={14} />{name}
    </button>
  );
}

export function FreedomCard({ dateLabel, yearsAway, age, onOpen, route, children }: {
  /** "March 2041"; null until the plan has enough to project. */
  dateLabel: string | null;
  yearsAway: number | null;
  age: number | null;
  /** Opens Plan → Freedom Date. */
  onOpen: () => void;
  /** A planned move to the retirement city (D-82), shown under the date so the number says what it assumes. */
  route?: { from: string; fromFlag?: string; to: string; toFlag?: string; when: string; onOpen: () => void };
  /** The curve, drawn by the dashboard from the same projection as the date. */
  children: React.ReactNode;
}) {
  return (
    <Card style={{ display: "grid", gap: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
        <div>
          <div className="uf-t-small" style={muted}>Work becomes optional</div>
          {dateLabel ? (
            <>
              <div style={{ fontFamily: "var(--uf-font-display)", fontSize: "clamp(32px, 6vw, 40px)", fontWeight: 700, color: "var(--uf-teal)", lineHeight: 1.1 }}>{dateLabel}</div>
              {yearsAway != null && (
                <div className="uf-t-small" style={{ color: "var(--uf-ink-2)", marginTop: 2 }}>
                  In {yearsAway} {yearsAway === 1 ? "year" : "years"}{age ? `, at ${age}` : ""}
                </div>
              )}
              {route && (
                <button type="button" onClick={route.onOpen} aria-label={`Planned move to ${route.to} ${route.when}. Change it in Plan`}
                  style={{ marginTop: 10, display: "inline-flex", alignItems: "center", gap: 6, border: "1px solid var(--uf-border)", background: "var(--uf-surface-2)", borderRadius: 999, padding: "5px 12px", font: "inherit", fontSize: 13, fontWeight: 700, color: "var(--uf-ink)", cursor: "pointer" }}>
                  {route.from && <><span><RouteFlag emoji={route.fromFlag} /> {route.from}</span><span aria-hidden style={{ color: "var(--uf-ink-3)" }}>→</span></>}
                  <span><RouteFlag emoji={route.toFlag} /> {route.to}</span>
                  <span style={{ color: "var(--uf-ink-3)", fontWeight: 500 }}>· {route.when} ›</span>
                </button>
              )}
            </>
          ) : (
            <div className="uf-t-body" style={{ color: "var(--uf-ink-2)" }}>Finish your setup to see your freedom date.</div>
          )}
        </div>
        <DoorChip to="plan" onClick={onOpen} />
      </div>
      {children}
    </Card>
  );
}

/**
 * The one next move (lib/next-move): a sentence, what it is worth, and one
 * green button to where it is done. "Not now" hides it for a week and the
 * next rule takes its place, so the card never nags.
 */
export function NextMoveCard({ move, fmt, onOpen, onSnooze }: {
  move: NextMove;
  fmt: (n: number) => string;
  onOpen: () => void;
  onSnooze: () => void;
}) {
  const split = move.split && move.split.length > 1 ? move.split : null;
  return (
    <Card style={{ display: "grid", gap: 12, alignContent: "start" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
        <span className="uf-t-label" style={muted}>Your next move</span>
        <DoorChip to={move.door} onClick={onOpen} />
      </div>
      <div className="uf-t-h3" style={{ margin: 0 }}>{move.title}</div>
      {move.payoff && (
        <span style={{ justifySelf: "start", borderRadius: 999, padding: "4px 10px", background: "var(--uf-teal-soft)", color: "var(--uf-teal-deep)", fontSize: 12, fontWeight: 700 }}>
          {move.payoff}
        </span>
      )}
      {split && (
        <div style={{ display: "grid", gap: 6 }}>
          <div role="img" aria-label={split.map((f) => `${f.label} ${fmt(f.amount)}`).join(", ")} style={{ display: "flex", gap: 3 }}>
            {split.map((f, i) => (
              <i key={f.label} style={{ flex: `${Math.max(f.amount, 1)} 1 0`, height: 8, borderRadius: 4, background: "var(--uf-teal)", opacity: i === 0 ? 1 : 0.35 }} />
            ))}
          </div>
          <div className="uf-t-small" style={{ color: "var(--uf-ink-2)" }}>
            This month: {split.map((f, i) => <span key={f.label}>{i > 0 && " · "}{f.label} <span style={mono}>{fmt(f.amount)}</span></span>)}
          </div>
        </div>
      )}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
        <Button variant="primary" onClick={onOpen} style={{ flex: 1 }}>{move.button}</Button>
        <Button variant="ghost" size="sm" onClick={onSnooze}>Not now</Button>
      </div>
    </Card>
  );
}

export interface MonthCategory { key: string; label: string; color: string; usd: number }

export interface UpcomingBill { label: string; date: string; usd: number }

/** "Nov 1" from an ISO date, read as a local day. */
const dayChip = (iso: string) => new Date(`${iso}T12:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" });

/**
 * The pace line: everyday spend so far (solid) against an even pace to the
 * budget by month end (dotted). Spending under the dotted line is ahead.
 */
function PaceLine({ soFar, days, budget }: { soFar: number[]; days: number; budget: number }) {
  const w = 300, h = 64;
  const top = Math.max(budget, soFar.at(-1) ?? 0) * 1.05 || 1;
  const x = (i: number) => (days > 1 ? (i / (days - 1)) * w : 0);
  const y = (v: number) => h - (v / top) * h;
  const path = soFar.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  const last = soFar.length - 1;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" aria-hidden style={{ width: "100%", height: h, display: "block", overflow: "visible" }}>
      <line x1={0} y1={h} x2={w} y2={y(budget)} stroke="var(--uf-border-2)" strokeWidth={2} strokeDasharray="4 5" vectorEffect="non-scaling-stroke" />
      {last >= 0 && <path d={path} fill="none" stroke="var(--uf-teal)" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />}
      {/* A zero-length round-capped stroke, not a circle: the stretched viewBox would draw a circle as an oval. */}
      {last >= 0 && <path d={`M${x(last).toFixed(1)},${y(soFar[last]).toFixed(1)}h0`} stroke="var(--uf-teal-deep)" strokeWidth={8} strokeLinecap="round" vectorEffect="non-scaling-stroke" />}
    </svg>
  );
}

export function MonthCard({ spent, budget, left, paceSoFar, monthDays, nextBills, fmt, onOpen }: {
  /** Everyday spending this month: bills set aside (lib/everyday-left). */
  spent: number;
  /** The everyday budget; 0 when none is set. */
  budget: number;
  /** Budget less spent (D-86); only its sign is shown, as the red when over. Home's "left" is Until payday (D-90). */
  left: number;
  /** Everyday spend so far, summed day by day (lib/everyday-left everydayByDay). */
  paceSoFar: number[];
  monthDays: number;
  /** The next bills from today, soonest first; the card shows up to three. */
  nextBills: UpcomingBill[];
  fmt: (n: number) => string;
  onOpen: () => void;
}) {
  const over = left < 0;
  const evenSoFar = budget * (paceSoFar.length / Math.max(1, monthDays));
  // Within 5% of the budget either side of even pace reads as "on pace".
  const gap = spent - evenSoFar;
  const pace = Math.abs(gap) <= budget * 0.05 ? "On pace" : gap < 0 ? "A bit ahead of pace" : "Spending faster than pace";
  return (
    <Card style={{ display: "grid", gap: 10, alignContent: "start" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
        <span className="uf-t-label" style={muted}>This month</span>
        <DoorChip to="money" onClick={onOpen} />
      </div>
      {budget > 0 ? (
        <>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
            <span style={{ ...mono, fontSize: 32, fontWeight: 600, color: over ? "var(--uf-neg-ink)" : "var(--uf-ink)" }}>{fmt(spent)}</span>
            <span className="uf-t-small" style={muted}>spent of your <span style={mono}>{fmt(budget)}</span> day-to-day budget</span>
          </div>
          <div role="img" aria-label={`${pace}: spent ${fmt(spent)} so far, even pace would be ${fmt(evenSoFar)}`}>
            <PaceLine soFar={paceSoFar} days={monthDays} budget={budget} />
          </div>
          <div className="uf-t-small" style={{ color: "var(--uf-ink-2)" }}>{pace}</div>
        </>
      ) : (
        <>
          <span style={{ ...mono, fontSize: 32, fontWeight: 600 }}>{fmt(spent)}</span>
          <span className="uf-t-small" style={muted}>spent so far. Set a budget to see what&apos;s left.</span>
        </>
      )}
      {nextBills.length > 0 && (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {nextBills.slice(0, 3).map((b) => (
            <span key={`${b.label}-${b.date}`} className="uf-t-small" style={{ display: "inline-flex", gap: 6, padding: "4px 10px", borderRadius: 999, background: "var(--uf-surface-2)", color: "var(--uf-ink-2)" }}>
              <span style={{ fontWeight: 700, color: "var(--uf-ink)" }}>{dayChip(b.date)}</span>{b.label} <span style={mono}>{fmt(b.usd)}</span>
            </span>
          ))}
        </div>
      )}
    </Card>
  );
}

/** "Nov 1" from an ISO date, read as a local day. */
const shortDay = (iso: string) => new Date(`${iso}T12:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" });

/** A signed amount with a real minus, so a shortfall reads as one. */
const signed = (n: number, fmt: (n: number) => string) => `${n < 0 ? "−" : ""}${fmt(Math.abs(n))}`;

const CHART_H = 150, CHART_TOP = 34, ICON = 30;

/**
 * Until payday (D-90): one number, then the line behind it (lib/payday-line).
 * Faded from the last paycheck to today, the balance as it was; from today,
 * flat but for the bills, each marked by its icon at the start of its drop,
 * ending on payday at the card's number. Below zero is striped red.
 */
export function UntilPaydayCard({ line, paydayIso, billCount, billTotal, icon, fmt, onOpen }: {
  line: PaydayLine;
  paydayIso: string;
  billCount: number;
  billTotal: number;
  /** The emoji for a category, as Money shows it. */
  icon: (category: string | null, description?: string) => string;
  fmt: (n: number) => string;
  onOpen: () => void;
}) {
  const { span, today, past, dips, bills, end } = line;
  const short = end < 0;
  const vals = [...past, end, ...bills.map((b) => b.before)];
  const hi = Math.max(...vals), lo = Math.min(0, ...vals);
  // A shortfall gets room under zero, so the red reads as a place, not a line.
  const floor = short ? Math.min(lo, -(hi - lo) * 0.3) : lo;
  const x = (d: number) => (d / Math.max(1, span)) * 100;
  const y = (v: number) => CHART_TOP + ((hi - v) / Math.max(1, hi - floor)) * (CHART_H - CHART_TOP);
  const pastPath = past.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(2)},${y(v).toFixed(1)}`).join(" ");
  let futPath = `M${x(today).toFixed(2)},${y(past[today]).toFixed(1)}`;
  for (const b of bills) futPath += ` L${x(b.day).toFixed(2)},${y(b.before).toFixed(1)} L${x(b.day).toFixed(2)},${y(b.before - b.usd).toFixed(1)}`;
  futPath += ` L100,${y(end).toFixed(1)}`;
  const zero = y(0);
  // Bills too close to draw apart fold into the biggest, with a count.
  const marks: { day: number; usd: number; before: number; category: string | null; description: string; more: number }[] = [];
  for (const b of bills) {
    const near = marks.find((m) => Math.abs(x(m.day) - x(b.day)) < 7);
    if (!near) marks.push({ ...b, more: 0 });
    else { near.more += 1; if (b.usd > near.usd) Object.assign(near, { day: b.day, usd: b.usd, before: b.before, category: b.category, description: b.description }); }
  }
  const pin = (left: number, top: number, child: React.ReactNode, key: string, faded = false, more = 0) => (
    <span key={key} aria-hidden style={{ position: "absolute", left: `${left}%`, top, transform: "translate(-50%, -100%)", width: ICON, height: ICON, borderRadius: 10,
      display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, background: "var(--uf-surface-2)", border: "2px solid var(--uf-card)", opacity: faded ? 0.8 : 1 }}>
      {child}
      {more > 0 && <span style={{ position: "absolute", right: -8, top: -8, background: "var(--uf-ink)", color: "var(--uf-card)", fontSize: 10, fontWeight: 800, borderRadius: 7, padding: "1px 5px" }}>+{more}</span>}
    </span>
  );
  const axis: React.CSSProperties = { position: "absolute", bottom: 0, fontSize: 11, fontWeight: 700, color: "var(--uf-ink-3)", whiteSpace: "nowrap" };
  return (
    <Card style={{ display: "grid", gap: 10, alignContent: "start" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
        <span className="uf-t-label" style={muted}>Until payday</span>
        <DoorChip to="money" onClick={onOpen} />
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}>
        <span style={{ ...mono, fontSize: 36, fontWeight: 500, lineHeight: 1, color: short ? "var(--uf-neg-ink)" : "var(--uf-ink)" }}>{signed(end, fmt)}</span>
        <span className="uf-t-small" style={muted}>{short ? "short before payday" : "yours until payday"}</span>
      </div>
      <div role="img" aria-label={`${fmt(past[today])} today; ${billCount} ${billCount === 1 ? "bill" : "bills"} of ${fmt(billTotal)} before payday on ${shortDay(paydayIso)} leave ${signed(end, fmt)}`}
        style={{ position: "relative", height: CHART_H + 26, marginTop: 8 }}>
        {/* Below zero, striped red; drawn in CSS, as the stretched chart would skew an SVG pattern. */}
        {short && <span aria-hidden style={{ position: "absolute", left: 0, right: 0, top: zero, height: CHART_H - zero,
          background: "repeating-linear-gradient(135deg, var(--uf-neg-bg) 0 5px, color-mix(in srgb, var(--uf-neg) 40%, var(--uf-neg-bg)) 5px 7px)" }} />}
        <svg viewBox={`0 0 100 ${CHART_H}`} preserveAspectRatio="none" style={{ position: "absolute", inset: 0, width: "100%", height: CHART_H, overflow: "visible" }}>
          <defs>
            <linearGradient id="uf-payday-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="var(--uf-teal)" stopOpacity={0.22} /><stop offset="1" stopColor="var(--uf-teal)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <path d={`${futPath} L100,${Math.min(zero, CHART_H)} L${x(today).toFixed(2)},${Math.min(zero, CHART_H)} Z`} fill="url(#uf-payday-fill)" />
          {short && <>
            <line x1={0} x2={100} y1={zero} y2={zero} stroke="var(--uf-neg)" strokeWidth={1.5} vectorEffect="non-scaling-stroke" />
          </>}
          <path d={pastPath} fill="none" stroke="var(--uf-teal)" strokeOpacity={0.35} strokeWidth={2.5} strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
          <path d={futPath} fill="none" stroke="var(--uf-teal)" strokeWidth={2.5} strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
          <line x1={x(today)} x2={x(today)} y1={y(past[today])} y2={CHART_H} stroke="var(--uf-teal)" strokeWidth={1.5} strokeDasharray="2 3" vectorEffect="non-scaling-stroke" />
        </svg>
        {dips.map((d) => pin(x(d.day - 1), y(past[d.day - 1]) - 4, icon(d.category), `dip-${d.day}`, true))}
        {marks.map((m) => pin(x(m.day), y(m.before) - 4, icon(m.category, m.description), `bill-${m.day}`, false, m.more))}
        {marks.filter((m) => m.usd >= Math.max(100, (hi - floor) * 0.15)).map((m) => (
          <span key={`amt-${m.day}`} className="uf-t-small" style={{ ...mono, position: "absolute", left: `${x(m.day)}%`, top: (y(m.before) + y(m.before - m.usd)) / 2 - 8, transform: "translateX(calc(-100% - 6px))", color: "var(--uf-ink-2)", fontSize: 11, whiteSpace: "nowrap" }}>
            {signed(-m.usd, fmt)}
          </span>
        ))}
        <span aria-hidden style={{ position: "absolute", left: `${x(today)}%`, top: y(past[today]), transform: "translate(-50%, -50%)", width: 12, height: 12, borderRadius: 6, background: "var(--uf-teal-deep)", boxShadow: "0 0 0 2.5px var(--uf-card)" }} />
        <span aria-hidden style={{ position: "absolute", left: "100%", top: y(end), transform: "translate(-50%, -50%)", width: 26, height: 26, borderRadius: 13,
          display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 800, color: "var(--uf-card)", background: short ? "var(--uf-neg)" : "var(--uf-green)", boxShadow: "0 0 0 2.5px var(--uf-card)" }}>$</span>
        <span style={{ ...axis, left: 0 }}>{shortDay(line.startIso)}</span>
        {x(today) > 14 && x(today) < 80 && <span style={{ ...axis, left: `${x(today)}%`, transform: "translateX(-50%)", color: "var(--uf-teal-deep)" }}>Today</span>}
        <span style={{ ...axis, right: 0 }}>Payday · {shortDay(paydayIso)}</span>
      </div>
      {billCount > 0 && (
        <span className="uf-t-small" style={{ justifySelf: "start", display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 11px", borderRadius: 12, background: "var(--uf-surface-2)", color: "var(--uf-ink-2)" }}>
          <b style={{ ...mono, color: "var(--uf-ink)" }}>{fmt(billTotal)}</b> in {billCount} {billCount === 1 ? "bill" : "bills"} before payday
        </span>
      )}
    </Card>
  );
}

const cell: React.CSSProperties = { display: "grid", gap: 10, alignContent: "start", padding: "16px 18px", background: "var(--uf-card)", color: "inherit", textAlign: "left", border: "none", font: "inherit", cursor: "pointer" };
const head: React.CSSProperties = { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 };

/** The reveal's comparison (RevealFlow): a common FIRE target, and the US personal saving rate (BEA/FRED), rounded. */
const FIRE_SAVER_RATE = 25;
const US_SAVING_RATE = 5;

function Sparkline({ values }: { values: number[] }) {
  const w = 120, h = 32;
  const lo = Math.min(...values), hi = Math.max(...values);
  const x = (i: number) => (i / Math.max(1, values.length - 1)) * w;
  const y = (v: number) => (hi > lo ? h - ((v - lo) / (hi - lo)) * h : h / 2);
  return (
    <svg viewBox={`0 0 ${w} ${h}`} aria-hidden style={{ width: w, height: h, overflow: "visible" }}>
      <path d={values.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ")} fill="none" stroke="var(--uf-teal)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** A tile's label and the tab it opens, one line. */
function TileHead({ label, to }: { label: string; to: "money" | "plan" }) {
  return (
    <span style={head}>
      <span className="uf-t-label" style={muted}>{label}</span>
      <span style={{ display: "inline-flex", alignItems: "center", gap: 4, color: "var(--uf-green)", fontSize: 12, fontWeight: 700 }}><Icon name={to} size={14} />{to === "plan" ? "Plan" : "Money"}</span>
    </span>
  );
}

export function GlanceRow({ netWorth, invested, safety, savingsRate, fmt, onNetWorth, onSafety, onSavings }: {
  netWorth: number;
  /** Invested at each month end, oldest first, up to 12 (the snapshots behind the curve); fewer than 2 draws no line. */
  invested: number[];
  /** Months of needs in the safety pot, and the target; null without spending to measure. */
  safety: { months: number; target: number } | null;
  /** The plan's saving as a share of take-home, the same saving the freedom date runs on; null without income. */
  savingsRate: number | null;
  fmt: (n: number) => string;
  onNetWorth: () => void;
  onSafety: () => void;
  onSavings: () => void;
}) {
  const change = invested.length >= 2 ? invested[invested.length - 1] - invested[invested.length - 2] : null;
  const full = safety ? safety.months >= safety.target : false;
  const rates = savingsRate != null ? [
    { label: "You", pct: savingsRate, you: true },
    { label: "FIRE saver", pct: FIRE_SAVER_RATE, you: false },
    { label: "US", pct: US_SAVING_RATE, you: false },
  ] : [];
  const maxRate = Math.max(1, ...rates.map((r) => r.pct));
  return (
    <Card style={{ padding: 0, overflow: "hidden" }}>
      {/* A 1px gap over a border-coloured grid draws the dividers in one row or three. */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(220px, 100%), 1fr))", gap: 1, background: "var(--uf-border)" }}>
        <button type="button" onClick={onNetWorth} aria-label="Net worth, open Money" style={cell}>
          <TileHead label="Net worth" to="money" />
          <b style={{ ...mono, fontSize: 22, color: netWorth < 0 ? "var(--uf-neg-ink)" : "var(--uf-ink)" }}>{fmt(netWorth)}</b>
          <span style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
            {change != null && (
              <span className="uf-t-small" style={{ ...mono, color: change >= 0 ? "var(--uf-pos-ink)" : "var(--uf-neg-ink)" }}>
                {change >= 0 ? "▲" : "▼"} {fmt(Math.abs(change))} invested
              </span>
            )}
            {invested.length >= 2 && <Sparkline values={invested} />}
          </span>
        </button>
        {safety && (
          <button type="button" onClick={onSafety} aria-label="Safety pot, open Money" style={cell}>
            <TileHead label="Safety pot" to="money" />
            <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <b style={{ ...mono, fontSize: 22 }}>{Math.min(safety.months, 99).toFixed(1)}</b>
              <span className="uf-t-small" style={muted}>of {safety.target} months</span>
              {full && <span style={{ color: "var(--uf-teal)" }}><Icon name="positive" size={18} /></span>}
            </span>
            <div role="img" aria-label={`${safety.months.toFixed(1)} of ${safety.target} months of needs saved`} style={{ display: "flex", gap: 3 }}>
              {Array.from({ length: safety.target }, (_, i) => {
                const fill = Math.max(0, Math.min(1, safety.months - i));
                return <i key={i} style={{ flex: 1, height: 8, borderRadius: 4, background: `linear-gradient(90deg, var(--uf-teal) ${fill * 100}%, var(--uf-surface-2) ${fill * 100}%)` }} />;
              })}
            </div>
          </button>
        )}
        {savingsRate != null && (
          <button type="button" onClick={onSavings} aria-label="Savings rate, open Plan" style={cell}>
            <TileHead label="Savings rate" to="plan" />
            <b style={{ ...mono, fontSize: 22 }}>{Math.round(savingsRate)}%</b>
            <div role="img" aria-label={`You ${Math.round(savingsRate)}%, typical FIRE saver ${FIRE_SAVER_RATE}%, US ${US_SAVING_RATE}%`} style={{ display: "grid", gap: 4 }}>
              {rates.map((r) => (
                <span key={r.label} className="uf-t-small" style={{ display: "grid", gridTemplateColumns: "70px 1fr", alignItems: "center", gap: 8, color: "var(--uf-ink-2)" }}>
                  {r.label}
                  <i style={{ height: 6, borderRadius: 3, width: `${Math.max(2, (Math.max(0, r.pct) / maxRate) * 100)}%`, background: r.you ? "var(--uf-teal)" : "var(--uf-border-2)" }} />
                </span>
              ))}
            </div>
          </button>
        )}
      </div>
    </Card>
  );
}
