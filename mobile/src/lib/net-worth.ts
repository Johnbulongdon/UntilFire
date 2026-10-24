import type { AccountData } from '@/state/account'

/** Net worth by the website's rule (D-32, D-35): connected accounts replace typed balances.
 *  A home's value counts here when typed, so a mortgage isn't all minus; it never counts toward freedom. */
export function netWorthOf(data: AccountData) {
  const { k401, rothIRA, taxable, cashSavings } = data.balances
  const { otherDebt, mortgage, cards } = data.debts
  const assets = [
    { label: 'Cash & savings', value: cashSavings },
    { label: 'Retirement', value: k401 + rothIRA },
    { label: 'Brokerage', value: taxable },
    { label: 'Home', value: data.typed.homeValue ?? 0 },
  ].filter(a => a.value !== 0)
  const owed = [
    { label: 'Mortgage', value: mortgage },
    { label: 'Loans & other debt', value: otherDebt },
    { label: 'Credit cards', value: cards },
  ].filter(d => d.value > 0)
  const assetTotal = assets.reduce((s, a) => s + a.value, 0)
  const owedTotal = owed.reduce((s, d) => s + d.value, 0)
  return { assets, owed, assetTotal, owedTotal, netWorth: assetTotal - owedTotal }
}
