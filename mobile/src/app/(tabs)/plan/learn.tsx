import { router } from 'expo-router'
import { Pressable, View } from 'react-native'

import { DetailScreen } from '@/components/DetailScreen'
import { Card, Label, ProgressTrack } from '@/components/Screen'
import { Text } from '@/components/Text'
import { getStageArticles, learnStages, type LearnArticle } from '@/engine'
import { haptic } from '@/lib/haptics'
import { CATEGORY_LOOK, stageFor, useReadArticles } from '@/lib/learn-progress'
import { useLivePlan } from '@/state/live-plan'
import { freedomFor } from '@/state/plan'

/** The website's Learn (D-47): where you are first, one article to read next, then each stage's reading. */
export default function Learn() {
  const { plan } = useLivePlan()
  const { read } = useReadArticles()
  const result = plan ? freedomFor(plan) : null
  const stageId = plan && result ? stageFor(plan.invested, result.target, result.years, plan.invested > 0 || plan.monthlyIncome > 0) : 'starting-out'
  const stage = learnStages.find(s => s.id === stageId) ?? learnStages[0]
  const stageArticles = getStageArticles(stage.id)
  const next = stageArticles.find(a => !read.includes(a.slug)) ?? stageArticles[0]
  const doneInStage = stageArticles.filter(a => read.includes(a.slug)).length

  return (
    <DetailScreen back="Plan" title="Learn" subtitle="Short reads for where you are on the path">
      <Card>
        <Label>Where you are</Label>
        <Text className="mt-1 font-display text-[24px] font-bold text-ink">{stage.label}</Text>
        <Text className="mt-1 text-[14px] leading-5 text-ink-2">{stage.whatMattersNow}</Text>
        <View className="mt-3"><ProgressTrack share={stageArticles.length ? doneInStage / stageArticles.length : 0} height={6} /></View>
        <Text className="mt-1.5 text-[12px] text-ink-3">{doneInStage} of {stageArticles.length} read in this stage</Text>
        {next && (
          <Pressable accessibilityRole="button" onPress={() => { haptic.tick(); router.push({ pathname: '/plan/article', params: { slug: next.slug } }) }}
            className="mt-4 rounded-control bg-green-50 p-3.5 active:opacity-70">
            <Text className="text-[12px] font-bold uppercase tracking-wider text-green-700">Read next</Text>
            <Text className="mt-1 text-[16px] font-semibold text-ink">{next.title}</Text>
            <Text className="mt-0.5 text-[12px] text-ink-3">{next.readTime}</Text>
          </Pressable>
        )}
      </Card>

      {learnStages.map(s => (
        <Card key={s.id}>
          <View className="flex-row items-center justify-between">
            <Text className="text-[16px] font-bold text-ink">{s.label}</Text>
            {s.id === stage.id && <Text className="text-[11px] font-bold uppercase tracking-wider text-teal-deep">You're here</Text>}
          </View>
          <Text className="mt-0.5 text-[13px] text-ink-2">{s.tagline}</Text>
          <View className="mt-2">
            {getStageArticles(s.id).map((a, i) => <ArticleRow key={a.slug} a={a} read={read.includes(a.slug)} first={i === 0} />)}
          </View>
        </Card>
      ))}
    </DetailScreen>
  )
}

function ArticleRow({ a, read, first }: { a: LearnArticle; read: boolean; first: boolean }) {
  const look = CATEGORY_LOOK[a.category] ?? { icon: '📄', color: '#8a7c68' }
  return (
    <Pressable accessibilityRole="button" onPress={() => { haptic.tick(); router.push({ pathname: '/plan/article', params: { slug: a.slug } }) }}
      className={`flex-row items-center gap-3 py-2.5 active:opacity-60 ${first ? '' : 'border-t border-border'}`}>
      <View className="h-9 w-9 items-center justify-center rounded-control" style={{ backgroundColor: `${look.color}22` }}>
        <Text className="text-[16px]">{look.icon}</Text>
      </View>
      <View className="flex-1">
        <Text numberOfLines={2} className={`text-[14px] font-semibold ${read ? 'text-ink-3' : 'text-ink'}`}>{a.title}</Text>
        <Text className="text-[12px] text-ink-3">{a.readTime}</Text>
      </View>
      {read ? <Text className="text-[14px] text-pos-ink">✓</Text> : <Text className="text-[16px] text-ink-3">›</Text>}
    </Pressable>
  )
}
