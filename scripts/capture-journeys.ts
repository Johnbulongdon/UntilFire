import fs from 'node:fs'
import http from 'node:http'
import path from 'node:path'

import { chromium, type Browser, type Page } from 'playwright'

import { CALC_SHOTS, JOURNEYS, SHOT_BUCKET, SHOT_VIEWPORTS, shotFile, type ShotDevice } from '../lib/journeys.ts'

// Screenshots every journey step that has a `shot`, at desktop and phone size,
// and uploads them to the public `journeys` bucket the admin Journeys tab reads.
// Run after each production deploy (.github/workflows/journeys.yml):
//   JOURNEY_BASE_URL=https://www.untilfire.com SUPABASE_URL=… SUPABASE_SERVICE_ROLE_KEY=… npm run journeys:capture
// Without the Supabase variables (or with JOURNEY_DRY_RUN=1) it saves to
// ./journey-shots instead, and without them signed-in steps are skipped.
// JOURNEY_APP_DIR is the phone app's web build (`npx expo export --platform web`
// in mobile/); without it the phone app steps are skipped.
const base = (process.env.JOURNEY_BASE_URL ?? 'https://www.untilfire.com').replace(/\/$/, '')
const supabaseUrl = process.env.SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const upload = !!supabaseUrl && !!serviceKey && process.env.JOURNEY_DRY_RUN !== '1'

// A real account the script signs in as. It never pays and never deletes.
const BOT_EMAIL = 'journeys-bot@untilfire.com'

async function save(file: string, body: Buffer | string, contentType: string) {
  if (!upload) {
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

/** Opens the code box on /login. The send is answered here, so no email goes out. */
async function showEmailCode(page: Page) {
  await page.route('**/auth/v1/otp**', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: '{}' }))
  try {
    await page.goto(`${base}/login?uf_internal=1`, { waitUntil: 'networkidle', timeout: 45_000 })
    await settle(page)
    await page.locator('#login-email').fill(BOT_EMAIL)
    await page.getByRole('button', { name: 'Email me a sign-in code' }).click()
    await page.locator('#login-code').waitFor({ timeout: 10_000 })
    await settle(page)
  } finally {
    await page.unroute('**/auth/v1/otp**')
  }
}

/** Phone onboarding answers: once a month, the suggested take-home, $3,000 spent, $6,000 invested. */
const APP_ANSWERS: Record<string, (page: Page) => Promise<void>> = {
  goal: (page) => tapText(page, 'Financial freedom'),
  city: (page) => tapText(page, 'Skip'),
  pay: (page) => tapText(page, 'Once a month'),
  income: (page) => tapText(page, 'Continue'),
  know: (page) => tapText(page, 'What I spend each month'),
  spending: async (page) => {
    await tapText(page, 'Type it instead')
    await page.locator('input:visible').last().fill('3000')
    await tapText(page, 'Continue')
  },
  invested: async (page) => {
    for (const key of ['6', '000']) await tapText(page, key)
    await tapText(page, 'Continue')
  },
  age: (page) => tapText(page, 'Show my freedom date'),
}
const tapText = (page: Page, text: string) => page.getByText(text, { exact: true }).last().click()

/** The phone's launch screen, drawn from app.json's splash settings (the web build has none). */
function launchScreen(): string {
  const mobile = path.resolve('mobile')
  const splash = (JSON.parse(fs.readFileSync(path.join(mobile, 'app.json'), 'utf8')).expo.plugins as unknown[])
    .find((p): p is [string, { image: string; imageWidth: number; backgroundColor: string }] => Array.isArray(p) && p[0] === 'expo-splash-screen')![1]
  const image = fs.readFileSync(path.join(mobile, splash.image)).toString('base64')
  return `<body style="margin:0;height:100vh;display:flex;align-items:center;justify-content:center;background:${splash.backgroundColor}">`
    + `<img src="data:image/png;base64,${image}" width="${splash.imageWidth}"></body>`
}

/** Serves the app's web build, sending every unknown path to index.html as the router expects. */
function serveApp(dir: string): Promise<{ url: string; close: () => void }> {
  const types: Record<string, string> = { '.js': 'text/javascript', '.css': 'text/css', '.html': 'text/html', '.json': 'application/json', '.png': 'image/png', '.ttf': 'font/ttf', '.svg': 'image/svg+xml', '.wasm': 'application/wasm' }
  const server = http.createServer((req, res) => {
    let file = path.join(dir, decodeURIComponent((req.url ?? '/').split('?')[0]))
    if (!file.startsWith(dir) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) file = path.join(dir, 'index.html')
    res.writeHead(200, { 'Content-Type': types[path.extname(file)] ?? 'application/octet-stream' })
    fs.createReadStream(file).pipe(res)
  })
  return new Promise((resolve) => server.listen(0, () => {
    const { port } = server.address() as { port: number }
    resolve({ url: `http://localhost:${port}`, close: () => server.close() })
  }))
}

/**
 * Phone app steps, at phone size: signed-out screens, then the onboarding
 * walked with APP_ANSWERS, then signed-in screens in that same browser.
 */
async function captureApp(browser: Browser, dir: string, shots: string[], shoot: (page: Page, shot: string) => Promise<void>) {
  const app = await serveApp(path.resolve(dir))
  const context = await browser.newContext({ viewport: SHOT_VIEWPORTS.phone, deviceScaleFactor: 1, isMobile: true, hasTouch: true })
  const page = await context.newPage()
  const open = async (route: string) => {
    await page.goto(`${app.url}${route}`, { waitUntil: 'networkidle', timeout: 45_000 })
    await page.waitForTimeout(1500)
  }
  const attempt = async (label: string, run: () => Promise<void>) => {
    try { await run() } catch (error) { failed.push(`app ${label}: ${(error as Error).message}`) }
  }
  try {
    const walk = shots.filter((s) => s.startsWith('app:/onboarding/')).map((s) => s.slice('app:/onboarding/'.length))
    if (shots.includes('app:launch')) {
      await attempt('app:launch', async () => {
        await page.setContent(launchScreen())
        await shoot(page, 'app:launch')
      })
    }
    for (const shot of shots.filter((s) => s.startsWith('app:/') && !s.startsWith('app:/onboarding/'))) {
      await attempt(shot, async () => { await open(shot.slice('app:'.length)); await shoot(page, shot) })
    }
    await attempt('onboarding', async () => {
      await open(`/onboarding/${walk[0]}`)
      for (const screen of walk) {
        await page.waitForURL(`**/onboarding/${screen}`, { timeout: 15_000 })
        // Result screens count up and animate in.
        await page.waitForTimeout(APP_ANSWERS[screen] ? 1200 : 3500)
        await shoot(page, `app:/onboarding/${screen}`)
        if (screen === walk[walk.length - 1]) break
        await (APP_ANSWERS[screen] ?? ((p: Page) => tapText(p, 'Continue')))(page)
      }
    })
    if (session) {
      // The app's Supabase client keeps its session under the default key.
      const key = `sb-${new URL(supabaseUrl!).hostname.split('.')[0]}-auth-token`
      await page.evaluate(([k, v]) => localStorage.setItem(k, v), [key, JSON.stringify(session)])
      for (const shot of shots.filter((s) => s.startsWith('app-user:'))) {
        await attempt(shot, async () => {
          await open(shot.slice('app-user:'.length))
          await page.waitForTimeout(1500)
          if (/^\/(onboarding|sign-in)/.test(new URL(page.url()).pathname)) throw new Error(`not signed in (${page.url()})`)
          await shoot(page, shot)
        })
      }
    }
  } finally {
    await context.close()
    app.close()
  }
}

const SUBSCRIPTIONS = '**/rest/v1/subscriptions?*'

/** Answers the browser's own subscription lookups with an active Pro plan. Nothing is written anywhere. */
async function pretendPro(page: Page) {
  const row = {
    plan: 'pro', status: 'active', source: 'stripe', stripe_subscription_id: 'sub_journeys', cancel_at_period_end: false,
    current_period_end: new Date(Date.now() + 30 * 86_400_000).toISOString(),
  }
  await page.route(SUBSCRIPTIONS, (route) => {
    const single = (route.request().headers().accept ?? '').includes('vnd.pgrst.object')
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(single ? row : [row]) })
  })
}

/**
 * The real Stripe pages need the test account to have a Stripe customer, so
 * each run reuses it rather than creating a new one (checkout makes one when
 * the account has none). Set once by hand: subscriptions.stripe_customer_id.
 */
async function hasStripeCustomer(userId: string): Promise<boolean> {
  const res = await fetch(`${supabaseUrl}/rest/v1/subscriptions?user_id=eq.${userId}&select=stripe_customer_id`, {
    headers: { apikey: serviceKey!, Authorization: `Bearer ${serviceKey}` },
  })
  const rows = res.ok ? await res.json() as { stripe_customer_id: string | null }[] : []
  return !!rows[0]?.stripe_customer_id
}

/** Presses the same buttons a person would, stopping on Stripe's page: nothing is paid or cancelled. */
async function openStripe(page: Page, shot: 'stripe:checkout' | 'stripe:portal') {
  if (shot === 'stripe:portal') await pretendPro(page)
  await page.goto(`${base}/dashboard?tab=profile`, { waitUntil: 'networkidle', timeout: 45_000 })
  await settle(page)
  if (shot === 'stripe:checkout') {
    await page.getByRole('button', { name: /Try Pro/ }).first().click()
    await settle(page)
    await page.getByRole('button', { name: /^(Start .*|Continue to checkout)$/ }).first().click()
    await page.waitForURL(/checkout\.stripe\.com/, { timeout: 30_000 })
  } else {
    await page.getByRole('button', { name: 'Manage billing' }).first().click()
    await page.waitForURL(/billing\.stripe\.com/, { timeout: 30_000 })
  }
  await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {})
  await page.waitForTimeout(2000)
}

const steps = JOURNEYS.flatMap((j) => j.steps).filter((s) => s.shot)
const unique = <T,>(items: T[], key: (t: T) => string) => [...new Map(items.map((t) => [key(t), t])).values()]
const plainShots = unique(steps.filter((s) => s.shot!.startsWith('/')), (s) => s.shot!)
const userShots = unique(steps.filter((s) => /^(user|pro):/.test(s.shot!)), (s) => `${s.shot}|${s.click?.join('|') ?? ''}`)
const stripeShots = [...new Set(steps.filter((s) => s.shot!.startsWith('stripe:')).map((s) => s.shot!))]
// In manifest order, so the onboarding screens are walked in the order the app shows them.
const appShots = [...new Set(steps.filter((s) => s.shot!.startsWith('app')).map((s) => s.shot!))]

const session = await botSession()
const stripeReady = !!session && stripeShots.length > 0 && await hasStripeCustomer(String((session.user as { id: string }).id))
if (session && stripeShots.length && !stripeReady) console.log('Skipping Stripe pages: the test account has no stripe_customer_id yet')
const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {})
const failed: string[] = []
let taken = 0

for (const device of Object.keys(SHOT_VIEWPORTS) as ShotDevice[]) {
  const context = await browser.newContext({ viewport: SHOT_VIEWPORTS[device], deviceScaleFactor: 1, isMobile: device === 'phone' })
  const page = await context.newPage()
  const shoot = async (shot: string, click?: string[]) => {
    await save(shotFile(shot, device, click), await page.screenshot(), 'image/png')
    taken++
    console.log(`✓ ${device} ${shot}${click ? ` → ${click.join(' → ')}` : ''}`)
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

  if (steps.some((s) => s.shot === 'login:code')) {
    try {
      await showEmailCode(page)
      await shoot('login:code')
    } catch (error) {
      failed.push(`${device} login:code: ${(error as Error).message}`)
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
        if (shot!.startsWith('pro:')) await pretendPro(page)
        await page.goto(`${base}${shot!.slice(shot!.indexOf(':') + 1)}`, { waitUntil: 'networkidle', timeout: 45_000 })
        if (new URL(page.url()).pathname === '/login') throw new Error('not signed in')
        await settle(page)
        for (const name of click ?? []) {
          await page.getByRole('button', { name: new RegExp(name) }).first().click()
          await settle(page)
        }
        await shoot(shot!, click)
      } catch (error) {
        failed.push(`${device} ${shot}${click ? ` → ${click.join(' → ')}` : ''}: ${(error as Error).message}`)
      } finally {
        await page.unroute(SUBSCRIPTIONS)
      }
    }
    for (const shot of stripeReady ? stripeShots : []) {
      try {
        await openStripe(page, shot as 'stripe:checkout' | 'stripe:portal')
        await shoot(shot)
      } catch (error) {
        failed.push(`${device} ${shot}: ${(error as Error).message}`)
      } finally {
        await page.unroute(SUBSCRIPTIONS)
      }
    }
  }
  await context.close()
}
if (process.env.JOURNEY_APP_DIR) {
  await captureApp(browser, process.env.JOURNEY_APP_DIR, appShots, async (page, shot) => {
    await save(shotFile(shot, 'phone'), await page.screenshot(), 'image/png')
    taken++
    console.log(`✓ app ${shot}`)
  })
}
await browser.close()

await save('run.json', JSON.stringify({ sha: process.env.GITHUB_SHA ?? 'local', takenAt: new Date().toISOString(), taken, failed }), 'application/json')
if (failed.length) {
  for (const f of failed) console.error(`FAIL: ${f}`)
  process.exit(1)
}
