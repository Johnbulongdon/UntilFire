// Public surface of the FIRE engine. Routes, components, and scripts should
// import from here rather than reaching into submodules — the seam is what
// makes the planner math swappable later.

export type {
  FireInputs,
  FireOutput,
  FireStrategy,
  Locale,
  LocaleKind,
  TaxBreakdown,
} from './types';

export {
  DEFAULT_FIRE_STRATEGY_ID,
  getFireStrategy,
  listFireStrategies,
  registerFireStrategy,
  traditionalStrategy,
} from './strategies';

export { calcFIRE } from './strategies/traditional';
import { calcFIRE } from './strategies/traditional';

export { calcTakeHome, getLocale, takeHomePay } from './tax';

export { monteCarloFIRE } from './monte-carlo';
export type { MonteCarloResult } from './monte-carlo';

export {
  ensureDefaultScenario,
  loadDefaultScenario,
  saveDefaultScenario,
} from './scenarios';
export interface RevealAction {
  id: string;
  title: string;
  rationale: string;
}

export function recommendActionsForReveal({
  monthlyIncome,
  monthlySavings,
  annualCostOfLiving,
  fireYears,
  currentAge,
}: {
  monthlyIncome: number;
  monthlySavings: number;
  annualCostOfLiving: number;
  fireYears?: number;
  currentAge?: number;
}): RevealAction[] {
  if ((fireYears ?? 1) <= 0) return [];
  const savingsRate = monthlyIncome > 0 ? monthlySavings / monthlyIncome : 0;
  const actions: RevealAction[] = [];

  const fmtYrDelta = (yrs: number) =>
    yrs >= 2 ? `${yrs.toFixed(1)} years` : `${Math.round(yrs * 12)} months`;

  if (savingsRate < 0.2) {
    const targetSavings = monthlyIncome * 0.2;
    const extra = Math.round(targetSavings - monthlySavings);
    if (fireYears !== undefined && extra > 0) {
      const base    = calcFIRE(monthlySavings, annualCostOfLiving, currentAge);
      const boosted = calcFIRE(targetSavings, annualCostOfLiving, currentAge);
      const delta   = Math.max(0, base.years - boosted.years);
      actions.push({
        id: 'raise_savings_rate',
        title: `Raise your savings rate from ${Math.round(savingsRate * 100)}% to 20%`,
        rationale: `Adding $${extra.toLocaleString()}/mo to investments would move your FIRE date ${fmtYrDelta(delta)} earlier.`,
      });
    } else {
      actions.push({
        id: 'raise_savings_rate',
        title: 'Raise savings rate to at least 20%',
        rationale: 'Your current savings rate is below the typical acceleration threshold for FIRE timelines.',
      });
    }
  }

  actions.push({
    id: 'automate_investing',
    title: 'Automate investing right after every payday',
    rationale: 'Consistent monthly investing — not timing the market — is the single biggest driver of FIRE timeline acceleration.',
  });

  if (annualCostOfLiving > 70000) {
    if (fireYears !== undefined) {
      const reducedCOL = annualCostOfLiving * 0.9;
      const base    = calcFIRE(monthlySavings, annualCostOfLiving, currentAge);
      const reduced = calcFIRE(monthlySavings + annualCostOfLiving * 0.1 / 12, reducedCOL, currentAge);
      const delta   = Math.max(0, base.years - reduced.years);
      actions.push({
        id: 'reduce_fixed_costs',
        title: 'Cut one recurring fixed cost this quarter',
        rationale: `A 10% reduction in your cost of living would accelerate your freedom date by approximately ${fmtYrDelta(delta)}.`,
      });
    } else {
      actions.push({
        id: 'reduce_fixed_costs',
        title: 'Target one fixed-cost reduction this quarter',
        rationale: 'In higher-cost locations, reducing recurring fixed expenses has outsized FIRE-date impact.',
      });
    }
  }

  if (savingsRate >= 0.2) {
    if (fireYears !== undefined) {
      const base    = calcFIRE(monthlySavings, annualCostOfLiving, currentAge);
      const boosted = calcFIRE(monthlySavings + monthlyIncome * 0.1, annualCostOfLiving, currentAge);
      const delta   = Math.max(0, base.years - boosted.years);
      actions.push({
        id: 'increase_income',
        title: 'Target a 10% income increase and invest the difference',
        rationale: `With your savings habit, a 10% income boost invested immediately would bring FIRE ${fmtYrDelta(delta)} sooner.`,
      });
    } else {
      actions.push({
        id: 'increase_income',
        title: 'Stack a focused income increase goal',
        rationale: 'With a solid savings base, additional income compounds quickly when mostly invested.',
      });
    }
  }

  return actions.slice(0, 4);
}
export type {
  DefaultScenarioPayload,
  ScenarioAssumptions,
} from './scenarios';
