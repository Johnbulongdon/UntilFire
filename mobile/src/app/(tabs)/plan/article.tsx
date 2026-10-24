import { router, useLocalSearchParams } from 'expo-router'
import { useEffect, useState } from 'react'
import { Pressable, View } from 'react-native'

import { DetailScreen } from '@/components/DetailScreen'
import { Card, Label } from '@/components/Screen'
import { Text } from '@/components/Text'
import { getLearnArticle, getRelatedArticles, type BodyNode } from '@/engine'
import { compactMoney } from '@/lib/format'
import { haptic } from '@/lib/haptics'
import { useReadArticles } from '@/lib/learn-progress'
import { useLivePlan } from '@/state/live-plan'
import { freedomFor } from '@/state/plan'

/** One Learn article, drawn natively from the website's article data (lib/learn.ts). */
export default function Article() {
  const { slug } = useLocalSearchParams<{ slug: string }>()
  const article = slug ? getLearnArticle(slug) : undefined
  const { markRead } = useReadArticles()
  const [openFaq, setOpenFaq] = useState<number | null>(null)

  useEffect(() => { if (article) markRead(article.slug) }, [article, markRead])
  if (!article) return <DetailScreen back="Learn" title="Not found"><Text className="text-ink-2">This article isn't available.</Text></DetailScreen>
  const related = getRelatedArticles(article.slug, 3)

  return (
    <DetailScreen back="Learn" title={article.title} subtitle={`${article.category} · ${article.readTime}`}>
      <View className="gap-3">
        {article.body.map((node, i) => <Node key={i} node={node} />)}
      </View>

      {article.faqs && article.faqs.length > 0 && (
        <Card>
          <Label>Questions people ask</Label>
          {article.faqs.map((f, i) => (
            <Pressable accessibilityRole="button" key={i} onPress={() => { haptic.tick(); setOpenFaq(openFaq === i ? null : i) }} className={`py-3 ${i > 0 ? 'border-t border-border' : ''}`}>
              <View className="flex-row justify-between gap-3">
                <Text className="flex-1 text-[15px] font-semibold text-ink">{f.question}</Text>
                <Text className="text-[16px] text-ink-3">{openFaq === i ? '−' : '+'}</Text>
              </View>
              {openFaq === i && <Text className="mt-2 text-[14px] leading-6 text-ink-2">{f.answer}</Text>}
            </Pressable>
          ))}
        </Card>
      )}

      {related.length > 0 && (
        <Card soft>
          <Label>Read next</Label>
          {related.map((r, i) => (
            <Pressable accessibilityRole="button" key={r.slug} onPress={() => { haptic.tick(); router.replace({ pathname: '/plan/article', params: { slug: r.slug } }) }}
              className={`py-2.5 ${i > 0 ? 'border-t border-border' : ''}`}>
              <Text className="text-[15px] font-semibold text-ink">{r.title}</Text>
              <Text className="text-[12px] text-ink-3">{r.readTime}</Text>
            </Pressable>
          ))}
        </Card>
      )}
    </DetailScreen>
  )
}

function Node({ node }: { node: BodyNode }) {
  switch (node.type) {
    case 'h2': return <Text className="mt-3 font-display text-[22px] font-bold leading-7 text-ink">{node.text}</Text>
    case 'h3': return <Text className="mt-1 text-[17px] font-bold text-ink">{node.text}</Text>
    case 'p': return <Text className="text-[16px] leading-7 text-ink">{node.text}</Text>
    case 'ul':
    case 'ol':
      return (
        <View className="gap-1.5">
          {node.items.map((item, i) => (
            <View key={i} className="flex-row gap-2.5">
              <Text className="w-5 text-[16px] leading-7 text-ink-3">{node.type === 'ol' ? `${i + 1}.` : '•'}</Text>
              <Text className="flex-1 text-[16px] leading-7 text-ink">{item}</Text>
            </View>
          ))}
        </View>
      )
    case 'fire-number': return <YourNumber />
    default: return null
  }
}

/** The article's inline calculator, answered with your own numbers instead of a form. */
function YourNumber() {
  const { plan } = useLivePlan()
  if (!plan) return null
  const r = freedomFor(plan)
  return (
    <Card soft>
      <Label>Your FIRE number</Label>
      <Text className="mt-1 font-mono text-[26px] text-ink">{compactMoney(r.target)}</Text>
      <Text className="text-[13px] text-ink-2">25 × your {compactMoney(plan.monthlySpending * 12)} a year of spending{r.year ? `, reached in ${r.year}` : ''}.</Text>
    </Card>
  )
}
