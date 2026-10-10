/**
 * Compare's life changes (D-69): what a person types, in their own numbers,
 * and how each becomes the engine's dated changes (D-66). Templates only fill
 * a starting value; every number is editable, and none is an assumption the
 * engine relies on. Years are calendar years, so a change reads the same with
 * or without an age; amounts are USD like the rest of the plan.
 */
export type ChangeKind = "work-less" | "break" | "college" | "home" | "side" | "cost" | "windfall" | "move" | "custom";

export type LifeChangeItem = {
  id: string;
  kind: ChangeKind;
  name: string;
  /** Off keeps it in the version without counting it. */
  on: boolean;
  /** First calendar year it applies. */
  from: number;
  /** First year it no longer applies; unset is for good. */
  to?: number;
  /** Starts or ends at a milestone instead of a year (D-69); `from` / `to` then hold the last resolved year. */
  fromAt?: Milestone;
  toAt?: Milestone;
  /** A month: take-home (work less), extra cost (home), side income, spending (move), signed (custom). */
  monthly?: number;
  /** One amount: a year per child (college), down payment, one-off cost, windfall, signed (custom). */
  amount?: number;
  /** Children (college) or months off (break). */
  count?: number;
  /** Working less: pension contributions keep their share of pay, or stop. */
  pension?: "same" | "stop";
};

/** Coast: what is invested would grow to enough by the retire age with no more saving. Free: the freedom date. */
export type Milestone = "coast" | "free";

export type LifeVersion = { id: string; name: string; changes: LifeChangeItem[]; savedAt: number };

/** The engine's change (calcProjection `changes`), in years from now. */
export type EngineChange = { startYear: number; endYear?: number; workShare?: number; annualIncome?: number; annualSpend?: number;
  addIncome?: number; addSpend?: number; once?: number };

export type ChangeContext = { thisYear: number; currentAge: number; takeHomeMonthly: number; spendMonthly: number };

export const TEMPLATES: { kind: ChangeKind; icon: string; title: string; hint: string }[] = [
  { kind: "work-less", icon: "🌤️", title: "Work less", hint: "Your new pay" },
  { kind: "break", icon: "⏸️", title: "Take a break", hint: "Months off" },
  { kind: "college", icon: "🎓", title: "Kids & college", hint: "Cost per year" },
  { kind: "home", icon: "🏠", title: "Buy a home", hint: "Down payment + monthly" },
  { kind: "side", icon: "💼", title: "Side income", hint: "Per month" },
  { kind: "cost", icon: "💸", title: "One-off cost", hint: "Wedding, car, gift" },
  { kind: "windfall", icon: "🎁", title: "Windfall", hint: "Inheritance, bonus" },
  { kind: "move", icon: "🌍", title: "Move somewhere", hint: "New spending" },
  { kind: "custom", icon: "✏️", title: "Custom", hint: "Any amount, any dates" },
];
export const templateFor = (kind: ChangeKind) => TEMPLATES.find((t) => t.kind === kind)!;

const round = (n: number, to = 100) => Math.round(n / to) * to;

/** A new change with starting values from the person's own numbers. */
export function newChange(kind: ChangeKind, ctx: ChangeContext, id = `c${Date.now().toString(36)}`): LifeChangeItem {
  const next = ctx.thisYear + 1, base = { id, kind, name: templateFor(kind).title, on: true, from: next };
  switch (kind) {
    case "work-less": return { ...base, name: "Work 4 days", monthly: round(ctx.takeHomeMonthly * 0.8), pension: "same" };
    case "break": return { ...base, count: 12 };
    case "college": return { ...base, name: "Kids' college", from: ctx.thisYear + 15, to: ctx.thisYear + 19, amount: 30000, count: 1 };
    case "home": return { ...base, from: ctx.thisYear + 2, amount: 60000, monthly: 800 };
    case "side": return { ...base, monthly: 1000 };
    case "cost": return { ...base, amount: 20000 };
    case "windfall": return { ...base, amount: 50000 };
    case "move": return { ...base, monthly: round(ctx.spendMonthly * 0.7) };
    case "custom": return { ...base, monthly: 0 };
  }
}

/** The engine changes for one item; off or empty gives none. */
export function toEngine(c: LifeChangeItem, ctx: ChangeContext): EngineChange[] {
  if (!c.on) return [];
  const startYear = Math.max(0, c.from - ctx.thisYear);
  const endYear = c.to != null ? Math.max(startYear + 1, c.to - ctx.thisYear) : undefined;
  const span = { startYear, endYear };
  switch (c.kind) {
    case "work-less": {
      const pay = Math.max(0, c.monthly ?? 0) * 12, now = ctx.takeHomeMonthly * 12;
      // Pension contributions follow pay: the same share of a smaller pay, or none.
      const workShare = c.pension === "stop" ? 0 : now > 0 ? Math.min(1, pay / now) : 1;
      return [{ ...span, annualIncome: pay, workShare }];
    }
    case "break": {
      // Whole years off, then a part year working the rest of it.
      const months = Math.max(0, c.count ?? 0), full = Math.floor(months / 12), part = (months % 12) / 12;
      const out: EngineChange[] = [];
      if (full > 0) out.push({ startYear, endYear: startYear + full, workShare: 0 });
      if (part > 0) out.push({ startYear: startYear + full, endYear: startYear + full + 1, workShare: 1 - part });
      return out;
    }
    case "college": return [{ ...span, addSpend: Math.max(0, c.amount ?? 0) * Math.max(1, c.count ?? 1) }];
    case "home": return [
      ...(c.amount ? [{ startYear, once: -Math.abs(c.amount) }] : []),
      ...(c.monthly ? [{ ...span, addSpend: Math.abs(c.monthly) * 12 }] : []),
    ];
    case "side": return [{ ...span, addIncome: Math.max(0, c.monthly ?? 0) * 12 }];
    case "cost": return [{ startYear, once: -Math.abs(c.amount ?? 0) }];
    case "windfall": return [{ startYear, once: Math.abs(c.amount ?? 0) }];
    case "move": return [{ ...span, annualSpend: Math.max(0, c.monthly ?? 0) * 12 }];
    case "custom": {
      const m = (c.monthly ?? 0) * 12;
      return [
        ...(m ? [{ ...span, ...(m > 0 ? { addIncome: m } : { addSpend: -m }) }] : []),
        ...(c.amount ? [{ startYear, once: c.amount }] : []),
      ];
    }
  }
}

export const versionToEngine = (v: LifeVersion, ctx: ChangeContext) => v.changes.flatMap((c) => toEngine(c, ctx));

/**
 * The first year (from now) that what is invested would grow to the target by the retire age with
 * nothing more saved: Coast FIRE. Needs an age; null when never or unknown.
 */
export function coastYear(invested: number[], target: number, growth: number, currentAge: number, retireAge: number): number | null {
  if (!(currentAge > 0) || !(target > 0)) return null;
  for (let y = 0; y < invested.length; y++) {
    const left = retireAge - (currentAge + y);
    if (left <= 0) return null;
    if (invested[y] * Math.pow(1 + growth, left) >= target) return y;
  }
  return null;
}

export type RunResult = { fireYear: number | null; invested: number[]; target: number };

/**
 * Pins milestone-bound changes to years and runs them. A change ending "when I'm free" moves the
 * freedom date it ends at, so this repeats until the years stop moving (each round closes most of the gap).
 * A milestone never reached leaves a start that never comes and an end that never comes.
 */
export function resolveAndRun(items: LifeChangeItem[], ctx: ChangeContext & { growth: number; retireAge: number },
  run: (changes: EngineChange[]) => RunResult): { items: LifeChangeItem[]; result: RunResult } {
  const bound = items.some((c) => c.on && (c.fromAt || c.toAt));
  // The first guess: the plan with only the changes that have fixed years.
  let result = run(items.filter((c) => !(c.fromAt || c.toAt)).flatMap((c) => toEngine(c, ctx)));
  let pinned = items;
  for (let round = 0; bound && round < 12; round++) {
    const at = (m: Milestone) => {
      const y = m === "free" ? result.fireYear : coastYear(result.invested, result.target, ctx.growth, ctx.currentAge, ctx.retireAge);
      return y == null ? null : ctx.thisYear + y;
    };
    const next = items.map((c) => {
      if (!c.on || !(c.fromAt || c.toAt)) return c;
      const from = c.fromAt ? at(c.fromAt) : c.from, to = c.toAt ? at(c.toAt) : c.to;
      // Never starting is off; never ending is for good.
      return from == null ? { ...c, on: false } : { ...c, from, to: to ?? undefined };
    });
    const same = next.every((c, i) => c.from === pinned[i].from && c.to === pinned[i].to && c.on === pinned[i].on);
    pinned = next;
    result = run(pinned.flatMap((c) => toEngine(c, ctx)));
    if (same && round > 0) break;
  }
  if (!bound) result = run(items.flatMap((c) => toEngine(c, ctx)));
  return { items: pinned, result };
}

/** "Age 35 · 2033" with an age, the year alone without. */
export const whenLabel = (year: number, ctx: ChangeContext) =>
  ctx.currentAge > 0 ? `age ${Math.round(ctx.currentAge + year - ctx.thisYear)}` : `${year}`;

/** The one line under a change's name. */
export function summary(c: LifeChangeItem, ctx: ChangeContext, money: (usd: number) => string) {
  const from = c.fromAt ? `when ${c.fromAt === "free" ? "free" : "you reach Coast"}` : whenLabel(c.from, ctx);
  const until = c.toAt ? ` until ${c.toAt === "free" ? "free" : "Coast"}` : c.to != null ? ` → ${whenLabel(c.to, ctx)}` : "";
  switch (c.kind) {
    case "work-less": return `${money(c.monthly ?? 0)} / mo take-home · from ${from}${until}`;
    case "break": return `${c.count ?? 0} months off · from ${from}`;
    case "college": return `${money((c.amount ?? 0) * (c.count ?? 1))} / yr · ${from}${until}`;
    case "home": return `${money(c.amount ?? 0)} down, ${money(c.monthly ?? 0)} / mo more · ${from}`;
    case "side": return `${money(c.monthly ?? 0)} / mo · from ${from}${until}`;
    case "cost": case "windfall": return `${money(c.amount ?? 0)} once · ${from}`;
    case "move": return `Spend ${money(c.monthly ?? 0)} / mo · from ${from}${until}`;
    case "custom": return `${(c.monthly ?? 0) >= 0 ? "+" : "−"}${money(Math.abs(c.monthly ?? 0))} / mo · from ${from}${until}`;
  }
}
