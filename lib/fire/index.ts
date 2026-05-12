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
}: {
  monthlyIncome: number;
  monthlySavings: number;
  annualCostOfLiving: number;
}): RevealAction[] {
  const savingsRate = monthlyIncome > 0 ? monthlySavings / monthlyIncome : 0;
  const actions: RevealAction[] = [];

  if (savingsRate < 0.2) {
    actions.push({
      id: 'raise_savings_rate',
      title: 'Raise savings rate to at least 20%',
      rationale: 'Your current savings rate is below the typical acceleration threshold for FIRE timelines.',
    });
  }

  actions.push({
    id: 'automate_investing',
    title: 'Automate monthly investing right after payday',
    rationale: 'Automation lowers missed contributions and keeps compounding consistent month to month.',
  });

  if (annualCostOfLiving > 70000) {
    actions.push({
      id: 'reduce_fixed_costs',
      title: 'Target one fixed-cost reduction this quarter',
      rationale: 'In higher-cost locations, reducing recurring fixed expenses has outsized FIRE-date impact.',
    });
  }

  if (savingsRate >= 0.2) {
    actions.push({
      id: 'increase_income',
      title: 'Stack a focused income increase goal',
      rationale: 'With a solid savings base, additional income compounds quickly when mostly invested.',
    });
  }

  return actions.slice(0, 4);
}
export type {
  DefaultScenarioPayload,
  ScenarioAssumptions,
} from './scenarios';
