import { chromium, type Page } from 'playwright'

import { CALC_SHOTS, JOURNEYS, SHOT_BUCKET, SHOT_VIEWPORTS, shotFile, type ShotDevice } from '../lib/journeys.ts'

// Screenshots every journey step that has a `shot`, at desktop and phone size,
// and uploads them to the public `journeys` bucket the admin Journeys tab reads.
// Run after each production deploy (.github/workflows/journeys.yml):
//   JOURNEY_BASE_URL=https://www.untilfire.com SUPABASE_URL=… SUPABASE_SERVICE_ROLE_KEY=… npm run journeys:capture
// Without the Supabase variables (or with JOURNEY_DRY_RUN=1) it saves to
// ./journey-shots instead, and without them signed-in steps are skipped.
const base = (process.env.JOURNEY_BASE_URL ?? 'https://www.untilfire.com').replace(/\/$/, '')
const supabaseUrl = process.env.SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const upload = !!supabaseUrl && !!serviceKey && process.env.JOURNEY_DRY_RUN !== '1'

// A real account the script signs in as. It never pays and never deletes.
const BOT_EMAIL = 'journeys-bot@untilfire.com'

async function save(file: string, body: Buffer | string, contentType: string) {
  if (!upload) {
    const fs = await import('node:fs')
    fs.mkdirSync('journey-shots', { recursive: true })
    fs.writeFileSync(`journey-shots/${file}`, body)
    return
  }
  const res = await fetch(`${supabaseUrl}/storage/v1/object/${SHOT_BUCKET}/${file}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${serviceKey}`, 'Content-Type': contentType, 'x-upsert': 'true', 'Cache-Control': 'max-age=60' },
    body,
  })
  if (!res.ok) throw new Error(`Upload of ${file} failed: ${res.status} ${await res.text()}`)
}

/** Signs the test account in through the admin API and returns its Supabase session. */
async function botSession(): Promise<Record<string, unknown> | null> {
  if (!supabaseUrl || !serviceKey) return null
  const headers = { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, 'Content-Type': 'application/json' }
  const post = (path: string, body: object) => fetch(`${supabaseUrl}${path}`, { method: 'POST', headers, body: JSON.stringify(body) })
  await post('/auth/v1/admin/users', { email: BOT_EMAIL, email_confirm: true }) // 422 once it exists
  const link = await (await post('/auth/v1/admin/generate_link', { type: 'magiclink', email: BOT_EMAIL })).json()
  const res = await post('/auth/v1/verify', { type: 'magiclink', token_hash: link.hashed_token ?? link.properties?.hashed_token })
  if (!res.ok) throw new Error(`Test account sign-in failed: ${res.status} ${await res.text()}`)
  const session = await res.json()
  // Keep the retention emails away from an inbox nobody reads.
  await fetch(`${supabaseUrl}/rest/v1/profiles?on_conflict=user_id`, {
    method: 'POST',
    headers: { ...headers, Prefer: 'resolution=merge-duplicates' },
    body: JSON.stringify({ user_id: session.user.id, marketing_unsubscribed_at: new Date().toISOString() }),
  })
  console.log(`Signed in as the journeys test account (${session.user.id})`)
  return { ...session, expires_at: session.expires_at ?? Math.floor(Date.now() / 1000) + session.expires_in }
}

/** $6,000 take-home a month, then $6,000 invested; savings and age keep their suggested values. */
const SAMPLE_ANSWER = '6000'

const settle = (page: Page) => page.waitForTimeout(900) // let entrance motion finish

/**
 * Answers the website calculator with its suggested amounts, taking one shot
 * per CALC_SHOTS page, and ends on /login after "Save my starting point".
 */
async function walkCalculator(page: Page, shoot: (name: string) => Promise<void>) {
  await page.goto(`${base}/?start=onboarding&city=austin&uf_internal=1`, { waitUntil: 'networkidle', timeout: 45_000 })
  await settle(page)
  const step = page.locator('[data-onboarding-step]:not([hidden])')
  for (const name of CALC_SHOTS) {
    const next = step.getByRole('button', { name: /^(Continue|Show my freedom date)/ })
    if (await next.count()) {
      // A question with nothing filled in yet: type the same sample amount on every size.
      if (await next.first().isDisabled()) await step.locator('input:visible').first().fill(SAMPLE_ANSWER)
      await next.first().click()
    } else {
      await page.getByRole('button', { name: /^(Continue|Save my starting point) →$/ }).first().click()
    }
    await settle(page)
    // The freedom date first plays a short loading scene.
    if (name === 'freedom-age') await page.getByRole('button', { name: 'Continue →' }).waitFor({ timeout: 20_000 })
    // Result pages count their numbers up; wait for them to land.
    if (!(await next.count())) await page.waitForTimeout(2200)
    await shoot(`calc:${name}`)
  }
  await page.getByRole('button', { name: 'Save my starting point →' }).first().click()
  await page.waitForURL('**/login**', { timeout: 20_000 })
}

const steps = JOURNEYS.flatMap((j) => j.steps).filter((s) => s.shot)
const unique = <T,>(items: T[], key: (t: T) => string) => [...new Map(items.map((t) => [key(t), t])).values()]
const plainShots = unique(steps.filter((s) => s.shot!.startsWith('/')), (s) => s.shot!)
const userShots = unique(steps.filter((s) => s.shot!.startsWith('user:')), (s) => `${s.shot}|${s.click ?? ''}`)

const session = await botSession()
const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {})
const failed: string[] = []
let taken = 0

for (const device of Object.keys(SHOT_VIEWPORTS) as ShotDevice[]) {
  const context = await browser.newContext({ viewport: SHOT_VIEWPORTS[device], deviceScaleFactor: 1, isMobile: device === 'phone' })
  const page = await context.newPage()
  const shoot = async (shot: string, click?: string) => {
    await save(shotFile(shot, device, click), await page.screenshot(), 'image/png')
    taken++
    console.log(`✓ ${device} ${shot}${click ? ` → ${click}` : ''}`)
  }

  for (const { shot } of plainShots) {
    // ?uf_internal=1 keeps these visits out of the funnel numbers (HomeClient).
    const url = `${base}${shot}${shot!.includes('?') ? '&' : '?'}uf_internal=1`
    try {
      const res = await page.goto(url, { waitUntil: 'networkidle', timeout: 45_000 })
      if (!res || res.status() >= 400) throw new Error(`HTTP ${res?.status()}`)
      await settle(page)
      await shoot(shot!)
    } catch (error) {
      failed.push(`${device} ${shot}: ${(error as Error).message}`)
    }
  }

  try {
    await walkCalculator(page, (name) => shoot(name))
  } catch (error) {
    failed.push(`${device} calculator: ${(error as Error).message}`)
  }

  if (session) {
    // Same browser as the calculator walk, so Home picks up the plan it just
    // made, as it would for a person signing up.
    // The site's own storageKey (lib/supabase.ts).
    await page.evaluate(([key, value]) => localStorage.setItem(key, value), ['fire-dashboard-auth', JSON.stringify(session)])
    for (const { shot, click } of userShots) {
      try {
        await page.goto(`${base}${shot!.slice('user:'.length)}`, { waitUntil: 'networkidle', timeout: 45_000 })
        if (new URL(page.url()).pathname === '/login') throw new Error('not signed in')
        await settle(page)
        if (click) {
          await page.getByRole('button', { name: new RegExp(`^${click}`) }).first().click()
          await settle(page)
        }
        await shoot(shot!, click)
      } catch (error) {
        failed.push(`${device} ${shot}${click ? ` → ${click}` : ''}: ${(error as Error).message}`)
      }
    }
  }
  await context.close()
}
await browser.close()

await save('run.json', JSON.stringify({ sha: process.env.GITHUB_SHA ?? 'local', takenAt: new Date().toISOString(), taken, failed }), 'application/json')
if (failed.length) {
  for (const f of failed) console.error(`FAIL: ${f}`)
  process.exit(1)
}
