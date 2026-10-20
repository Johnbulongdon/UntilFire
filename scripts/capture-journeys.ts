import { chromium } from 'playwright'

import { JOURNEYS, SHOT_BUCKET, SHOT_VIEWPORTS, shotFile, type ShotDevice } from '../lib/journeys.ts'

// Screenshots every signed-out journey step at desktop and phone size and
// uploads them to the public `journeys` bucket the admin Journeys tab reads.
// Run after each production deploy (.github/workflows/journeys.yml):
//   JOURNEY_BASE_URL=https://www.untilfire.com SUPABASE_URL=… SUPABASE_SERVICE_ROLE_KEY=… npm run journeys:capture
// Without the Supabase variables it saves to ./journey-shots instead.
const base = (process.env.JOURNEY_BASE_URL ?? 'https://www.untilfire.com').replace(/\/$/, '')
const supabaseUrl = process.env.SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

async function save(file: string, body: Buffer | string, contentType: string) {
  if (!supabaseUrl || !serviceKey) {
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

const shots = [...new Set(JOURNEYS.flatMap((j) => j.steps.map((s) => s.shot).filter((s): s is string => !!s)))]
const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {})
const failed: string[] = []

for (const device of Object.keys(SHOT_VIEWPORTS) as ShotDevice[]) {
  // ?uf_internal=1 keeps these visits out of the funnel numbers (HomeClient).
  const context = await browser.newContext({ viewport: SHOT_VIEWPORTS[device], deviceScaleFactor: 1, isMobile: device === 'phone' })
  const page = await context.newPage()
  for (const shot of shots) {
    const url = `${base}${shot}${shot.includes('?') ? '&' : '?'}uf_internal=1`
    try {
      const res = await page.goto(url, { waitUntil: 'networkidle', timeout: 45_000 })
      if (!res || res.status() >= 400) throw new Error(`HTTP ${res?.status()}`)
      await page.waitForTimeout(800) // let entrance motion finish
      await save(shotFile(shot, device), await page.screenshot(), 'image/png')
      console.log(`✓ ${device} ${shot}`)
    } catch (error) {
      failed.push(`${device} ${shot}: ${(error as Error).message}`)
    }
  }
  await context.close()
}
await browser.close()

await save('run.json', JSON.stringify({ sha: process.env.GITHUB_SHA ?? 'local', takenAt: new Date().toISOString(), failed }), 'application/json')
if (failed.length) {
  for (const f of failed) console.error(`FAIL: ${f}`)
  process.exit(1)
}
