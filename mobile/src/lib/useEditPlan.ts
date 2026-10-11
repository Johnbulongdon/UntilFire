import { router } from 'expo-router'

import { usePlan } from '@/state/plan'

/**
 * Reopens onboarding with the saved answers filled in. `fromStart` begins at the
 * welcome screen and logo, so the whole flow can be seen again; otherwise it
 * starts at the first question. Nothing is cleared until the new answers are saved.
 */
export function useEditPlan() {
  const { plan, setDraft } = usePlan()
  return (fromStart = false) => {
    if (plan) setDraft(plan)
    router.push(fromStart ? '/onboarding' : '/onboarding/goal')
  }
}
