import { Redirect } from 'expo-router'

import { usePlan } from '@/state/plan'

/** First launch goes to onboarding; once a plan is saved, straight to Home. */
export default function Entry() {
  const { plan, ready } = usePlan()
  if (!ready) return null
  return <Redirect href={plan ? '/(tabs)' : '/onboarding'} />
}
