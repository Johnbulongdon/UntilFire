import { useMemo, useState } from 'react'
import { Button } from './Button'
import { Alert, Pressable, View } from 'react-native'

import { findFlags, FLAG_ORDER, type FlagKind } from '@/engine'
import { moneyIn } from '@/lib/format'
import { haptic } from '@/lib/haptics'
import { resolveFlag } from '@/lib/mutations'
import { toUSD, useAccount, type Transaction } from '@/state/account'

import { Text } from './Text'

// The website's WorthALook copy (app/dashboard/WorthALook.tsx). Bills are asked on the website.
export const FLAG_COPY: Partial<Record<FlagKind, { label: string; tip: string; yes: string; no: string }>> = {
  card_payment: { label: 'Card payment', tip: 'Paying a credit card bill moves money; the purchases on the card were the spending. Counting both doubles it.', yes: "It's a card payment", no: "No, it's spending" },
  duplicate: { label: 'Possible duplicate', tip: 'Same merchant and amount within two days of another row. Overlapping imports and re-posted charges do this.', yes: 'Delete this one', no: 'Keep both' },
  large: { label: 'Unusually large', tip: 'Well above what this merchant usually costs, or among your largest expenses.', yes: '', no: 'Looks right' },
}

/** Flags for the rows in view, from lib/transaction-flags (D-31). */
export function useFlags(inView: Transaction[]) {
  const { data } = useAccount()
  return useMemo(() => {
    const all = findFlags(inView, data?.transactions ?? [], toUSD)
    return new Map([...all].filter(([, k]) => k in FLAG_COPY))
  }, [inView, data])
}

/**
 * Rows that may be making the numbers wrong (D-31), as chips that only appear
 * when something is there. Opening one lists the rows with a one-tap answer;
 * nothing changes without the person choosing.
 */
export function WorthALook({ rows }: { rows: Transaction[] }) {
  const { refresh } = useAccount()
  const flags = useFlags(rows)
  const [open, setOpen] = useState<FlagKind | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const counts = FLAG_ORDER.map(k => ({ k, n: [...flags.values()].filter(v => v === k).length })).filter(c => c.n > 0 && FLAG_COPY[c.k])
  if (!counts.length) return null
  const listed = open ? rows.filter(r => flags.get(r.id) === open) : []

  const answer = async (row: Transaction, kind: FlagKind, yes: boolean) => {
    haptic.select(); setBusy(row.id)
    const problem = await resolveFlag(row, kind, yes)
    setBusy(null)
    if (problem) { haptic.warn(); Alert.alert(problem); return }
    haptic.success(); refresh()
  }

  return (
    <View className="gap-2">
      <View className="flex-row flex-wrap gap-2">
        {counts.map(({ k, n }) => (
          <Pressable key={k} accessibilityRole="button" accessibilityState={{ expanded: open === k }} onPress={() => { haptic.tick(); setOpen(open === k ? null : k) }}
            className={`flex-row items-center gap-1.5 rounded-full border px-3 py-1.5 ${open === k ? 'border-warn bg-warn-bg' : 'border-border bg-card'}`}>
            <Text className="text-[13px] text-warn">⚑</Text>
            <Text className="text-[13px] font-semibold text-ink">{FLAG_COPY[k]!.label}</Text>
            <Text className="font-mono text-[13px] font-bold text-ink">{n}</Text>
          </Pressable>
        ))}
      </View>
      {open && (
        <View className="overflow-hidden rounded-2xl border border-border bg-card">
          <Text className="border-b border-border px-4 py-2.5 text-[12px] leading-4 text-ink-3">{FLAG_COPY[open]!.tip}</Text>
          {listed.map((r, i) => (
            <View key={r.id} className={`gap-2 px-4 py-3 ${i ? 'border-t border-border' : ''}`}>
              <View className="flex-row items-center justify-between gap-3">
                <View className="flex-1">
                  <Text numberOfLines={1} className="text-[14px] font-semibold text-ink">{r.description}</Text>
                  <Text className="text-[12px] text-ink-3">{r.date}</Text>
                </View>
                <Text className="font-mono text-[14px] text-ink">{moneyIn(r.amount, r.currency)}</Text>
              </View>
              <View className="flex-row gap-2">
                {FLAG_COPY[open]!.yes ? (
                  <Button small label={FLAG_COPY[open]!.yes} disabled={busy === r.id} onPress={() => answer(r, open, true)} />
                ) : null}
                <Button small kind="quiet" label={FLAG_COPY[open]!.no} disabled={busy === r.id} onPress={() => answer(r, open, false)} />
              </View>
            </View>
          ))}
        </View>
      )}
    </View>
  )
}
