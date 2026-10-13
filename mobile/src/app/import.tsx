import * as DocumentPicker from 'expo-document-picker'
import { Button } from '@/components/Button'
import { File } from 'expo-file-system'
import { router } from 'expo-router'
import { useEffect, useMemo, useState } from 'react'
import { ActivityIndicator, Pressable, ScrollView, Switch, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { PrimaryButton } from '@/components/PrimaryButton'
import { Text } from '@/components/Text'
import { autoDetectColumns, buildTransactions, inferImportCurrency, isLikelyDuplicate, parseCSV, type ColumnMap } from '@/engine'
import { displayCurrency } from '@/lib/display-currency'
import { moneyIn } from '@/lib/format'
import { haptic } from '@/lib/haptics'
import { supabase } from '@/lib/supabase'
import { useAccount } from '@/state/account'
import { useAuth } from '@/state/auth'
import { colors } from '@/theme/colors'

type Field = keyof ColumnMap
const FIELDS: { key: Field; label: string; optional?: boolean }[] = [
  { key: 'date', label: 'Date' },
  { key: 'description', label: 'Description' },
  { key: 'amount', label: 'Amount' },
  { key: 'currency', label: 'Currency', optional: true },
  { key: 'type', label: 'Income or spending', optional: true },
  { key: 'notes', label: 'Notes', optional: true },
]

/**
 * Import a bank's CSV export, by the website's rules (lib/csv-import.ts):
 * columns found by name and changeable, signs flippable for card exports,
 * rows that look already imported skipped, then saved like the website's import.
 */
export default function ImportCsv() {
  const { session } = useAuth()
  const { refresh } = useAccount()
  const [file, setFile] = useState<{ name: string; headers: string[]; rows: string[][] } | null>(null)
  const [cols, setCols] = useState<ColumnMap | null>(null)
  const [editing, setEditing] = useState<Field | null>(null)
  const [flip, setFlip] = useState(false)
  const [skipDupes, setSkipDupes] = useState(true)
  const [dupes, setDupes] = useState<Set<number> | null>(null)
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState('')

  const pick = async () => {
    haptic.tick(); setError('')
    const res = await DocumentPicker.getDocumentAsync({ type: ['text/csv', 'text/comma-separated-values', 'text/plain', 'application/vnd.ms-excel'], copyToCacheDirectory: true })
    if (res.canceled || !res.assets?.[0]) return
    const asset = res.assets[0]
    try {
      const text = await new File(asset.uri).text()
      const { headers, rows } = parseCSV(text)
      if (headers.length < 2 || rows.length === 0) { setError('That file has no rows to import. Export it from your bank as CSV.'); return }
      setFile({ name: asset.name, headers, rows }); setCols(autoDetectColumns(headers)); setDupes(null)
      haptic.success()
    } catch {
      setError('Couldn\'t read that file. Export it from your bank as CSV and try again.')
    }
  }

  const importCurrency = useMemo(() => (file && cols
    ? inferImportCurrency({ headers: file.headers, rows: file.rows, colAmount: cols.amount, colCurrency: cols.currency, fallbackCurrency: displayCurrency() })
    : displayCurrency()), [file, cols])
  const parsed = useMemo(() => (file && cols ? buildTransactions(file.headers, file.rows, cols, { flipSigns: flip, importCurrency }) : []), [file, cols, flip, importCurrency])

  // Rows that look already in the account, checked against what's saved around the same dates.
  useEffect(() => {
    if (!session || parsed.length === 0) { setDupes(new Set()); return }
    let live = true
    const dates = parsed.map(t => t.date).sort()
    const shift = (iso: string, d: number) => { const x = new Date(`${iso}T00:00:00Z`); x.setUTCDate(x.getUTCDate() + d); return x.toISOString().slice(0, 10) }
    supabase.from('expenses').select('date, amount, currency').eq('user_id', session.user.id)
      .gte('date', shift(dates[0], -2)).lte('date', shift(dates[dates.length - 1], 2)).limit(5000)
      .then(({ data }) => {
        if (!live) return
        const existing = (data ?? []).map(e => ({ date: e.date as string, amount: Number(e.amount), currency: (e.currency as string) ?? 'USD' }))
        setDupes(new Set(parsed.map((t, i) => (existing.some(e => isLikelyDuplicate(t, e)) ? i : -1)).filter(i => i >= 0)))
      })
    return () => { live = false }
  }, [parsed, session])

  const toImport = parsed.filter((_, i) => !(skipDupes && dupes?.has(i)))
  const spending = toImport.filter(t => t.transaction_type === 'expense').length
  const income = toImport.filter(t => t.transaction_type === 'income').length
  const ready = !!cols?.date && !!cols.description && !!cols.amount && toImport.length > 0 && dupes != null

  const run = async () => {
    if (!session || !file || !ready) return
    setBusy(true); setError(''); setProgress(0)
    const BATCH = 50
    for (let i = 0; i < toImport.length; i += BATCH) {
      const batch = toImport.slice(i, i + BATCH).map(t => ({
        user_id: session.user.id, date: t.date, occurred_at: t.occurred_at, amount: t.amount, currency: t.currency,
        description: t.description, notes: t.notes || '', category: t.category, transaction_type: t.transaction_type,
        tags: [], sub_category: null, source: 'csv', source_file: file.name,
      }))
      const { error: dbErr } = await supabase.from('expenses').insert(batch)
      if (dbErr) { setBusy(false); haptic.warn(); setError(`Stopped after ${i} rows: ${dbErr.message}`); refresh(); return }
      setProgress(i + batch.length)
    }
    haptic.success()
    await refresh()
    router.back()
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.ground }}>
      <View className="flex-row items-center justify-between px-5 pt-4">
        <Pressable accessibilityRole="button" hitSlop={12} onPress={() => { haptic.tick(); router.back() }}><Text className="text-[16px] font-semibold text-ink-2">Cancel</Text></Pressable>
        <Text className="text-[16px] font-bold text-ink">Import CSV</Text>
        <View style={{ width: 52 }} />
      </View>

      <ScrollView contentContainerClassName="gap-4 px-5 pb-10 pt-5">
        {!file ? (
          <View className="rounded-card border border-border bg-card p-5">
            <Text className="text-[32px]">📄</Text>
            <Text className="mt-2 text-[17px] font-semibold text-ink">Bring in a bank export</Text>
            <Text className="mt-1 text-[14px] leading-5 text-ink-2">
              Download your transactions from your bank as a CSV file, then choose it here. UntilFire finds the date, description and amount columns, and skips anything already imported.
            </Text>
            <View className="mt-4"><PrimaryButton label="Choose a file" onPress={pick} /></View>
          </View>
        ) : (
          <>
            <View className="flex-row items-center justify-between rounded-card bg-surface px-4 py-3">
              <View className="flex-1 pr-3">
                <Text numberOfLines={1} className="text-[15px] font-semibold text-ink">{file.name}</Text>
                <Text className="text-[12px] text-ink-3">{file.rows.length} rows · amounts in {importCurrency}</Text>
              </View>
              <Button small kind="quiet" label="Change" onPress={pick} />
            </View>

            <View className="rounded-card border border-border bg-card px-4">
              {FIELDS.map((f, i) => (
                <View key={f.key} className={i > 0 ? 'border-t border-border' : ''}>
                  <Pressable accessibilityRole="button" accessibilityState={{ expanded: editing === f.key }} onPress={() => { haptic.tick(); setEditing(editing === f.key ? null : f.key) }}
                    className="flex-row items-center justify-between py-3">
                    <Text className="text-[15px] text-ink">{f.label}</Text>
                    <Text numberOfLines={1} className={`ml-3 flex-1 text-right text-[14px] ${cols?.[f.key] ? 'text-ink-2' : f.optional ? 'text-ink-3' : 'text-neg-ink'}`}>
                      {cols?.[f.key] || (f.optional ? 'None' : 'Choose a column')} ›
                    </Text>
                  </Pressable>
                  {editing === f.key && (
                    <View className="flex-row flex-wrap gap-2 pb-3">
                      {[...(f.optional ? [''] : []), ...file.headers].map(h => (
                        <Pressable key={h || '_none'} accessibilityRole="button" accessibilityState={{ selected: cols?.[f.key] === h }}
                          onPress={() => { haptic.select(); setCols(c => (c ? { ...c, [f.key]: h } : c)); setEditing(null) }}
                          className={`rounded-full border px-3 py-1.5 ${cols?.[f.key] === h ? 'border-green bg-green-50' : 'border-border bg-surface'}`}>
                          <Text className="text-[13px] text-ink">{h || 'None'}</Text>
                        </Pressable>
                      ))}
                    </View>
                  )}
                </View>
              ))}
            </View>

            {!cols?.type && (
              <Row label="Spending shows as positive numbers" note="Turn on for card exports where purchases aren't negative">
                <Switch accessibilityLabel="Spending shows as positive numbers" value={flip} onValueChange={v => { haptic.select(); setFlip(v) }} trackColor={{ true: colors.green, false: colors.border2 }} />
              </Row>
            )}
            {dupes && dupes.size > 0 && (
              <Row label={`Skip ${dupes.size} already imported`} note="Same amount within two days of one in your account">
                <Switch accessibilityLabel="Skip rows already imported" value={skipDupes} onValueChange={v => { haptic.select(); setSkipDupes(v) }} trackColor={{ true: colors.green, false: colors.border2 }} />
              </Row>
            )}

            <View className="rounded-card border border-border bg-card p-4">
              <Text className="text-[13px] text-ink-3">To import</Text>
              <Text className="mt-1 font-mono text-[24px] text-ink">{toImport.length} transactions</Text>
              <Text className="text-[13px] text-ink-2">{spending} spending · {income} income · {toImport.length - spending - income} transfers</Text>
              {toImport.slice(0, 5).map((t, i) => (
                <View key={i} className="mt-2 flex-row items-center justify-between border-t border-border pt-2">
                  <View className="flex-1 pr-3">
                    <Text numberOfLines={1} className="text-[14px] text-ink">{t.description}</Text>
                    <Text className="text-[12px] text-ink-3">{t.date} · {t.category}</Text>
                  </View>
                  <Text className={`font-mono text-[14px] ${t.transaction_type === 'income' ? 'text-pos-ink' : 'text-ink'}`}>
                    {t.transaction_type === 'expense' ? '−' : t.transaction_type === 'income' ? '+' : ''}{moneyIn(t.amount, t.currency)}
                  </Text>
                </View>
              ))}
            </View>

            {error ? <Text className="text-[14px] text-neg-ink">{error}</Text> : null}
            {busy ? (
              <View className="flex-row items-center justify-center gap-3 py-3"><ActivityIndicator color={colors.green} /><Text className="text-[15px] text-ink-2">Importing {progress} of {toImport.length}…</Text></View>
            ) : (
              <PrimaryButton label={dupes == null ? 'Checking for duplicates…' : `Import ${toImport.length}`} onPress={run} disabled={!ready} />
            )}
          </>
        )}
        {!file && error ? <Text className="text-[14px] text-neg-ink">{error}</Text> : null}
      </ScrollView>
    </SafeAreaView>
  )
}

function Row({ label, note, children }: { label: string; note: string; children: React.ReactNode }) {
  return (
    <View className="flex-row items-center justify-between rounded-card border border-border bg-card px-4 py-3">
      <View className="flex-1 pr-3">
        <Text className="text-[15px] text-ink">{label}</Text>
        <Text className="text-[12px] text-ink-3">{note}</Text>
      </View>
      {children}
    </View>
  )
}
