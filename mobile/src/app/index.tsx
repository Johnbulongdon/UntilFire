import { Redirect } from 'expo-router'

import { useAuth } from '@/state/auth'
import { usePlan } from '@/state/plan'

/** Signed out or no plan yet: the welcome screen. Signed in with a plan: straight to Home. */
export default function Entry() {
  const { plan, ready } = usePlan()
  const auth = useAuth()
  if (!ready || !auth.ready) return null
  return <Redirect href={plan && auth.session ? '/(tabs)' : '/onboarding'} />
}
