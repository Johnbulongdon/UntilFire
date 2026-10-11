import type { AccountData } from '@/state/account'

/** Net worth by the website's rule (D-32, D-35): connected accounts replace typed balances. */
export function netWorthOf(data: AccountData) {
  const { k401, rothIRA, taxable, cashSavings } = data.balances
  const { otherDebt, mortgage, cards } = data.debts
  const assets = [
    { label: 'Cash & savings', value: cashSavings },
    { label: 'Retirement', value: k401 + rothIRA },
    { label: 'Brokerage', value: taxable },
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
