import fs from 'node:fs'
import path from 'node:path'

import { JOURNEYS } from '../lib/journeys.ts'

// Each journey step must point at a page or screen that still exists, so the
// admin Journeys tab cannot quietly describe a flow the code no longer has.
const failures: string[] = []

function webRouteExists(route: string): boolean {
  const dir = path.join('app', ...route.split('/').filter(Boolean))
  return ['page.tsx', 'route.ts'].some((file) => fs.existsSync(path.join(dir, file)))
}

for (const journey of JOURNEYS) {
  if (journey.steps.length < 2) failures.push(`${journey.id}: a journey needs at least two steps`)
  for (const step of journey.steps) {
    const ok = journey.platform === 'web'
      ? webRouteExists(step.route)
      : fs.existsSync(path.join('mobile/src/app', step.route))
    if (!ok) failures.push(`${journey.id} → "${step.label}": ${step.route} does not exist`)
    if (step.shot && journey.platform !== 'web') failures.push(`${journey.id} → "${step.label}": only web steps take screenshots`)
  }
}

// The phone onboarding order in the manifest must match the order the screens
// push each other, so a reordered screen shows up here.
const phone = JOURNEYS.find((j) => j.id === 'phone-new')!.steps
  .map((s) => s.route)
  .filter((r) => r.startsWith('onboarding/') && r !== 'onboarding/index.tsx')
for (let i = 0; i < phone.length - 1; i++) {
  const source = fs.readFileSync(path.join('mobile/src/app', phone[i]), 'utf8')
  const next = '/' + phone[i + 1].replace(/\.tsx$/, '')
  if (!source.includes(`'${next}'`)) failures.push(`phone-new: ${phone[i]} no longer goes to ${next}`)
}

if (failures.length) {
  for (const f of failures) console.error(`FAIL: ${f}`)
  process.exit(1)
}
console.log(`PASS: ${JOURNEYS.length} journeys, every step's page exists.`)
