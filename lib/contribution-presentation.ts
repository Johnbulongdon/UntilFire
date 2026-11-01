import type { LadderView } from './contribution-ladder.ts';
import { daysSinceSync, STALE_AFTER_DAYS } from './account-currency.ts';

/** Presentation only: preserve the waterfall's allocations and priority order. */
export function contributionDestinations(fills: { kind: string; label: string; amount: number; enabled: boolean }[]) {
  const rows: { kind: string; label: string; amount: number }[] = [];
  for (const f of fills) {
    if (!f.enabled || f.amount <= 0) continue;
    const emergency = f.kind === 'emergency-floor' || f.kind === 'emergency-target';
    const kind = emergency ? 'emergency' : f.kind;
    const existing = rows.find((r) => r.kind === kind);
    if (existing) existing.amount += f.amount;
    else rows.push({ kind, label: emergency ? 'Emergency savings' : f.kind === 'taxable' ? 'Investments' : f.label, amount: f.amount });
  }
  return rows;
}

/** Urgent qualifications stay visible even while the calculation is collapsed. */
export function contributionWarnings(view: LadderView, today = new Date()) {
  const a = view.available;
  const warnings: { kind: string; text: string; action: 'cashflow' | 'accounts' }[] = [];
  if (a.forecast.shortBefore) warnings.push({ kind: 'shortfall', text: 'A cash shortfall is forecast before contribution day.', action: 'cashflow' });
  if (a.cashAccounts.some((a) => (daysSinceSync(a.syncedAt, today) ?? 0) > STALE_AFTER_DAYS)) warnings.push({ kind: 'stale', text: 'Some account balances need updating.', action: 'accounts' });
  if (a.cashAccounts.some((a) => !a.converted)) warnings.push({ kind: 'currency', text: 'Some balances could not be converted and are not counted.', action: 'accounts' });
  if (!a.hasExpectedData) warnings.push({ kind: 'missing', text: 'Add bills and paydays to complete the estimate.', action: 'cashflow' });
  if (!a.allowanceBasis) warnings.push({ kind: 'spending', text: 'Everyday spending is not estimated yet.', action: 'cashflow' });
  if (!a.done && view.budgetIsCustom && view.budget > a.free + 0.005) warnings.push({ kind: 'override', text: 'Your planned amount is above the cash forecast.', action: 'cashflow' });
  return warnings;
}
