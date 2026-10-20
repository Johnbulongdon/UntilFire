/**
 * Ported from app/dashboard/page.tsx (effectiveBalances, effectiveDebts and the
 * account-type tests), where they live inside the page rather than in lib/.
 * Same rules (D-32, D-35): a connected account replaces the typed balance of
 * the same kind instead of adding to it. If they move to lib/, import them
 * through src/engine instead and delete this file.
 */

import { isCounted, safetyPot } from '@/engine'

export interface PlaidAccount {
  id: string
  /** Plaid's own id, which holdings refer to. */
  plaid_account_id?: string
  name: string
  official_name?: string | null
  type: string
  subtype: string | null
  apy?: number | null
  balance_current: number | null
  balance_available?: number | null
  iso_currency_code?: string | null
  mask?: string | null
  /** Monthly withdrawal limit, set on the website; null when not tracked. */
  withdrawal_limit?: number | null
  /** This month's money out, sent only when a limit is set. */
  withdrawals?: { date: string; amount: number; description: string | null; pending: boolean }[]
}

type Kind = Pick<PlaidAccount, 'type' | 'subtype'>

const normalizeSubtype = (subtype: string | null | undefined) => (subtype ?? '').toLowerCase().replace(/[_-]/g, ' ').trim()

export function isRetirementAccount(a: Kind): boolean {
  if (a.type !== 'investment') return false
  const s = normalizeSubtype(a.subtype)
  return ['401', '403', '457', 'ira', 'roth', 'retirement', 'pension', 'annuity', 'sep', 'simple', 'keogh'].some(t => s.includes(t))
}

export const isBrokerageAccount = (a: Kind) => a.type === 'investment' && !isRetirementAccount(a)
export const isMortgageAccount = (a: Kind) => a.type === 'loan' && normalizeSubtype(a.subtype).includes('mortgage')

export function effectiveBalances({ k401, rothIRA, taxable, cashSavings, plaidAccounts }: {
  k401: number; rothIRA: number; taxable: number; cashSavings: number; plaidAccounts: PlaidAccount[]
}) {
  const sum = (keep: (a: Kind) => boolean) => plaidAccounts.filter(keep).reduce((s, a) => s + (a.balance_current ?? 0), 0)
  const retirement = sum(isRetirementAccount)
  const brokerage = sum(isBrokerageAccount)
  const cash = sum(a => a.type === 'depository')
  return {
    k401: retirement > 0 ? retirement : k401,
    rothIRA: retirement > 0 ? 0 : rothIRA,
    taxable: brokerage > 0 ? brokerage : taxable,
    cashSavings: cash > 0 ? cash : cashSavings,
  }
}

export function effectiveDebts({ totalDebt, mortgageBalance, plaidAccounts }: {
  totalDebt: number; mortgageBalance: number; plaidAccounts: PlaidAccount[]
}) {
  const sum = (keep: (a: Kind) => boolean) => plaidAccounts.filter(keep).reduce((s, a) => s + Math.max(0, a.balance_current ?? 0), 0)
  const mortgages = sum(isMortgageAccount)
  const loans = sum(a => a.type === 'loan' && !isMortgageAccount(a))
  return {
    otherDebt: loans > 0 ? loans : totalDebt,
    mortgage: mortgages > 0 ? mortgages : mortgageBalance,
    cards: sum(a => a.type === 'credit'),
  }
}

/**
 * Cash by role (money logic study, Oct 16 2026): spending money is the
 * accounts switched on for free to spend, checking by default (D-29); the
 * rest of the cash is the safety pot (lib/freedom-cash, the website's rule).
 * One pot is never counted as both: typed cash is savings, and with no
 * connected checking there is no spending figure (`spending` null), so free
 * to spend stays hidden rather than calling all savings spendable.
 */
export function cashByRole(plaidAccounts: PlaidAccount[], toggles: Record<string, boolean>, typedCash: number) {
  const cash = plaidAccounts.filter(a => a.type === 'depository')
  const counted = (a: PlaidAccount) => isCounted({ id: a.id, name: a.name, type: a.type, subtype: a.subtype, balanceUSD: 0 }, toggles)
  const spendingAccounts = cash.filter(counted)
  const spending = spendingAccounts.length ? spendingAccounts.reduce((s, a) => s + (a.balance_available ?? a.balance_current ?? 0), 0) : null
  return { spending, safety: safetyPot(plaidAccounts, toggles, typedCash), split: cash.length > 0 }
}
