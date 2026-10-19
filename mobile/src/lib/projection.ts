/**
 * The website's full freedom-date engine, ported from app/dashboard/page.tsx
 * (calcProjection and exactFreedomDateFrom), where it lives inside the page
 * rather than in lib/. Same maths line for line, so the app's date matches
 * the dashboard's. If the website moves it into lib/, import it through
 * src/engine instead and delete this file.
 */
import { REAL_RETURN } from '@/engine'

export function calcProjection({
  annualIncome, monthlyExpenses, k401, rothIRA, taxable, cashSavings = 0,
  totalDebt, mortgageBalance, mortgageMonthly,
  growthRate = REAL_RETURN, withdrawalRate = 0.04, years = 50, debtRate = 0.05,
  targetMonthlyExpenses,
  taxEnabled = false, retirementTaxRate = 0, rothPct = 0,
  retirementAnnualSpend = 0, payGrowth = 0, employerAnnual = 0, pensionAnnual = 0,
  currentAge = 0, accessAge = 0, mortgageRate = 0.065, taxFreeAnnual, taxFreeGainsLocked = true, mortgages, change, changes,
}: {
  annualIncome: number; monthlyExpenses: number; k401: number;
  rothIRA: number; taxable: number; cashSavings?: number; totalDebt: number;
  mortgageBalance: number; mortgageMonthly: number;
  growthRate?: number; withdrawalRate?: number; years?: number;
  /** The non-mortgage debt's yearly rate as a fraction; 5% when unknown. */
  debtRate?: number;
  targetMonthlyExpenses?: number;
  taxEnabled?: boolean; retirementTaxRate?: number; rothPct?: number;
  /** What you plan to spend a year once free (D-59). Set, it is the goal, ahead of today's spending or a city. */
  retirementAnnualSpend?: number;
  /** Pay growth a year above inflation. Spending stays as it is, so a raise is saved; employer money grows with pay. */
  payGrowth?: number;
  /** Paid into a pension outside take-home pay: by your employer, and by you before tax. */
  employerAnnual?: number; pensionAnnual?: number;
  /** With both set, you are only free once the money you can reach before the pension opens lasts until it does. */
  currentAge?: number; accessAge?: number;
  mortgageRate?: number;
  /**
   * After-tax saving into a tax-free account a year (Roth IRA, ISA, NISA, TFSA). Set, or with a pension
   * set, saving from take-home goes there first and the rest to a taxable account: the pension is already
   * counted, so none of it goes to the 401(k). Unset, the old split (40% 401(k), 20% Roth, the rest taxable).
   */
  taxFreeAnnual?: number;
  /** Only what was paid in can be taken out before the access age (a Roth IRA); elsewhere all of it. */
  taxFreeGainsLocked?: boolean;
  /**
   * Each mortgage on its own (D-61): balance, payment a month, rate as a fraction. Given, they replace the
   * single mortgage above; each is paid down at its own rate, and once paid off its payment goes to saving.
   */
  mortgages?: { balance: number; monthly: number; rate: number }[];
  /**
   * A different path for a while (D-66): from `startYear` to `endYear` (years from now), work a share of
   * today's hours (or earn a set take-home) and spend differently. Pay, pension contributions and debt
   * repayment scale with the share (debt keeps at least its interest paid). A year that earns less than it
   * spends withdraws the gap: cash, then taxable, then the tax-free account (paid-in only before the access
   * age where gains wait), then the pension once it opens. What cannot be covered is a shortfall, reported
   * as `broke`, and that path has no freedom date.
   */
  change?: { startYear: number; endYear?: number; workShare?: number; annualIncome?: number; annualSpend?: number };
  /**
   * Several changes, each in its own years (Compare, D-69), applied together with `change`. Work shares
   * multiply; a set take-home or spending replaces today's (the later one in the list wins); `addIncome`
   * and `addSpend` add to whatever the year earns or spends (college, a side job); `once` lands in
   * `startYear` only, positive for a windfall and negative for a one-off cost.
   */
  changes?: { startYear: number; endYear?: number; workShare?: number; annualIncome?: number; annualSpend?: number;
    addIncome?: number; addSpend?: number; once?: number }[];
}) {
  const loans = mortgages && mortgages.length > 0 ? mortgages.map((m) => ({ ...m })) : null;
  const events: NonNullable<typeof changes> = [...(change ? [change] : []), ...(changes ?? [])];
  const annualExpenses       = monthlyExpenses * 12;
  const targetAnnualExpenses = retirementAnnualSpend > 0 ? retirementAnnualSpend
    : targetMonthlyExpenses != null ? targetMonthlyExpenses * 12 : annualExpenses;
  const annualMortgage = loans ? loans.reduce((s, l) => s + l.monthly * 12, 0) : mortgageMonthly * 12;
  const annualSavings  = annualIncome - annualExpenses - annualMortgage;
  // When tax is enabled, gross up the withdrawal needed to cover retirement taxes.
  // Roth / tax-free portion needs no grossing; traditional portion does.
  const taxGrossup = (taxEnabled && retirementTaxRate > 0)
    ? ((1 - rothPct / 100) / (1 - Math.min(retirementTaxRate, 0.6)) + rothPct / 100)
    : 1;
  const fireTarget     = targetAnnualExpenses * taxGrossup / withdrawalRate;


  const data: Record<string, number>[] = [];
  let cur401k    = k401;
  let curRoth    = rothIRA;
  let curTaxable = taxable;
  let curCash    = cashSavings;
  let curDebt    = totalDebt;
  let curMort    = loans ? loans.reduce((s, l) => s + l.balance, 0) : mortgageBalance;
  let fireYear: number | null = null;
  // The first year the total reaches the target, whether or not it can be reached in time (the bridge check below).
  let totalYear: number | null = null;
  let bridge: { needed: number; reachable: number; locked: number; years: number } | null = null;
  let rothBasis = rothIRA; // Roth money paid in can be taken out at any age; its growth waits for the access age.
  let totalContributed = k401 + rothIRA + taxable + cashSavings;
  let firstYearInvested = 0; // savings invested in year one, after debt payments (Plan's tools use it)
  // The first year a change's spending could not be covered from money within reach (D-66).
  let broke: { year: number; short: number } | null = null;
  let withdrawn = 0;
  const flows: { year: number; saved: number; withdrawn: number }[] = [];

  for (let y = 0; y <= years; y++) {
    const investable = cur401k + curRoth + curTaxable + curCash;
    const netWorth   = investable - curDebt - curMort;
    // fireTarget > 0 guards against the moment right after a page refresh,
    // before real data has loaded from Supabase and every input (including
    // monthlyExpenses, so fireTarget itself) is still its zero default —
    // without this, "$0 invested >= $0 target" is trivially true on the
    // very first loop year, and the freedom date briefly shows as today.
    if (fireYear === null && fireTarget > 0 && investable >= fireTarget && y > 0) {
      totalYear ??= y;
      const early = currentAge > 0 && accessAge > 0 ? Math.max(0, accessAge - (currentAge + y)) : 0;
      if (early > 0) {
        // Spending until the pension opens, from money that keeps growing meanwhile. Each year's
        // spending comes out at its start (D-65): a year is lived before it earns its growth.
        const needed = growthRate > 0 ? targetAnnualExpenses * (1 - Math.pow(1 + growthRate, -early)) / growthRate * (1 + growthRate) : targetAnnualExpenses * early;
        const reachable = curTaxable + curCash + (taxFreeGainsLocked ? Math.min(rothBasis, curRoth) : curRoth);
        bridge = { needed, reachable, locked: investable - reachable, years: early };
        if (reachable >= needed) fireYear = y;
      } else {
        bridge = null;
        fireYear = y;
      }
    }
    const contributed = Math.min(totalContributed, investable);
    data.push({
      year: y,
      "401(k)":        Math.round(cur401k),
      "Roth IRA":      Math.round(curRoth),
      "Taxable":       Math.round(curTaxable),
      "Net Worth":     Math.round(netWorth),
      "FIRE Target":   Math.round(fireTarget),
      "Investable":    Math.round(investable),
      "Debt":          Math.round(-(curDebt + curMort)),
      "Contributions": Math.round(contributed),
      "Market Growth": Math.round(Math.max(investable - contributed, 0)),
      // What can be drawn before the pension opens (D-59): taxable, cash, and the tax-free account (paid-in only where gains wait).
      "Reachable":     Math.round(curTaxable + curCash + (taxFreeGainsLocked ? Math.min(rothBasis, curRoth) : curRoth)),
    });
    // Debt is paid out of savings first (up to 30% of them), and only what
    // is left is invested. Paying it from savings that were also invested in
    // full spent the same money twice and brought the date forward (D-32).
    // During a change (D-66), earnings and spending are the change's; outside it, today's, exactly as before.
    const active   = events.filter((e) => e.once == null && y >= e.startYear && (e.endYear == null || y < e.endYear));
    const once     = events.reduce((t, e) => t + (e.once != null && e.startYear === y ? e.once : 0), 0);
    const inChange = active.length > 0 || once !== 0;
    const share    = active.reduce((m, e) => m * Math.min(1, Math.max(0, e.workShare ?? 1)), 1);
    const setIncome = active.reduce<number | undefined>((v, e) => e.annualIncome ?? v, undefined);
    const setSpend  = active.reduce<number | undefined>((v, e) => e.annualSpend ?? v, undefined);
    const added     = active.reduce((t, e) => t + (e.addIncome ?? 0) - (e.addSpend ?? 0), 0);
    let debtPayment = 0;
    if (curDebt > 0) {
      // The debt's own rate when known (lib/freedom-debt), else 5%.
      const interest = curDebt * debtRate;
      // Working less repays less, though never below the interest.
      debtPayment = inChange
        ? Math.min(curDebt + interest, Math.max(interest, annualSavings * 0.3 * share))
        : Math.min(curDebt + interest, Math.max(annualSavings * 0.3, 0));
      curDebt = Math.max(0, curDebt + interest - debtPayment);
    }
    const pay            = Math.pow(1 + payGrowth, y);
    const raises         = annualIncome * (pay - 1);
    // A mortgage paid off in an earlier year stops costing anything: its payment is saved instead.
    const freed          = loans ? loans.filter((l) => l.balance <= 0).reduce((s, l) => s + l.monthly * 12, 0) : 0;
    const changeNet      = inChange
      ? (setIncome ?? annualIncome * pay * share) - (setSpend ?? annualExpenses) + added + once - annualMortgage + freed - debtPayment
      : 0;
    // Match the website: baseline deficits consume accessible money too.
    const netCashflow    = inChange ? changeNet : annualSavings + raises + freed - debtPayment;
    const toInvest       = Math.max(netCashflow, 0);
    let need             = Math.max(-netCashflow, 0);
    if (need > 0) {
      const take = (v: number) => { const t = Math.min(Math.max(v, 0), need); need -= t; return v - t; };
      curCash = take(curCash);
      curTaxable = take(curTaxable);
      const open = !(currentAge > 0 && accessAge > 0) || currentAge + y >= accessAge;
      if (open || !taxFreeGainsLocked) { curRoth = take(curRoth); rothBasis = Math.min(rothBasis, curRoth); }
      else { const t = Math.min(Math.max(Math.min(rothBasis, curRoth), 0), need); curRoth -= t; rothBasis -= t; need -= t; }
      if (open) cur401k = take(cur401k);
      withdrawn += Math.max(-netCashflow, 0) - need;
      if (need > 0.5 && !broke) broke = { year: y, short: need };
    }
    const ownSplit       = taxFreeAnnual != null || pensionAnnual > 0;
    const k401Contrib    = ownSplit ? 0 : Math.min(toInvest * 0.4, 23000);
    const rothContrib    = ownSplit ? Math.min(toInvest, taxFreeAnnual ?? 0) : Math.min(toInvest * 0.2, 7000);
    const taxableContrib = toInvest - k401Contrib - rothContrib;
    const pension        = (pensionAnnual + employerAnnual * pay) * share;
    flows.push({ year: y, saved: toInvest + pension, withdrawn: Math.max(-netCashflow, 0) - need });
    if (y === 0) firstYearInvested = toInvest + pension;
    totalContributed += toInvest + pension;
    rothBasis += rothContrib;
    cur401k    = cur401k    * (1 + growthRate) + k401Contrib + pension;
    curRoth    = curRoth    * (1 + growthRate) + rothContrib;
    curTaxable = curTaxable * (1 + growthRate) + taxableContrib;
    curCash    = curCash    * (1 + growthRate);
    if (loans) {
      for (const l of loans) if (l.balance > 0) l.balance = Math.max(0, l.balance - Math.max(0, l.monthly * 12 - l.balance * l.rate));
      curMort = loans.reduce((s, l) => s + l.balance, 0);
    } else if (curMort > 0) {
      const mInt = curMort * mortgageRate;
      const prin = Math.max(0, annualMortgage - mInt);
      curMort = Math.max(0, curMort - prin);
    }
  }
  // A path that runs out of reachable money before freedom has no freedom date: the gap was real (D-66).
  const reached = broke && (fireYear === null || fireYear > broke.year) ? null : fireYear;
  return { data, fireYear: reached, fireTarget, annualSavings, firstYearInvested, totalYear, bridge, broke, withdrawn, flows };
}

/**
 * Exact freedom date: interpolate between the yearly projection points that
 * bracket the FIRE-target crossing. A smoothed estimate over a yearly-step
 * projection, not a day-by-day simulation.
 */
export function exactFreedomDateFrom(data: Record<string, number>[], fireYear: number | null, fireTarget: number): Date | null {
  if (fireYear === null || fireYear <= 0) return null;
  const prevPoint = data[fireYear - 1];
  const curPoint = data[fireYear];
  if (!prevPoint || !curPoint) return null;
  const prevVal = prevPoint["Investable"] ?? 0;
  const curVal = curPoint["Investable"] ?? 0;
  const msPerYearExact = 365.25 * 24 * 60 * 60 * 1000;
  // Past the target today: work is already optional, as the first result said. Year 0 is never the
  // freedom year (it guards the zero-input moment), so without this it read as a year from now.
  if (fireYear === 1 && prevVal >= fireTarget) return new Date();
  // Already past the target the year before: freedom waited for the bridge (D-59), so it is this year exactly.
  if (prevVal >= fireTarget) return new Date(Date.now() + fireYear * msPerYearExact);
  const span = curVal - prevVal;
  const fraction = span > 0 ? Math.min(1, Math.max(0, (fireTarget - prevVal) / span)) : 0;
  const msPerYear = 365.25 * 24 * 60 * 60 * 1000;
  return new Date(Date.now() + (fireYear - 1 + fraction) * msPerYear);
}
