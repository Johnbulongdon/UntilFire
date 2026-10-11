import { router } from 'expo-router'
import { useMemo, useState } from 'react'
import { Pressable, Switch, TextInput, View } from 'react-native'

import { MoneyRow, SheetFrame } from '@/components/SheetFrame'
import { Text } from '@/components/Text'
import { CITIES, REAL_RETURN } from '@/engine'
import { money } from '@/lib/format'
import { haptic } from '@/lib/haptics'
import { saveAge, saveFireProfile } from '@/lib/mutations'
import { useAccount } from '@/state/account'
import { useAuth } from '@/state/auth'
import { colors } from '@/theme/colors'

const LIFESTYLES = [{ label: 'Frugal', m: 0.75 }, { label: 'Typical', m: 1 }, { label: 'Comfortable', m: 1.5 }]
const WITHDRAWALS = [0.03, 0.035, 0.04, 0.045, 0.05]
const GROWTHS = [{ label: 'Cautious', g: 0.04 }, { label: 'Since 1928', g: REAL_RETURN }, { label: 'Hopeful', g: 0.08 }]

/** The website's planning assumptions (FireAssumptionsCard): age, where you live, where freedom gets priced and how richly, growth, withdrawals and tax. */
export default function Assumptions() {
  const { session } = useAuth()
  const { data, refresh } = useAccount()
  const p = data?.profile
  const [age, setAge] = useState(String(data?.age ?? ''))
  const [home, setHome] = useState(p?.cityName ?? '')
  const [retire, setRetire] = useState(p?.retirementCityName ?? '')
  const [lifestyle, setLifestyle] = useState(p?.lifestyleMultiplier ?? 1)
  const [growth, setGrowth] = useState(p?.growthRate ?? REAL_RETURN)
  const [withdrawal, setWithdrawal] = useState(p?.withdrawalRate ?? 0.04)
  const [taxOn, setTaxOn] = useState(p?.taxEnabled ?? false)
  const [taxRate, setTaxRate] = useState(String(Math.round((p?.retirementTaxRate ?? 0.15) * 100)))
  const [rothPct, setRothPct] = useState(String(p?.rothPct ?? 0))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const retireCity = CITIES.find(c => c.name === retire)
  const save = async () => {
    if (!session) return
    setBusy(true); setError('')
    const problem = (await saveFireProfile(session.user.id, {
      cityName: home,
      retirementCityName: retireCity ? retireCity.name : '',
      retirementCityCol: retireCity ? retireCity.col : 0,
      lifestyleMultiplier: lifestyle,
      growthRate: growth,
      withdrawalRate: withdrawal,
      taxEnabled: taxOn,
      retirementTaxRate: Math.min(60, Math.max(0, Number(taxRate) || 0)) / 100,
      rothPct: Math.min(100, Math.max(0, Number(rothPct) || 0)),
    })) ?? (Number(age) > 0 ? await saveAge(session.user.id, Number(age)) : null)
    if (problem) { setBusy(false); haptic.warn(); setError(problem); return }
    haptic.success(); await refresh(); router.back()
  }

  return (
    <SheetFrame title="Planning assumptions" saveLabel="Save" onSave={save} canSave={!!session} busy={busy} error={error}>
      <View className="rounded-card border border-border bg-card px-4">
        <MoneyRow first label="Your age" value={age} onChange={setAge} suffix=" " />
      </View>

      <Section title="Where you live" note="Sets your tax while working.">
        <CityPicker value={home} onChange={setHome} placeholder="Search your city" />
      </Section>

      <Section title="Where freedom gets priced" note="Leave empty to price it at today's spending.">
        <CityPicker value={retire} onChange={setRetire} placeholder="Search a retirement city" allowClear />
        {retireCity && (
          <>
            <Chips options={LIFESTYLES.map(l => ({ label: l.label, on: lifestyle === l.m, pick: () => setLifestyle(l.m) }))} />
            <Text className="mt-2 text-[13px] text-ink-2">{money((retireCity.col * lifestyle) / 12)} a month in {retireCity.name.split(',')[0]}</Text>
          </>
        )}
      </Section>

      <Section title="Growth after inflation" note="The website's default is the S&P 500 since 1928.">
        <Chips options={GROWTHS.map(g => ({ label: `${g.label} ${(g.g * 100).toFixed(1)}%`, on: Math.abs(growth - g.g) < 0.0005, pick: () => setGrowth(g.g) }))} />
      </Section>

      <Section title="Withdrawal rate" note="4% means a target of 25 times a year of spending.">
        <Chips options={WITHDRAWALS.map(w => ({ label: `${(w * 100).toFixed(1).replace('.0', '')}%`, on: withdrawal === w, pick: () => setWithdrawal(w) }))} />
      </Section>

      <Section title="Tax on withdrawals">
        <View className="flex-row items-center justify-between rounded-card border border-border bg-card px-4 py-3">
          <Text className="text-[15px] font-semibold text-ink">Count tax in retirement</Text>
          <Switch value={taxOn} onValueChange={v => { haptic.select(); setTaxOn(v) }} trackColor={{ true: colors.green, false: colors.border2 }} />
        </View>
        {taxOn && (
          <View className="mt-2 rounded-card border border-border bg-card px-4">
            <MoneyRow first label="Tax rate on withdrawals" value={taxRate} onChange={setTaxRate} suffix="%" />
            <MoneyRow label="Share in Roth (tax-free)" value={rothPct} onChange={setRothPct} suffix="%" />
          </View>
        )}
      </Section>
    </SheetFrame>
  )
}

function Section({ title, note, children }: { title: string; note?: string; children: React.ReactNode }) {
  return (
    <View className="mt-5">
      <Text className="text-[15px] font-bold text-ink">{title}</Text>
      {note ? <Text className="mb-2 text-[12px] text-ink-3">{note}</Text> : <View className="mb-2" />}
      {children}
    </View>
  )
}

function Chips({ options }: { options: { label: string; on: boolean; pick: () => void }[] }) {
  return (
    <View className="mt-1 flex-row flex-wrap" style={{ gap: 8 }}>
      {options.map(o => (
        <Pressable accessibilityRole="button" key={o.label} onPress={() => { haptic.select(); o.pick() }} className={`rounded-full border px-3 py-1.5 ${o.on ? 'border-green bg-green-50' : 'border-border bg-card'}`}>
          <Text className={`text-[13px] font-semibold ${o.on ? 'text-green-700' : 'text-ink-2'}`}>{o.label}</Text>
        </Pressable>
      ))}
    </View>
  )
}

function CityPicker({ value, onChange, placeholder, allowClear }: { value: string; onChange: (v: string) => void; placeholder: string; allowClear?: boolean }) {
  const [q, setQ] = useState('')
  const matches = useMemo(() => (q.trim() ? CITIES.filter(c => c.name.toLowerCase().includes(q.trim().toLowerCase())).slice(0, 5) : []), [q])
  return (
    <View>
      {value ? (
        <View className="flex-row items-center justify-between rounded-control border border-border bg-card px-4 py-3">
          <Text className="text-[15px] font-semibold text-ink">{CITIES.find(c => c.name === value)?.flag} {value}</Text>
          <Pressable accessibilityRole="button" hitSlop={8} onPress={() => { haptic.tick(); onChange('') }}><Text className="text-[13px] font-bold text-pos-ink">{allowClear ? 'Clear' : 'Change'}</Text></Pressable>
        </View>
      ) : (
        <>
          <TextInput className="rounded-control border border-border bg-card px-4 py-3 text-[15px] text-ink" style={{ fontFamily: 'Manrope_500Medium' }}
            placeholder={placeholder} placeholderTextColor={colors.ink3} value={q} onChangeText={setQ} autoCorrect={false} />
          {matches.map(c => (
            <Pressable accessibilityRole="button" key={c.key} onPress={() => { haptic.select(); onChange(c.name); setQ('') }} className="border-b border-border py-2.5">
              <Text className="text-[15px] text-ink">{c.flag} {c.name}</Text>
            </Pressable>
          ))}
        </>
      )}
    </View>
  )
}
